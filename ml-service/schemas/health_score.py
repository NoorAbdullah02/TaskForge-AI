from pydantic import BaseModel
from typing import List

class HealthScoreRequest(BaseModel):
    completion_rate: float    # 0-1
    overdue_ratio: float      # 0-1
    team_size: int
    days_remaining_ratio: float  # 0-1 (days_left/days_total)
    priority_high_ratio: float
    blocker_count: int

class HealthScoreResponse(BaseModel):
    health_score: float       # 0-100
    health_level: str         # "critical" | "poor" | "fair" | "good" | "excellent"
    contributing_factors: List[str]
