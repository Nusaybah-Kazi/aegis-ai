import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend.database.db import get_connection

conn = get_connection()
cursor = conn.cursor()

cursor.execute(
    "UPDATE policies SET applies_to = ? WHERE id = ?",
    ('["query_order"]', "policy-002")
)
conn.commit()

cursor.execute("SELECT id, name, rule_type, action, applies_to FROM policies")
for row in cursor.fetchall():
    print(dict(row))

conn.close()