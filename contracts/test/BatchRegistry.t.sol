// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/BatchRegistry.sol";

contract BatchRegistryTest is Test {
    BatchRegistry public registry;

    bytes32 constant FARMER_ID = keccak256("farmer1");
    bytes32 constant BATCH_ID = keccak256("batch1");

    function setUp() public {
        registry = new BatchRegistry();
    }

    function test_RegisterBatch() public {
        uint64 harvestTime = uint64(block.timestamp);

        registry.registerBatch(
            BATCH_ID,
            harvestTime,
            "maize",
            24000, // 24kg
            8, // quality grade
            FARMER_ID,
            "gbsuv7", // geohash
            "QmTest123" // IPFS CID
        );

        BatchRegistry.Batch memory batch = registry.getBatch(BATCH_ID);

        assertEq(batch.batchId, BATCH_ID);
        assertEq(batch.cropType, "maize");
        assertEq(batch.weightKg, 24000);
        assertEq(batch.qualityGrade, 8);
        assertEq(batch.farmerId, FARMER_ID);
        assertEq(batch.harvestTimestamp, harvestTime);
        assertTrue(batch.exists);
    }

    function test_RevertWhen_BatchAlreadyExists() public {
        uint64 harvestTime = uint64(block.timestamp);

        registry.registerBatch(
            BATCH_ID,
            harvestTime,
            "maize",
            24000,
            8,
            FARMER_ID,
            "gbsuv7",
            "QmTest123"
        );

        vm.expectRevert(BatchRegistry.BatchAlreadyExists.selector);
        registry.registerBatch(
            BATCH_ID,
            harvestTime,
            "cocoa",
            10000,
            7,
            FARMER_ID,
            "gbsuv7",
            "QmTest456"
        );
    }

    function test_RevertWhen_InvalidQualityGrade() public {
        vm.expectRevert(BatchRegistry.InvalidQualityGrade.selector);
        registry.registerBatch(
            BATCH_ID,
            uint64(block.timestamp),
            "maize",
            24000,
            11, // Invalid: > 10
            FARMER_ID,
            "gbsuv7",
            "QmTest123"
        );

        vm.expectRevert(BatchRegistry.InvalidQualityGrade.selector);
        registry.registerBatch(
            BATCH_ID,
            uint64(block.timestamp),
            "maize",
            24000,
            0, // Invalid: == 0
            FARMER_ID,
            "gbsuv7",
            "QmTest123"
        );
    }

    function test_RevertWhen_InvalidWeight() public {
        vm.expectRevert(BatchRegistry.InvalidWeight.selector);
        registry.registerBatch(
            BATCH_ID,
            uint64(block.timestamp),
            "maize",
            0, // Invalid weight
            8,
            FARMER_ID,
            "gbsuv7",
            "QmTest123"
        );
    }

    function test_RevertWhen_EmptyCropType() public {
        vm.expectRevert(BatchRegistry.EmptyCropType.selector);
        registry.registerBatch(
            BATCH_ID,
            uint64(block.timestamp),
            "", // Empty crop type
            24000,
            8,
            FARMER_ID,
            "gbsuv7",
            "QmTest123"
        );
    }

    function test_UpdateBatchMedia() public {
        // Register batch first
        registry.registerBatch(
            BATCH_ID,
            uint64(block.timestamp),
            "maize",
            24000,
            8,
            FARMER_ID,
            "gbsuv7",
            "QmTest123"
        );

        // Update media
        string memory newCid = "QmNewMedia456";
        registry.updateBatchMedia(BATCH_ID, newCid);

        BatchRegistry.Batch memory batch = registry.getBatch(BATCH_ID);
        assertEq(batch.mediaCid, newCid);
    }

    function test_AddLabTest() public {
        // Register batch first
        registry.registerBatch(
            BATCH_ID,
            uint64(block.timestamp),
            "maize",
            24000,
            8,
            FARMER_ID,
            "gbsuv7",
            "QmTest123"
        );

        // Add lab test
        bytes32 labHash = keccak256("lab-cert-hash");
        registry.addLabTest(BATCH_ID, labHash);

        BatchRegistry.Batch memory batch = registry.getBatch(BATCH_ID);
        assertEq(batch.labTestCidHash, labHash);
    }

    function test_GetFarmerBatches() public {
        bytes32 batch1 = keccak256("batch1");
        bytes32 batch2 = keccak256("batch2");
        bytes32 batch3 = keccak256("batch3");

        // Register multiple batches for same farmer
        registry.registerBatch(
            batch1,
            uint64(block.timestamp),
            "maize",
            10000,
            8,
            FARMER_ID,
            "gbsuv7",
            "QmTest1"
        );
        registry.registerBatch(
            batch2,
            uint64(block.timestamp),
            "cocoa",
            15000,
            9,
            FARMER_ID,
            "gbsuv7",
            "QmTest2"
        );
        registry.registerBatch(
            batch3,
            uint64(block.timestamp),
            "cassava",
            20000,
            7,
            FARMER_ID,
            "gbsuv7",
            "QmTest3"
        );

        bytes32[] memory farmerBatches = registry.getFarmerBatches(FARMER_ID);
        assertEq(farmerBatches.length, 3);
        assertEq(farmerBatches[0], batch1);
        assertEq(farmerBatches[1], batch2);
        assertEq(farmerBatches[2], batch3);
    }

    function test_BatchExists() public {
        assertFalse(registry.batchExists(BATCH_ID));

        registry.registerBatch(
            BATCH_ID,
            uint64(block.timestamp),
            "maize",
            24000,
            8,
            FARMER_ID,
            "gbsuv7",
            "QmTest123"
        );

        assertTrue(registry.batchExists(BATCH_ID));
    }

    function test_TotalBatches() public {
        assertEq(registry.totalBatches(), 0);

        registry.registerBatch(
            keccak256("batch1"),
            uint64(block.timestamp),
            "maize",
            24000,
            8,
            FARMER_ID,
            "gbsuv7",
            "QmTest1"
        );
        assertEq(registry.totalBatches(), 1);

        registry.registerBatch(
            keccak256("batch2"),
            uint64(block.timestamp),
            "cocoa",
            15000,
            9,
            FARMER_ID,
            "gbsuv7",
            "QmTest2"
        );
        assertEq(registry.totalBatches(), 2);
    }
}
