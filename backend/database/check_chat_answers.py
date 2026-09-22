import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend.database.db import get_connection

conn = get_connection()
cursor = conn.cursor()
cursor.execute("""
    SELECT id, tool_name, decision, answer
    FROM audit_log
    WHERE tool_name IN ('internal_ai', 'external_ai')
    ORDER BY timestamp DESC
    LIMIT 5
""")
for row in cursor.fetchall():
    print(dict(row))
conn.close()