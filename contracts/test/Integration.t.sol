// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/BatchRegistry.sol";
import "../src/AuctionManager.sol";
import "../src/EscrowManager.sol";
import "../src/ReputationSystem.sol";
import "../src/mocks/MockStablecoin.sol";

/**
 * @title IntegrationTest
 * @notice End-to-end integration test for the full platform
 */
contract IntegrationTest is Test {
    BatchRegistry public batchRegistry;
    AuctionManager public auctionManager;
    EscrowManager public escrowManager;
    ReputationSystem public reputationSystem;
    MockStablecoin public stablecoin;

    address public feeCollector = address(0x999);
    address public farmer = address(0x1);
    address public buyer1 = address(0x2);
    address public buyer2 = address(0x3);

    bytes32 constant FARMER_ID = keccak256("farmer1");

    function setUp() public {
        // Deploy all contracts
        stablecoin = new MockStablecoin();
        batchRegistry = new BatchRegistry();
        auctionManager = new AuctionManager(address(batchRegistry));
        escrowManager = new EscrowManager(
            address(stablecoin),
            address(auctionManager),
            feeCollector
        );
        reputationSystem = new ReputationSystem(address(auctionManager));

        // Setup test accounts
        vm.label(farmer, "Farmer");
        vm.label(buyer1, "Buyer1");
        vm.label(buyer2, "Buyer2");
        vm.label(feeCollector, "FeeCollector");

        // Mint stablecoins to buyers
        stablecoin.mint(buyer1, 1000000e6); // 1M USDC
        stablecoin.mint(buyer2, 1000000e6);
    }

    function test_CompleteAuctionFlow() public {
        // ========== PHASE 1: Farmer registers batch ==========
        bytes32 batchId = keccak256("maize-batch-001");

        vm.prank(farmer);
        batchRegistry.registerBatch(
            batchId,
            uint64(block.timestamp),
            "maize",
            24000, // 24kg
            8,
            FARMER_ID,
            "gbsuv7zw",
            "QmPhotoHash123"
        );

        console.log("[OK] Batch registered");

        // ========== PHASE 2: Farmer creates auction ==========
        bytes32 auctionId = keccak256("auction-001");
        uint256 startingPrice = 10000e6; // 10,000 USDC
        uint256 reservePrice = 12000e6; // 12,000 USDC

        vm.prank(farmer);
        auctionManager.createAuction(
            auctionId,
            batchId,
            FARMER_ID,
            1 hours,
            startingPrice,
            reservePrice,
            "gbsuv7zw"
        );

        console.log("[OK] Auction created");

        // ========== PHASE 3: Buyers place competitive bids ==========

        // Buyer 1 places first bid
        vm.prank(buyer1);
        auctionManager.placeBid(auctionId, 11000e6);
        console.log("[OK] Buyer1 bid: 11,000 USDC");

        // Buyer 2 outbids
        vm.prank(buyer2);
        auctionManager.placeBid(auctionId, 12500e6);
        console.log("[OK] Buyer2 bid: 12,500 USDC");

        // Buyer 1 counter-bids
        vm.prank(buyer1);
        auctionManager.placeBid(auctionId, 13000e6);
        console.log("[OK] Buyer1 bid: 13,000 USDC");

        // Buyer 2 makes final bid
        vm.prank(buyer2);
        auctionManager.placeBid(auctionId, 14000e6);
        console.log("[OK] Buyer2 bid: 14,000 USDC (winning)");

        // Verify winning bid
        AuctionManager.Auction memory auction = auctionManager.getAuction(
            auctionId
        );
        assertEq(auction.highestBid, 14000e6);
        assertEq(auction.highestBidder, buyer2);

        // ========== PHASE 4: Winner locks funds in escrow ==========
        uint256 winningBid = 14000e6;

        vm.startPrank(buyer2);
        stablecoin.approve(address(escrowManager), winningBid);
        escrowManager.lockFunds(auctionId, winningBid);
        vm.stopPrank();

        console.log("[OK] Funds locked in escrow");

        assertEq(stablecoin.balanceOf(address(escrowManager)), winningBid);

        // ========== PHASE 5: Auction ends and closes ==========
        vm.warp(block.timestamp + 2 hours); // Fast forward past auction end

        auctionManager.closeAuction(auctionId);
        console.log("[OK] Auction closed");

        // ========== PHASE 6: Auction settled ==========
        auctionManager.settleAuction(auctionId);
        console.log("[OK] Auction settled");

        // ========== PHASE 7: Funds released to farmer ==========
        uint256 farmerBalanceBefore = stablecoin.balanceOf(farmer);
        uint256 feeCollectorBalanceBefore = stablecoin.balanceOf(feeCollector);

        escrowManager.releaseFunds(auctionId, farmer);
        console.log("[OK] Funds released to farmer");

        // Verify payments
        uint256 platformFee = (winningBid * 200) / 10000; // 2%
        uint256 farmerPayout = winningBid - platformFee;

        assertEq(
            stablecoin.balanceOf(farmer),
            farmerBalanceBefore + farmerPayout
        );
        assertEq(
            stablecoin.balanceOf(feeCollector),
            feeCollectorBalanceBefore + platformFee
        );

        console.log("  Farmer received:", farmerPayout / 1e6, "USDC");
        console.log("  Platform fee:", platformFee / 1e6, "USDC");

        // ========== PHASE 8: Record sale in reputation system ==========
        reputationSystem.recordSale(FARMER_ID, buyer2, auctionId, winningBid);
        console.log("[OK] Sale recorded");

        ReputationSystem.FarmerReputation memory farmerRep = reputationSystem
            .getFarmerReputation(FARMER_ID);
        assertEq(farmerRep.totalSales, 1);
        assertEq(farmerRep.totalRevenue, winningBid);

        ReputationSystem.BuyerReputation memory buyerRep = reputationSystem
            .getBuyerReputation(buyer2);
        assertEq(buyerRep.totalPurchases, 1);
        assertEq(buyerRep.totalSpent, winningBid);

        // ========== PHASE 9: Buyer submits quality feedback ==========
        vm.prank(buyer2);
        reputationSystem.submitQualityFeedback(
            batchId,
            auctionId,
            FARMER_ID,
            9,
            "Excellent quality maize, well packaged"
        );
        console.log("[OK] Quality feedback submitted");

        ReputationSystem.QualityFeedback[] memory feedback = reputationSystem
            .getBatchFeedback(batchId);
        assertEq(feedback.length, 1);
        assertEq(feedback[0].qualityScore, 9);

        // ========== VERIFICATION ==========
        console.log("\n=== Final State ===");
        console.log("Batch exists:", batchRegistry.batchExists(batchId));
        console.log(
            "Auction settled:",
            uint8(auctionManager.getAuction(auctionId).status) == 2
        );
        console.log(
            "Escrow released:",
            escrowManager.getEscrow(auctionId).released
        );
        console.log(
            "Farmer reputation score:",
            reputationSystem.calculateFarmerScore(FARMER_ID)
        );
        console.log(
            "Buyer reputation score:",
            reputationSystem.calculateBuyerScore(buyer2)
        );
    }

    function test_MultipleAuctionsWithDifferentOutcomes() public {
        // Create 3 batches and auctions
        for (uint i = 0; i < 3; i++) {
            bytes32 batchId = keccak256(abi.encodePacked("batch", i));
            bytes32 auctionId = keccak256(abi.encodePacked("auction", i));

            // Register batch
            batchRegistry.registerBatch(
                batchId,
                uint64(block.timestamp),
                i == 0
                    ? "maize"
                    : i == 1
                        ? "cocoa"
                        : "cassava",
                20000 + uint32(i * 5000),
                7 + uint8(i),
                FARMER_ID,
                "gbsuv7",
                string(abi.encodePacked("QmPhoto", i))
            );

            // Create auction
            auctionManager.createAuction(
                auctionId,
                batchId,
                FARMER_ID,
                1 hours,
                10000e6 + (i * 2000e6),
                12000e6 + (i * 2000e6),
                "gbsuv7"
            );

            // Place winning bid
            vm.prank(buyer1);
            auctionManager.placeBid(auctionId, 13000e6 + (i * 2000e6));

            // Lock funds
            vm.startPrank(buyer1);
            stablecoin.approve(address(escrowManager), 13000e6 + (i * 2000e6));
            escrowManager.lockFunds(auctionId, 13000e6 + (i * 2000e6));
            vm.stopPrank();

            // Close and settle
            vm.warp(block.timestamp + 2 hours);
            auctionManager.closeAuction(auctionId);
            auctionManager.settleAuction(auctionId);

            // Release funds
            escrowManager.releaseFunds(auctionId, farmer);

            // Record sale
            reputationSystem.recordSale(
                FARMER_ID,
                buyer1,
                auctionId,
                13000e6 + (i * 2000e6)
            );

            // Reset time for next auction
            if (i < 2) vm.warp(block.timestamp - 2 hours);
        }

        // Verify farmer stats
        ReputationSystem.FarmerReputation memory rep = reputationSystem
            .getFarmerReputation(FARMER_ID);
        assertEq(rep.totalSales, 3);
        assertGt(rep.totalRevenue, 0);

        console.log("[OK] Completed 3 auctions");
        console.log("  Total sales:", rep.totalSales);
        console.log("  Total revenue:", rep.totalRevenue / 1e6, "USDC");
    }

    function test_RefundScenario() public {
        bytes32 batchId = keccak256("batch-refund");
        bytes32 auctionId = keccak256("auction-refund");

        // Register and create auction
        batchRegistry.registerBatch(
            batchId,
            uint64(block.timestamp),
            "maize",
            20000,
            7,
            FARMER_ID,
            "gbsuv7",
            "QmPhoto"
        );

        auctionManager.createAuction(
            auctionId,
            batchId,
            FARMER_ID,
            1 hours,
            10000e6,
            15000e6, // High reserve price
            "gbsuv7"
        );

        // Buyer places bid below reserve
        vm.prank(buyer1);
        auctionManager.placeBid(auctionId, 12000e6);

        // Lock funds
        vm.startPrank(buyer1);
        stablecoin.approve(address(escrowManager), 12000e6);
        escrowManager.lockFunds(auctionId, 12000e6);
        vm.stopPrank();

        uint256 buyerBalanceBefore = stablecoin.balanceOf(buyer1);

        // Auction ends but reserve not met
        vm.warp(block.timestamp + 2 hours);
        auctionManager.closeAuction(auctionId);

        // Buyer gets refund (reserve price not met)
        escrowManager.refundFunds(auctionId);

        assertEq(stablecoin.balanceOf(buyer1), buyerBalanceBefore + 12000e6);

        console.log("[OK] Refund processed successfully");
    }
}
