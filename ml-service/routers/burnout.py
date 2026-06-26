from fastapi import APIRouter, HTTPException
from schemas.burnout import BurnoutPredictionRequest, BurnoutPredictionResponse
from schemas.health_score import HealthScoreRequest, HealthScoreResponse
from services.predictor import PredictorService

router = APIRouter(prefix="/predict", tags=["Burnout and Health Prediction"])
predictor = PredictorService()

@router.post("/burnout", response_model=BurnoutPredictionResponse)
def predict_burnout(payload: BurnoutPredictionRequest):
    try:
        response = predictor.predict_burnout(payload)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Burnout prediction error: {str(e)}")

@router.post("/health-score", response_model=HealthScoreResponse)
def predict_health_score(payload: HealthScoreRequest):
    try:
        response = predictor.predict_health_score(payload)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health score prediction error: {str(e)}")
