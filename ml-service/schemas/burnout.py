from pydantic import BaseModel
from typing import List

class BurnoutPredictionRequest(BaseModel):
    overtime_hours_30d: float
    tasks_overdue_count: int
    attendance_rate_30d: float  # 0-1
    avg_task_completion_days: float
    workload_score: float       # 0-100 (active tasks / capacity)
    days_since_last_leave: int

class BurnoutPredictionResponse(BaseModel):
    burnout_risk: str           # "low" | "medium" | "high" | "critical"
    burnout_probability: float
    risk_factors: List[str]
