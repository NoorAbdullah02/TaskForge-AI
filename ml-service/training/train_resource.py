import pandas as pd
import numpy as np
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from xgboost import XGBRegressor
from sklearn.metrics import mean_squared_error, r2_score

def train_resource_model():
    # Base directory relative to this script
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(base_dir, 'models')
    data_dir = os.path.join(base_dir, 'training', 'data')
    os.makedirs(models_dir, exist_ok=True)
    
    data_path = os.path.join(data_dir, 'resource_data.csv')
    if not os.path.exists(data_path):
        from generate_data import generate_resource_data
        df = generate_resource_data()
        os.makedirs(os.path.dirname(data_path), exist_ok=True)
        df.to_csv(data_path, index=False)
    else:
        df = pd.read_csv(data_path)
        
    print("Training Resource Recommendation Model...")
    
    # Feature columns
    categorical_cols = ['project_category']
    numerical_cols = ['complexity_score', 'target_duration_days', 'budget_tier']
    
    X = df[categorical_cols + numerical_cols]
    y = df['recommended_team_size']
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Preprocessor using ColumnTransformer
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_cols),
            ('num', StandardScaler(), numerical_cols)
        ]
    )
    
    X_train_processed = preprocessor.fit_transform(X_train)
    X_test_processed = preprocessor.transform(X_test)
    
    # Save preprocessor
    preprocessor_path = os.path.join(models_dir, 'resource_preprocessor.joblib')
    joblib.dump(preprocessor, preprocessor_path)
    print(f"Saved preprocessor to {preprocessor_path}")
    
    # Train Regressor
    reg = XGBRegressor(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        random_state=42
    )
    reg.fit(X_train_processed, y_train)
    
    # Evaluate Regressor
    y_pred = reg.predict(X_test_processed)
    # Clip predictions to realistic team size [1, 20]
    y_pred = np.clip(np.round(y_pred), 1, 20)
    
    mse = mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    print(f"\nModel Performance:")
    print(f"Mean Squared Error: {mse:.4f}")
    print(f"R-squared Score: {r2:.4f}")
    
    # Save Regressor
    reg_path = os.path.join(models_dir, 'resource_regressor.joblib')
    joblib.dump(reg, reg_path)
    print(f"Saved regressor to {reg_path}")

if __name__ == "__main__":
    train_resource_model()
