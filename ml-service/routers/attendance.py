from fastapi import APIRouter, HTTPException
from schemas.attendance import AttendancePredictionRequest, AttendancePredictionResponse
from services.predictor import PredictorService

router = APIRouter(prefix="/predict", tags=["Attendance Prediction"])
predictor = PredictorService()

@router.post("/attendance", response_model=AttendancePredictionResponse)
def predict_attendance_status(payload: AttendancePredictionRequest):
    try:
        response = predictor.predict_attendance(payload)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
