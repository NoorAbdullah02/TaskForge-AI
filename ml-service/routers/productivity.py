from fastapi import APIRouter, HTTPException
from schemas.productivity import ProductivityPredictionRequest, ProductivityPredictionResponse
from services.predictor import PredictorService

router = APIRouter(prefix="/predict", tags=["Productivity Prediction"])
predictor = PredictorService()

@router.post("/productivity", response_model=ProductivityPredictionResponse)
def predict_developer_productivity(payload: ProductivityPredictionRequest):
    try:
        response = predictor.predict_productivity(payload)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
