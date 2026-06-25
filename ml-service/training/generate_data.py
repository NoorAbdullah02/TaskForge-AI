import pandas as pd
import numpy as np
import os

# Set random seed for reproducibility
np.random.seed(42)

def generate_delay_data(n_samples=2000):
    """
    Generates synthetic data for Project Delay prediction.
    Features:
      - task_count: total tasks (5 to 150)
      - milestone_count: milestone tasks (0 to 15)
      - team_size: size of the project team (2 to 20)
      - days_total: planned project duration in days (10 to 180)
      - priority_high_ratio: percentage of tasks with high/urgent priority (0.0 to 1.0)
      - avg_task_duration_est: average estimated days per task (2 to 15)
      - days_remaining: remaining days before deadline (0 to days_total)
      - current_progress: completed tasks ratio (0.0 to 1.0)
    Targets:
      - is_delayed (binary 0 or 1)
      - delay_days (continuous regression target >= 0)
    """
    task_count = np.random.randint(5, 150, size=n_samples)
    team_size = np.random.randint(2, 20, size=n_samples)
    
    # Milestones typically scale with task count
    milestone_count = np.array([np.random.randint(0, max(1, int(tc * 0.15))) for tc in task_count])
    
    days_total = np.random.randint(10, 180, size=n_samples)
    priority_high_ratio = np.random.uniform(0.0, 0.8, size=n_samples)
    avg_task_duration_est = np.random.uniform(2.0, 15.0, size=n_samples)
    
    # Days remaining and progress are correlated
    current_progress = np.random.uniform(0.0, 1.0, size=n_samples)
    
    # If progress is high, days remaining is likely low, and vice versa (with noise)
    days_remaining = []
    for i in range(n_samples):
        # average days remaining based on progress: days_total * (1 - progress) + noise
        rem = days_total[i] * (1.0 - current_progress[i]) + np.random.normal(0, 10)
        rem = np.clip(rem, 0, days_total[i])
        days_remaining.append(int(rem))
    days_remaining = np.array(days_remaining)

    # Let's define delay risk based on features
    # Required workload = task_count * avg_task_duration_est / team_size
    # Capacity remaining = days_remaining
    workload = (task_count * avg_task_duration_est) / team_size
    progress_gap = 1.0 - current_progress
    workload_remaining = workload * progress_gap
    
    # Risk factor (higher workload remaining compared to days remaining + high priority ratio)
    risk_factor = (workload_remaining / (days_remaining + 1.0)) * (1.0 + priority_high_ratio)
    
    # Output noise
    noise = np.random.normal(0, 0.5, size=n_samples)
    
    # Binary classification target: is_delayed
    # If risk_factor > 1.2, it's highly likely to be delayed
    delay_prob = 1.0 / (1.0 + np.exp(-(risk_factor - 1.2) * 3 + noise))
    is_delayed = (delay_prob > 0.5).astype(int)
    
    # Regression target: delay_days
    # Delayed days depends on the workload gap
    delay_days = np.zeros(n_samples)
    delayed_indices = is_delayed == 1
    if np.sum(delayed_indices) > 0:
        base_delay = (workload_remaining[delayed_indices] - days_remaining[delayed_indices])
        # Add some base project delay and noise
        delay_days[delayed_indices] = np.clip(base_delay * np.random.uniform(0.5, 1.5, size=np.sum(delayed_indices)) + np.random.uniform(1, 10, size=np.sum(delayed_indices)), 0, 45)
    
    # Round targets
    delay_days = np.round(delay_days, 1)

    df = pd.DataFrame({
        'task_count': task_count,
        'milestone_count': milestone_count,
        'team_size': team_size,
        'days_total': days_total,
        'priority_high_ratio': np.round(priority_high_ratio, 2),
        'avg_task_duration_est': np.round(avg_task_duration_est, 1),
        'days_remaining': days_remaining,
        'current_progress': np.round(current_progress, 2),
        'is_delayed': is_delayed,
        'delay_days': delay_days
    })
    
    return df

