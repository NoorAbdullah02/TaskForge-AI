from pydantic import BaseModel, Field

class DelayPredictionRequest(BaseModel):
    task_count: int = Field(..., ge=1, description="Total tasks in project")
    milestone_count: int = Field(..., ge=0, description="Tasks marked as milestones")
    team_size: int = Field(..., ge=1, description="Number of members in project team")
    days_total: float = Field(..., ge=1.0, description="Total planned project duration in days")
    priority_high_ratio: float = Field(..., ge=0.0, le=1.0, description="Ratio of high/urgent priority tasks (0.0 to 1.0)")
    avg_task_duration_est: float = Field(..., ge=0.1, description="Average estimated days per task")
    days_remaining: float = Field(..., ge=0.0, description="Remaining days until project deadline")
    current_progress: float = Field(..., ge=0.0, le=1.0, description="Ratio of completed tasks (0.0 to 1.0)")

    model_config = {
        "json_schema_extra": {
            "example": {
                "task_count": 45,
                "milestone_count": 5,
                "team_size": 4,
                "days_total": 60,
                "priority_high_ratio": 0.25,
                "avg_task_duration_est": 5.5,
                "days_remaining": 15,
                "current_progress": 0.4
            }
        }
    }

class DelayPredictionResponse(BaseModel):
    is_delayed: bool = Field(..., description="Flag indicating if the project is predicted to be delayed")
    delay_probability: float = Field(..., description="Probability score of the project being delayed")
    predicted_delay_days: float = Field(..., description="Estimated number of delay days beyond deadline")
