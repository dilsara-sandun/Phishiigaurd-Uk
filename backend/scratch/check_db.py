import asyncio
from sqlalchemy import create_engine, inspect
import os
from dotenv import load_dotenv

load_dotenv()

def check_schema():
    url = os.getenv("SYNC_DATABASE_URL")
    engine = create_engine(url)
    inspector = inspect(engine)
    
    tables = inspector.get_table_names()
    print(f"Tables: {tables}")
    
    if "scans" in tables:
        columns = inspector.get_columns("scans")
        print("Columns in 'scans' table:")
        for col in columns:
            print(f" - {col['name']}: {col['type']}")
    else:
        print("'scans' table not found")

    # Check for enums
    from sqlalchemy import text
    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM scans;"))
        rows = result.fetchall()
        print(f"Rows in 'scans': {len(rows)}")
        for row in rows:
            print(f" - {row}")
        
        result = conn.execute(text("SELECT t.typname FROM pg_type t JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype = 'e';"))
        enums = [row[0] for row in result]
        print(f"Enums: {enums}")

if __name__ == "__main__":
    check_schema()
