from fastapi import APIRouter, HTTPException
from schemas.delay import DelayPredictionRequest, DelayPredictionResponse
from services.predictor import PredictorService

router = APIRouter(prefix="/predict", tags=["Delay Prediction"])
predictor = PredictorService()

@router.post("/delay", response_model=DelayPredictionResponse)
def predict_project_delay(payload: DelayPredictionRequest):
    try:
        response = predictor.predict_delay(payload)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
