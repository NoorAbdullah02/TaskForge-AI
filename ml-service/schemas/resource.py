from pydantic import BaseModel, Field
from typing import List, Dict

class AvailableMember(BaseModel):
    userId: int = Field(..., description="ID of the user")
    name: str = Field(..., description="Name of the user")
    role: str = Field(..., description="Current role (e.g. Developer, Designer, QA, Project Manager)")
    current_task_load: int = Field(..., ge=0, description="Number of currently assigned active tasks")
    historical_productivity: float = Field(..., ge=0.0, le=100.0, description="Historical productivity score (0-100)")
    department: str = Field(..., description="Department name")

class ResourceRecommendationRequest(BaseModel):
    project_category: str = Field(..., description="Project Category, e.g. 'Web App', 'Mobile App', 'DevOps', 'UI/UX', 'Data Science'")
    complexity_score: int = Field(..., ge=1, le=10, description="Project complexity (1 to 10)")
    target_duration_days: float = Field(..., ge=1.0, description="Target duration of the project in days")
    budget_tier: int = Field(..., ge=1, le=5, description="Project budget tier (1 to 5)")
    available_members: List[AvailableMember] = Field(..., description="List of available members to evaluate")

    model_config = {
        "json_schema_extra": {
            "example": {
                "project_category": "Web App",
                "complexity_score": 7,
                "target_duration_days": 90.0,
                "budget_tier": 3,
                "available_members": [
                    {
                        "userId": 1,
                        "name": "John Doe",
                        "role": "Developer",
                        "current_task_load": 2,
                        "historical_productivity": 85.0,
                        "department": "Engineering"
                    },
                    {
                        "userId": 2,
                        "name": "Jane Smith",
                        "role": "Designer",
                        "current_task_load": 1,
                        "historical_productivity": 90.0,
                        "department": "Design"
                    },
                    {
                        "userId": 3,
                        "name": "Bob Johnson",
                        "role": "Developer",
                        "current_task_load": 5,
                        "historical_productivity": 70.0,
                        "department": "Engineering"
                    },
                    {
                        "userId": 4,
                        "name": "Alice Williams",
                        "role": "QA",
                        "current_task_load": 0,
                        "historical_productivity": 80.0,
                        "department": "QA"
                    }
                ]
            }
        }
    }

class RecommendedMember(BaseModel):
    userId: int = Field(..., description="ID of the user")
    name: str = Field(..., description="Name of the user")
    role: str = Field(..., description="Role of the user")
    suitability_score: float = Field(..., description="Calculated suitability score (0.0 to 100.0)")
    reasons: List[str] = Field(..., description="Bullet points justifying this recommendation")

class ResourceRecommendationResponse(BaseModel):
    recommended_team_size: int = Field(..., description="Predicted ideal team size")
    recommended_roles: Dict[str, int] = Field(..., description="Recommended distribution of roles")
    recommended_members: List[RecommendedMember] = Field(..., description="Available members ranked by compatibility")
