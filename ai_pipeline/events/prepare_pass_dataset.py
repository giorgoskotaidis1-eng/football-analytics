"""
Prepare pass dataset from event CSVs for pass value training.

Expects CSV files in data/events/ with columns:
- match_id, team, player_id, event_type, timestamp, x, y
- For passes: x_end, y_end (end coordinates)
- metadata (JSON string) with fields like: leading_to_shot, leading_to_goal, etc.
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
OUTPUT_TRAIN = os.path.join(OUTPUT_DIR, "passes_train.parquet")
OUTPUT_VALID = os.path.join(OUTPUT_DIR, "passes_valid.parquet")

# Pass event types
PASS_TYPES = ["pass", "key_pass", "assist", "cross", "through_ball"]


def normalize_coords(x, y):
    """Convert from 0-100 coordinates to 0-1 normalized."""
    return x / 100.0, y / 100.0


def get_zone(x_norm, y_norm):
    """
    Map coordinates to zones.
    Returns: 'Self box', 'Def third', 'Middle', 'Att third', 'Opp box'
    """
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


def prepare_pass_features(df):
    """Create features for pass dataset."""
    features_list = []
    
    for idx, row in df.iterrows():
        # Start coordinates
        x_start_norm, y_start_norm = normalize_coords(row['x'], row['y'])
        
        # End coordinates (if available)
        if 'x_end' in row and 'y_end' in row and pd.notna(row['x_end']) and pd.notna(row['y_end']):
            x_end_norm, y_end_norm = normalize_coords(row['x_end'], row['y_end'])
        else:
            # If no end coordinates, skip or use start (skip for now)
            continue
        
        # Progress metrics
        forward_progress = x_end_norm - x_start_norm  # Positive = forward
        lateral_progress = abs(y_end_norm - y_start_norm)
        
        # Zones
        zone_start = get_zone(x_start_norm, y_start_norm)
        zone_end = get_zone(x_end_norm, y_end_norm)
        
        # Parse metadata
        metadata = parse_metadata(row.get('metadata', '{}'))
        
        # Features
        features = {
            'x_start': x_start_norm,
            'y_start': y_start_norm,
            'x_end': x_end_norm,
            'y_end': y_end_norm,
            'forward_progress': forward_progress,
            'lateral_progress': lateral_progress,
            'zone_start': zone_start,
            'zone_end': zone_end,
        }
        
        # Pass type
        pass_type = metadata.get('pass_type', 'normal')
        features['pass_type'] = pass_type
        
        # Target: leading_to_shot or leading_to_goal (if available)
        # For now, use placeholder if not available
        leading_to_shot = metadata.get('leading_to_shot', 0)
        leading_to_goal = metadata.get('leading_to_goal', 0)
        
        if isinstance(leading_to_shot, bool):
            leading_to_shot = 1 if leading_to_shot else 0
        if isinstance(leading_to_goal, bool):
            leading_to_goal = 1 if leading_to_goal else 0
        
        # Use leading_to_goal as primary target (xA-like), fallback to leading_to_shot
        if leading_to_goal > 0:
            features['target_value'] = 1
        elif leading_to_shot > 0:
            features['target_value'] = 0.5  # Intermediate value
        else:
            features['target_value'] = 0
        
        # Additional features
        features['successful'] = int(metadata.get('successful', 1))
        features['length'] = np.sqrt((x_end_norm - x_start_norm)**2 + (y_end_norm - y_start_norm)**2)
        
        features_list.append(features)
    
    return pd.DataFrame(features_list)


def main():
    print("=" * 60)
    print("Preparing Pass Dataset for Pass Value Training")
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
        print("Expected CSV files with columns: match_id, team, player_id, event_type, x, y, x_end, y_end, metadata, ...")
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
    
    # Filter passes
    print("Filtering pass events...")
    pass_events = events_df[events_df['event_type'].isin(PASS_TYPES)].copy()
    print(f"Pass events found: {len(pass_events)}")
    
    if len(pass_events) == 0:
        print("❌ No pass events found!")
        print(f"Expected event_type to be one of: {PASS_TYPES}")
        return
    
    # Check required columns
    required_cols = ['x', 'y']
    missing_cols = [col for col in required_cols if col not in pass_events.columns]
    if missing_cols:
        print(f"❌ Error: Missing required columns: {missing_cols}")
        return
    
    # Check for end coordinates
    if 'x_end' not in pass_events.columns or 'y_end' not in pass_events.columns:
        print("⚠ Warning: x_end and y_end columns not found.")
        print("  Passes without end coordinates will be skipped.")
        print("  Consider adding these columns to your CSV exports.")
    
    # Prepare features
    print("Creating features...")
    passes_df = prepare_pass_features(pass_events)
    print(f"Features created: {len(passes_df)} passes (with end coordinates)")
    print()
    
    if len(passes_df) == 0:
        print("❌ No passes with valid end coordinates!")
        return
    
    # Clean data
    print("Cleaning data...")
    initial_count = len(passes_df)
    
    # Remove NaN
    passes_df = passes_df.dropna(subset=['x_start', 'y_start', 'x_end', 'y_end', 'target_value'])
    
    # Remove extreme values
    passes_df = passes_df[
        (passes_df['x_start'] >= 0) & (passes_df['x_start'] <= 1) &
        (passes_df['y_start'] >= 0) & (passes_df['y_start'] <= 1) &
        (passes_df['x_end'] >= 0) & (passes_df['x_end'] <= 1) &
        (passes_df['y_end'] >= 0) & (passes_df['y_end'] <= 1)
    ]
    
    final_count = len(passes_df)
    print(f"  Removed {initial_count - final_count} invalid rows")
    print(f"  Final dataset: {final_count} passes")
    print()
    
    # Check target distribution
    target_dist = passes_df['target_value'].value_counts()
    print(f"Target distribution:")
    print(f"  0.0 (no value): {target_dist.get(0.0, 0)}")
    print(f"  0.5 (leads to shot): {target_dist.get(0.5, 0)}")
    print(f"  1.0 (leads to goal): {target_dist.get(1.0, 0)}")
    print()
    
    # One-hot encode categorical features
    print("Encoding categorical features...")
    passes_df = pd.get_dummies(passes_df, columns=['zone_start', 'zone_end', 'pass_type'], 
                               prefix=['zone_start', 'zone_end', 'type'])
    
    # Split train/valid
    print("Splitting train/validation (80/20)...")
    # Use stratified split if possible (bin target for stratification)
    passes_df['target_bin'] = pd.cut(passes_df['target_value'], bins=[-0.1, 0.1, 0.6, 1.1], labels=[0, 1, 2])
    train_df, valid_df = train_test_split(passes_df, test_size=0.2, random_state=42, 
                                          stratify=passes_df['target_bin'])
    passes_df = passes_df.drop('target_bin', axis=1)
    train_df = train_df.drop('target_bin', axis=1)
    valid_df = valid_df.drop('target_bin', axis=1)
    
    print(f"  Train: {len(train_df)} passes")
    print(f"  Valid: {len(valid_df)} passes")
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
    print(f"Features: {len(passes_df.columns) - 1} (excluding target)")
    print()
    print("Note: If target_value is all zeros, you may need to add")
    print("      'leading_to_shot' or 'leading_to_goal' to metadata in your CSV exports.")
    print("=" * 60)


if __name__ == "__main__":
    main()

