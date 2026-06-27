import os
import pandas as pd
import numpy as np
from typing import List, Dict
from datetime import datetime, timedelta

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
        
        self.models_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
        self._load_models()
        self._initialized = True

    def _load_models(self):
        print("Bypassing Machine Learning models. Rule-Based Prediction Service is active.")

    def predict_delay(self, request: DelayPredictionRequest) -> DelayPredictionResponse:
        # Determine delay probability dynamically based on remaining work and deadline proximity
        work_rem_ratio = 1.0 - request.current_progress
        
        if work_rem_ratio <= 0:
            delay_prob = 0.02
            is_delayed = False
            predicted_delay_days = 0.0
        else:
            # How fast must progress happen per day?
            progress_rate_needed = work_rem_ratio / max(0.1, request.days_remaining)
            # Baseline expected rate: 1 task completed per task estimate * team efficiency
            expected_productivity = 1.0 / max(0.5, request.avg_task_duration_est * request.task_count / max(1.0, request.team_size))
            
            risk_multiplier = progress_rate_needed / max(0.001, expected_productivity)
            # High priority ratio increases likelihood of bottleneck delay
            delay_prob = 0.1 * risk_multiplier * (1.0 + request.priority_high_ratio * 0.5)
            # Clip probability between 0.01 and 0.98
            delay_prob = float(np.clip(delay_prob, 0.01, 0.98))
            
            is_delayed = delay_prob > 0.5
            
            if is_delayed:
                # Delay days estimate based on how much work remains versus capacity
                under_capacity_ratio = max(0.0, progress_rate_needed - expected_productivity)
                predicted_delay_days = round(under_capacity_ratio * request.days_total * (1.0 + request.priority_high_ratio), 1)
                predicted_delay_days = max(1.0, predicted_delay_days)
            else:
                predicted_delay_days = 0.0

        return DelayPredictionResponse(
            is_delayed=is_delayed,
            delay_probability=round(delay_prob, 3),
            predicted_delay_days=predicted_delay_days
        )

    def predict_attendance(self, request: AttendancePredictionRequest) -> AttendancePredictionResponse:
        # Rules for predicting user attendance
        # Baseline probability of being present
        p_present = request.historical_attendance_rate
        p_absent = 1.0 - p_present
        p_late = 0.05

        # Adjust for weekend/holiday proximity (higher absence risk)
        if request.is_before_after_holiday > 0.5:
            p_absent += 0.15
            p_present -= 0.15

        # Adjust for leave count (consecutive days fatigue)
        if request.leave_days_taken_last_30d > 3:
            p_absent += 0.05
            p_present -= 0.05

        # Adjust for average checkin time (high late indicator)
        if request.checkin_hour_avg > 9.5:
            p_late += 0.20
            p_present -= 0.20

        # Normalize probabilities
        total = max(0.001, p_present + p_absent + p_late)
        prob_pres = float(np.clip(p_present / total, 0.01, 0.98))
        prob_abs = float(np.clip(p_absent / total, 0.01, 0.98))
        prob_late = float(np.clip(p_late / total, 0.01, 0.98))

        # Re-normalize to exactly 1.0
        final_total = prob_pres + prob_abs + prob_late
        prob_pres = round(prob_pres / final_total, 3)
        prob_abs = round(prob_abs / final_total, 3)
        prob_late = round(prob_late / final_total, 3)

        probabilities = {
            "present": prob_pres,
            "late": prob_late,
            "absent": prob_abs
        }

        # Select highest probability as prediction status
        predicted_status = max(probabilities, key=probabilities.get)

        return AttendancePredictionResponse(
            predicted_status=predicted_status,
            probabilities=probabilities
        )

    def predict_productivity(self, request: ProductivityPredictionRequest) -> ProductivityPredictionResponse:
        # Rules for productivity scoring
        completion_ratio = request.tasks_completed_last_30d / max(1, request.tasks_assigned_last_30d)
        
        # Base score from task completion rate, attendance rate and team collaboration
        score = (completion_ratio * 40.0) + (request.attendance_rate_30d * 30.0) + (request.collaboration_score * 0.15)
        
        # Speed reward: faster avg completion time adds points
        score += max(0.0, (10.0 - request.avg_task_completion_days) * 1.5)
        # Moderate overtime reward
        score += min(10.0, request.overtime_hours_30d) * 0.5

        pred_score = float(np.clip(score, 10.0, 100.0))

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
        # Direct rule-based recommendation of team sizes
        recommended_team_size = int(np.clip(round(request.complexity_score * 1.8 + request.target_duration_days / 15.0), 1, max(1, len(request.available_members))))
        recommended_roles = self._calculate_role_distribution(request.project_category, recommended_team_size)

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
            dist["Developer"] = team_size

        total = sum(dist.values())
        if total != team_size:
            diff = team_size - total
            main_role = list(dist.keys())[0]
            dist[main_role] = max(0, dist[main_role] + diff)

        return dist

    def _evaluate_member_suitability(self, member: AvailableMember, request: ResourceRecommendationRequest) -> tuple[float, List[str]]:
        score = member.historical_productivity
        reasons = [f"Historical productivity score is high ({member.historical_productivity:.1f})"] if member.historical_productivity >= 80 else [f"Baseline productivity score is {member.historical_productivity:.1f}"]

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
        elif delay_res.delay_probability < 0.7:
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
            return DeadlinePredictionResponse(
                predicted_days_needed=0.0,
                predicted_date=datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
                confidence_score=0.98
            )

        if request.type == "task":
            base_days = 1.5
        elif request.type == "sprint":
            base_days = 2.5
        else:  # project
            base_days = 3.5

        # Normalize historical productivity to a multiplier
        prod_factor = 100.0 / max(10.0, request.avg_productivity)
        # Ratio of high priority increases overhead
        priority_factor = 1.0 + (request.high_priority_ratio * 0.5)

        total_man_days = remaining_tasks * base_days * prod_factor * priority_factor
        effective_team_size = max(1.0, float(request.team_size)) ** 0.8
        predicted_days = total_man_days / effective_team_size

        predicted_days_needed = max(1.0, round(predicted_days, 1))
        est_date = datetime.now() + timedelta(days=predicted_days_needed)
        predicted_date_str = est_date.strftime("%Y-%m-%dT%H:%M:%S")

        confidence = 0.95 - (request.high_priority_ratio * 0.15) - (remaining_tasks / 200.0)
        confidence = float(np.clip(confidence, 0.4, 0.98))

        return DeadlinePredictionResponse(
            predicted_days_needed=predicted_days_needed,
            predicted_date=predicted_date_str,
            confidence_score=round(confidence, 2)
        )

    def predict_burnout(self, request: BurnoutPredictionRequest) -> BurnoutPredictionResponse:
        # Overtime fatigue
        ot_impact = min(40.0, request.overtime_hours_30d) * 1.0
        # High workload
        workload_impact = request.workload_score * 0.35
        # Overdue tasks
        overdue_impact = min(5, request.tasks_overdue_count) * 5.0
        # No recent leaves taken
        leave_impact = min(30.0, request.days_since_last_leave / 3.0)
        # low attendance rates imply avoidance/disengagement
        attendance_impact = (1.0 - request.attendance_rate_30d) * 10.0

        total_burnout_score = ot_impact + workload_impact + overdue_impact + leave_impact + attendance_impact
        burnout_probability = min(0.98, max(0.01, total_burnout_score / 100.0))

        if burnout_probability < 0.25:
            burnout_risk = "low"
        elif burnout_probability < 0.55:
            burnout_risk = "medium"
        elif burnout_probability < 0.80:
            burnout_risk = "high"
        else:
            burnout_risk = "critical"

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
            burnout_probability=round(burnout_probability, 3),
            risk_factors=risk_factors
        )

    def predict_health_score(self, request: HealthScoreRequest) -> HealthScoreResponse:
        score = request.completion_rate * 55.0
        score -= request.overdue_ratio * 30.0
        score -= request.blocker_count * 7.5
        score += request.days_remaining_ratio * 15.0
        score -= request.priority_high_ratio * 10.0

        final_score = float(np.clip(score, 5.0, 100.0))

        if final_score < 40:
            level = "critical"
        elif final_score < 60:
            level = "poor"
        elif final_score < 75:
            level = "fair"
        elif final_score < 90:
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
            health_score=round(final_score, 1),
            health_level=level,
            contributing_factors=factors
        )
