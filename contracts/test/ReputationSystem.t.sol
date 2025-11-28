// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/ReputationSystem.sol";
import "../src/AuctionManager.sol";
import "../src/BatchRegistry.sol";

contract ReputationSystemTest is Test {
    ReputationSystem public reputationSystem;
    AuctionManager public auctionManager;
    BatchRegistry public batchRegistry;

    bytes32 constant FARMER_ID = keccak256("farmer1");
    bytes32 constant BATCH_ID = keccak256("batch1");
    bytes32 constant AUCTION_ID = keccak256("auction1");

    address constant BUYER1 = address(0x1);
    address constant BUYER2 = address(0x2);

    function setUp() public {
        batchRegistry = new BatchRegistry();
        auctionManager = new AuctionManager(address(batchRegistry));
        reputationSystem = new ReputationSystem(address(auctionManager));

        // Register batch
        batchRegistry.registerBatch(
            BATCH_ID,
            uint64(block.timestamp),
            "maize",
            24000,
            8,
            FARMER_ID,
            "gbsuv7",
            "QmTest123"
        );

        // Create auction
        auctionManager.createAuction(
            AUCTION_ID,
            BATCH_ID,
            FARMER_ID,
            1 hours,
            10000e6,
            12000e6,
            "gbsuv7"
        );
    }

    function test_RegisterFarmer() public {
        reputationSystem.registerFarmer(FARMER_ID);

        ReputationSystem.FarmerReputation memory rep = reputationSystem
            .getFarmerReputation(FARMER_ID);

        assertEq(rep.totalSales, 0);
        assertEq(rep.successfulDeliveries, 0);
        assertEq(rep.averageQualityScore, 0);
        assertEq(rep.totalRevenue, 0);
        assertEq(rep.memberSince, uint64(block.timestamp));
        assertFalse(rep.verified);
    }

    function test_RevertWhen_FarmerAlreadyRegistered() public {
        reputationSystem.registerFarmer(FARMER_ID);

        vm.expectRevert(ReputationSystem.FarmerAlreadyRegistered.selector);
        reputationSystem.registerFarmer(FARMER_ID);
    }

    function test_RegisterBuyer() public {
        vm.prank(BUYER1);
        reputationSystem.registerBuyer();

        ReputationSystem.BuyerReputation memory rep = reputationSystem
            .getBuyerReputation(BUYER1);

        assertEq(rep.totalPurchases, 0);
        assertEq(rep.timelyPayments, 0);
        assertEq(rep.disputesRaised, 0);
        assertEq(rep.totalSpent, 0);
        assertEq(rep.memberSince, uint64(block.timestamp));
        assertFalse(rep.verified);
    }

    function test_RecordSale() public {
        uint256 saleAmount = 15000e6;

        reputationSystem.recordSale(FARMER_ID, BUYER1, AUCTION_ID, saleAmount);

        // Check farmer stats
        ReputationSystem.FarmerReputation memory farmerRep = reputationSystem
            .getFarmerReputation(FARMER_ID);
        assertEq(farmerRep.totalSales, 1);
        assertEq(farmerRep.successfulDeliveries, 1);
        assertEq(farmerRep.totalRevenue, saleAmount);

        // Check buyer stats
        ReputationSystem.BuyerReputation memory buyerRep = reputationSystem
            .getBuyerReputation(BUYER1);
        assertEq(buyerRep.totalPurchases, 1);
        assertEq(buyerRep.timelyPayments, 1);
        assertEq(buyerRep.totalSpent, saleAmount);
    }

    function test_RecordMultipleSales() public {
        reputationSystem.recordSale(
            FARMER_ID,
            BUYER1,
            keccak256("auction1"),
            10000e6
        );
        reputationSystem.recordSale(
            FARMER_ID,
            BUYER1,
            keccak256("auction2"),
            15000e6
        );
        reputationSystem.recordSale(
            FARMER_ID,
            BUYER2,
            keccak256("auction3"),
            12000e6
        );

        ReputationSystem.FarmerReputation memory farmerRep = reputationSystem
            .getFarmerReputation(FARMER_ID);
        assertEq(farmerRep.totalSales, 3);
        assertEq(farmerRep.totalRevenue, 37000e6);
    }

    function test_SubmitQualityFeedback() public {
        // Place bid and settle auction
        vm.prank(BUYER1);
        auctionManager.placeBid(AUCTION_ID, 13000e6);

        vm.warp(block.timestamp + 2 hours);
        auctionManager.closeAuction(AUCTION_ID);
        auctionManager.settleAuction(AUCTION_ID);

        // Submit feedback
        vm.prank(BUYER1);
        reputationSystem.submitQualityFeedback(
            BATCH_ID,
            AUCTION_ID,
            FARMER_ID,
            9,
            "Excellent quality maize"
        );

        // Check feedback
        ReputationSystem.QualityFeedback[] memory feedback = reputationSystem
            .getBatchFeedback(BATCH_ID);
        assertEq(feedback.length, 1);
        assertEq(feedback[0].buyer, BUYER1);
        assertEq(feedback[0].qualityScore, 9);
        assertEq(feedback[0].comment, "Excellent quality maize");

        // Check updated farmer score
        ReputationSystem.FarmerReputation memory rep = reputationSystem
            .getFarmerReputation(FARMER_ID);
        assertEq(rep.averageQualityScore, 900); // 9 * 100
    }

    function test_RevertWhen_InvalidQualityScore() public {
        vm.prank(BUYER1);
        auctionManager.placeBid(AUCTION_ID, 13000e6);

        vm.warp(block.timestamp + 2 hours);
        auctionManager.closeAuction(AUCTION_ID);
        auctionManager.settleAuction(AUCTION_ID);

        // Score too high
        vm.prank(BUYER1);
        vm.expectRevert(ReputationSystem.InvalidQualityScore.selector);
        reputationSystem.submitQualityFeedback(
            BATCH_ID,
            AUCTION_ID,
            FARMER_ID,
            11,
            ""
        );

        // Score too low
        vm.prank(BUYER1);
        vm.expectRevert(ReputationSystem.InvalidQualityScore.selector);
        reputationSystem.submitQualityFeedback(
            BATCH_ID,
            AUCTION_ID,
            FARMER_ID,
            0,
            ""
        );
    }

    function test_RevertWhen_UnauthorizedFeedback() public {
        vm.prank(BUYER1);
        auctionManager.placeBid(AUCTION_ID, 13000e6);

        vm.warp(block.timestamp + 2 hours);
        auctionManager.closeAuction(AUCTION_ID);
        auctionManager.settleAuction(AUCTION_ID);

        // Different buyer tries to submit feedback
        vm.prank(BUYER2);
        vm.expectRevert(ReputationSystem.UnauthorizedFeedback.selector);
        reputationSystem.submitQualityFeedback(
            BATCH_ID,
            AUCTION_ID,
            FARMER_ID,
            8,
            ""
        );
    }

    function test_RevertWhen_FeedbackAlreadySubmitted() public {
        vm.prank(BUYER1);
        auctionManager.placeBid(AUCTION_ID, 13000e6);

        vm.warp(block.timestamp + 2 hours);
        auctionManager.closeAuction(AUCTION_ID);
        auctionManager.settleAuction(AUCTION_ID);

        vm.startPrank(BUYER1);
        reputationSystem.submitQualityFeedback(
            BATCH_ID,
            AUCTION_ID,
            FARMER_ID,
            9,
            "Good"
        );

        vm.expectRevert(ReputationSystem.FeedbackAlreadySubmitted.selector);
        reputationSystem.submitQualityFeedback(
            BATCH_ID,
            AUCTION_ID,
            FARMER_ID,
            8,
            "Actually not bad"
        );
        vm.stopPrank();
    }

    function test_AverageQualityScoreCalculation() public {
        // Create multiple batches and auctions
        bytes32[] memory batchIds = new bytes32[](3);
        bytes32[] memory auctionIds = new bytes32[](3);

        for (uint i = 0; i < 3; i++) {
            batchIds[i] = keccak256(abi.encodePacked("batch", i));
            auctionIds[i] = keccak256(abi.encodePacked("auction", i));

            batchRegistry.registerBatch(
                batchIds[i],
                uint64(block.timestamp),
                "maize",
                24000,
                8,
                FARMER_ID,
                "gbsuv7",
                "QmTest"
            );

            auctionManager.createAuction(
                auctionIds[i],
                batchIds[i],
                FARMER_ID,
                1 hours,
                10000e6,
                12000e6,
                "gbsuv7"
            );
        }

        // Record sales first
        reputationSystem.recordSale(FARMER_ID, BUYER1, auctionIds[0], 10000e6);
        reputationSystem.recordSale(FARMER_ID, BUYER1, auctionIds[1], 11000e6);
        reputationSystem.recordSale(FARMER_ID, BUYER1, auctionIds[2], 12000e6);

        // Submit feedback with different scores
        vm.startPrank(BUYER1);

        // Auction 0
        auctionManager.placeBid(auctionIds[0], 13000e6);
        vm.warp(block.timestamp + 2 hours);
        auctionManager.closeAuction(auctionIds[0]);
        auctionManager.settleAuction(auctionIds[0]);
        reputationSystem.submitQualityFeedback(
            batchIds[0],
            auctionIds[0],
            FARMER_ID,
            8,
            ""
        );

        // Auction 1
        vm.warp(block.timestamp - 2 hours); // Reset time
        auctionManager.placeBid(auctionIds[1], 13000e6);
        vm.warp(block.timestamp + 2 hours);
        auctionManager.closeAuction(auctionIds[1]);
        auctionManager.settleAuction(auctionIds[1]);
        reputationSystem.submitQualityFeedback(
            batchIds[1],
            auctionIds[1],
            FARMER_ID,
            9,
            ""
        );

        // Auction 2
        vm.warp(block.timestamp - 2 hours);
        auctionManager.placeBid(auctionIds[2], 13000e6);
        vm.warp(block.timestamp + 2 hours);
        auctionManager.closeAuction(auctionIds[2]);
        auctionManager.settleAuction(auctionIds[2]);
        reputationSystem.submitQualityFeedback(
            batchIds[2],
            auctionIds[2],
            FARMER_ID,
            10,
            ""
        );

        vm.stopPrank();

        ReputationSystem.FarmerReputation memory rep = reputationSystem
            .getFarmerReputation(FARMER_ID);

        // Average should be (8 + 9 + 10) / 3 = 9 (times 100 = 900)
        assertEq(rep.averageQualityScore, 900);
    }

    function test_VerifyFarmer() public {
        reputationSystem.registerFarmer(FARMER_ID);
        reputationSystem.verifyFarmer(FARMER_ID);

        ReputationSystem.FarmerReputation memory rep = reputationSystem
            .getFarmerReputation(FARMER_ID);
        assertTrue(rep.verified);
    }

    function test_VerifyBuyer() public {
        vm.prank(BUYER1);
        reputationSystem.registerBuyer();

        reputationSystem.verifyBuyer(BUYER1);

        ReputationSystem.BuyerReputation memory rep = reputationSystem
            .getBuyerReputation(BUYER1);
        assertTrue(rep.verified);
    }

    function test_CalculateFarmerScore() public {
        reputationSystem.registerFarmer(FARMER_ID);

        // Record sales and feedback
        for (uint i = 0; i < 10; i++) {
            reputationSystem.recordSale(
                FARMER_ID,
                BUYER1,
                keccak256(abi.encodePacked("auction", i)),
                10000e6
            );
        }

        // Set average quality score manually (9/10)
        ReputationSystem.FarmerReputation memory rep = reputationSystem
            .getFarmerReputation(FARMER_ID);

        // Verify farmer
        reputationSystem.verifyFarmer(FARMER_ID);

        uint256 score = reputationSystem.calculateFarmerScore(FARMER_ID);

        // Score should be > 0 (exact calculation depends on internal logic)
        assertGt(score, 0);
        assertLe(score, 100);
    }

    function test_CalculateBuyerScore() public {
        vm.prank(BUYER1);
        reputationSystem.registerBuyer();

        // Record purchases
        for (uint i = 0; i < 10; i++) {
            reputationSystem.recordSale(
                FARMER_ID,
                BUYER1,
                keccak256(abi.encodePacked("auction", i)),
                10000e6
            );
        }

        reputationSystem.verifyBuyer(BUYER1);

        uint256 score = reputationSystem.calculateBuyerScore(BUYER1);

        assertGt(score, 0);
        assertLe(score, 100);
    }
}
