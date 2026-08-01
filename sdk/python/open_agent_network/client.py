"""
Agent Commerce Protocol — Python SDK v0.1.0

For AI agents running in Python environments.
"""

import json
import hashlib
from dataclasses import dataclass, asdict
from typing import Optional, List, Dict, Any
from datetime import datetime
import httpx
from eth_account import Account
from web3 import Web3


# ─── Data Models ────────────────────────────────────────────────────

@dataclass
class Pricing:
    model: str  # 'fixed', 'hourly', 'per_token'
    amount: str
    currency: str
    chain: str


@dataclass
class AgentCapability:
    skill_id: str
    name: str
    description: str
    input_schema: str
    output_schema: str
    pricing: Pricing
    verification_method: str
    tee_required: bool
    avg_latency_seconds: int


@dataclass
class AgentEndpoints:
    webhook: str
    health: str


@dataclass
class AgentReputation:
    contract_address: str
    chain: str
    total_jobs_completed: int
    success_rate: float
    stake_usdc: str


@dataclass
class AgentManifest:
    agent_id: str
    name: str
    version: str
    capabilities: List[AgentCapability]
    endpoints: AgentEndpoints
    reputation: AgentReputation
    owner: Dict[str, str]


@dataclass
class JobScope:
    skill_id: str
    description: str
    input_cid: str
    acceptance_criteria: Dict[str, Any]


@dataclass
class JobPayment:
    amount: str
    currency: str
    chain: str
    escrow_address: str
    milestone_split: List[Dict[str, Any]]


@dataclass
class JobTimeline:
    created_at: str
    deadline: str


@dataclass
class JobDispute:
    arbitrator: str
    arbitrator_address: str
    fee_percent: int


@dataclass
class JobContract:
    contract_id: str
    hirer: Dict[str, str]
    worker: Dict[str, str]
    scope: JobScope
    payment: JobPayment
    timeline: JobTimeline
    dispute: JobDispute


# ─── ACP Client ────────────────────────────────────────────────────

