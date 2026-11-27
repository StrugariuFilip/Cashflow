from fastapi import FastAPI, HTTPException
from sqlalchemy import text
from app.database import engine
from app.api.routes import router
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="CashFlow API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")

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
