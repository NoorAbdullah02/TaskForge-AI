from pydantic import BaseModel, Field
from typing import Dict

class AttendancePredictionRequest(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6, description="Day of the week (0=Monday, 6=Sunday)")
    month: int = Field(..., ge=1, le=12, description="Month of the year (1-12)")
    historical_attendance_rate: float = Field(..., ge=0.0, le=1.0, description="User's past attendance rate (0.0 to 1.0)")
    leave_days_taken_last_30d: float = Field(..., ge=0, description="Leave days taken in the last 30 days")
    is_before_after_holiday: float = Field(..., description="1.0 if adjacent to a holiday/weekend, else 0.0")
    checkin_hour_avg: float = Field(..., ge=0.0, le=24.0, description="Average checkin hour (e.g. 9.25 for 9:15 AM)")

    model_config = {
        "json_schema_extra": {
            "example": {
                "day_of_week": 0,
                "month": 6,
                "historical_attendance_rate": 0.92,
                "leave_days_taken_last_30d": 1,
                "is_before_after_holiday": 1.0,
                "checkin_hour_avg": 9.15
            }
        }
    }

class AttendancePredictionResponse(BaseModel):
    predicted_status: str = Field(..., description="Predicted status: 'present', 'late', 'absent'")
    probabilities: Dict[str, float] = Field(..., description="Probability distribution of each status")
