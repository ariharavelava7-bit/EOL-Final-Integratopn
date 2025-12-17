"""
Database Models and Schema for L&T CORe
SQLite database with SQLAlchemy ORM
"""

from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import enum
import os

# Database URL - SQLite for simplicity
DATABASE_URL = "sqlite:///./ltcore.db"

# Create engine
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"
    VIEWER = "viewer"


class UserStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"


class User(Base):
    """User model - stores all user information"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default=UserRole.USER.value)
    status = Column(String(20), default=UserStatus.PENDING.value)
    department = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    profile_image = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    search_history = relationship("SearchHistory", back_populates="user", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    saved_searches = relationship("SavedSearch", back_populates="user", cascade="all, delete-orphan")


class SearchHistory(Base):
    """Stores user search history"""
    __tablename__ = "search_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    part_number = Column(String(100), nullable=False)
    manufacturer = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    alternates_count = Column(Integer, default=0)
    searched_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    user = relationship("User", back_populates="search_history")


class SavedSearch(Base):
    """Stores saved/favorite searches"""
    __tablename__ = "saved_searches"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    part_number = Column(String(100), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    user = relationship("User", back_populates="saved_searches")


class Report(Base):
    """Stores generated reports"""
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    report_name = Column(String(255), nullable=False)
    report_type = Column(String(50), default="comparison")  # comparison, bom, analysis
    file_path = Column(String(500), nullable=True)
    part_number = Column(String(100), nullable=True)
    alternates_included = Column(Text, nullable=True)  # JSON list of alternates
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    user = relationship("User", back_populates="reports")


class Notification(Base):
    """Stores user notifications"""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), default="info")  # info, warning, alert, success
    is_read = Column(Boolean, default=False)
    link = Column(String(500), nullable=True)  # Optional link to navigate
    created_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime, nullable=True)
    
    # Relationship
    user = relationship("User", back_populates="notifications")


class SystemNotification(Base):
    """System-wide notifications (sent to all users)"""
    __tablename__ = "system_notifications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), default="info")
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)


class AuditLog(Base):
    """Audit log for tracking user actions"""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)  # login, logout, search, download, etc.
    details = Column(Text, nullable=True)  # JSON details
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Create all tables
def init_db():
    Base.metadata.create_all(bind=engine)
    print("[DB] Database tables created successfully!")


# Create default admin user if not exists
def create_default_admin():
    from passlib.context import CryptContext
    
    # Use same scheme as auth.py
    pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
    db = SessionLocal()
    
    try:
        # Check if admin exists
        admin = db.query(User).filter(User.email == "admin@ltcore.com").first()
        if not admin:
            admin = User(
                email="admin@ltcore.com",
                username="admin",
                full_name="System Administrator",
                hashed_password=pwd_context.hash("admin123"),  # Change this in production!
                role=UserRole.ADMIN.value,
                status=UserStatus.APPROVED.value,
                department="IT",
                approved_at=datetime.utcnow()
            )
            db.add(admin)
            db.commit()
            print("[DB] Default admin user created: admin@ltcore.com / admin123")
        else:
            print("[DB] Admin user already exists")
    except Exception as e:
        print(f"[DB] Error creating admin: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
    create_default_admin()

