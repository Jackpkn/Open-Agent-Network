const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ACPEscrow Smart Contract Test Suite", function () {
  let usdc, reputation, escrow, owner, hirer, worker, arbitrator, treasury;

  beforeEach(async function () {
    [owner, hirer, worker, arbitrator, treasury] = await ethers.getSigners();

    // Deploy Mock USDC (ERC20)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();

    // Deploy Mock Reputation
    const MockReputation = await ethers.getContractFactory("MockReputation");
    reputation = await MockReputation.deploy();
    await reputation.waitForDeployment();

    // Deploy ACPEscrow
    const ACPEscrow = await ethers.getContractFactory("ACPEscrow");
    escrow = await ACPEscrow.deploy(
      await usdc.getAddress(),
      await reputation.getAddress(),
      treasury.address
    );
    await escrow.waitForDeployment();
  });

  it("Should initialize contract with correct addresses", async function () {
    expect(await escrow.usdc()).to.equal(await usdc.getAddress());
    expect(await escrow.reputation()).to.equal(await reputation.getAddress());
    expect(await escrow.treasury()).to.equal(treasury.address);
  });
});
