// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/AuctionManager.sol";
import "../src/BatchRegistry.sol";

contract AuctionManagerTest is Test {
    AuctionManager public auctionManager;
    BatchRegistry public batchRegistry;

    bytes32 constant FARMER_ID = keccak256("farmer1");
    bytes32 constant BATCH_ID = keccak256("batch1");
    bytes32 constant AUCTION_ID = keccak256("auction1");

    address constant BIDDER1 = address(0x1);
    address constant BIDDER2 = address(0x2);
    address constant BIDDER3 = address(0x3);

    function setUp() public {
        batchRegistry = new BatchRegistry();
        auctionManager = new AuctionManager(address(batchRegistry));

        // Register a batch for testing
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
    }

    function test_CreateAuction() public {
        uint64 duration = 1 hours;
        uint256 startPrice = 10000e6; // 10,000 stablecoin
        uint256 reservePrice = 12000e6;

        auctionManager.createAuction(
            AUCTION_ID,
            BATCH_ID,
            FARMER_ID,
            duration,
            startPrice,
            reservePrice,
            "gbsuv7"
        );

        AuctionManager.Auction memory auction = auctionManager.getAuction(
            AUCTION_ID
        );

        assertEq(auction.auctionId, AUCTION_ID);
        assertEq(auction.batchId, BATCH_ID);
        assertEq(auction.farmerId, FARMER_ID);
        assertEq(auction.startingPrice, startPrice);
        assertEq(auction.reservePrice, reservePrice);
        assertEq(
            uint8(auction.status),
            uint8(AuctionManager.AuctionStatus.Open)
        );
        assertEq(auction.endTimestamp, uint64(block.timestamp) + duration);
    }

    function test_RevertWhen_AuctionAlreadyExists() public {
        auctionManager.createAuction(
            AUCTION_ID,
            BATCH_ID,
            FARMER_ID,
            1 hours,
            10000e6,
            12000e6,
            "gbsuv7"
        );

        vm.expectRevert(AuctionManager.AuctionAlreadyExists.selector);
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

    function test_RevertWhen_BatchNotRegistered() public {
        bytes32 fakeBatchId = keccak256("fake-batch");

        vm.expectRevert(AuctionManager.BatchNotRegistered.selector);
        auctionManager.createAuction(
            AUCTION_ID,
            fakeBatchId,
            FARMER_ID,
            1 hours,
            10000e6,
            12000e6,
            "gbsuv7"
        );
    }

    function test_RevertWhen_InvalidDuration() public {
        // Too short
        vm.expectRevert(AuctionManager.InvalidDuration.selector);
        auctionManager.createAuction(
            AUCTION_ID,
            BATCH_ID,
            FARMER_ID,
            5 minutes,
            10000e6,
            12000e6,
            "gbsuv7"
        );

        // Too long
        vm.expectRevert(AuctionManager.InvalidDuration.selector);
        auctionManager.createAuction(
            AUCTION_ID,
            BATCH_ID,
            FARMER_ID,
            8 days,
            10000e6,
            12000e6,
            "gbsuv7"
        );
    }

    function test_RevertWhen_InvalidPrice() public {
        // Reserve price < starting price
        vm.expectRevert(AuctionManager.InvalidPrice.selector);
        auctionManager.createAuction(
            AUCTION_ID,
            BATCH_ID,
            FARMER_ID,
            1 hours,
            12000e6,
            10000e6,
            "gbsuv7"
        );

        // Starting price == 0
        vm.expectRevert(AuctionManager.InvalidPrice.selector);
        auctionManager.createAuction(
            AUCTION_ID,
            BATCH_ID,
            FARMER_ID,
            1 hours,
            0,
            10000e6,
            "gbsuv7"
        );
    }

    function test_PlaceBid() public {
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

        // Place first bid
        vm.prank(BIDDER1);
        auctionManager.placeBid(AUCTION_ID, 10500e6);

        AuctionManager.Auction memory auction = auctionManager.getAuction(
            AUCTION_ID
        );
        assertEq(auction.highestBid, 10500e6);
        assertEq(auction.highestBidder, BIDDER1);
    }

    function test_PlaceMultipleBids() public {
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

        // Bidder 1
        vm.prank(BIDDER1);
        auctionManager.placeBid(AUCTION_ID, 10500e6);

        // Bidder 2 outbids
        vm.prank(BIDDER2);
        auctionManager.placeBid(AUCTION_ID, 11000e6);

        // Bidder 3 outbids
        vm.prank(BIDDER3);
        auctionManager.placeBid(AUCTION_ID, 11500e6);

        AuctionManager.Auction memory auction = auctionManager.getAuction(
            AUCTION_ID
        );
        assertEq(auction.highestBid, 11500e6);
        assertEq(auction.highestBidder, BIDDER3);

        // Check bid history
        AuctionManager.Bid[] memory bids = auctionManager.getAuctionBids(
            AUCTION_ID
        );
        assertEq(bids.length, 3);
        assertEq(bids[0].bidder, BIDDER1);
        assertEq(bids[1].bidder, BIDDER2);
        assertEq(bids[2].bidder, BIDDER3);
    }

    function test_RevertWhen_BidTooLow() public {
        auctionManager.createAuction(
            AUCTION_ID,
            BATCH_ID,
            FARMER_ID,
            1 hours,
            10000e6,
            12000e6,
            "gbsuv7"
        );

        // Bid below starting price
        vm.prank(BIDDER1);
        vm.expectRevert(AuctionManager.BidTooLow.selector);
        auctionManager.placeBid(AUCTION_ID, 9000e6);

        // Place valid bid
        vm.prank(BIDDER1);
        auctionManager.placeBid(AUCTION_ID, 10500e6);

        // Bid not enough increment above current (increment is 100 wei, this is only 50)
        vm.prank(BIDDER2);
        vm.expectRevert(AuctionManager.BidTooLow.selector);
        auctionManager.placeBid(AUCTION_ID, 10500e6 + 50); // Not enough increment
    }

    function test_RevertWhen_AuctionEnded() public {
        auctionManager.createAuction(
            AUCTION_ID,
            BATCH_ID,
            FARMER_ID,
            1 hours,
            10000e6,
            12000e6,
            "gbsuv7"
        );

        // Fast forward past auction end
        vm.warp(block.timestamp + 2 hours);

        vm.prank(BIDDER1);
        vm.expectRevert(AuctionManager.AuctionAlreadyEnded.selector);
        auctionManager.placeBid(AUCTION_ID, 10500e6);
    }

    function test_CloseAuction() public {
        auctionManager.createAuction(
            AUCTION_ID,
            BATCH_ID,
            FARMER_ID,
            1 hours,
            10000e6,
            12000e6,
            "gbsuv7"
        );

        // Place bid
        vm.prank(BIDDER1);
        auctionManager.placeBid(AUCTION_ID, 12500e6);

        // Fast forward past end
        vm.warp(block.timestamp + 2 hours);

        // Close auction
        auctionManager.closeAuction(AUCTION_ID);

        AuctionManager.Auction memory auction = auctionManager.getAuction(
            AUCTION_ID
        );
        assertEq(
            uint8(auction.status),
            uint8(AuctionManager.AuctionStatus.Closed)
        );
    }

    function test_RevertWhen_CloseAuctionNotEnded() public {
        auctionManager.createAuction(
            AUCTION_ID,
            BATCH_ID,
            FARMER_ID,
            1 hours,
            10000e6,
            12000e6,
            "gbsuv7"
        );

        vm.expectRevert(AuctionManager.AuctionNotEnded.selector);
        auctionManager.closeAuction(AUCTION_ID);
    }

    function test_SettleAuction() public {
        auctionManager.createAuction(
            AUCTION_ID,
            BATCH_ID,
            FARMER_ID,
            1 hours,
            10000e6,
            12000e6,
            "gbsuv7"
        );

        // Place bid above reserve
        vm.prank(BIDDER1);
        auctionManager.placeBid(AUCTION_ID, 13000e6);

        // Close auction
        vm.warp(block.timestamp + 2 hours);
        auctionManager.closeAuction(AUCTION_ID);

        // Settle
        auctionManager.settleAuction(AUCTION_ID);

        AuctionManager.Auction memory auction = auctionManager.getAuction(
            AUCTION_ID
        );
        assertEq(
            uint8(auction.status),
            uint8(AuctionManager.AuctionStatus.Settled)
        );
    }

    function test_CancelAuction() public {
        auctionManager.createAuction(
            AUCTION_ID,
            BATCH_ID,
            FARMER_ID,
            1 hours,
            10000e6,
            12000e6,
            "gbsuv7"
        );

        // Cancel auction with no bids
        auctionManager.cancelAuction(AUCTION_ID);

        AuctionManager.Auction memory auction = auctionManager.getAuction(
            AUCTION_ID
        );
        assertEq(
            uint8(auction.status),
            uint8(AuctionManager.AuctionStatus.Cancelled)
        );
    }

    function test_RevertWhen_CancelAuctionWithBids() public {
        auctionManager.createAuction(
            AUCTION_ID,
            BATCH_ID,
            FARMER_ID,
            1 hours,
            10000e6,
            12000e6,
            "gbsuv7"
        );

        // Place bid
        vm.prank(BIDDER1);
        auctionManager.placeBid(AUCTION_ID, 10500e6);

        // Cannot cancel with existing bids
        vm.expectRevert(AuctionManager.NoWinningBid.selector);
        auctionManager.cancelAuction(AUCTION_ID);
    }

    function test_IsAuctionActive() public {
        auctionManager.createAuction(
            AUCTION_ID,
            BATCH_ID,
            FARMER_ID,
            1 hours,
            10000e6,
            12000e6,
            "gbsuv7"
        );

        assertTrue(auctionManager.isAuctionActive(AUCTION_ID));

        // After end time
        vm.warp(block.timestamp + 2 hours);
        assertFalse(auctionManager.isAuctionActive(AUCTION_ID));
    }

    function test_GetBuyerAuctions() public {
        bytes32 auction1 = keccak256("auction1");
        bytes32 auction2 = keccak256("auction2");

        // Create auctions
        auctionManager.createAuction(
            auction1,
            BATCH_ID,
            FARMER_ID,
            1 hours,
            10000e6,
            12000e6,
            "gbsuv7"
        );

        bytes32 batch2 = keccak256("batch2");
        batchRegistry.registerBatch(
            batch2,
            uint64(block.timestamp),
            "cocoa",
            15000,
            9,
            FARMER_ID,
            "gbsuv7",
            "QmTest2"
        );
        auctionManager.createAuction(
            auction2,
            batch2,
            FARMER_ID,
            1 hours,
            15000e6,
            18000e6,
            "gbsuv7"
        );

        // Bidder participates in both
        vm.startPrank(BIDDER1);
        auctionManager.placeBid(auction1, 10500e6);
        auctionManager.placeBid(auction2, 15500e6);
        vm.stopPrank();

        bytes32[] memory buyerAuctions = auctionManager.getBuyerAuctions(
            BIDDER1
        );
        assertEq(buyerAuctions.length, 2);
    }
}
