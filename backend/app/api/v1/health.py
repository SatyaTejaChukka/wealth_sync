import logging
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.api.deps import get_current_user
from app.core.database import get_db, engine
from app.core.config import settings
from app.models.user import User
from app.schemas.health_score import HealthScoreResponse
from app.services.health_score_calculator import HealthScoreCalculator

logger = logging.getLogger(__name__)

router = APIRouter()

@router.api_route("", methods=["GET", "HEAD"])
@router.api_route("/", methods=["GET", "HEAD"])
async def system_health_status():
    """System health check endpoint for monitoring and connection testing"""
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            db_status = [row[0] for row in result]

        return {
            "status": "ok",
            "app_name": settings.PROJECT_NAME,
            "env": settings.ENVIRONMENT,
            "db": db_status
        }
    except Exception as e:
        logger.error(f"Health check db query failed: {e}")
        return {
            "status": "ok",
            "app_name": settings.PROJECT_NAME,
            "env": settings.ENVIRONMENT,
            "db": "error"
        }

@router.get("/score", response_model=HealthScoreResponse)
async def get_health_score(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the current financial health score for the authenticated user"""
    score_data = await HealthScoreCalculator.calculate_overall_score(db, current_user.id)
    return HealthScoreResponse(**score_data)
