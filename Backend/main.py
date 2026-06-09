# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from init_db import init_database  # Import the agent
from routes import users  # Your routes
import os
from pydantic import BaseModel
from typing import List, Optional

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize database on startup
logger.info("Running database initialization...")
init_database()

# Create FastAPI app
app = FastAPI(title="MeshBoard Super-Node API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(users.router)

@app.get("/")
def read_root():
    return {"message": "MeshBoard Super-Node API"}

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "database": "connected",
        "api": "running"
    }

# Run with: uvicorn main:app --reload



app = FastAPI(
    title="MeshBoard Supernode API",
    description="FastAPI backend optimized for Web and Android clients.",
    version="1.0.0"
)

# Setup CORS using environment variables from Railway
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Models (This auto-generates your Android-friendly documentation!)
class Node(BaseModel):
    id: str
    display_name: str
    credit_balance: float
    total_spent: float
    is_active: bool

class Post(BaseModel):
    id: str
    node_id: str
    message_text: str
    status: str  # pending, active

# --- ENDPOINTS ---

@app.get("/api/health")
def health_check():
    return {"status": "OK", "engine": "FastAPI + Uvicorn"}

@app.get("/api/stats")
def get_stats():
    # Mocking aggregated database data for the dashboard
    return {
        "active_nodes": 3,
        "pending_posts": 2,
        "live_broadcasts": 1
    }

@app.get("/api/nodes", response_model=List[Node])
def get_nodes():
    return [
        {"id": "NODE-A1B2-C3D4", "display_name": "Arusha Market Node", "credit_balance": 12.00, "total_spent": 8.00, "is_active": True},
        {"id": "NODE-E5F6-G7H8", "display_name": "Moshi Community Hub", "credit_balance": 5.00, "total_spent": 3.00, "is_active": True},
        {"id": "NODE-I9J0-K1L2", "display_name": "Karatu Relay", "credit_balance": 0.00, "total_spent": 10.00, "is_active": False}
    ]

@app.get("/api/posts", response_model=List[Post])
def get_posts(status: Optional[str] = None):
    all_posts = [
        {"id": "MSG-DEMO01", "node_id": "NODE-A1B2-C3D4", "message_text": "Fresh produce at Arusha market!", "status": "active"},
        {"id": "MSG-DEMO02", "node_id": "NODE-E5F6-G7H8", "message_text": "Moshi heavy rain alert - check grid.", "status": "pending"}
    ]
    if status:
        return [p for p in all_posts if p["status"] == status]
    return all_posts

@app.post("/api/posts/{post_id}/approve")
def approve_post(post_id: str):
    return {"status": "success", "message": f"Post {post_id} has been approved."}