class ACPClient:
    """Client for the Agent Commerce Protocol."""

    def __init__(
        self,
        api_base_url: str = "http://localhost:3001",
        chain_rpc_url: str = "https://sepolia.base.org",
        escrow_contract_address: str = "0x0000000000000000000000000000000000000000",
        usdc_address: str = "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        private_key: Optional[str] = None,
    ):
        self.api_base_url = api_base_url.rstrip("/")
        self.chain_rpc_url = chain_rpc_url
        self.escrow_contract_address = escrow_contract_address
        self.usdc_address = usdc_address
        self.private_key = private_key

        self.w3 = Web3(Web3.HTTPProvider(chain_rpc_url))
        self.account = Account.from_key(private_key) if private_key else None

        self.escrow_abi = [
            {
                "inputs": [
                    {"name": "contractId", "type": "bytes32"},
                    {"name": "worker", "type": "address"},
                    {"name": "arbitrator", "type": "address"},
                    {"name": "milestone1Bps", "type": "uint256"},
                    {"name": "milestone2Bps", "type": "uint256"},
                    {"name": "deadline", "type": "uint256"},
                ],
                "name": "createContract",
                "outputs": [],
                "type": "function",
            },
            {
                "inputs": [
                    {"name": "contractId", "type": "bytes32"},
                    {"name": "milestone", "type": "uint256"},
                ],
                "name": "releaseMilestone",
                "outputs": [],
                "type": "function",
            },
            {
                "inputs": [{"name": "contractId", "type": "bytes32"}],
                "name": "raiseDispute",
                "outputs": [],
                "type": "function",
            },
            {
                "inputs": [],
                "name": "withdraw",
                "outputs": [],
                "type": "function",
            },
        ]

        self.erc20_abi = [
            {
                "inputs": [
                    {"name": "spender", "type": "address"},
                    {"name": "amount", "type": "uint256"},
                ],
                "name": "approve",
                "outputs": [{"name": "", "type": "bool"}],
                "type": "function",
            },
            {
                "inputs": [
                    {"name": "owner", "type": "address"},
                    {"name": "spender", "type": "address"},
                ],
                "name": "allowance",
                "outputs": [{"name": "", "type": "uint256"}],
                "type": "function",
            },
        ]

        if self.w3.is_connected() and self.account:
            self.escrow_contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(escrow_contract_address),
                abi=self.escrow_abi,
            )
            self.usdc_contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(usdc_address),
                abi=self.erc20_abi,
            )
        else:
            self.escrow_contract = None
            self.usdc_contract = None

    # ─── Agent Registry ──────────────────────────────────────────────

    async def register_agent(self, manifest: AgentManifest) -> Dict[str, str]:
        """Register an agent on the protocol."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_base_url}/api/v1/agents/register",
                json={"manifest": self._manifest_to_dict(manifest)},
            )
            response.raise_for_status()
            return response.json()

    async def search_agents(
        self,
        skill: Optional[str] = None,
        min_reputation: Optional[float] = None,
        max_price: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Search for agents by skill, reputation, or price."""
        params: Dict[str, Any] = {}
        if skill:
            params["skill"] = skill
        if min_reputation:
            params["min_reputation"] = min_reputation
        if max_price:
            params["max_price"] = max_price

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base_url}/api/v1/agents/search",
                params=params,
            )
            response.raise_for_status()
            return response.json()

    # ─── Job Management ──────────────────────────────────────────────

    async def create_job(self, contract: JobContract) -> Dict[str, str]:
        """Create a job with escrowed payment."""
        if not self.account or not self.escrow_contract or not self.usdc_contract:
            raise ValueError("Private key required for on-chain operations")

        amount_wei = int(float(contract.payment.amount) * 10**6)

        approve_txn = self.usdc_contract.functions.approve(
            Web3.to_checksum_address(self.escrow_contract_address),
            amount_wei,
        ).build_transaction({
            "from": self.account.address,
            "nonce": self.w3.eth.get_transaction_count(self.account.address),
            "gas": 100000,
            "gasPrice": self.w3.to_wei("0.1", "gwei"),
        })
        signed_approve = self.account.sign_transaction(approve_txn)
        tx_hash = self.w3.eth.send_raw_transaction(signed_approve.rawTransaction)
        self.w3.eth.wait_for_transaction_receipt(tx_hash)

        contract_id_bytes = self._string_to_bytes32(contract.contract_id)
        milestone1_bps = int(contract.payment.milestone_split[0]["percent"] * 100)
        milestone2_bps = int(contract.payment.milestone_split[1]["percent"] * 100)
        deadline = int(
            datetime.fromisoformat(contract.timeline.deadline.replace("Z", "+00:00")).timestamp()
        )

        create_txn = self.escrow_contract.functions.createContract(
            contract_id_bytes,
            Web3.to_checksum_address(contract.worker["address"]),
            Web3.to_checksum_address(contract.dispute.arbitrator_address),
            milestone1_bps,
            milestone2_bps,
            deadline,
        ).build_transaction({
            "from": self.account.address,
            "nonce": self.w3.eth.get_transaction_count(self.account.address),
            "gas": 300000,
            "gasPrice": self.w3.to_wei("0.1", "gwei"),
        })
        signed_create = self.account.sign_transaction(create_txn)
        tx_hash = self.w3.eth.send_raw_transaction(signed_create.rawTransaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_base_url}/api/v1/jobs",
                json={"contract": self._contract_to_dict(contract)},
            )
            response.raise_for_status()
            result = response.json()
            result["on_chain_tx"] = receipt["transactionHash"].hex()
            return result

    async def submit_work(
        self, job_id: str, output_cid: str, verification_proof: str
    ) -> Dict[str, str]:
        """Submit completed work for verification."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_base_url}/api/v1/jobs/{job_id}/submit",
                json={"output_cid": output_cid, "verification_proof": verification_proof},
            )
            response.raise_for_status()
            return response.json()

    def release_milestone(self, contract_id: str, milestone: int) -> str:
        """Release payment for a milestone."""
        if not self.account or not self.escrow_contract:
            raise ValueError("Private key required")

        contract_id_bytes = self._string_to_bytes32(contract_id)
        txn = self.escrow_contract.functions.releaseMilestone(
            contract_id_bytes, milestone
        ).build_transaction({
            "from": self.account.address,
            "nonce": self.w3.eth.get_transaction_count(self.account.address),
            "gas": 200000,
            "gasPrice": self.w3.to_wei("0.1", "gwei"),
        })
        signed = self.account.sign_transaction(txn)
        tx_hash = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        return receipt["transactionHash"].hex()

    def raise_dispute(self, contract_id: str) -> str:
        """Raise a dispute for a contract."""
        if not self.account or not self.escrow_contract:
            raise ValueError("Private key required")

        contract_id_bytes = self._string_to_bytes32(contract_id)
        txn = self.escrow_contract.functions.raiseDispute(
            contract_id_bytes
        ).build_transaction({
            "from": self.account.address,
            "nonce": self.w3.eth.get_transaction_count(self.account.address),
            "gas": 150000,
            "gasPrice": self.w3.to_wei("0.1", "gwei"),
        })
        signed = self.account.sign_transaction(txn)
        tx_hash = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        return receipt["transactionHash"].hex()

    def withdraw(self) -> str:
        """Withdraw accumulated earnings."""
        if not self.account or not self.escrow_contract:
            raise ValueError("Private key required")

        txn = self.escrow_contract.functions.withdraw().build_transaction({
            "from": self.account.address,
            "nonce": self.w3.eth.get_transaction_count(self.account.address),
            "gas": 100000,
            "gasPrice": self.w3.to_wei("0.1", "gwei"),
        })
        signed = self.account.sign_transaction(txn)
        tx_hash = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        return receipt["transactionHash"].hex()

    async def handle_webhook(self, payload: Dict[str, Any], signature: str) -> None:
        """Handle incoming webhook from the protocol."""
        event = payload.get("event")
        print(f"[ACP Webhook] Received event: {event}")

    def _string_to_bytes32(self, text: str) -> bytes:
        return hashlib.sha256(text.encode()).digest()

    def _manifest_to_dict(self, manifest: AgentManifest) -> Dict[str, Any]:
        return {
            "agent_id": manifest.agent_id,
            "name": manifest.name,
            "version": manifest.version,
            "capabilities": [
                {
                    "skill_id": c.skill_id,
                    "name": c.name,
                    "description": c.description,
                    "input_schema": c.input_schema,
                    "output_schema": c.output_schema,
                    "pricing": asdict(c.pricing),
                    "verification_method": c.verification_method,
                    "tee_required": c.tee_required,
                    "avg_latency_seconds": c.avg_latency_seconds,
                }
                for c in manifest.capabilities
            ],
            "endpoints": asdict(manifest.endpoints),
            "reputation": asdict(manifest.reputation),
            "owner": manifest.owner,
        }

    def _contract_to_dict(self, contract: JobContract) -> Dict[str, Any]:
        return {
            "contract_id": contract.contract_id,
            "hirer": contract.hirer,
            "worker": contract.worker,
            "scope": asdict(contract.scope),
            "payment": asdict(contract.payment),
            "timeline": asdict(contract.timeline),
            "dispute": asdict(contract.dispute),
        }
