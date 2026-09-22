import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend.database.db import get_connection

conn = get_connection()
cursor = conn.cursor()

cursor.execute("PRAGMA table_info(audit_log)")
existing_columns = [row["name"] for row in cursor.fetchall()]

if "answer" in existing_columns:
    print("Column 'answer' already exists on audit_log — nothing to do.")
else:
    cursor.execute("ALTER TABLE audit_log ADD COLUMN answer TEXT")
    conn.commit()
    print("Added 'answer' column to audit_log.")

cursor.execute("PRAGMA table_info(audit_log)")
for row in cursor.fetchall():
    print(dict(row))

conn.close()