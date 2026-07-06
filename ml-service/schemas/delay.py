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

class ProjectSuccessRequest(BaseModel):
    task_count: int = Field(..., description="Total tasks")
    milestone_count: int = Field(..., description="Milestone count")
    team_size: int = Field(..., description="Team size")
    days_total: float = Field(..., description="Total duration in days")
    priority_high_ratio: float = Field(..., description="High priority tasks ratio")
    avg_task_duration_est: float = Field(..., description="Average task duration estimate in days")
    days_remaining: float = Field(..., description="Days remaining")
    current_progress: float = Field(..., description="Current progress (0 to 1)")

class ProjectSuccessResponse(BaseModel):
    success_probability: float = Field(..., description="Probability of success (0-100)")
    delay_probability: float = Field(..., description="Probability of delay (0-100)")
    risk_level: str = Field(..., description="Risk level (low, medium, high)")

class DeadlinePredictionRequest(BaseModel):
    type: str = Field(..., description="Prediction target type ('task', 'sprint', or 'project')")
    task_count: int = Field(..., description="Total tasks in scope")
    completed_count: int = Field(0, description="Completed tasks in scope")
    team_size: int = Field(1, description="Team size in scope")
    days_remaining: float = Field(..., description="Planned days remaining")
    avg_productivity: float = Field(80.0, description="Average historical productivity of team (0-100)")
    high_priority_ratio: float = Field(0.2, description="Ratio of high/critical priority tasks")

class DeadlinePredictionResponse(BaseModel):
    predicted_days_needed: float = Field(..., description="Estimated days needed to complete")
    predicted_date: str = Field(..., description="Estimated completion date (ISO string)")
    confidence_score: float = Field(..., description="Confidence score (0.0 to 1.0)")
