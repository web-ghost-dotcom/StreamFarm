// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/BatchRegistry.sol";
import "../src/AuctionManager.sol";
import "../src/EscrowManager.sol";
import "../src/ReputationSystem.sol";
import "../src/mocks/MockStablecoin.sol";

/**
 * @title DeployAgroDataStreams
 * @notice Deployment script for the Agro Data Streams platform
 */
contract DeployAgroDataStreams is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address feeCollector = vm.envAddress("FEE_COLLECTOR");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy MockStablecoin (for testnet only)
        // In production, use existing stablecoin address
        MockStablecoin stablecoin = new MockStablecoin();
        console.log("MockStablecoin deployed at:", address(stablecoin));

        // 2. Deploy BatchRegistry
        BatchRegistry batchRegistry = new BatchRegistry();
        console.log("BatchRegistry deployed at:", address(batchRegistry));

        // 3. Deploy AuctionManager
        AuctionManager auctionManager = new AuctionManager(
            address(batchRegistry)
        );
        console.log("AuctionManager deployed at:", address(auctionManager));

        // 4. Deploy EscrowManager
        EscrowManager escrowManager = new EscrowManager(
            address(stablecoin),
            address(auctionManager),
            feeCollector
        );
        console.log("EscrowManager deployed at:", address(escrowManager));

        // 5. Deploy ReputationSystem
        ReputationSystem reputationSystem = new ReputationSystem(
            address(auctionManager)
        );
        console.log("ReputationSystem deployed at:", address(reputationSystem));

        vm.stopBroadcast();

        // Save deployment addresses
        console.log("\n=== Deployment Summary ===");
        console.log("Stablecoin:", address(stablecoin));
        console.log("BatchRegistry:", address(batchRegistry));
        console.log("AuctionManager:", address(auctionManager));
        console.log("EscrowManager:", address(escrowManager));
        console.log("ReputationSystem:", address(reputationSystem));
        console.log("Fee Collector:", feeCollector);
    }
}
