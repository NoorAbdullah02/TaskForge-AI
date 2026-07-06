import os
import sys

# Add parent directory of this script to path so imports work when running from anywhere
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(base_dir, "training"))

from generate_data import generate_delay_data, generate_attendance_data, generate_productivity_data, generate_resource_data
from train_delay import train_delay_models
from train_attendance import train_attendance_model
from train_productivity import train_productivity_model
from train_resource import train_resource_model

def run_pipeline():
    print("==================================================")
    # 1. Generate Data
    data_dir = os.path.join(base_dir, 'training', 'data')
    os.makedirs(data_dir, exist_ok=True)
    
    print("Step 1: Generating synthetic datasets...")
    
    df_delay = generate_delay_data()
    df_delay.to_csv(os.path.join(data_dir, 'delay_data.csv'), index=False)
    
    df_attend = generate_attendance_data()
    df_attend.to_csv(os.path.join(data_dir, 'attendance_data.csv'), index=False)
    
    df_prod = generate_productivity_data()
    df_prod.to_csv(os.path.join(data_dir, 'productivity_data.csv'), index=False)
    
    df_res = generate_resource_data()
    df_res.to_csv(os.path.join(data_dir, 'resource_data.csv'), index=False)
    
    print("All datasets generated successfully!")
    print("==================================================")
    
    # 2. Train Models
    print("Step 2: Training Delay models...")
    train_delay_models()
    print("==================================================")
    
    print("Step 3: Training Attendance model...")
    train_attendance_model()
    print("==================================================")
    
    print("Step 4: Training Productivity model...")
    train_productivity_model()
    print("==================================================")
    
    print("Step 5: Training Resource Recommendation model...")
    train_resource_model()
    print("==================================================")
    
    print(f"All models trained and saved to {os.path.join(base_dir, 'models')}/")

if __name__ == "__main__":
    run_pipeline()
