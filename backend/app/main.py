from fastapi import FastAPI, HTTPException
from sqlalchemy import text
from app.database import engine
from app.api.routes import router
from app.database import Base, engine
from app.models.transaction import Transaction
from app.models.user import User
from app.api.auth import router as auth_router

app = FastAPI(title="CashFlow API")
app.include_router(router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
Base.metadata.create_all(bind=engine)

@app.get("/health")
def health_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception:
        raise HTTPException(
            status_code=503,
            detail={"status": "error", "database": "unavailable"},
        )