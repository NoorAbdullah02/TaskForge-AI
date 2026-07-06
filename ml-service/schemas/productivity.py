from pydantic import BaseModel, Field

class ProductivityPredictionRequest(BaseModel):
    tasks_assigned_last_30d: int = Field(..., ge=0, description="Tasks assigned to the user in last 30 days")
    tasks_completed_last_30d: int = Field(..., ge=0, description="Tasks completed by the user in last 30 days")
    avg_task_completion_days: float = Field(..., ge=0.0, description="Average duration in days to complete a task")
    attendance_rate_30d: float = Field(..., ge=0.0, le=1.0, description="Attendance rate in last 30 days")
    overtime_hours_30d: float = Field(..., ge=0.0, description="Overtime hours logged in last 30 days")
    collaboration_score: float = Field(..., ge=0.0, le=100.0, description="Collaboration activity metric (0-100)")

    model_config = {
        "json_schema_extra": {
            "example": {
                "tasks_assigned_last_30d": 12,
                "tasks_completed_last_30d": 10,
                "avg_task_completion_days": 4.2,
                "attendance_rate_30d": 0.95,
                "overtime_hours_30d": 15.0,
                "collaboration_score": 75.0
            }
        }
    }

class ProductivityPredictionResponse(BaseModel):
    predicted_productivity_score: float = Field(..., description="Predicted productivity score from 0.0 to 100.0")
    productivity_level: str = Field(..., description="Qualitative productivity level: 'low', 'medium', 'high'")
