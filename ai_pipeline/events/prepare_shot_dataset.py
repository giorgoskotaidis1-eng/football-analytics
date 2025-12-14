"""
Prepare shot dataset from event CSVs for xG training.

Expects CSV files in data/events/ with columns:
- match_id, team, player_id, event_type, timestamp, x, y
- metadata (JSON string) with fields like: body_part, is_goal, shot_type, etc.
- minute (optional)
"""

import os
import json
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.model_selection import train_test_split

EVENTS_DIR = "data/events"
OUTPUT_DIR = "data/processed"
OUTPUT_TRAIN = os.path.join(OUTPUT_DIR, "shots_train.parquet")
OUTPUT_VALID = os.path.join(OUTPUT_DIR, "shots_valid.parquet")

# Pitch dimensions (standard football pitch)
PITCH_LENGTH = 105.0  # meters
PITCH_WIDTH = 68.0     # meters
GOAL_WIDTH = 7.32      # meters
GOAL_CENTER_Y = 50.0   # normalized (middle of width)

# Shot event types
SHOT_TYPES = ["shot", "header_shot", "free_kick_shot", "penalty"]


def normalize_coords(x, y):
    """
    Convert from 0-100 coordinates to 0-1 normalized.
    x: 0 = left touchline, 100 = right touchline
    y: 0 = attacking end, 100 = defending end
    """
    return x / 100.0, y / 100.0


def calculate_distance_to_goal(x_norm, y_norm, attacking_direction="right"):
    """
    Calculate distance from shot location to goal center.
    x_norm, y_norm: normalized coordinates (0-1)
    attacking_direction: "right" or "left" (which end is attacking)
    """
    # Goal is at x=100 (right end) or x=0 (left end)
    if attacking_direction == "right":
        goal_x = 1.0
    else:
        goal_x = 0.0
    
    goal_y = 0.5  # Center of goal
    
    # Convert normalized to meters
    x_m = x_norm * PITCH_LENGTH
    y_m = y_norm * PITCH_WIDTH
    goal_x_m = goal_x * PITCH_LENGTH
    goal_y_m = goal_y * PITCH_WIDTH
    
    # Distance
    dist = np.sqrt((x_m - goal_x_m)**2 + (y_m - goal_y_m)**2)
    return dist


def calculate_angle_to_goal(x_norm, y_norm, attacking_direction="right"):
    """
    Calculate angle from shot location to goal center.
    Returns angle in radians.
    """
    if attacking_direction == "right":
        goal_x = 1.0
    else:
        goal_x = 0.0
    
    goal_y = 0.5
    
    # Convert to meters
    x_m = x_norm * PITCH_LENGTH
    y_m = y_norm * PITCH_WIDTH
    goal_x_m = goal_x * PITCH_LENGTH
    goal_y_m = goal_y * PITCH_WIDTH
    
    # Angle
    dx = goal_x_m - x_m
    dy = goal_y_m - y_m
    angle = np.arctan2(dy, dx)
    return angle


def parse_metadata(metadata_str):
    """Parse JSON metadata string."""
    if pd.isna(metadata_str) or metadata_str == "":
        return {}
    try:
        if isinstance(metadata_str, str):
            return json.loads(metadata_str)
        return metadata_str
    except:
        return {}


def get_zone(x_norm, y_norm):
    """
    Map coordinates to zones.
    Returns: 'Self box', 'Def third', 'Middle', 'Att third', 'Opp box'
    """
    # Assuming attacking direction is right (x=1.0 is goal)
    # Self box: x < 0.18 (penalty box at defending end)
    # Def third: 0.18 <= x < 0.33
    # Middle: 0.33 <= x < 0.67
    # Att third: 0.67 <= x < 0.82
    # Opp box: x >= 0.82 (penalty box at attacking end)
    
    if x_norm < 0.18:
        return "Self box"
    elif x_norm < 0.33:
        return "Def third"
    elif x_norm < 0.67:
        return "Middle"
    elif x_norm < 0.82:
        return "Att third"
    else:
        return "Opp box"


