import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend.database.db import get_connection

conn = get_connection()
cursor = conn.cursor()

cursor.execute("""
    INSERT OR IGNORE INTO policies (id, name, description, rule_type, threshold, action, applies_to)
    VALUES (?, ?, ?, ?, ?, ?, ?)
""", (
    "policy-004",
    "Senior Approval Refund Limit",
    "Refunds above ₹25,000 require senior management approval",
    "amount_limit",
    25000,
    "block",
    '["process_refund"]'
))
conn.commit()

cursor.execute("SELECT id, name, rule_type, threshold, action, applies_to FROM policies")
for row in cursor.fetchall():
    print(dict(row))

conn.close()