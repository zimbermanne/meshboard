# init_db.py
import logging
from sqlalchemy import text, inspect
from database import engine, SessionLocal, Base
from models import User

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseInitAgent:
    """Automatically initializes and manages database setup"""
    
    def __init__(self):
        self.engine = engine
        self.session = SessionLocal()
    
    def check_database_connection(self):
        """Test connection to database"""
        try:
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("✓ Database connection successful")
            return True
        except Exception as e:
            logger.error(f"✗ Database connection failed: {e}")
            return False
    
    def check_table_exists(self, table_name):
        """Check if a table exists in the database"""
        inspector = inspect(self.engine)
        tables = inspector.get_table_names()
        return table_name in tables
    
    def create_tables(self):
        """Create all tables from SQLAlchemy models"""
        try:
            Base.metadata.create_all(bind=self.engine)
            logger.info("✓ All tables created successfully")
            return True
        except Exception as e:
            logger.error(f"✗ Failed to create tables: {e}")
            return False
    
    def seed_initial_data(self):
        """Insert test data if users table is empty"""
        try:
            # Check if users table is empty
            user_count = self.session.query(User).count()
            
            if user_count == 0:
                logger.info("Users table is empty. Inserting seed data...")
                
                test_users = [
                    User(name="John Doe", email="john@example.com"),
                    User(name="Jane Smith", email="jane@example.com"),
                    User(name="Bob Johnson", email="bob@example.com"),
                    User(name="Alice Williams", email="alice@example.com"),
                    User(name="Charlie Brown", email="charlie@example.com"),
                ]
                
                self.session.add_all(test_users)
                self.session.commit()
                logger.info(f"✓ Inserted {len(test_users)} test users")
            else:
                logger.info(f"✓ Database already has {user_count} users. Skipping seed data.")
                
            return True
        except Exception as e:
            logger.error(f"✗ Failed to seed data: {e}")
            self.session.rollback()
            return False
    
    def get_database_status(self):
        """Get a status report of the database"""
        try:
            user_count = self.session.query(User).count()
            return {
                "status": "healthy",
                "users_count": user_count,
                "message": f"Database is healthy with {user_count} users"
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }
    
    def initialize(self):
        """Run full initialization"""
        logger.info("=" * 50)
        logger.info("Starting Database Initialization Agent")
        logger.info("=" * 50)
        
        # Step 1: Check connection
        if not self.check_database_connection():
            logger.error("Cannot proceed without database connection")
            return False
        
        # Step 2: Create tables
        if not self.create_tables():
            logger.error("Failed to create tables")
            return False
        
        # Step 3: Seed initial data
        self.seed_initial_data()
        
        # Step 4: Report status
        status = self.get_database_status()
        logger.info(f"✓ Database Status: {status['message']}")
        
        logger.info("=" * 50)
        logger.info("Database Initialization Complete ✓")
        logger.info("=" * 50)
        
        return True
    
    def close(self):
        """Close database session"""
        self.session.close()


# Function to run initialization
def init_database():
    """Initialize database on startup"""
    agent = DatabaseInitAgent()
    success = agent.initialize()
    agent.close()
    return success
