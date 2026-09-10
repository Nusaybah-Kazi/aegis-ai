import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend.database.db import get_connection

conn = get_connection()
cursor = conn.cursor()

cursor.execute(
    "UPDATE tools SET data_sensitivity = ? WHERE name = ?",
    ("medium", "process_refund")
)
conn.commit()

cursor.execute("SELECT id, name, risk_weight, data_sensitivity, requires_approval_above FROM tools WHERE name = 'process_refund'")
print(dict(cursor.fetchone()))
conn.close()