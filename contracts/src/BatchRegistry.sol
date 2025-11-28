// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/**
 * @title BatchRegistry
 * @notice Immutable on-chain registry for agricultural produce batches
 * @dev Stores verifiable provenance data for each harvest batch
 */
contract BatchRegistry {
    // ============ Structs ============

    struct Batch {
        bytes32 batchId;
        uint64 harvestTimestamp;
        string cropType;
        uint32 weightKg; // Weight in grams (e.g., 24000 = 24kg)
        uint8 qualityGrade; // 1-10 scale
        bytes32 farmerId;
        string locationHash; // Geohash or region identifier
        string mediaCid; // IPFS CID for photos
        bytes32 labTestCidHash; // Optional lab certificate hash
        bool exists;
    }

    // ============ State Variables ============

    mapping(bytes32 => Batch) public batches;
    mapping(bytes32 => bytes32[]) public farmerBatches; // farmerId => batchIds

    bytes32[] public allBatchIds; // Track all batch IDs

    uint256 public totalBatches;

    // ============ Events ============

    event BatchRegistered(
        bytes32 indexed batchId,
        bytes32 indexed farmerId,
        string cropType,
        uint32 weightKg,
        uint8 qualityGrade,
        uint64 harvestTimestamp
    );

    event BatchMediaUpdated(bytes32 indexed batchId, string mediaCid);

    event LabTestAdded(bytes32 indexed batchId, bytes32 labTestCidHash);

    // ============ Errors ============

    error BatchAlreadyExists();
    error BatchDoesNotExist();
    error InvalidQualityGrade();
    error InvalidWeight();
    error UnauthorizedFarmer();
    error EmptyCropType();

    // ============ Functions ============

    /**
     * @notice Register a new produce batch
     * @param batchId Unique identifier for the batch
     * @param harvestTimestamp Unix timestamp of harvest
     * @param cropType Type of crop (e.g., "maize", "cocoa")
     * @param weightKg Weight in grams
     * @param qualityGrade Quality grade (1-10)
     * @param farmerId Unique farmer identifier
     * @param locationHash Geohash of farm location
     * @param mediaCid IPFS CID for batch photos
     */
    function registerBatch(
        bytes32 batchId,
        uint64 harvestTimestamp,
        string calldata cropType,
        uint32 weightKg,
        uint8 qualityGrade,
        bytes32 farmerId,
        string calldata locationHash,
        string calldata mediaCid
    ) external {
        if (batches[batchId].exists) revert BatchAlreadyExists();
        if (qualityGrade == 0 || qualityGrade > 10)
            revert InvalidQualityGrade();
        if (weightKg == 0) revert InvalidWeight();
        if (bytes(cropType).length == 0) revert EmptyCropType();

        Batch memory newBatch = Batch({
            batchId: batchId,
            harvestTimestamp: harvestTimestamp,
            cropType: cropType,
            weightKg: weightKg,
            qualityGrade: qualityGrade,
            farmerId: farmerId,
            locationHash: locationHash,
            mediaCid: mediaCid,
            labTestCidHash: bytes32(0),
            exists: true
        });

        batches[batchId] = newBatch;
        farmerBatches[farmerId].push(batchId);
        allBatchIds.push(batchId);
        totalBatches++;

        emit BatchRegistered(
            batchId,
            farmerId,
            cropType,
            weightKg,
            qualityGrade,
            harvestTimestamp
        );
    }

    /**
     * @notice Update batch media CID (in case of additional photos)
     * @param batchId The batch to update
     * @param newMediaCid New IPFS CID
     */
    function updateBatchMedia(
        bytes32 batchId,
        string calldata newMediaCid
    ) external {
        if (!batches[batchId].exists) revert BatchDoesNotExist();

        batches[batchId].mediaCid = newMediaCid;

        emit BatchMediaUpdated(batchId, newMediaCid);
    }

    /**
     * @notice Add lab test certificate to batch
     * @param batchId The batch to update
     * @param labTestCidHash Hash of lab test certificate
     */
    function addLabTest(bytes32 batchId, bytes32 labTestCidHash) external {
        if (!batches[batchId].exists) revert BatchDoesNotExist();

        batches[batchId].labTestCidHash = labTestCidHash;

        emit LabTestAdded(batchId, labTestCidHash);
    }

    /**
     * @notice Get batch details
     * @param batchId The batch to query
     * @return Batch struct
     */
    function getBatch(bytes32 batchId) external view returns (Batch memory) {
        if (!batches[batchId].exists) revert BatchDoesNotExist();
        return batches[batchId];
    }

    /**
     * @notice Get all batches for a farmer
     * @param farmerId The farmer to query
     * @return Array of batch IDs
     */
    function getFarmerBatches(
        bytes32 farmerId
    ) external view returns (bytes32[] memory) {
        return farmerBatches[farmerId];
    }

    /**
     * @notice Verify batch exists
     * @param batchId The batch to check
     * @return true if exists
     */
    function batchExists(bytes32 batchId) external view returns (bool) {
        return batches[batchId].exists;
    }

    /**
     * @notice Get all batch IDs
     * @return Array of all batch IDs
     */
    function getAllBatchIds() external view returns (bytes32[] memory) {
        return allBatchIds;
    }

    /**
     * @notice Get all batches (full data)
     * @return Array of all Batch structs
     */
    function getAllBatches() external view returns (Batch[] memory) {
        Batch[] memory result = new Batch[](allBatchIds.length);

        for (uint256 i = 0; i < allBatchIds.length; i++) {
            result[i] = batches[allBatchIds[i]];
        }

        return result;
    }

    /**
     * @notice Get paginated batches
     * @param offset Starting index
     * @param limit Number of batches to return
     * @return Array of Batch structs
     */
    function getBatchesPaginated(
        uint256 offset,
        uint256 limit
    ) external view returns (Batch[] memory) {
        if (offset >= allBatchIds.length) {
            return new Batch[](0);
        }

        uint256 end = offset + limit;
        if (end > allBatchIds.length) {
            end = allBatchIds.length;
        }

        uint256 resultLength = end - offset;
        Batch[] memory result = new Batch[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = batches[allBatchIds[offset + i]];
        }

        return result;
    }
}
