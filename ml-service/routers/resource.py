from fastapi import APIRouter, HTTPException
from schemas.resource import ResourceRecommendationRequest, ResourceRecommendationResponse
from services.predictor import PredictorService

router = APIRouter(prefix="/predict", tags=["Resource Recommendation"])
predictor = PredictorService()

@router.post("/resource", response_model=ResourceRecommendationResponse)
def recommend_project_resources(payload: ResourceRecommendationRequest):
    try:
        response = predictor.recommend_resources(payload)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation error: {str(e)}")
