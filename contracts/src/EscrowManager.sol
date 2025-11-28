// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./interfaces/IStablecoin.sol";
import "./AuctionManager.sol";

/**
 * @title EscrowManager
 * @notice Manages stablecoin escrow for auction settlements
 * @dev Handles locking, releasing, and refunding of escrowed funds
 */
contract EscrowManager {
    // ============ Structs ============

    struct Escrow {
        bytes32 auctionId;
        address buyer;
        address farmer;
        uint256 amount;
        uint64 lockTimestamp;
        bool released;
        bool refunded;
    }

    // ============ State Variables ============

    IStablecoin public immutable stablecoin;
    AuctionManager public immutable auctionManager;

    mapping(bytes32 => Escrow) public escrows; // auctionId => Escrow
    mapping(address => uint256) public buyerEscrowBalance; // Total locked per buyer
    mapping(address => uint256) public farmerPendingPayouts; // Pending payouts to farmers

    uint256 public platformFee = 200; // 2% (basis points: 200/10000)
    address public feeCollector;
    uint256 public totalFeesCollected;

    // ============ Events ============

    event FundsLocked(
        bytes32 indexed auctionId,
        address indexed buyer,
        uint256 amount
    );

    event FundsReleased(
        bytes32 indexed auctionId,
        address indexed farmer,
        uint256 amount,
        uint256 fee
    );

    event FundsRefunded(
        bytes32 indexed auctionId,
        address indexed buyer,
        uint256 amount
    );

    event PlatformFeeUpdated(uint256 newFee);

    event FeeCollectorUpdated(address indexed newCollector);

    // ============ Errors ============

    error InsufficientBalance();
    error InsufficientAllowance();
    error EscrowAlreadyExists();
    error EscrowDoesNotExist();
    error AlreadyReleased();
    error AlreadyRefunded();
    error AuctionNotSettled();
    error TransferFailed();
    error InvalidFee();
    error UnauthorizedCaller();
    error AuctionStillActive();

    // ============ Constructor ============

    constructor(
        address _stablecoin,
        address _auctionManager,
        address _feeCollector
    ) {
        stablecoin = IStablecoin(_stablecoin);
        auctionManager = AuctionManager(_auctionManager);
        feeCollector = _feeCollector;
    }

    // ============ Functions ============

    /**
     * @notice Lock funds in escrow for a bid
     * @param auctionId The auction ID
     * @param amount Amount to lock
     */
    function lockFunds(bytes32 auctionId, uint256 amount) external {
        if (escrows[auctionId].lockTimestamp != 0) revert EscrowAlreadyExists();

        // Get auction details
        AuctionManager.Auction memory auction = auctionManager.getAuction(
            auctionId
        );

        // Check buyer has sufficient balance
        if (stablecoin.balanceOf(msg.sender) < amount)
            revert InsufficientBalance();

        // Check allowance
        if (stablecoin.allowance(msg.sender, address(this)) < amount) {
            revert InsufficientAllowance();
        }

        // Transfer funds to escrow
        bool success = stablecoin.transferFrom(
            msg.sender,
            address(this),
            amount
        );
        if (!success) revert TransferFailed();

        // Create escrow record
        escrows[auctionId] = Escrow({
            auctionId: auctionId,
            buyer: msg.sender,
            farmer: address(0), // Will be set on release
            amount: amount,
            lockTimestamp: uint64(block.timestamp),
            released: false,
            refunded: false
        });

        buyerEscrowBalance[msg.sender] += amount;

        emit FundsLocked(auctionId, msg.sender, amount);
    }

    /**
     * @notice Release escrowed funds to farmer after successful auction
     * @param auctionId The auction ID
     * @param farmerAddress Farmer's payment address
     */
    function releaseFunds(bytes32 auctionId, address farmerAddress) external {
        Escrow storage escrow = escrows[auctionId];

        if (escrow.lockTimestamp == 0) revert EscrowDoesNotExist();
        if (escrow.released) revert AlreadyReleased();
        if (escrow.refunded) revert AlreadyRefunded();

        // Verify auction is settled
        AuctionManager.Auction memory auction = auctionManager.getAuction(
            auctionId
        );
        if (auction.status != AuctionManager.AuctionStatus.Settled) {
            revert AuctionNotSettled();
        }

        // Calculate platform fee
        uint256 fee = (escrow.amount * platformFee) / 10000;
        uint256 farmerAmount = escrow.amount - fee;

        // Update state
        escrow.released = true;
        escrow.farmer = farmerAddress;
        buyerEscrowBalance[escrow.buyer] -= escrow.amount;
        farmerPendingPayouts[farmerAddress] += farmerAmount;
        totalFeesCollected += fee;

        // Transfer to farmer
        bool success = stablecoin.transfer(farmerAddress, farmerAmount);
        if (!success) revert TransferFailed();

        // Transfer fee to collector
        if (fee > 0) {
            success = stablecoin.transfer(feeCollector, fee);
            if (!success) revert TransferFailed();
        }

        emit FundsReleased(auctionId, farmerAddress, farmerAmount, fee);
    }

    /**
     * @notice Refund escrowed funds to buyer (if auction failed or cancelled)
     * @param auctionId The auction ID
     */
    function refundFunds(bytes32 auctionId) external {
        Escrow storage escrow = escrows[auctionId];

        if (escrow.lockTimestamp == 0) revert EscrowDoesNotExist();
        if (escrow.released) revert AlreadyReleased();
        if (escrow.refunded) revert AlreadyRefunded();

        // Verify auction is not active and not settled
        AuctionManager.Auction memory auction = auctionManager.getAuction(
            auctionId
        );
        if (auctionManager.isAuctionActive(auctionId))
            revert AuctionStillActive();

        // Can refund if: cancelled, closed but reserve not met, or buyer didn't win
        bool canRefund = auction.status ==
            AuctionManager.AuctionStatus.Cancelled ||
            (auction.status == AuctionManager.AuctionStatus.Closed &&
                auction.highestBidder != escrow.buyer) ||
            (auction.status == AuctionManager.AuctionStatus.Closed &&
                auction.highestBid < auction.reservePrice);

        if (!canRefund) revert UnauthorizedCaller();

        // Update state
        escrow.refunded = true;
        buyerEscrowBalance[escrow.buyer] -= escrow.amount;

        // Transfer back to buyer
        bool success = stablecoin.transfer(escrow.buyer, escrow.amount);
        if (!success) revert TransferFailed();

        emit FundsRefunded(auctionId, escrow.buyer, escrow.amount);
    }

    /**
     * @notice Update platform fee (only owner/governance)
     * @param newFee New fee in basis points (e.g., 200 = 2%)
     */
    function updatePlatformFee(uint256 newFee) external {
        if (msg.sender != feeCollector) revert UnauthorizedCaller();
        if (newFee > 1000) revert InvalidFee(); // Max 10%

        platformFee = newFee;
        emit PlatformFeeUpdated(newFee);
    }

    /**
     * @notice Update fee collector address
     * @param newCollector New collector address
     */
    function updateFeeCollector(address newCollector) external {
        if (msg.sender != feeCollector) revert UnauthorizedCaller();

        feeCollector = newCollector;
        emit FeeCollectorUpdated(newCollector);
    }

    /**
     * @notice Get escrow details
     * @param auctionId The auction ID
     * @return Escrow struct
     */
    function getEscrow(
        bytes32 auctionId
    ) external view returns (Escrow memory) {
        return escrows[auctionId];
    }

    /**
     * @notice Check if funds are locked for auction
     * @param auctionId The auction ID
     * @return true if escrow exists and not released/refunded
     */
    function isLocked(bytes32 auctionId) external view returns (bool) {
        Escrow memory escrow = escrows[auctionId];
        return
            escrow.lockTimestamp != 0 && !escrow.released && !escrow.refunded;
    }

    /**
     * @notice Get buyer's total locked balance
     * @param buyer The buyer address
     * @return Total locked amount
     */
    function getBuyerLockedBalance(
        address buyer
    ) external view returns (uint256) {
        return buyerEscrowBalance[buyer];
    }
}
