// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title ACPEscrow
/// @notice Trustless escrow for agent-to-agent work contracts
/// @dev Uses USDC on Base. Milestone-based payment release.
contract ACPEscrow is ReentrancyGuard {
    IERC20 public immutable usdc;
    IACPReputation public immutable reputation;

    uint256 public constant PLATFORM_FEE_BPS = 100; // 1%
    address public immutable treasury;
    address public owner;

    enum Status { Pending, Active, Completed, Disputed, Cancelled }

    struct Contract {
        address hirer;
        address worker;
        address arbitrator;
        address token; // ERC-20 token address (USDC, USDT, WETH, DEGEN)
        uint256 amount;
        uint256 milestone1Bps; // e.g., 5000 = 50.00%
        uint256 milestone2Bps;
        Status status;
        uint256 createdAt;
        uint256 deadline;
        bool milestone1Released;
        bool milestone2Released;
    }

    mapping(bytes32 => Contract) public contracts;
    mapping(address => mapping(address => uint256)) public pendingTokenWithdrawals; // user => token => amount
    mapping(address => bool) public supportedTokens;

    event ContractCreated(
        bytes32 indexed contractId,
        address indexed hirer,
        address indexed worker,
        uint256 amount
    );
    event MilestoneReleased(
        bytes32 indexed contractId,
        uint256 milestone,
        uint256 amount
    );
    event DisputeRaised(bytes32 indexed contractId, address indexed by);
    event DisputeResolved(
        bytes32 indexed contractId,
        address indexed winner,
        uint256 amount
    );
    event ContractCancelled(bytes32 indexed contractId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyArbitrator(bytes32 contractId) {
        require(
            msg.sender == contracts[contractId].arbitrator,
            "Not arbitrator"
        );
        _;
    }

    constructor(address _usdc, address _reputation, address _treasury) {
        usdc = IERC20(_usdc);
        reputation = IACPReputation(_reputation);
        treasury = _treasury;
        owner = msg.sender;
    }

    /// @notice Create a new work contract with escrowed USDC
    /// @param contractId Unique identifier for the contract
    /// @param worker Address of the agent doing the work
    /// @param arbitrator Address that can resolve disputes
    /// @param milestone1Bps Percentage for first milestone (basis points)
    /// @param milestone2Bps Percentage for second milestone (basis points)
    /// @param deadline Unix timestamp when contract expires
    function createContract(
        bytes32 contractId,
        address worker,
        address arbitrator,
        uint256 milestone1Bps,
        uint256 milestone2Bps,
        uint256 deadline
    ) external nonReentrant {
        require(contracts[contractId].hirer == address(0), "Exists");
        require(worker != address(0), "Invalid worker");
        require(arbitrator != address(0), "Invalid arbitrator");
        require(
            milestone1Bps + milestone2Bps == 10000,
            "Milestones must sum to 100%"
        );
        require(deadline > block.timestamp, "Deadline passed");

        uint256 amount = usdc.allowance(msg.sender, address(this));
        require(amount > 0, "No allowance");

        bool success = usdc.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");

        contracts[contractId] = Contract({
            hirer: msg.sender,
            worker: worker,
            arbitrator: arbitrator,
            amount: amount,
            milestone1Bps: milestone1Bps,
            milestone2Bps: milestone2Bps,
            status: Status.Active,
            createdAt: block.timestamp,
            deadline: deadline,
            milestone1Released: false,
            milestone2Released: false
        });

        emit ContractCreated(contractId, msg.sender, worker, amount);
    }

    /// @notice Release a milestone payment after verification
    /// @param contractId The contract to release payment for
    /// @param milestone 1 or 2
    function releaseMilestone(
        bytes32 contractId,
        uint256 milestone
    ) external nonReentrant {
        Contract storage c = contracts[contractId];
        require(c.status == Status.Active, "Not active");
        require(
            msg.sender == c.hirer || msg.sender == c.arbitrator,
            "Not authorized"
        );
        require(milestone == 1 || milestone == 2, "Invalid milestone");

        uint256 releaseAmount;
        if (milestone == 1 && !c.milestone1Released) {
            releaseAmount = (c.amount * c.milestone1Bps) / 10000;
            c.milestone1Released = true;
        } else if (milestone == 2 && !c.milestone2Released) {
            releaseAmount = (c.amount * c.milestone2Bps) / 10000;
            c.milestone2Released = true;
        } else {
            revert("Already released");
        }

        // Platform fee
        uint256 fee = (releaseAmount * PLATFORM_FEE_BPS) / 10000;
        uint256 workerAmount = releaseAmount - fee;

        // Send fee to treasury
        if (fee > 0) {
            pendingWithdrawals[treasury] += fee;
        }

        // Queue worker payment
        pendingWithdrawals[c.worker] += workerAmount;

        // Update reputation
        if (milestone == 2) {
            c.status = Status.Completed;
            reputation.recordJob(c.worker, true, 500); // 5.0 score
        }

        emit MilestoneReleased(contractId, milestone, workerAmount);
    }

    /// @notice Raise a dispute if work is unsatisfactory
    /// @param contractId The contract in dispute
    function raiseDispute(bytes32 contractId) external {
        Contract storage c = contracts[contractId];
        require(c.status == Status.Active, "Not active");
        require(
            msg.sender == c.hirer || msg.sender == c.worker,
            "Not party"
        );
        require(block.timestamp < c.deadline + 7 days, "Too late");

        c.status = Status.Disputed;
        emit DisputeRaised(contractId, msg.sender);
    }

    /// @notice Arbitrator resolves a dispute
    /// @param contractId The disputed contract
    /// @param winner Who gets the escrowed funds
    /// @param workerQualityScore 0-500 (for reputation update)
    function resolveDispute(
        bytes32 contractId,
        address winner,
        uint256 workerQualityScore
    ) external onlyArbitrator(contractId) nonReentrant {
        Contract storage c = contracts[contractId];
        require(c.status == Status.Disputed, "Not disputed");
        require(
            winner == c.hirer || winner == c.worker,
            "Invalid winner"
        );

        uint256 fee = (c.amount * PLATFORM_FEE_BPS) / 10000;
        uint256 payout = c.amount - fee;

        pendingWithdrawals[treasury] += fee;
        pendingWithdrawals[winner] += payout;

        c.status = Status.Completed;

        // Update reputation
        bool workerWon = winner == c.worker;
        reputation.recordJob(c.worker, workerWon, workerQualityScore);

        // Slash worker if they lost
        if (!workerWon && c.amount > 0) {
            reputation.slashStake(c.worker, c.amount / 10); // 10% slash
        }

        emit DisputeResolved(contractId, winner, payout);
    }

    /// @notice Cancel contract if deadline passed with no work
    /// @param contractId The contract to cancel
    function cancelContract(bytes32 contractId) external nonReentrant {
        Contract storage c = contracts[contractId];
        require(c.status == Status.Active, "Not active");
        require(
            msg.sender == c.hirer || block.timestamp > c.deadline,
            "Not authorized"
        );

        c.status = Status.Cancelled;

        // Return funds to hirer
        uint256 remaining = c.amount;
        if (c.milestone1Released) {
            uint256 m1 = (c.amount * c.milestone1Bps) / 10000;
            remaining -= m1;
        }
        if (c.milestone2Released) {
            uint256 m2 = (c.amount * c.milestone2Bps) / 10000;
            remaining -= m2;
        }

        pendingWithdrawals[c.hirer] += remaining;

        emit ContractCancelled(contractId);
    }

    /// @notice Withdraw accumulated funds
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No funds");
        pendingWithdrawals[msg.sender] = 0;

        bool success = usdc.transfer(msg.sender, amount);
        require(success, "Transfer failed");
    }

    /// @notice Get contract details
    function getContract(
        bytes32 contractId
    ) external view returns (Contract memory) {
        return contracts[contractId];
    }
}

interface IACPReputation {
    function recordJob(address agent, bool success, uint256 qualityScore) external;
    function slashStake(address agent, uint256 amount) external;
}
