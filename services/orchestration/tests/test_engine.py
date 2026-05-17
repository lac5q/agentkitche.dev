import os
import tempfile
import unittest

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from engine import OrchestrationEngine, OrchestrationStore


AGENTS = [
    {
        "id": "slow-agent",
        "name": "Slow Agent",
        "status": "dormant",
        "protocol": "a2a",
        "capabilities": [{"id": "research", "name": "Research", "tags": ["research"]}],
    },
    {
        "id": "active-agent",
        "name": "Active Agent",
        "status": "active",
        "protocol": "a2a",
        "capabilities": [{"id": "research", "name": "Research", "tags": ["research", "analysis"]}],
    },
]


class OrchestrationEngineTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.tmp.name, "orchestration.db")
        self.store = OrchestrationStore(self.db_path)
        self.engine = OrchestrationEngine(self.store, retry_limit=2)

    def tearDown(self):
        self.store.close()
        self.tmp.cleanup()

    def test_routes_by_declared_capability_and_persists_lineage(self):
        result = self.engine.route_task(
            {
                "taskSummary": "Research current LangGraph checkpointing",
                "requiredCapability": "research",
                "agents": AGENTS,
                "correlationId": "corr-1",
            }
        )

        self.assertEqual(result["status"], "dispatched")
        self.assertEqual(result["selectedAgentId"], "active-agent")
        self.assertEqual(result["correlationId"], "corr-1")
        self.assertEqual(result["retryLimit"], 2)
        self.assertEqual(result["boundary"], "LangGraph chooses policy; Memroos/A2A owns transport")
        run = self.store.get_run(result["runId"])
        self.assertEqual(run["selected_agent_id"], "active-agent")
        lineage = self.store.list_lineage(result["correlationId"])
        self.assertEqual([hop["hop_type"] for hop in lineage], ["ingress", "route", "dispatch_request"])

    def test_creates_pending_hil_decision_when_approval_required(self):
        result = self.engine.route_task(
            {
                "taskSummary": "Deploy a production change",
                "requiredCapability": "research",
                "agents": AGENTS,
                "correlationId": "corr-hil",
                "requiresApproval": True,
            }
        )

        self.assertEqual(result["status"], "waiting_for_approval")
        self.assertTrue(result["hilDecisionId"])
        pending = self.store.list_pending_hil()
        self.assertEqual(len(pending), 1)
        self.assertEqual(pending[0]["correlationId"], "corr-hil")
        self.assertEqual(pending[0]["status"], "pending")

    def test_approve_and_reject_resume_hil_decisions(self):
        result = self.engine.route_task(
            {
                "taskSummary": "Needs approval",
                "requiredCapability": "research",
                "agents": AGENTS,
                "correlationId": "corr-resume",
                "requiresApproval": True,
            }
        )

        approved = self.engine.resolve_hil(result["hilDecisionId"], "approve", "luis")
        self.assertEqual(approved["status"], "approved")
        self.assertEqual(approved["resumed"], True)
        self.assertEqual(self.store.list_pending_hil(), [])

        rejected_run = self.engine.route_task(
            {
                "taskSummary": "Reject this",
                "requiredCapability": "research",
                "agents": AGENTS,
                "correlationId": "corr-reject",
                "requiresApproval": True,
            }
        )
        rejected = self.engine.resolve_hil(rejected_run["hilDecisionId"], "reject", "luis")
        self.assertEqual(rejected["status"], "rejected")
        self.assertEqual(rejected["resumed"], False)

    def test_task_failure_retries_then_surfaces_pending_hil(self):
        result = self.engine.route_task(
            {
                "taskSummary": "Retry this dispatch",
                "requiredCapability": "research",
                "agents": AGENTS,
                "correlationId": "corr-retry",
            }
        )

        first = self.engine.record_task_failure(result["runId"], "timeout")
        self.assertEqual(first["status"], "retrying")
        self.assertEqual(first["attempts"], 1)
        self.assertEqual(first["remainingRetries"], 1)

        second = self.engine.record_task_failure(result["runId"], "timeout")
        self.assertEqual(second["status"], "waiting_for_approval")
        self.assertEqual(second["attempts"], 2)
        self.assertTrue(second["hilDecisionId"])
        self.assertEqual(self.store.list_pending_hil()[0]["correlationId"], "corr-retry")


if __name__ == "__main__":
    unittest.main()
