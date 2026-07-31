const hre = require("hardhat");

async function main() {
  console.log("=================================================");
  console.log("🚀 Deploying ACPEscrow to Base Sepolia Testnet");
  console.log("=================================================");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contract with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Official Base Sepolia USDC Address
  const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  // Deploy Mock Reputation for Testnet (or use existing address)
  const MockReputation = await hre.ethers.getContractFactory("MockReputation");
  const reputation = await MockReputation.deploy();
  await reputation.waitForDeployment();
  const reputationAddress = await reputation.getAddress();
  console.log("MockReputation deployed to:", reputationAddress);

  // Deploy ACPEscrow
  const ACPEscrow = await hre.ethers.getContractFactory("ACPEscrow");
  const escrow = await ACPEscrow.deploy(
    BASE_SEPOLIA_USDC,
    reputationAddress,
    deployer.address // Treasury defaults to deployer
  );
  await escrow.waitForDeployment();

  const escrowAddress = await escrow.getAddress();
  console.log("=================================================");
  console.log("✅ ACPEscrow Deployed Successfully!");
  console.log("-------------------------------------------------");
  console.log("Contract Address :", escrowAddress);
  console.log("USDC Token       :", BASE_SEPOLIA_USDC);
  console.log("Reputation       :", reputationAddress);
  console.log("Network          : Base Sepolia (Chain ID: 84532)");
  console.log("BaseScan Explorer: https://sepolia.basescan.org/address/" + escrowAddress);
  console.log("=================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