def prepare_shot_features(df):
    """Create features for shot dataset."""
    features_list = []
    
    for idx, row in df.iterrows():
        # Normalize coordinates
        x_norm, y_norm = normalize_coords(row['x'], row['y'])
        
        # Distance and angle to goal
        # Assume attacking direction based on y (if y < 50, attacking right, else left)
        attacking_dir = "right" if row['y'] < 50 else "left"
        distance = calculate_distance_to_goal(x_norm, y_norm, attacking_dir)
        angle = calculate_angle_to_goal(x_norm, y_norm, attacking_dir)
        
        # Parse metadata
        metadata = parse_metadata(row.get('metadata', '{}'))
        
        # Features
        features = {
            'x_shot': x_norm,
            'y_shot': y_norm,
            'distance_to_goal': distance,
            'angle_to_goal': angle,
            'zone': get_zone(x_norm, y_norm),
        }
        
        # Body part (one-hot encoding will be done later)
        body_part = metadata.get('body_part', 'foot')
        features['body_part'] = body_part
        
        # Shot type
        shot_type = metadata.get('shot_type', 'open_play')
        features['shot_type'] = shot_type
        
        # Target: is_goal
        is_goal = metadata.get('is_goal', 0)
        if isinstance(is_goal, bool):
            is_goal = 1 if is_goal else 0
        features['is_goal'] = int(is_goal)
        
        # Additional features if available
        features['under_pressure'] = int(metadata.get('under_pressure', 0))
        features['num_defenders'] = metadata.get('num_defenders_between', 0)
        
        features_list.append(features)
    
    return pd.DataFrame(features_list)


def main():
    print("=" * 60)
    print("Preparing Shot Dataset for xG Training")
    print("=" * 60)
    
    # Find all CSV files
    events_path = Path(EVENTS_DIR)
    if not events_path.exists():
        print(f"❌ Error: {EVENTS_DIR} does not exist!")
        print("Please create the directory and add event CSV files.")
        return
    
    csv_files = list(events_path.glob("*.csv"))
    if not csv_files:
        print(f"❌ Error: No CSV files found in {EVENTS_DIR}")
        print("Expected CSV files with columns: match_id, team, player_id, event_type, x, y, metadata, ...")
        return
    
    print(f"Found {len(csv_files)} CSV file(s)")
    print()
    
    # Load all CSVs
    all_events = []
    for csv_file in csv_files:
        print(f"Loading: {csv_file.name}")
        try:
            df = pd.read_csv(csv_file)
            all_events.append(df)
        except Exception as e:
            print(f"  ⚠ Warning: Could not load {csv_file.name}: {e}")
            continue
    
    if not all_events:
        print("❌ No valid CSV files loaded!")
        return
    
    # Combine all events
    events_df = pd.concat(all_events, ignore_index=True)
    print(f"Total events loaded: {len(events_df)}")
    print()
    
    # Filter shots
    print("Filtering shot events...")
    shot_events = events_df[events_df['event_type'].isin(SHOT_TYPES)].copy()
    print(f"Shot events found: {len(shot_events)}")
    
    if len(shot_events) == 0:
        print("❌ No shot events found!")
        print(f"Expected event_type to be one of: {SHOT_TYPES}")
        return
    
    # Check required columns
    required_cols = ['x', 'y']
    missing_cols = [col for col in required_cols if col not in shot_events.columns]
    if missing_cols:
        print(f"❌ Error: Missing required columns: {missing_cols}")
        return
    
    # Prepare features
    print("Creating features...")
    shots_df = prepare_shot_features(shot_events)
    print(f"Features created: {len(shots_df)} shots")
    print()
    
    # Clean data
    print("Cleaning data...")
    initial_count = len(shots_df)
    
    # Remove NaN in critical features
    shots_df = shots_df.dropna(subset=['x_shot', 'y_shot', 'distance_to_goal', 'is_goal'])
    
    # Remove extreme values
    shots_df = shots_df[
        (shots_df['distance_to_goal'] > 0) & 
        (shots_df['distance_to_goal'] < 200) &  # Max reasonable distance
        (shots_df['x_shot'] >= 0) & (shots_df['x_shot'] <= 1) &
        (shots_df['y_shot'] >= 0) & (shots_df['y_shot'] <= 1)
    ]
    
    final_count = len(shots_df)
    print(f"  Removed {initial_count - final_count} invalid rows")
    print(f"  Final dataset: {final_count} shots")
    print()
    
    # One-hot encode categorical features
    print("Encoding categorical features...")
    shots_df = pd.get_dummies(shots_df, columns=['body_part', 'shot_type', 'zone'], prefix=['body', 'type', 'zone'])
    
    # Split train/valid
    print("Splitting train/validation (80/20)...")
    train_df, valid_df = train_test_split(shots_df, test_size=0.2, random_state=42, stratify=shots_df['is_goal'])
    
    print(f"  Train: {len(train_df)} shots ({train_df['is_goal'].sum()} goals)")
    print(f"  Valid: {len(valid_df)} shots ({valid_df['is_goal'].sum()} goals)")
    print()
    
    # Save
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    train_df.to_parquet(OUTPUT_TRAIN, index=False)
    valid_df.to_parquet(OUTPUT_VALID, index=False)
    
    print("=" * 60)
    print("✅ Dataset preparation complete!")
    print("=" * 60)
    print(f"Train: {OUTPUT_TRAIN}")
    print(f"Valid: {OUTPUT_VALID}")
    print(f"Features: {len(shots_df.columns) - 1} (excluding target)")
    print("=" * 60)


if __name__ == "__main__":
    main()

