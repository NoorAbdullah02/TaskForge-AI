import pandas as pd
import numpy as np
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from xgboost import XGBRegressor
from sklearn.metrics import mean_squared_error, r2_score

def train_productivity_model():
    # Base directory relative to this script
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(base_dir, 'models')
    data_dir = os.path.join(base_dir, 'training', 'data')
    os.makedirs(models_dir, exist_ok=True)
    
    data_path = os.path.join(data_dir, 'productivity_data.csv')
    if not os.path.exists(data_path):
        from generate_data import generate_productivity_data
        df = generate_productivity_data()
        os.makedirs(os.path.dirname(data_path), exist_ok=True)
        df.to_csv(data_path, index=False)
    else:
        df = pd.read_csv(data_path)
        
    print("Training Productivity Prediction Model...")
    
    feature_cols = [
        'tasks_assigned_last_30d', 'tasks_completed_last_30d', 
        'avg_task_completion_days', 'attendance_rate_30d', 
        'overtime_hours_30d', 'collaboration_score'
    ]
    
    X = df[feature_cols]
    y = df['productivity_score']
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Save the scaler
    scaler_path = os.path.join(models_dir, 'productivity_scaler.joblib')
    joblib.dump(scaler, scaler_path)
    print(f"Saved scaler to {scaler_path}")
    
    # Train Regressor
    reg = XGBRegressor(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        random_state=42
    )
    reg.fit(X_train_scaled, y_train)
    
    # Evaluate Regressor
    y_pred = reg.predict(X_test_scaled)
    # Clip predictions to valid productivity score range [0, 100]
    y_pred = np.clip(y_pred, 0, 100)
    
    mse = mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    print(f"\nModel Performance:")
    print(f"Mean Squared Error: {mse:.4f}")
    print(f"R-squared Score: {r2:.4f}")
    
    # Save Regressor
    reg_path = os.path.join(models_dir, 'productivity_regressor.joblib')
    joblib.dump(reg, reg_path)
    print(f"Saved regressor to {reg_path}")

if __name__ == "__main__":
    train_productivity_model()
