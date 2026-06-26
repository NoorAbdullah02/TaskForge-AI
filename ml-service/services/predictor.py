import os
import joblib
import pandas as pd
import numpy as np
from typing import List, Dict

from schemas.delay import (
    DelayPredictionRequest, DelayPredictionResponse,
    ProjectSuccessRequest, ProjectSuccessResponse,
    DeadlinePredictionRequest, DeadlinePredictionResponse
)
from schemas.attendance import AttendancePredictionRequest, AttendancePredictionResponse
from schemas.productivity import ProductivityPredictionRequest, ProductivityPredictionResponse
from schemas.resource import ResourceRecommendationRequest, ResourceRecommendationResponse, RecommendedMember, AvailableMember
from schemas.burnout import BurnoutPredictionRequest, BurnoutPredictionResponse
from schemas.health_score import HealthScoreRequest, HealthScoreResponse


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
            
            # 5. Burnout Model (LightGBM)
            burnout_path = os.path.join(self.models_dir, "burnout_classifier.joblib")
            if os.path.exists(burnout_path):
                self.burnout_classifier = joblib.load(burnout_path)
            else:
                print("Burnout model not found. Training inline with LightGBM on synthetic data...")
                import lightgbm as lgb
                # Generate synthetic data for training
                # Features: overtime_hours_30d, tasks_overdue_count, attendance_rate_30d, avg_task_completion_days, workload_score, days_since_last_leave
                np.random.seed(42)
                X = np.random.rand(200, 6)
                # Scale columns to realistic values
                X[:, 0] *= 40.0   # overtime hours: 0-40
                X[:, 1] = np.random.randint(0, 10, 200) # tasks overdue: 0-9
                X[:, 2] = 0.5 + X[:, 2]*0.5 # attendance: 0.5-1.0
                X[:, 3] *= 15.0   # avg completion days: 0-15
                X[:, 4] *= 100.0  # workload: 0-100
                X[:, 5] = np.random.randint(0, 60, 200) # days since last leave: 0-59

                # Create targets (0: Low, 1: Medium, 2: High, 3: Critical)
                y = []
                for row in X:
                    score = (row[0] * 0.4) + (row[1] * 3.0) + ((1.0 - row[2]) * 10.0) + (row[3] * 0.5) + (row[4] * 0.2) + (row[5] * 0.1)
                    if score < 15:
                        y.append(0)
                    elif score < 30:
                        y.append(1)
                    elif score < 45:
                        y.append(2)
                    else:
                        y.append(3)
                y = np.array(y)

                # Train LightGBM classifier
                train_data = lgb.Dataset(X, label=y)
                params = {
                    'objective': 'multiclass',
                    'num_class': 4,
                    'metric': 'multi_logloss',
                    'boosting_type': 'gbdt',
                    'verbosity': -1,
                    'seed': 42
                }
                model = lgb.train(params, train_data, num_boost_round=50)
                self.burnout_classifier = model
                joblib.dump(model, burnout_path)
                print("Burnout model trained and saved successfully!")

            # 6. Health Score Model (CatBoost)
            health_path = os.path.join(self.models_dir, "health_regressor.joblib")
            if os.path.exists(health_path):
                self.health_regressor = joblib.load(health_path)
            else:
                print("Health score model not found. Training inline with CatBoost on synthetic data...")
                from catboost import CatBoostRegressor
                # Features: completion_rate, overdue_ratio, team_size, days_remaining_ratio, priority_high_ratio, blocker_count
                np.random.seed(42)
                X = np.random.rand(200, 6)
                X[:, 0] = 0.3 + X[:, 0]*0.7 # completion rate: 0.3-1.0
                X[:, 1] = X[:, 1]*0.5 # overdue ratio: 0.0-0.5
                X[:, 2] = np.random.randint(1, 15, 200) # team size
                X[:, 3] = X[:, 3] # days remaining ratio
                X[:, 4] = X[:, 4]*0.8 # priority high ratio
                X[:, 5] = np.random.randint(0, 5, 200) # blocker count

                y = []
                for row in X:
                    score = (row[0] * 40.0) - (row[1] * 20.0) + (min(row[2], 8) * 2.0) + (row[3] * 15.0) - (row[4] * 10.0) - (row[5] * 8.0) + 40.0
                    y.append(np.clip(score, 0.0, 100.0))
                y = np.array(y)

                model = CatBoostRegressor(iterations=50, depth=4, learning_rate=0.1, verbose=0, random_seed=42)
                model.fit(X, y)
                self.health_regressor = model
                joblib.dump(model, health_path)
                print("Health score model trained and saved successfully!")

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

    def predict_project_success(self, request: ProjectSuccessRequest) -> ProjectSuccessResponse:
        delay_req = DelayPredictionRequest(
            task_count=request.task_count,
            milestone_count=request.milestone_count,
            team_size=request.team_size,
            days_total=request.days_total,
            priority_high_ratio=request.priority_high_ratio,
            avg_task_duration_est=request.avg_task_duration_est,
            days_remaining=request.days_remaining,
            current_progress=request.current_progress
        )
        delay_res = self.predict_delay(delay_req)
        
        delay_prob_pct = round(delay_res.delay_probability * 100.0, 1)
        success_prob_pct = round(100.0 - delay_prob_pct, 1)
        
        if delay_res.delay_probability < 0.3:
            risk_level = "low"
        elif delay_res.delay_probability < 0.75:
            risk_level = "medium"
        else:
            risk_level = "high"
            
        return ProjectSuccessResponse(
            success_probability=success_prob_pct,
            delay_probability=delay_prob_pct,
            risk_level=risk_level
        )

    def predict_deadline(self, request: DeadlinePredictionRequest) -> DeadlinePredictionResponse:
        remaining_tasks = max(0, request.task_count - request.completed_count)
        
        if remaining_tasks == 0:
            from datetime import datetime
            return DeadlinePredictionResponse(
                predicted_days_needed=0.0,
                predicted_date=datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
                confidence_score=1.0
            )
            
        if request.type == "task":
            base_days = 2.0
        elif request.type == "sprint":
            base_days = 3.0
        else: # project
            base_days = 4.0
            
        prod_factor = 100.0 / max(10.0, request.avg_productivity)
        priority_factor = 1.0 + (request.high_priority_ratio * 0.8)
        
        total_man_days = remaining_tasks * base_days * prod_factor * priority_factor
        effective_team_size = max(1.0, float(request.team_size)) ** 0.85
        predicted_days = total_man_days / effective_team_size
        
        predicted_days_needed = max(1.0, round(predicted_days, 1))
        
        from datetime import datetime, timedelta
        est_date = datetime.now() + timedelta(days=predicted_days_needed)
        predicted_date_str = est_date.strftime("%Y-%m-%dT%H:%M:%S")
        
        confidence = 0.95 - (request.high_priority_ratio * 0.25)
        confidence -= (remaining_tasks / 100.0) * 0.05
        confidence = float(np.clip(confidence, 0.4, 0.98))
        
        return DeadlinePredictionResponse(
            predicted_days_needed=predicted_days_needed,
            predicted_date=predicted_date_str,
            confidence_score=round(confidence, 2)
        )

    def predict_burnout(self, request: BurnoutPredictionRequest) -> BurnoutPredictionResponse:
        features = np.array([[
            request.overtime_hours_30d,
            request.tasks_overdue_count,
            request.attendance_rate_30d,
            request.avg_task_completion_days,
            request.workload_score,
            request.days_since_last_leave
        ]])
        # lightgbm predict on raw train object returns class probabilities of shape (n_samples, n_classes)
        preds = self.burnout_classifier.predict(features)[0]
        pred_class = int(np.argmax(preds))
        prob = float(preds[pred_class])
        
        status_map = {0: "low", 1: "medium", 2: "high", 3: "critical"}
        burnout_risk = status_map[pred_class]
        
        risk_factors = []
        if request.overtime_hours_30d > 20:
            risk_factors.append(f"High overtime hours: {request.overtime_hours_30d}h in last 30 days")
        if request.tasks_overdue_count > 3:
            risk_factors.append(f"Multiple overdue tasks: {request.tasks_overdue_count} tasks")
        if request.attendance_rate_30d < 0.85:
            risk_factors.append(f"Low attendance rate: {request.attendance_rate_30d * 100:.1f}%")
        if request.workload_score > 80:
            risk_factors.append(f"Extreme workload score: {request.workload_score:.1f}/100")
        if request.days_since_last_leave > 45:
            risk_factors.append(f"No recent time off: {request.days_since_last_leave} days since last leave")
            
        if not risk_factors:
            risk_factors.append("No critical risk factors identified")
            
        return BurnoutPredictionResponse(
            burnout_risk=burnout_risk,
            burnout_probability=round(prob, 3),
            risk_factors=risk_factors
        )

    def predict_health_score(self, request: HealthScoreRequest) -> HealthScoreResponse:
        features = np.array([[
            request.completion_rate,
            request.overdue_ratio,
            request.team_size,
            request.days_remaining_ratio,
            request.priority_high_ratio,
            request.blocker_count
        ]])
        score = float(self.health_regressor.predict(features)[0])
        score = np.clip(score, 0.0, 100.0)
        
        if score < 40:
            level = "critical"
        elif score < 60:
            level = "poor"
        elif score < 75:
            level = "fair"
        elif score < 90:
            level = "good"
        else:
            level = "excellent"
            
        factors = []
        if request.completion_rate < 0.5:
            factors.append(f"Low completion rate: {request.completion_rate * 100:.1f}%")
        if request.overdue_ratio > 0.2:
            factors.append(f"High ratio of overdue tasks: {request.overdue_ratio * 100:.1f}%")
        if request.blocker_count > 0:
            factors.append(f"Active blockers: {request.blocker_count} items")
        if request.days_remaining_ratio < 0.15 and request.completion_rate < 0.8:
            factors.append("Approaching deadline with significant work remaining")
            
        if not factors:
            factors.append("Strong overall metrics")
            
        return HealthScoreResponse(
            health_score=round(score, 1),
            health_level=level,
            contributing_factors=factors
        )


