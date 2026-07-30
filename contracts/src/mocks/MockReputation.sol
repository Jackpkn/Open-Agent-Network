// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../ACPEscrow.sol";

contract MockReputation is IACPReputation {
    mapping(address => uint256) public totalJobs;
    mapping(address => uint256) public slashed;

    function recordJob(address agent, bool success, uint256 qualityScore) external override {
        totalJobs[agent] += 1;
    }

    function slashStake(address agent, uint256 amount) external override {
        slashed[agent] += amount;
    }
}
