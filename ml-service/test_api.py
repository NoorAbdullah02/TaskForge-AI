import urllib.request
import json
import time
import sys

BASE_URL = "http://127.0.0.1:8000"

def make_post_request(path: str, data: dict):
    url = f"{BASE_URL}{path}"
    req_body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(
        url, 
        data=req_body, 
        headers={'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(req) as res:
            res_body = res.read().decode('utf-8')
            return json.loads(res_body)
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
        raise e
    except urllib.error.URLError as e:
        print(f"URL Error: {e.reason}")
        raise e

def test_root():
    print("\n--- Testing Root Endpoint ---")
    try:
        with urllib.request.urlopen(BASE_URL) as res:
            res_body = res.read().decode('utf-8')
            print("Root Response:", json.loads(res_body))
            return True
    except Exception as e:
        print("Root Endpoint failed:", str(e))
        return False

def test_delay_prediction():
    print("\n--- Testing Project Delay Prediction Endpoint ---")
    payload = {
        "task_count": 55,
        "milestone_count": 6,
        "team_size": 5,
        "days_total": 75.0,
        "priority_high_ratio": 0.3,
        "avg_task_duration_est": 6.0,
        "days_remaining": 12.0,
        "current_progress": 0.5
    }
    print("Payload:", json.dumps(payload, indent=2))
    response = make_post_request("/api/predict/delay", payload)
    print("Response:", json.dumps(response, indent=2))
    return response

def test_attendance_prediction():
    print("\n--- Testing Attendance Prediction Endpoint ---")
    payload = {
        "day_of_week": 0, 
        "month": 6,
        "historical_attendance_rate": 0.90,
        "leave_days_taken_last_30d": 2.0,
        "is_before_after_holiday": 1.0,
        "checkin_hour_avg": 9.40
    }
    print("Payload:", json.dumps(payload, indent=2))
    response = make_post_request("/api/predict/attendance", payload)
    print("Response:", json.dumps(response, indent=2))
    return response

def test_productivity_prediction():
    print("\n--- Testing Productivity Prediction Endpoint ---")
    payload = {
        "tasks_assigned_last_30d": 15,
        "tasks_completed_last_30d": 12,
        "avg_task_completion_days": 3.5,
        "attendance_rate_30d": 0.96,
        "overtime_hours_30d": 20.0,
        "collaboration_score": 85.0
    }
    print("Payload:", json.dumps(payload, indent=2))
    response = make_post_request("/api/predict/productivity", payload)
    print("Response:", json.dumps(response, indent=2))
    return response

def test_resource_recommendation():
    print("\n--- Testing Resource Recommendation Endpoint ---")
    payload = {
        "project_category": "Web App",
        "complexity_score": 8,
        "target_duration_days": 120.0,
        "budget_tier": 4,
        "available_members": [
            {
                "userId": 101,
                "name": "Alex Mercer",
                "role": "Developer",
                "current_task_load": 1,
                "historical_productivity": 88.5,
                "department": "Engineering"
            },
            {
                "userId": 102,
                "name": "Sarah Connor",
                "role": "Designer",
                "current_task_load": 3,
                "historical_productivity": 82.0,
                "department": "Design"
            },
            {
                "userId": 103,
                "name": "John Miller",
                "role": "Developer",
                "current_task_load": 6,
                "historical_productivity": 74.0,
                "department": "Engineering"
            },
            {
                "userId": 104,
                "name": "Emma Watson",
                "role": "QA",
                "current_task_load": 0,
                "historical_productivity": 91.0,
                "department": "QA"
            },
            {
                "userId": 105,
                "name": "Bruce Banner",
                "role": "Project Manager",
                "current_task_load": 2,
                "historical_productivity": 95.0,
                "department": "Management"
            }
        ]
    }
    print("Payload:", json.dumps(payload, indent=2))
    response = make_post_request("/api/predict/resource", payload)
    print("Response (Truncated Member List):")
    
    response_copy = response.copy()
    if "recommended_members" in response_copy:
        response_copy["recommended_members"] = response_copy["recommended_members"][:2]
    print(json.dumps(response_copy, indent=2))
    return response

def test_project_success_prediction():
    print("\n--- Testing Project Success Prediction Endpoint ---")
    payload = {
        "task_count": 55,
        "milestone_count": 6,
        "team_size": 5,
        "days_total": 75.0,
        "priority_high_ratio": 0.3,
        "avg_task_duration_est": 6.0,
        "days_remaining": 12.0,
        "current_progress": 0.5
    }
    print("Payload:", json.dumps(payload, indent=2))
    response = make_post_request("/api/predict/project-success", payload)
    print("Response:", json.dumps(response, indent=2))
    return response

def test_deadline_prediction():
    print("\n--- Testing Deadline Prediction Endpoint ---")
    payload = {
        "type": "project",
        "task_count": 50,
        "completed_count": 10,
        "team_size": 4,
        "days_remaining": 30.0,
        "avg_productivity": 85.0,
        "high_priority_ratio": 0.2
    }
    print("Payload:", json.dumps(payload, indent=2))
    response = make_post_request("/api/predict/deadline", payload)
    print("Response:", json.dumps(response, indent=2))
    return response

if __name__ == "__main__":
    print("Testing ML Service APIs...")
    success = test_root()
    if not success:
        print("FastAPI server is not running on http://127.0.0.1:8000. Please start the server first.")
        sys.exit(1)
        
    test_delay_prediction()
    test_attendance_prediction()
    test_productivity_prediction()
    test_resource_recommendation()
    test_project_success_prediction()
    test_deadline_prediction()
    print("\nAll endpoints verified successfully!")

