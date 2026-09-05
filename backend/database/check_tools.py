import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend.database.db import get_connection

conn = get_connection()
cursor = conn.cursor()
cursor.execute("SELECT * FROM tools WHERE name = 'process_refund'")
print(dict(cursor.fetchone()))
conn.close()