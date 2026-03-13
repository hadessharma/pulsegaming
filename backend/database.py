from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv

load_dotenv()

# For local development, it will still use SQLite if DATABASE_URL is not set
# For Supabase, set DATABASE_URL=postgresql://user:pass@host:port/db in your .env
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./wordle.db")

# PostgreSQL fix: SQLAlchemy requires postgresql:// instead of postgres://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Optimization for Transaction Pooler (PgBouncer)
db_config = {}
if "6543" in DATABASE_URL:
    # Transaction pooling doesn't support prepared statements
    # But psycopg2 doesn't use them by default for simple selects
    # It's safer to use pool_pre_ping to handle dropped connections
    db_config["pool_pre_ping"] = True

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# PostgreSQL Connection with optimized pooling for 50+ users
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_pre_ping=True,
    connect_args=connect_args # Retain connect_args for SQLite compatibility
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
