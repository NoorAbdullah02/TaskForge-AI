import pandas as pd
import numpy as np
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier
from sklearn.metrics import classification_report, accuracy_score

def train_attendance_model():
    # Base directory relative to this script
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(base_dir, 'models')
    data_dir = os.path.join(base_dir, 'training', 'data')
    os.makedirs(models_dir, exist_ok=True)
    
    data_path = os.path.join(data_dir, 'attendance_data.csv')
    if not os.path.exists(data_path):
        from generate_data import generate_attendance_data
        df = generate_attendance_data()
        os.makedirs(os.path.dirname(data_path), exist_ok=True)
        df.to_csv(data_path, index=False)
    else:
        df = pd.read_csv(data_path)
        
    print("Training Attendance Prediction Model...")
    
    feature_cols = [
        'day_of_week', 'month', 'historical_attendance_rate', 
        'leave_days_taken_last_30d', 'is_before_after_holiday', 'checkin_hour_avg'
    ]
    
    X = df[feature_cols]
    y = df['status']
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Save the scaler
    scaler_path = os.path.join(models_dir, 'attendance_scaler.joblib')
    joblib.dump(scaler, scaler_path)
    print(f"Saved scaler to {scaler_path}")
    
    # Train Classifier
    clf = XGBClassifier(
        n_estimators=120,
        max_depth=5,
        learning_rate=0.1,
        random_state=42,
        eval_metric='mlogloss',
        objective='multi:softprob',
        num_class=3
    )
    clf.fit(X_train_scaled, y_train)
    
    # Evaluate Classifier
    y_pred = clf.predict(X_test_scaled)
    acc = accuracy_score(y_test, y_pred)
    print(f"\nModel Accuracy: {acc:.4f}")
    print("\nClassification Report (0: Present, 1: Late, 2: Absent):")
    print(classification_report(y_test, y_pred, target_names=['Present', 'Late', 'Absent']))
    
    # Save Classifier
    clf_path = os.path.join(models_dir, 'attendance_classifier.joblib')
    joblib.dump(clf, clf_path)
    print(f"Saved classifier to {clf_path}")

if __name__ == "__main__":
    train_attendance_model()
