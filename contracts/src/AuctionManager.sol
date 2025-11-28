// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./BatchRegistry.sol";

/**
 * @title AuctionManager
 * @notice Manages micro-auctions for agricultural produce batches
 * @dev Handles auction creation, bidding, and settlement
 */
contract AuctionManager {
    // ============ Enums ============

    enum AuctionStatus {
        Open,
        Closed,
        Settled,
        Cancelled
    }

    // ============ Structs ============

    struct Auction {
        bytes32 auctionId;
        bytes32 batchId;
        bytes32 farmerId;
        uint64 startTimestamp;
        uint64 endTimestamp;
        uint256 startingPrice;
        uint256 reservePrice; // Minimum acceptable price
        uint256 highestBid;
        address highestBidder;
        AuctionStatus status;
        string deliveryLocationHash;
    }

    struct Bid {
        address bidder;
        uint256 amount;
        uint64 timestamp;
    }

    // ============ State Variables ============

    BatchRegistry public immutable batchRegistry;

    mapping(bytes32 => Auction) public auctions;
    mapping(bytes32 => Bid[]) public auctionBids; // auctionId => bid history
    mapping(bytes32 => bytes32) public batchToAuction; // batchId => auctionId
    mapping(address => bytes32[]) public buyerAuctions; // buyer => auctionIds participated

    bytes32[] public allAuctionIds; // Track all auction IDs
    mapping(bytes32 => bytes32[]) public farmerAuctions; // farmerId => auctionIds

    uint256 public totalAuctions;
    uint256 public minAuctionDuration = 15 minutes;
    uint256 public maxAuctionDuration = 7 days;
    uint256 public minBidIncrement = 100; // Minimum bid increment in wei (adjustable)

    // ============ Events ============

    event AuctionCreated(
        bytes32 indexed auctionId,
        bytes32 indexed batchId,
        bytes32 indexed farmerId,
        uint256 startingPrice,
        uint64 endTimestamp
    );

    event NewBid(
        bytes32 indexed auctionId,
        address indexed bidder,
        uint256 amount,
        uint64 timestamp
    );

    event AuctionClosed(
        bytes32 indexed auctionId,
        address indexed winner,
        uint256 finalPrice
    );

    event AuctionSettled(
        bytes32 indexed auctionId,
        bytes32 indexed batchId,
        address indexed buyer
    );

    event AuctionCancelled(bytes32 indexed auctionId, bytes32 indexed batchId);

    // ============ Errors ============

    error AuctionAlreadyExists();
    error AuctionDoesNotExist();
    error AuctionNotOpen();
    error AuctionNotEnded();
    error AuctionAlreadyEnded();
    error BatchNotRegistered();
    error InvalidDuration();
    error InvalidPrice();
    error BidTooLow();
    error UnauthorizedCaller();
    error AuctionAlreadySettled();
    error NoWinningBid();

    // ============ Modifiers ============

    modifier auctionExists(bytes32 auctionId) {
        if (auctions[auctionId].startTimestamp == 0)
            revert AuctionDoesNotExist();
        _;
    }

    modifier onlyOpenAuction(bytes32 auctionId) {
        if (auctions[auctionId].status != AuctionStatus.Open)
            revert AuctionNotOpen();
        if (block.timestamp >= auctions[auctionId].endTimestamp)
            revert AuctionAlreadyEnded();
        _;
    }

    // ============ Constructor ============

    constructor(address _batchRegistry) {
        batchRegistry = BatchRegistry(_batchRegistry);
    }

    // ============ Functions ============

    /**
     * @notice Create a new auction for a batch
     * @param auctionId Unique auction identifier
     * @param batchId Associated batch ID
     * @param farmerId Farmer creating the auction
     * @param durationSeconds Auction duration
     * @param startingPrice Minimum starting bid
     * @param reservePrice Minimum acceptable final price
     * @param deliveryLocationHash Delivery location geohash
     */
    function createAuction(
        bytes32 auctionId,
        bytes32 batchId,
        bytes32 farmerId,
        uint64 durationSeconds,
        uint256 startingPrice,
        uint256 reservePrice,
        string calldata deliveryLocationHash
    ) external {
        if (auctions[auctionId].startTimestamp != 0)
            revert AuctionAlreadyExists();
        if (!batchRegistry.batchExists(batchId)) revert BatchNotRegistered();
        if (
            durationSeconds < minAuctionDuration ||
            durationSeconds > maxAuctionDuration
        ) {
            revert InvalidDuration();
        }
        if (startingPrice == 0 || reservePrice < startingPrice)
            revert InvalidPrice();

        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = startTime + durationSeconds;

        Auction memory newAuction = Auction({
            auctionId: auctionId,
            batchId: batchId,
            farmerId: farmerId,
            startTimestamp: startTime,
            endTimestamp: endTime,
            startingPrice: startingPrice,
            reservePrice: reservePrice,
            highestBid: 0,
            highestBidder: address(0),
            status: AuctionStatus.Open,
            deliveryLocationHash: deliveryLocationHash
        });

        auctions[auctionId] = newAuction;
        batchToAuction[batchId] = auctionId;
        allAuctionIds.push(auctionId);
        farmerAuctions[farmerId].push(auctionId);
        totalAuctions++;

        emit AuctionCreated(
            auctionId,
            batchId,
            farmerId,
            startingPrice,
            endTime
        );
    }

    /**
     * @notice Place a bid on an open auction
     * @param auctionId The auction to bid on
     * @param bidAmount Bid amount in stablecoin
     */
    function placeBid(
        bytes32 auctionId,
        uint256 bidAmount
    ) external auctionExists(auctionId) onlyOpenAuction(auctionId) {
        Auction storage auction = auctions[auctionId];

        // First bid must be >= startingPrice
        if (auction.highestBid == 0) {
            if (bidAmount < auction.startingPrice) revert BidTooLow();
        } else {
            // Subsequent bids must exceed current highest by minimum increment
            if (bidAmount < auction.highestBid + minBidIncrement)
                revert BidTooLow();
        }

        // Update auction state
        auction.highestBid = bidAmount;
        auction.highestBidder = msg.sender;

        // Record bid
        auctionBids[auctionId].push(
            Bid({
                bidder: msg.sender,
                amount: bidAmount,
                timestamp: uint64(block.timestamp)
            })
        );

        // Track buyer participation
        if (
            buyerAuctions[msg.sender].length == 0 ||
            buyerAuctions[msg.sender][buyerAuctions[msg.sender].length - 1] !=
            auctionId
        ) {
            buyerAuctions[msg.sender].push(auctionId);
        }

        emit NewBid(auctionId, msg.sender, bidAmount, uint64(block.timestamp));
    }

    /**
     * @notice Close an auction after end time
     * @param auctionId The auction to close
     */
    function closeAuction(bytes32 auctionId) external auctionExists(auctionId) {
        Auction storage auction = auctions[auctionId];

        if (auction.status != AuctionStatus.Open) revert AuctionNotOpen();
        if (block.timestamp < auction.endTimestamp) revert AuctionNotEnded();

        auction.status = AuctionStatus.Closed;

        emit AuctionClosed(
            auctionId,
            auction.highestBidder,
            auction.highestBid
        );
    }

    /**
     * @notice Settle a closed auction (called by escrow manager)
     * @param auctionId The auction to settle
     */
    function settleAuction(
        bytes32 auctionId
    ) external auctionExists(auctionId) {
        Auction storage auction = auctions[auctionId];

        if (auction.status != AuctionStatus.Closed) revert AuctionNotOpen();
        if (auction.highestBid < auction.reservePrice) revert BidTooLow();

        auction.status = AuctionStatus.Settled;

        emit AuctionSettled(auctionId, auction.batchId, auction.highestBidder);
    }

    /**
     * @notice Cancel an auction (only if no bids placed)
     * @param auctionId The auction to cancel
     */
    function cancelAuction(
        bytes32 auctionId
    ) external auctionExists(auctionId) {
        Auction storage auction = auctions[auctionId];

        if (auction.status != AuctionStatus.Open) revert AuctionNotOpen();
        if (auction.highestBid > 0) revert NoWinningBid(); // Can't cancel if bids exist

        auction.status = AuctionStatus.Cancelled;

        emit AuctionCancelled(auctionId, auction.batchId);
    }

    /**
     * @notice Get auction details
     * @param auctionId The auction to query
     * @return Auction struct
     */
    function getAuction(
        bytes32 auctionId
    ) external view returns (Auction memory) {
        if (auctions[auctionId].startTimestamp == 0)
            revert AuctionDoesNotExist();
        return auctions[auctionId];
    }

    /**
     * @notice Get bid history for an auction
     * @param auctionId The auction to query
     * @return Array of bids
     */
    function getAuctionBids(
        bytes32 auctionId
    ) external view returns (Bid[] memory) {
        return auctionBids[auctionId];
    }

    /**
     * @notice Check if auction is active
     * @param auctionId The auction to check
     * @return true if auction is open and not expired
     */
    function isAuctionActive(bytes32 auctionId) external view returns (bool) {
        Auction memory auction = auctions[auctionId];
        return
            auction.status == AuctionStatus.Open &&
            block.timestamp < auction.endTimestamp;
    }

    /**
     * @notice Get auctions participated by buyer
     * @param buyer The buyer address
     * @return Array of auction IDs
     */
    function getBuyerAuctions(
        address buyer
    ) external view returns (bytes32[] memory) {
        return buyerAuctions[buyer];
    }

    /**
     * @notice Get all auction IDs
     * @return Array of all auction IDs
     */
    function getAllAuctionIds() external view returns (bytes32[] memory) {
        return allAuctionIds;
    }

    /**
     * @notice Get all active auctions
     * @return Array of active Auction structs
     */
    function getActiveAuctions() external view returns (Auction[] memory) {
        uint256 activeCount = 0;

        // Count active auctions
        for (uint256 i = 0; i < allAuctionIds.length; i++) {
            Auction memory auction = auctions[allAuctionIds[i]];
            if (
                auction.status == AuctionStatus.Open &&
                block.timestamp < auction.endTimestamp
            ) {
                activeCount++;
            }
        }

        // Build active auctions array
        Auction[] memory activeAuctions = new Auction[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < allAuctionIds.length; i++) {
            Auction memory auction = auctions[allAuctionIds[i]];
            if (
                auction.status == AuctionStatus.Open &&
                block.timestamp < auction.endTimestamp
            ) {
                activeAuctions[index] = auction;
                index++;
            }
        }

        return activeAuctions;
    }

    /**
     * @notice Get auctions by farmer
     * @param farmerId The farmer ID
     * @return Array of Auction structs
     */
    function getAuctionsByFarmer(
        bytes32 farmerId
    ) external view returns (Auction[] memory) {
        bytes32[] memory auctionIds = farmerAuctions[farmerId];
        Auction[] memory result = new Auction[](auctionIds.length);

        for (uint256 i = 0; i < auctionIds.length; i++) {
            result[i] = auctions[auctionIds[i]];
        }

        return result;
    }

    /**
     * @notice Get paginated auctions
     * @param offset Starting index
     * @param limit Number of auctions to return
     * @return Array of Auction structs
     */
    function getAuctionsPaginated(
        uint256 offset,
        uint256 limit
    ) external view returns (Auction[] memory) {
        if (offset >= allAuctionIds.length) {
            return new Auction[](0);
        }

        uint256 end = offset + limit;
        if (end > allAuctionIds.length) {
            end = allAuctionIds.length;
        }

        uint256 resultLength = end - offset;
        Auction[] memory result = new Auction[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = auctions[allAuctionIds[offset + i]];
        }

        return result;
    }
}
