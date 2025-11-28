// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./AuctionManager.sol";

/**
 * @title ReputationSystem
 * @notice Tracks reputation scores for farmers and buyers
 * @dev Reputation based on completed trades, quality, and reliability
 */
contract ReputationSystem {
    // ============ Structs ============

    struct FarmerReputation {
        uint256 totalSales;
        uint256 successfulDeliveries;
        uint256 averageQualityScore; // 1-10 scale (times 100 for precision)
        uint256 totalFeedbackCount; // Total number of feedback received
        uint256 totalRevenue;
        uint64 memberSince;
        bool verified;
    }

    struct BuyerReputation {
        uint256 totalPurchases;
        uint256 timelyPayments;
        uint256 disputesRaised;
        uint256 totalSpent;
        uint64 memberSince;
        bool verified;
    }

    struct QualityFeedback {
        bytes32 auctionId;
        address buyer;
        uint8 qualityScore; // 1-10
        string comment;
        uint64 timestamp;
    }

    // ============ State Variables ============

    AuctionManager public immutable auctionManager;

    mapping(bytes32 => FarmerReputation) public farmerReputations; // farmerId => reputation
    mapping(address => BuyerReputation) public buyerReputations;
    mapping(bytes32 => QualityFeedback[]) public batchFeedback; // batchId => feedback

    uint256 public constant QUALITY_PRECISION = 100;
    uint256 public constant MIN_QUALITY_SCORE = 1;
    uint256 public constant MAX_QUALITY_SCORE = 10;

    // ============ Events ============

    event FarmerRegistered(bytes32 indexed farmerId, uint64 timestamp);
    event BuyerRegistered(address indexed buyer, uint64 timestamp);

    event SaleRecorded(
        bytes32 indexed farmerId,
        address indexed buyer,
        bytes32 indexed auctionId,
        uint256 amount
    );

    event QualityFeedbackSubmitted(
        bytes32 indexed batchId,
        address indexed buyer,
        uint8 qualityScore
    );

    event FarmerVerified(bytes32 indexed farmerId);
    event BuyerVerified(address indexed buyer);

    // ============ Errors ============

    error FarmerAlreadyRegistered();
    error BuyerAlreadyRegistered();
    error InvalidQualityScore();
    error UnauthorizedFeedback();
    error FeedbackAlreadySubmitted();

    // ============ Constructor ============

    constructor(address _auctionManager) {
        auctionManager = AuctionManager(_auctionManager);
    }

    // ============ Functions ============

    /**
     * @notice Register a new farmer
     * @param farmerId Unique farmer identifier
     */
    function registerFarmer(bytes32 farmerId) external {
        if (farmerReputations[farmerId].memberSince != 0) {
            revert FarmerAlreadyRegistered();
        }

        farmerReputations[farmerId] = FarmerReputation({
            totalSales: 0,
            successfulDeliveries: 0,
            averageQualityScore: 0,
            totalFeedbackCount: 0,
            totalRevenue: 0,
            memberSince: uint64(block.timestamp),
            verified: false
        });

        emit FarmerRegistered(farmerId, uint64(block.timestamp));
    }

    /**
     * @notice Register a new buyer
     */
    function registerBuyer() external {
        if (buyerReputations[msg.sender].memberSince != 0) {
            revert BuyerAlreadyRegistered();
        }

        buyerReputations[msg.sender] = BuyerReputation({
            totalPurchases: 0,
            timelyPayments: 0,
            disputesRaised: 0,
            totalSpent: 0,
            memberSince: uint64(block.timestamp),
            verified: false
        });

        emit BuyerRegistered(msg.sender, uint64(block.timestamp));
    }

    /**
     * @notice Record a successful sale
     * @param farmerId The farmer who sold
     * @param buyer The buyer who purchased
     * @param auctionId The auction ID
     * @param amount Sale amount
     */
    function recordSale(
        bytes32 farmerId,
        address buyer,
        bytes32 auctionId,
        uint256 amount
    ) external {
        // Auto-register if not exists
        if (farmerReputations[farmerId].memberSince == 0) {
            farmerReputations[farmerId].memberSince = uint64(block.timestamp);
            farmerReputations[farmerId].totalFeedbackCount = 0;
        }
        if (buyerReputations[buyer].memberSince == 0) {
            buyerReputations[buyer].memberSince = uint64(block.timestamp);
        }

        // Update farmer stats
        farmerReputations[farmerId].totalSales++;
        farmerReputations[farmerId].successfulDeliveries++;
        farmerReputations[farmerId].totalRevenue += amount;

        // Update buyer stats
        buyerReputations[buyer].totalPurchases++;
        buyerReputations[buyer].timelyPayments++;
        buyerReputations[buyer].totalSpent += amount;

        emit SaleRecorded(farmerId, buyer, auctionId, amount);
    }

    /**
     * @notice Submit quality feedback for a batch
     * @param batchId The batch ID
     * @param auctionId The auction ID
     * @param farmerId The farmer ID
     * @param qualityScore Quality rating (1-10)
     * @param comment Optional feedback comment
     */
    function submitQualityFeedback(
        bytes32 batchId,
        bytes32 auctionId,
        bytes32 farmerId,
        uint8 qualityScore,
        string calldata comment
    ) external {
        if (
            qualityScore < MIN_QUALITY_SCORE || qualityScore > MAX_QUALITY_SCORE
        ) {
            revert InvalidQualityScore();
        }

        // Verify buyer purchased this batch
        AuctionManager.Auction memory auction = auctionManager.getAuction(
            auctionId
        );
        if (auction.highestBidder != msg.sender) revert UnauthorizedFeedback();

        // Check if already submitted feedback
        QualityFeedback[] memory existingFeedback = batchFeedback[batchId];
        for (uint i = 0; i < existingFeedback.length; i++) {
            if (existingFeedback[i].buyer == msg.sender) {
                revert FeedbackAlreadySubmitted();
            }
        }

        // Record feedback
        batchFeedback[batchId].push(
            QualityFeedback({
                auctionId: auctionId,
                buyer: msg.sender,
                qualityScore: qualityScore,
                comment: comment,
                timestamp: uint64(block.timestamp)
            })
        );

        // Update farmer's average quality score
        FarmerReputation storage rep = farmerReputations[farmerId];

        if (rep.averageQualityScore == 0) {
            // First feedback
            rep.averageQualityScore = uint256(qualityScore) * QUALITY_PRECISION;
        } else {
            // Running average: ((oldAvg * n) + newScore) / (n + 1)
            uint256 totalScores = (rep.averageQualityScore *
                rep.totalFeedbackCount) / QUALITY_PRECISION;
            totalScores += qualityScore;
            rep.averageQualityScore =
                (totalScores * QUALITY_PRECISION) /
                (rep.totalFeedbackCount + 1);
        }

        rep.totalFeedbackCount++;

        emit QualityFeedbackSubmitted(batchId, msg.sender, qualityScore);
    }

    /**
     * @notice Verify a farmer (admin/governance function)
     * @param farmerId The farmer to verify
     */
    function verifyFarmer(bytes32 farmerId) external {
        // In production, add access control
        farmerReputations[farmerId].verified = true;
        emit FarmerVerified(farmerId);
    }

    /**
     * @notice Verify a buyer (admin/governance function)
     * @param buyer The buyer to verify
     */
    function verifyBuyer(address buyer) external {
        // In production, add access control
        buyerReputations[buyer].verified = true;
        emit BuyerVerified(buyer);
    }

    /**
     * @notice Get farmer reputation
     * @param farmerId The farmer to query
     * @return FarmerReputation struct
     */
    function getFarmerReputation(
        bytes32 farmerId
    ) external view returns (FarmerReputation memory) {
        return farmerReputations[farmerId];
    }

    /**
     * @notice Get buyer reputation
     * @param buyer The buyer to query
     * @return BuyerReputation struct
     */
    function getBuyerReputation(
        address buyer
    ) external view returns (BuyerReputation memory) {
        return buyerReputations[buyer];
    }

    /**
     * @notice Get quality feedback for a batch
     * @param batchId The batch to query
     * @return Array of quality feedback
     */
    function getBatchFeedback(
        bytes32 batchId
    ) external view returns (QualityFeedback[] memory) {
        return batchFeedback[batchId];
    }

    /**
     * @notice Calculate farmer reputation score (0-100)
     * @param farmerId The farmer to score
     * @return Reputation score
     */
    function calculateFarmerScore(
        bytes32 farmerId
    ) external view returns (uint256) {
        FarmerReputation memory rep = farmerReputations[farmerId];

        if (rep.totalSales == 0) return 0;

        // Score components:
        // - 40% from quality score
        // - 30% from delivery success rate
        // - 20% from total sales volume
        // - 10% from verification status

        uint256 qualityComponent = (rep.averageQualityScore * 40) /
            (MAX_QUALITY_SCORE * QUALITY_PRECISION);

        uint256 deliveryRate = (rep.successfulDeliveries * 100) /
            rep.totalSales;
        uint256 deliveryComponent = (deliveryRate * 30) / 100;

        uint256 volumeComponent = rep.totalSales > 100
            ? 20
            : (rep.totalSales * 20) / 100;

        uint256 verificationComponent = rep.verified ? 10 : 0;

        return
            qualityComponent +
            deliveryComponent +
            volumeComponent +
            verificationComponent;
    }

    /**
     * @notice Calculate buyer reputation score (0-100)
     * @param buyer The buyer to score
     * @return Reputation score
     */
    function calculateBuyerScore(
        address buyer
    ) external view returns (uint256) {
        BuyerReputation memory rep = buyerReputations[buyer];

        if (rep.totalPurchases == 0) return 0;

        // Score components:
        // - 50% from payment reliability
        // - 30% from low dispute rate
        // - 10% from purchase volume
        // - 10% from verification status

        uint256 paymentRate = (rep.timelyPayments * 100) / rep.totalPurchases;
        uint256 paymentComponent = (paymentRate * 50) / 100;

        uint256 disputeRate = rep.disputesRaised > rep.totalPurchases
            ? 0
            : 100 - ((rep.disputesRaised * 100) / rep.totalPurchases);
        uint256 disputeComponent = (disputeRate * 30) / 100;

        uint256 volumeComponent = rep.totalPurchases > 50
            ? 10
            : (rep.totalPurchases * 10) / 50;

        uint256 verificationComponent = rep.verified ? 10 : 0;

        return
            paymentComponent +
            disputeComponent +
            volumeComponent +
            verificationComponent;
    }
}
