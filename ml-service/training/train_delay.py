import pandas as pd
import numpy as np
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier, XGBRegressor
from sklearn.metrics import classification_report, mean_squared_error, r2_score

def train_delay_models():
    # Base directory relative to this script
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(base_dir, 'models')
    data_dir = os.path.join(base_dir, 'training', 'data')
    os.makedirs(models_dir, exist_ok=True)
    
    # Check if data exists, generate if not
    data_path = os.path.join(data_dir, 'delay_data.csv')
    if not os.path.exists(data_path):
        from generate_data import generate_delay_data
        df = generate_delay_data()
        os.makedirs(os.path.dirname(data_path), exist_ok=True)
        df.to_csv(data_path, index=False)
    else:
        df = pd.read_csv(data_path)
        
    print("Training Delay Prediction Models...")
    
    # Feature columns
    feature_cols = [
        'task_count', 'milestone_count', 'team_size', 'days_total', 
        'priority_high_ratio', 'avg_task_duration_est', 'days_remaining', 'current_progress'
    ]
    
    X = df[feature_cols]
    y_class = df['is_delayed']
    y_reg = df['delay_days']
    
    # Split for classification
    X_train, X_test, y_class_train, y_class_test = train_test_split(
        X, y_class, test_size=0.2, random_state=42, stratify=y_class
    )
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Save the scaler
    scaler_path = os.path.join(models_dir, 'delay_scaler.joblib')
    joblib.dump(scaler, scaler_path)
    print(f"Saved scaler to {scaler_path}")
    
    # 1. Train Classifier (is_delayed)
    clf = XGBClassifier(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        random_state=42,
        eval_metric='logloss'
    )
    clf.fit(X_train_scaled, y_class_train)
    
    # Evaluate Classifier
    y_class_pred = clf.predict(X_test_scaled)
    print("\nClassification Report (is_delayed):")
    print(classification_report(y_class_test, y_class_pred))
    
    # Save Classifier
    clf_path = os.path.join(models_dir, 'delay_classifier.joblib')
    joblib.dump(clf, clf_path)
    print(f"Saved classifier to {clf_path}")
    
    # 2. Train Regressor (delay_days - only on delayed projects for training, or on all projects)
    # We will train on all projects, where non-delayed projects have 0 delay days
    X_reg_train, X_reg_test, y_reg_train, y_reg_test = train_test_split(
        X, y_reg, test_size=0.2, random_state=42
    )
    
    scaler_reg = StandardScaler()
    X_reg_train_scaled = scaler_reg.fit_transform(X_reg_train)
    X_reg_test_scaled = scaler_reg.transform(X_reg_test)
    
    # Save the regressor scaler
    scaler_reg_path = os.path.join(models_dir, 'delay_reg_scaler.joblib')
    joblib.dump(scaler_reg, scaler_reg_path)
    
    reg = XGBRegressor(
        n_estimators=150,
        max_depth=4,
        learning_rate=0.08,
        random_state=42
    )
    reg.fit(X_reg_train_scaled, y_reg_train)
    
    # Evaluate Regressor
    y_reg_pred = reg.predict(X_reg_test_scaled)
    # Clip predictions to 0 since negative delay days make no sense
    y_reg_pred = np.clip(y_reg_pred, 0, None)
    
    mse = mean_squared_error(y_reg_test, y_reg_pred)
    r2 = r2_score(y_reg_test, y_reg_pred)
    print(f"\nRegressor Performance:")
    print(f"Mean Squared Error: {mse:.4f}")
    print(f"R-squared Score: {r2:.4f}")
    
    # Save Regressor
    reg_path = os.path.join(models_dir, 'delay_regressor.joblib')
    joblib.dump(reg, reg_path)
    print(f"Saved regressor to {reg_path}")

if __name__ == "__main__":
    train_delay_models()
