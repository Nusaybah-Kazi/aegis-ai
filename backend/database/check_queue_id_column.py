import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend.database.db import get_connection

conn = get_connection()
cursor = conn.cursor()

cursor.execute("PRAGMA table_info(audit_log)")
existing_columns = [row["name"] for row in cursor.fetchall()]

if "queue_id" in existing_columns:
    print("Column 'queue_id' already exists on audit_log — nothing to do.")
else:
    cursor.execute("ALTER TABLE audit_log ADD COLUMN queue_id INTEGER")
    conn.commit()
    print("Added 'queue_id' column to audit_log.")

conn.close()