def generate_attendance_data(n_samples=3000):
    """
    Generates synthetic data for Attendance prediction.
    Features:
      - day_of_week: 0 (Mon) to 6 (Sun)
      - month: 1 to 12
      - historical_attendance_rate: 0.7 to 1.0
      - leave_days_taken_last_30d: 0 to 8
      - is_before_after_holiday: 0 or 1
      - checkin_hour_avg: average checkin hour (8.0 to 10.5)
    Targets:
      - status (0: present, 1: late, 2: absent)
    """
    day_of_week = np.random.randint(0, 7, size=n_samples)
    month = np.random.randint(1, 13, size=n_samples)
    historical_attendance_rate = np.random.uniform(0.75, 1.0, size=n_samples)
    leave_days_taken_last_30d = np.random.poisson(lam=1.0, size=n_samples)
    leave_days_taken_last_30d = np.clip(leave_days_taken_last_30d, 0, 10)
    
    # 0 or 1, Mondays (0) and Fridays (4) are more likely to be adjacent to weekends
    is_before_after_holiday = np.where((day_of_week == 0) | (day_of_week == 4), 
                                       np.random.choice([0, 1], p=[0.3, 0.7], size=n_samples),
                                       np.random.choice([0, 1], p=[0.8, 0.2], size=n_samples))
    
    checkin_hour_avg = np.random.uniform(8.2, 10.2, size=n_samples)
    
    # Determine logits for the 3 classes: present, late, absent
    # Base rates: present is high, late is medium, absent is low
    status = []
    for i in range(n_samples):
        # Baseline rates
        p_pres = 0.85
        p_late = 0.10
        p_abs = 0.05
        
        # Adjust based on historical attendance rate
        hist = historical_attendance_rate[i]
        p_pres += (hist - 0.9) * 0.5
        p_abs -= (hist - 0.9) * 0.3
        p_late -= (hist - 0.9) * 0.2
        
        # Day of week adjustments (absenteeism higher on Mon/Fri, lateness higher on Mon)
        if day_of_week[i] == 0:  # Mon
            p_pres -= 0.05
            p_late += 0.03
            p_abs += 0.02
        elif day_of_week[i] == 4:  # Fri
            p_pres -= 0.05
            p_abs += 0.05
        elif day_of_week[i] >= 5:  # Weekend - if working, higher absence
            p_pres -= 0.15
            p_abs += 0.15
            
        # Adjacency to holidays
        if is_before_after_holiday[i] == 1:
            p_pres -= 0.06
            p_abs += 0.04
            p_late += 0.02
            
        # Leave days taken in last 30d (burnout indicator/more likely to be absent)
        if leave_days_taken_last_30d[i] > 3:
            p_pres -= 0.08
            p_abs += 0.05
            p_late += 0.03
            
        # Checkin hour avg (higher average check-in time means higher probability of being late)
        ch = checkin_hour_avg[i]
        if ch > 9.5:
            p_pres -= 0.15
            p_late += 0.18
            p_abs -= 0.03 # slightly less present, mostly late
            
        # Normalize probabilities
        probs = np.array([p_pres, p_late, p_abs])
        probs = np.clip(probs, 0.01, 0.98)
        probs /= probs.sum()
        
        # Sample status
        status.append(np.random.choice([0, 1, 2], p=probs))
        
    df = pd.DataFrame({
        'day_of_week': day_of_week,
        'month': month,
        'historical_attendance_rate': np.round(historical_attendance_rate, 2),
        'leave_days_taken_last_30d': leave_days_taken_last_30d,
        'is_before_after_holiday': is_before_after_holiday,
        'checkin_hour_avg': np.round(checkin_hour_avg, 2),
        'status': status
    })
    
    return df

