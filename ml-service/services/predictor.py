import os
import joblib
import pandas as pd
import numpy as np
from typing import List, Dict

from schemas.delay import DelayPredictionRequest, DelayPredictionResponse
from schemas.attendance import AttendancePredictionRequest, AttendancePredictionResponse
from schemas.productivity import ProductivityPredictionRequest, ProductivityPredictionResponse
from schemas.resource import ResourceRecommendationRequest, ResourceRecommendationResponse, RecommendedMember, AvailableMember

class PredictorService:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(PredictorService, cls).__new__(cls, *args, **kwargs)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        
        # Base models path
        self.models_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
        
        # Load all models and preprocessing components
        self._load_models()
        self._initialized = True

    def _load_models(self):
        print("Loading ML models into memory...")
        try:
            # 1. Delay Prediction Models
            self.delay_scaler = joblib.load(os.path.join(self.models_dir, "delay_scaler.joblib"))
            self.delay_classifier = joblib.load(os.path.join(self.models_dir, "delay_classifier.joblib"))
            self.delay_reg_scaler = joblib.load(os.path.join(self.models_dir, "delay_reg_scaler.joblib"))
            self.delay_regressor = joblib.load(os.path.join(self.models_dir, "delay_regressor.joblib"))
            
            # 2. Attendance Model
            self.attendance_scaler = joblib.load(os.path.join(self.models_dir, "attendance_scaler.joblib"))
            self.attendance_classifier = joblib.load(os.path.join(self.models_dir, "attendance_classifier.joblib"))
            
            # 3. Productivity Model
            self.productivity_scaler = joblib.load(os.path.join(self.models_dir, "productivity_scaler.joblib"))
            self.productivity_regressor = joblib.load(os.path.join(self.models_dir, "productivity_regressor.joblib"))
            
            # 4. Resource Recommendation Model
            self.resource_preprocessor = joblib.load(os.path.join(self.models_dir, "resource_preprocessor.joblib"))
            self.resource_regressor = joblib.load(os.path.join(self.models_dir, "resource_regressor.joblib"))
            
            print("All models loaded successfully!")
        except Exception as e:
            print(f"Error loading models: {e}")
            raise e

    def predict_delay(self, request: DelayPredictionRequest) -> DelayPredictionResponse:
        # Prepare input features as dataframe to preserve header structure (if needed) or numpy array
        features = np.array([[
            request.task_count,
            request.milestone_count,
            request.team_size,
            request.days_total,
            request.priority_high_ratio,
            request.avg_task_duration_est,
            request.days_remaining,
            request.current_progress
        ]])
        
        # Scale for classification
        features_clf_scaled = self.delay_scaler.transform(features)
        is_delayed = bool(self.delay_classifier.predict(features_clf_scaled)[0])
        delay_prob = float(self.delay_classifier.predict_proba(features_clf_scaled)[0][1])
        
        # Scale for regression
        features_reg_scaled = self.delay_reg_scaler.transform(features)
        predicted_delay_days = float(self.delay_regressor.predict(features_reg_scaled)[0])
        
        # Clip delay days
        if not is_delayed or predicted_delay_days < 0:
            predicted_delay_days = 0.0
        else:
            predicted_delay_days = round(predicted_delay_days, 1)

        return DelayPredictionResponse(
            is_delayed=is_delayed,
            delay_probability=round(delay_prob, 3),
            predicted_delay_days=predicted_delay_days
        )

    def predict_attendance(self, request: AttendancePredictionRequest) -> AttendancePredictionResponse:
        features = np.array([[
            request.day_of_week,
            request.month,
            request.historical_attendance_rate,
            request.leave_days_taken_last_30d,
            request.is_before_after_holiday,
            request.checkin_hour_avg
        ]])
        
        features_scaled = self.attendance_scaler.transform(features)
        probs = self.attendance_classifier.predict_proba(features_scaled)[0]
        
        status_map = {0: "present", 1: "late", 2: "absent"}
        pred_class = int(np.argmax(probs))
        
        probabilities = {
            "present": round(float(probs[0]), 3),
            "late": round(float(probs[1]), 3),
            "absent": round(float(probs[2]), 3)
        }
        
        return AttendancePredictionResponse(
            predicted_status=status_map[pred_class],
            probabilities=probabilities
        )

    def predict_productivity(self, request: ProductivityPredictionRequest) -> ProductivityPredictionResponse:
        features = np.array([[
            request.tasks_assigned_last_30d,
            request.tasks_completed_last_30d,
            request.avg_task_completion_days,
            request.attendance_rate_30d,
            request.overtime_hours_30d,
            request.collaboration_score
        ]])
        
        features_scaled = self.productivity_scaler.transform(features)
        pred_score = float(self.productivity_regressor.predict(features_scaled)[0])
        pred_score = np.clip(pred_score, 0.0, 100.0)
        
        if pred_score < 60.0:
            level = "low"
        elif pred_score < 85.0:
            level = "medium"
        else:
            level = "high"
            
        return ProductivityPredictionResponse(
            predicted_productivity_score=round(pred_score, 1),
            productivity_level=level
        )

    def recommend_resources(self, request: ResourceRecommendationRequest) -> ResourceRecommendationResponse:
        # Category encoder mapping
        cat_mapping = {
            "Web App": 0,
            "Mobile App": 1,
            "DevOps": 2,
            "UI/UX": 3,
            "Data Science": 4
        }
        
        cat_code = cat_mapping.get(request.project_category, 0)
        
        # Prepare input for ML team size prediction
        df_input = pd.DataFrame([{
            'project_category': cat_code,
            'complexity_score': request.complexity_score,
            'target_duration_days': request.target_duration_days,
            'budget_tier': request.budget_tier
        }])
        
        # Transform and predict team size
        processed_input = self.resource_preprocessor.transform(df_input)
        pred_size = float(self.resource_regressor.predict(processed_input)[0])
        # round and clip to range
        recommended_team_size = int(np.clip(round(pred_size), 1, max(1, len(request.available_members))))
        
        # Role distribution planning
        recommended_roles = self._calculate_role_distribution(request.project_category, recommended_team_size)
        
        # Calculate suitability score for available members
        ranked_members = []
        for member in request.available_members:
            score, reasons = self._evaluate_member_suitability(member, request)
            ranked_members.append(RecommendedMember(
                userId=member.userId,
                name=member.name,
                role=member.role,
                suitability_score=round(score, 1),
                reasons=reasons
            ))
            
        # Sort members by suitability score descending
        ranked_members.sort(key=lambda m: m.suitability_score, reverse=True)
        
        return ResourceRecommendationResponse(
            recommended_team_size=recommended_team_size,
            recommended_roles=recommended_roles,
            recommended_members=ranked_members
        )
        
    def _calculate_role_distribution(self, category: str, team_size: int) -> Dict[str, int]:
        dist = {}
        if team_size <= 0:
            return dist
            
        if category in ["Web App", "Mobile App"]:
            # Standard breakdown
            if team_size == 1:
                dist["Developer"] = 1
            elif team_size == 2:
                dist["Developer"] = 1
                dist["Designer"] = 1
            else:
                dist["Project Manager"] = 1
                dist["Designer"] = 1
                if team_size >= 5:
                    dist["QA"] = 1
                    dist["Developer"] = team_size - 3
                else:
                    dist["Developer"] = team_size - 2
        elif category == "UI/UX":
            if team_size == 1:
                dist["Designer"] = 1
            else:
                dist["Designer"] = max(1, int(team_size * 0.6))
                dist["Developer"] = max(1, team_size - dist["Designer"])
        elif category == "DevOps":
            if team_size == 1:
                dist["DevOps"] = 1
            else:
                dist["DevOps"] = max(1, int(team_size * 0.7))
                dist["QA"] = max(1, team_size - dist["DevOps"])
        elif category == "Data Science":
            if team_size == 1:
                dist["Data Scientist"] = 1
            else:
                dist["Data Scientist"] = max(1, int(team_size * 0.6))
                dist["Developer"] = max(1, int(team_size * 0.3))
                dist["Project Manager"] = max(1, team_size - dist["Data Scientist"] - dist["Developer"])
        else:
            # Default
            dist["Developer"] = team_size
            
        # Ensure sum equals team_size
        total = sum(dist.values())
        if total != team_size:
            diff = team_size - total
            # Add/subtract from developer or main role
            main_role = list(dist.keys())[0]
            dist[main_role] = max(0, dist[main_role] + diff)
            
        return dist

    def _evaluate_member_suitability(self, member: AvailableMember, request: ResourceRecommendationRequest) -> tuple[float, List[str]]:
        score = member.historical_productivity
        reasons = [f"Historical productivity score is high ({member.historical_productivity:.1f})"] if member.historical_productivity >= 80 else [f"Baseline productivity score is {member.historical_productivity:.1f}"]
        
        # Task load penalty (ideal: <= 2 tasks)
        if member.current_task_load == 0:
            score += 10
            reasons.append("Currently has no tasks assigned (+10 suitability)")
        elif member.current_task_load <= 2:
            score += 5
            reasons.append(f"Low current workload with {member.current_task_load} tasks (+5 suitability)")
        elif member.current_task_load >= 5:
            score -= 15
            reasons.append(f"High workload warning: currently has {member.current_task_load} active tasks (-15 suitability)")
        else:
            score -= 5
            reasons.append(f"Moderate workload with {member.current_task_load} tasks (-5 suitability)")
            
        # Role match based on project category
        dev_categories = ["Web App", "Mobile App", "DevOps", "Data Science"]
        design_categories = ["UI/UX"]
        
        role_lower = member.role.lower()
        cat_lower = request.project_category.lower()
        
        role_matched = False
        if "designer" in role_lower and cat_lower in design_categories:
            score += 20
            role_matched = True
        elif "developer" in role_lower and cat_lower in dev_categories:
            score += 20
            role_matched = True
        elif "devops" in role_lower and cat_lower == "devops":
            score += 20
            role_matched = True
        elif "qa" in role_lower and cat_lower in ["web app", "mobile app", "devops"]:
            score += 15
            role_matched = True
            
        if role_matched:
            reasons.append(f"Role match: {member.role} is highly compatible with {request.project_category} projects (+20 suitability)")
            
        # Department context match
        dept_lower = member.department.lower()
        dept_matched = False
        if "engineering" in dept_lower and cat_lower in ["web app", "mobile app", "devops", "data science"]:
            score += 10
            dept_matched = True
        elif "design" in dept_lower and cat_lower == "ui/ux":
            score += 10
            dept_matched = True
            
        if dept_matched:
            reasons.append(f"Department alignment: {member.department} matches project nature (+10 suitability)")
            
        # Clip score between 10 and 100
        final_score = np.clip(score, 10.0, 100.0)
        return float(final_score), reasons
