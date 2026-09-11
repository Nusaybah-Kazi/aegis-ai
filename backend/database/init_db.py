# backend/database/init_db.py
import json
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "../../"))

from backend.database.db import DB_PATH, get_connection
from backend.services.auth_service import hash_password


def init_db():
    print(f"Initializing database at: {DB_PATH}")
    conn = get_connection()
    cursor = conn.cursor()

    # ── Agents ────────────────────────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            model TEXT,
            status TEXT DEFAULT 'active',
            tools TEXT,
            risk_score INTEGER DEFAULT 0,
            owner TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Tools ─────────────────────────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tools (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            risk_weight INTEGER DEFAULT 0,
            requires_approval_above REAL,
            data_sensitivity TEXT DEFAULT 'low',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Policies ──────────────────────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS policies (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            rule_type TEXT,
            threshold REAL,
            action TEXT,
            applies_to TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Audit log ─────────────────────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            tool_name TEXT,
            action TEXT,
            parameters TEXT,
            risk_score INTEGER,
            decision TEXT,
            reason TEXT,
            reviewed_by TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Approval queue ────────────────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS approval_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            tool_name TEXT,
            action TEXT,
            parameters TEXT,
            risk_score INTEGER,
            reason TEXT,
            status TEXT DEFAULT 'pending',
            reviewed_by TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reviewed_at TIMESTAMP
        )
    """)

    # ── Users (Phase 10) ──────────────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'employee',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    print("Tables created successfully.")

    # ── Seed agents ───────────────────────────────────────────────────────────
    seed_agents_path = os.path.join(
        os.path.dirname(__file__), "../../data/seed/agents.json"
    )
    with open(seed_agents_path) as f:
        agents = json.load(f)

    for agent in agents:
        cursor.execute("""
            INSERT OR IGNORE INTO agents (id, name, description, model, status, tools, risk_score, owner)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            agent["id"], agent["name"], agent["description"], agent["model"],
            agent["status"], json.dumps(agent["tools"]), agent["risk_score"], agent["owner"],
        ))

    # ── Seed tools ────────────────────────────────────────────────────────────
    seed_tools_path = os.path.join(
        os.path.dirname(__file__), "../../data/seed/tools.json"
    )
    with open(seed_tools_path) as f:
        tools = json.load(f)

    for tool in tools:
        cursor.execute("""
            INSERT OR IGNORE INTO tools (id, name, description, risk_weight, requires_approval_above, data_sensitivity)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            tool["id"], tool["name"], tool["description"],
            tool["risk_weight"], tool["requires_approval_above"], tool["data_sensitivity"],
        ))

    # ── Seed policies ─────────────────────────────────────────────────────────
    sample_policies = [
        ("policy-001", "Refund Limit", "Auto-refunds capped at ₹5,000",
         "amount_limit", 5000, "pause", '["process_refund"]'),
        ("policy-002", "PII Access Control", "PII access requires approval",
         "permission", None, "block", '["query_customer_pii"]'),
        ("policy-003", "Bulk Write Limit", "Bulk DB writes over 100 records need approval",
         "amount_limit", 100, "pause", '["update_inventory"]'),
        ("policy-004", "Senior Approval Refund Limit",
         "Refunds above ₹25,000 require senior management approval",
         "amount_limit", 25000, "block", '["process_refund"]'),
    ]
    for policy in sample_policies:
        cursor.execute("""
            INSERT OR IGNORE INTO policies (id, name, description, rule_type, threshold, action, applies_to)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, policy)

    # ── Seed default admin ────────────────────────────────────────────────────
    existing_admin = conn.execute(
        "SELECT id FROM users WHERE email = ?", ("admin@aegis.ai",)
    ).fetchone()

    if not existing_admin:
        admin_hash = hash_password("Admin@123")
        conn.execute("""
            INSERT INTO users (name, email, password_hash, role)
            VALUES (?, ?, ?, ?)
        """, ("Aegis Admin", "admin@aegis.ai", admin_hash, "admin"))
        print("✅ Default admin seeded: admin@aegis.ai / Admin@123")
    else:
        print("ℹ️  Admin already exists — skipping seed.")

    conn.commit()

    # ── Migrations (safe to run on every boot) ──────────────────────────────────
    existing_audit_cols = [
        row[1] for row in conn.execute("PRAGMA table_info(audit_log)").fetchall()
    ]
    if "user_id" not in existing_audit_cols:
        conn.execute("ALTER TABLE audit_log ADD COLUMN user_id INTEGER")
        print("✅ Migration: added user_id to audit_log")

    existing_queue_cols = [
        row[1] for row in conn.execute("PRAGMA table_info(approval_queue)").fetchall()
    ]
    if "user_id" not in existing_queue_cols:
        conn.execute("ALTER TABLE approval_queue ADD COLUMN user_id INTEGER")
        print("✅ Migration: added user_id to approval_queue")

    if "response" not in existing_queue_cols:
        conn.execute("ALTER TABLE approval_queue ADD COLUMN response TEXT")
        print("✅ Migration: added response to approval_queue")

    conn.commit()
    print("Migrations complete.")
    conn.close()
    print("Seed data loaded successfully.")
    print("✅ Database initialized.")


if __name__ == "__main__":
    init_db()