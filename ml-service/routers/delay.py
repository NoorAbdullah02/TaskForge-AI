from fastapi import APIRouter, HTTPException
from schemas.delay import (
    DelayPredictionRequest, DelayPredictionResponse,
    ProjectSuccessRequest, ProjectSuccessResponse,
    DeadlinePredictionRequest, DeadlinePredictionResponse
)
from services.predictor import PredictorService

router = APIRouter(prefix="/predict", tags=["Delay and Success Prediction"])
predictor = PredictorService()

@router.post("/delay", response_model=DelayPredictionResponse)
def predict_project_delay(payload: DelayPredictionRequest):
    try:
        response = predictor.predict_delay(payload)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@router.post("/project-success", response_model=ProjectSuccessResponse)
def predict_project_success_status(payload: ProjectSuccessRequest):
    try:
        response = predictor.predict_project_success(payload)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Project success prediction error: {str(e)}")

@router.post("/deadline", response_model=DeadlinePredictionResponse)
def predict_deadline_dates(payload: DeadlinePredictionRequest):
    try:
        response = predictor.predict_deadline(payload)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deadline prediction error: {str(e)}")

