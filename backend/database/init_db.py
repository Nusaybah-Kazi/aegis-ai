import json
import os
import sys

# Make sure we can import from backend/
sys.path.append(os.path.join(os.path.dirname(__file__), "../../"))

from backend.database.db import DB_PATH, get_connection


def init_db():
    print(f"Initializing database at: {DB_PATH}")
    conn = get_connection()
    cursor = conn.cursor()

    # Agents table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            model TEXT,
            status TEXT DEFAULT 'active',
            tools TEXT,         -- JSON array stored as string
            risk_score INTEGER DEFAULT 0,
            owner TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Tools table
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

    # Policies table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS policies (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            rule_type TEXT,     -- 'amount_limit', 'permission', 'data_access'
            threshold REAL,
            action TEXT,        -- 'block', 'pause', 'warn'
            applies_to TEXT,    -- JSON array of tool names
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Audit log table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            tool_name TEXT,
            action TEXT,
            parameters TEXT,    -- JSON string
            risk_score INTEGER,
            decision TEXT,      -- 'approved', 'blocked', 'paused'
            reason TEXT,
            reviewed_by TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Human approval queue table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS approval_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            tool_name TEXT,
            action TEXT,
            parameters TEXT,    -- JSON string
            risk_score INTEGER,
            reason TEXT,
            status TEXT DEFAULT 'pending',  -- 'pending', 'approved', 'denied'
            reviewed_by TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reviewed_at TIMESTAMP
        )
    """)

    conn.commit()
    print("Tables created successfully.")

    # Seed agents
    seed_agents_path = os.path.join(os.path.dirname(__file__), "../../data/seed/agents.json")
    with open(seed_agents_path) as f:
        agents = json.load(f)

    for agent in agents:
        cursor.execute("""
            INSERT OR IGNORE INTO agents (id, name, description, model, status, tools, risk_score, owner)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            agent["id"],
            agent["name"],
            agent["description"],
            agent["model"],
            agent["status"],
            json.dumps(agent["tools"]),
            agent["risk_score"],
            agent["owner"]
        ))

    # Seed tools
    seed_tools_path = os.path.join(os.path.dirname(__file__), "../../data/seed/tools.json")
    with open(seed_tools_path) as f:
        tools = json.load(f)

    for tool in tools:
        cursor.execute("""
            INSERT OR IGNORE INTO tools (id, name, description, risk_weight, requires_approval_above, data_sensitivity)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            tool["id"],
            tool["name"],
            tool["description"],
            tool["risk_weight"],
            tool["requires_approval_above"],
            tool["data_sensitivity"]
        ))

    # Seed sample policies
    sample_policies = [
        ("policy-001", "Refund Limit", "Auto-refunds capped at ₹5,000", "amount_limit", 5000, "pause", '["process_refund"]'),
        ("policy-002", "PII Access Control", "PII access requires approval", "permission", None, "block", '["query_customer_pii"]'),
        ("policy-003", "Bulk Write Limit", "Bulk DB writes over 100 records need approval", "amount_limit", 100, "pause", '["update_inventory"]'),
    ]

    for policy in sample_policies:
        cursor.execute("""
            INSERT OR IGNORE INTO policies (id, name, description, rule_type, threshold, action, applies_to)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, policy)

    conn.commit()
    conn.close()
    print("Seed data loaded successfully.")
    print("✅ Database initialized.")

if __name__ == "__main__":
    init_db()