def generate_productivity_data(n_samples=2500):
    """
    Generates synthetic data for Productivity prediction.
    Features:
      - tasks_assigned_last_30d: tasks assigned (2 to 40)
      - tasks_completed_last_30d: tasks completed (0 to tasks_assigned_last_30d)
      - avg_task_completion_days: average completion days (1.0 to 15.0)
      - attendance_rate_30d: attendance rate past month (0.6 to 1.0)
      - overtime_hours_30d: overtime hours logged (0 to 60)
      - collaboration_score: comments or logs (0 to 100)
    Targets:
      - productivity_score (0.0 to 100.0)
    """
    tasks_assigned = np.random.randint(2, 40, size=n_samples)
    
    tasks_completed = []
    for ta in tasks_assigned:
        # completion rate ranges from 50% to 100% with some noise
        rate = np.random.uniform(0.5, 1.0)
        tasks_completed.append(int(ta * rate))
    tasks_completed = np.array(tasks_completed)
    
    avg_task_completion_days = np.random.uniform(1.0, 15.0, size=n_samples)
    attendance_rate_30d = np.random.uniform(0.7, 1.0, size=n_samples)
    overtime_hours_30d = np.random.uniform(0, 50, size=n_samples)
    collaboration_score = np.random.uniform(5, 95, size=n_samples)
    
    # Formulate productivity score (0-100)
    # Positively correlated with: completion ratio, attendance, collaboration
    # Negatively correlated with: average task completion days
    # Overtime has a non-linear effect (some overtime helps, too much leads to burnout/drop in efficiency)
    completion_ratio = np.where(tasks_assigned > 0, tasks_completed / tasks_assigned, 0.8)
    
    # Overtime factor: peak productivity around 20-30 hours, lower if 0 or >45
    overtime_factor = 1.0 - (np.abs(overtime_hours_30d - 25.0) / 50.0) * 0.3
    
    # Productivity score calculation
    prod_score = (
        completion_ratio * 45.0 + 
        (1.0 - (avg_task_completion_days / 15.0)) * 20.0 + 
        attendance_rate_30d * 15.0 + 
        (collaboration_score / 100.0) * 10.0 + 
        overtime_factor * 10.0
    )
    
    # Add noise
    noise = np.random.normal(0, 3.0, size=n_samples)
    prod_score = prod_score + noise
    prod_score = np.clip(prod_score, 10.0, 100.0)
    
    df = pd.DataFrame({
        'tasks_assigned_last_30d': tasks_assigned,
        'tasks_completed_last_30d': tasks_completed,
        'avg_task_completion_days': np.round(avg_task_completion_days, 1),
        'attendance_rate_30d': np.round(attendance_rate_30d, 2),
        'overtime_hours_30d': np.round(overtime_hours_30d, 1),
        'collaboration_score': np.round(collaboration_score, 1),
        'productivity_score': np.round(prod_score, 1)
    })
    
    return df

def generate_resource_data(n_samples=1500):
    """
    Generates synthetic data for Resource Recommendation.
    Features:
      - project_category: 0 (Web App), 1 (Mobile App), 2 (DevOps), 3 (UI/UX), 4 (Data Science)
      - complexity_score: 1 to 10
      - target_duration_days: planned duration in days (15 to 365)
      - budget_tier: 1 to 5
    Targets:
      - recommended_team_size (integer 1 to 15)
    """
    project_category = np.random.randint(0, 5, size=n_samples)
    complexity_score = np.random.randint(1, 11, size=n_samples)
    target_duration_days = np.random.randint(15, 365, size=n_samples)
    budget_tier = np.random.randint(1, 6, size=n_samples)
    
    # Logic for recommended team size:
    # Scale with complexity and budget tier
    # Negatively correlated with duration (longer duration for same complexity requires fewer concurrent people)
    # Some categories (Data Science, Web App) might require larger teams on average than DevOps/UIUX
    category_factors = {0: 1.2, 1: 1.1, 2: 0.8, 3: 0.7, 4: 1.3}
    cat_factor = np.array([category_factors[c] for c in project_category])
    
    base_team = (complexity_score * 0.9) + (budget_tier * 0.8) + (100.0 / target_duration_days)
    team_size = base_team * cat_factor + np.random.normal(0, 0.8, size=n_samples)
    
    # Ensure realistic range
    team_size = np.clip(np.round(team_size), 1, 15).astype(int)
    
    df = pd.DataFrame({
        'project_category': project_category,
        'complexity_score': complexity_score,
        'target_duration_days': target_duration_days,
        'budget_tier': budget_tier,
        'recommended_team_size': team_size
    })
    
    return df

if __name__ == "__main__":
    # Create training directory if not exists
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, 'training', 'data')
    os.makedirs(data_dir, exist_ok=True)
    
    print("Generating synthetic datasets...")
    
    df_delay = generate_delay_data()
    df_delay.to_csv(os.path.join(data_dir, 'delay_data.csv'), index=False)
    print(f"Generated delay data: {df_delay.shape}")
    
    df_attend = generate_attendance_data()
    df_attend.to_csv(os.path.join(data_dir, 'attendance_data.csv'), index=False)
    print(f"Generated attendance data: {df_attend.shape}")
    
    df_prod = generate_productivity_data()
    df_prod.to_csv(os.path.join(data_dir, 'productivity_data.csv'), index=False)
    print(f"Generated productivity data: {df_prod.shape}")
    
    df_res = generate_resource_data()
    df_res.to_csv(os.path.join(data_dir, 'resource_data.csv'), index=False)
    print(f"Generated resource data: {df_res.shape}")
    
    print("All synthetic datasets generated successfully!")
