// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/EscrowManager.sol";
import "../src/AuctionManager.sol";
import "../src/BatchRegistry.sol";
import "../src/mocks/MockStablecoin.sol";

contract EscrowManagerTest is Test {
    EscrowManager public escrowManager;
    AuctionManager public auctionManager;
    BatchRegistry public batchRegistry;
    MockStablecoin public stablecoin;

    address public feeCollector = address(0x999);

    bytes32 constant FARMER_ID = keccak256("farmer1");
    bytes32 constant BATCH_ID = keccak256("batch1");
    bytes32 constant AUCTION_ID = keccak256("auction1");

    address constant BUYER = address(0x1);
    address constant FARMER = address(0x2);

    function setUp() public {
        // Deploy contracts
        stablecoin = new MockStablecoin();
        batchRegistry = new BatchRegistry();
        auctionManager = new AuctionManager(address(batchRegistry));
        escrowManager = new EscrowManager(
            address(stablecoin),
            address(auctionManager),
            feeCollector
        );

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

        // Mint tokens to buyer
        stablecoin.mint(BUYER, 100000e6);
    }

    function test_LockFunds() public {
        uint256 bidAmount = 15000e6;

        // Buyer approves escrow
        vm.startPrank(BUYER);
        stablecoin.approve(address(escrowManager), bidAmount);

        // Lock funds
        escrowManager.lockFunds(AUCTION_ID, bidAmount);
        vm.stopPrank();

        // Verify escrow
        EscrowManager.Escrow memory escrow = escrowManager.getEscrow(
            AUCTION_ID
        );
        assertEq(escrow.auctionId, AUCTION_ID);
        assertEq(escrow.buyer, BUYER);
        assertEq(escrow.amount, bidAmount);
        assertFalse(escrow.released);
        assertFalse(escrow.refunded);

        // Verify balances
        assertEq(stablecoin.balanceOf(address(escrowManager)), bidAmount);
        assertEq(escrowManager.getBuyerLockedBalance(BUYER), bidAmount);
        assertTrue(escrowManager.isLocked(AUCTION_ID));
    }

    function test_RevertWhen_InsufficientBalance() public {
        address poorBuyer = address(0x3);
        uint256 bidAmount = 15000e6;

        vm.prank(poorBuyer);
        vm.expectRevert(EscrowManager.InsufficientBalance.selector);
        escrowManager.lockFunds(AUCTION_ID, bidAmount);
    }

    function test_RevertWhen_InsufficientAllowance() public {
        uint256 bidAmount = 15000e6;

        // No approval
        vm.prank(BUYER);
        vm.expectRevert(EscrowManager.InsufficientAllowance.selector);
        escrowManager.lockFunds(AUCTION_ID, bidAmount);
    }

    function test_ReleaseFunds() public {
        uint256 bidAmount = 15000e6;

        // Lock funds
        vm.startPrank(BUYER);
        stablecoin.approve(address(escrowManager), bidAmount);
        escrowManager.lockFunds(AUCTION_ID, bidAmount);
        vm.stopPrank();

        // Place bid and close auction
        vm.prank(BUYER);
        auctionManager.placeBid(AUCTION_ID, bidAmount);

        vm.warp(block.timestamp + 2 hours);
        auctionManager.closeAuction(AUCTION_ID);
        auctionManager.settleAuction(AUCTION_ID);

        // Release funds
        uint256 farmerBalanceBefore = stablecoin.balanceOf(FARMER);
        uint256 feeCollectorBalanceBefore = stablecoin.balanceOf(feeCollector);

        escrowManager.releaseFunds(AUCTION_ID, FARMER);

        // Calculate expected amounts (2% fee)
        uint256 expectedFee = (bidAmount * 200) / 10000;
        uint256 expectedFarmerAmount = bidAmount - expectedFee;

        assertEq(
            stablecoin.balanceOf(FARMER),
            farmerBalanceBefore + expectedFarmerAmount
        );
        assertEq(
            stablecoin.balanceOf(feeCollector),
            feeCollectorBalanceBefore + expectedFee
        );

        // Verify escrow state
        EscrowManager.Escrow memory escrow = escrowManager.getEscrow(
            AUCTION_ID
        );
        assertTrue(escrow.released);
        assertEq(escrow.farmer, FARMER);
        assertEq(escrowManager.getBuyerLockedBalance(BUYER), 0);
        assertFalse(escrowManager.isLocked(AUCTION_ID));
    }

    function test_RevertWhen_AuctionNotSettled() public {
        uint256 bidAmount = 15000e6;

        vm.startPrank(BUYER);
        stablecoin.approve(address(escrowManager), bidAmount);
        escrowManager.lockFunds(AUCTION_ID, bidAmount);
        vm.stopPrank();

        // Try to release before settlement
        vm.expectRevert(EscrowManager.AuctionNotSettled.selector);
        escrowManager.releaseFunds(AUCTION_ID, FARMER);
    }

    function test_RefundFunds_CancelledAuction() public {
        uint256 bidAmount = 15000e6;

        // Lock funds
        vm.startPrank(BUYER);
        stablecoin.approve(address(escrowManager), bidAmount);
        escrowManager.lockFunds(AUCTION_ID, bidAmount);
        vm.stopPrank();

        // Cancel auction (no bids placed)
        auctionManager.cancelAuction(AUCTION_ID);

        // Refund
        uint256 buyerBalanceBefore = stablecoin.balanceOf(BUYER);
        escrowManager.refundFunds(AUCTION_ID);

        assertEq(stablecoin.balanceOf(BUYER), buyerBalanceBefore + bidAmount);

        EscrowManager.Escrow memory escrow = escrowManager.getEscrow(
            AUCTION_ID
        );
        assertTrue(escrow.refunded);
        assertFalse(escrow.released);
    }

    function test_RefundFunds_LosingBidder() public {
        // Create a second auction for the losing bidder
        bytes32 batch2 = keccak256("batch2");
        bytes32 auction2 = keccak256("auction2");

        batchRegistry.registerBatch(
            batch2,
            uint64(block.timestamp),
            "cocoa",
            15000,
            7,
            FARMER_ID,
            "gbsuv7",
            "QmTest2"
        );

        auctionManager.createAuction(
            auction2,
            batch2,
            FARMER_ID,
            1 hours,
            10000e6,
            12000e6,
            "gbsuv7"
        );

        uint256 bid1 = 11000e6;
        address loser = address(0x4);
        stablecoin.mint(loser, 100000e6);

        // Loser locks funds and bids
        vm.startPrank(loser);
        stablecoin.approve(address(escrowManager), bid1);
        escrowManager.lockFunds(auction2, bid1);
        auctionManager.placeBid(auction2, bid1);
        vm.stopPrank();

        // Winner outbids on same auction
        uint256 bid2 = 13000e6;
        vm.startPrank(BUYER);
        stablecoin.approve(address(escrowManager), bid2);
        auctionManager.placeBid(auction2, bid2);
        vm.stopPrank();

        // Close auction
        vm.warp(block.timestamp + 2 hours);
        auctionManager.closeAuction(auction2);

        // Loser can refund (didn't win)
        uint256 loserBalanceBefore = stablecoin.balanceOf(loser);
        escrowManager.refundFunds(auction2);

        assertEq(stablecoin.balanceOf(loser), loserBalanceBefore + bid1);
    }

    function test_UpdatePlatformFee() public {
        uint256 newFee = 300; // 3%

        vm.prank(feeCollector);
        escrowManager.updatePlatformFee(newFee);

        assertEq(escrowManager.platformFee(), newFee);
    }

    function test_RevertWhen_InvalidFee() public {
        vm.prank(feeCollector);
        vm.expectRevert(EscrowManager.InvalidFee.selector);
        escrowManager.updatePlatformFee(1001); // > 10%
    }

    function test_RevertWhen_UnauthorizedFeeUpdate() public {
        vm.prank(BUYER);
        vm.expectRevert(EscrowManager.UnauthorizedCaller.selector);
        escrowManager.updatePlatformFee(300);
    }

    function test_UpdateFeeCollector() public {
        address newCollector = address(0x888);

        vm.prank(feeCollector);
        escrowManager.updateFeeCollector(newCollector);

        assertEq(escrowManager.feeCollector(), newCollector);
    }
}
