"""
Runtime functions for xG and pass value predictions.

These functions can be called from the backend to get predictions for events.
"""

import os
import joblib
import numpy as np
import pandas as pd
from pathlib import Path

MODEL_DIR = Path(__file__).parent.parent / "models"
XG_MODEL_PATH = MODEL_DIR / "xg_shots_model.pkl"
PASS_MODEL_PATH = MODEL_DIR / "pass_value_model.pkl"

# Lazy loading
_xg_model = None
_pass_model = None


def _load_xg_model():
    """Lazy load xG model."""
    global _xg_model
    if _xg_model is None:
        if not XG_MODEL_PATH.exists():
            raise FileNotFoundError(f"xG model not found: {XG_MODEL_PATH}")
        _xg_model = joblib.load(XG_MODEL_PATH)
    return _xg_model


def _load_pass_model():
    """Lazy load pass value model."""
    global _pass_model
    if _pass_model is None:
        if not PASS_MODEL_PATH.exists():
            return None  # Model not trained yet
        _pass_model = joblib.load(PASS_MODEL_PATH)
    return _pass_model


def get_zone(x: float, y: float) -> str:
    """
    Map normalized coordinates (0-1) to zones.
    
    Args:
        x: Normalized x coordinate (0-1, where 0=left, 1=right)
        y: Normalized y coordinate (0-1, where 0=attacking end, 1=defending end)
    
    Returns:
        Zone name: 'Self box', 'Def third', 'Middle', 'Att third', 'Opp box'
    """
    if x < 0.18:
        return "Self box"
    elif x < 0.33:
        return "Def third"
    elif x < 0.67:
        return "Middle"
    elif x < 0.82:
        return "Att third"
    else:
        return "Opp box"


def predict_shot_xg(features: dict) -> float:
    """
    Predict xG (Expected Goals) for a shot.
    
    Args:
        features: Dictionary with shot features:
            - x_shot: float (0-1, normalized x coordinate)
            - y_shot: float (0-1, normalized y coordinate)
            - distance_to_goal: float (meters, optional - will calculate if missing)
            - angle_to_goal: float (radians, optional - will calculate if missing)
            - body_part: str (e.g., "foot", "head", default: "foot")
            - shot_type: str (e.g., "open_play", "free_kick", default: "open_play")
            - under_pressure: int (0 or 1, default: 0)
            - num_defenders: int (default: 0)
    
    Returns:
        xG value (0-1): Probability of goal
    """
    model = _load_xg_model()
    
    # Calculate missing features if needed
    x_norm = features.get('x_shot', 0.5)
    y_norm = features.get('y_shot', 0.5)
    
    if 'distance_to_goal' not in features:
        # Calculate distance (simplified)
        PITCH_LENGTH = 105.0
        PITCH_WIDTH = 68.0
        goal_x = 1.0  # Assuming attacking right
        goal_y = 0.5
        x_m = x_norm * PITCH_LENGTH
        y_m = y_norm * PITCH_WIDTH
        goal_x_m = goal_x * PITCH_LENGTH
        goal_y_m = goal_y * PITCH_WIDTH
        features['distance_to_goal'] = np.sqrt((x_m - goal_x_m)**2 + (y_m - goal_y_m)**2)
    
    if 'angle_to_goal' not in features:
        # Calculate angle
        goal_x = 1.0
        goal_y = 0.5
        x_m = x_norm * 105.0
        y_m = y_norm * 68.0
        goal_x_m = goal_x * 105.0
        goal_y_m = goal_y * 68.0
        dx = goal_x_m - x_m
        dy = goal_y_m - y_m
        features['angle_to_goal'] = np.arctan2(dy, dx)
    
    # Get zone
    zone = get_zone(x_norm, y_norm)
    
    # Default values
    body_part = features.get('body_part', 'foot')
    shot_type = features.get('shot_type', 'open_play')
    under_pressure = features.get('under_pressure', 0)
    num_defenders = features.get('num_defenders', 0)
    
    # Create feature vector (match training format)
    feature_dict = {
        'x_shot': x_norm,
        'y_shot': y_norm,
        'distance_to_goal': features['distance_to_goal'],
        'angle_to_goal': features['angle_to_goal'],
        'under_pressure': under_pressure,
        'num_defenders': num_defenders,
    }
    
    # Add one-hot encoded features
    # Note: This should match the training format
    # For simplicity, we'll create a DataFrame and let pandas handle encoding
    feature_dict[f'body_{body_part}'] = 1
    feature_dict[f'type_{shot_type}'] = 1
    feature_dict[f'zone_{zone}'] = 1
    
    # Convert to DataFrame
    feature_df = pd.DataFrame([feature_dict])
    
    # Get model's expected features (from training)
    # This is a simplified version - in production, you'd save the feature list
    # For now, we'll try to predict and handle missing features
    
    try:
        # Predict
        if hasattr(model, 'predict_proba'):
            xg = model.predict_proba(feature_df)[0, 1]
        elif hasattr(model, 'predict'):
            # LightGBM
            xg = model.predict(feature_df)[0]
        else:
            xg = 0.0
    except Exception as e:
        # Fallback: simple heuristic
        distance = features['distance_to_goal']
        if distance < 10:
            xg = 0.3
        elif distance < 20:
            xg = 0.15
        else:
            xg = 0.05
        print(f"Warning: Model prediction failed, using heuristic: {e}")
    
    # Clamp to [0, 1]
    return max(0.0, min(1.0, xg))


def predict_pass_value(features: dict) -> float:
    """
    Predict pass value (xA-like metric).
    
    Args:
        features: Dictionary with pass features:
            - x_start: float (0-1, normalized start x)
            - y_start: float (0-1, normalized start y)
            - x_end: float (0-1, normalized end x)
            - y_end: float (0-1, normalized end y)
            - forward_progress: float (optional - will calculate if missing)
            - lateral_progress: float (optional - will calculate if missing)
            - zone_start: str (optional - will calculate if missing)
            - zone_end: str (optional - will calculate if missing)
            - pass_type: str (default: "normal")
            - successful: int (0 or 1, default: 1)
            - length: float (optional - will calculate if missing)
    
    Returns:
        Pass value (0-1): Probability/value of pass leading to goal/shot
    """
    model = _load_pass_model()
    
    if model is None:
        # Model not trained yet
        raise NotImplementedError("Pass value model not trained yet. Run train_pass_value.py first.")
    
    # Calculate missing features
    x_start = features.get('x_start', 0.5)
    y_start = features.get('y_start', 0.5)
    x_end = features.get('x_end', 0.5)
    y_end = features.get('y_end', 0.5)
    
    if 'forward_progress' not in features:
        features['forward_progress'] = x_end - x_start
    
    if 'lateral_progress' not in features:
        features['lateral_progress'] = abs(y_end - y_start)
    
    if 'zone_start' not in features:
        features['zone_start'] = get_zone(x_start, y_start)
    
    if 'zone_end' not in features:
        features['zone_end'] = get_zone(x_end, y_end)
    
    if 'length' not in features:
        features['length'] = np.sqrt((x_end - x_start)**2 + (y_end - y_start)**2)
    
    # Default values
    pass_type = features.get('pass_type', 'normal')
    successful = features.get('successful', 1)
    
    # Create feature vector
    feature_dict = {
        'x_start': x_start,
        'y_start': y_start,
        'x_end': x_end,
        'y_end': y_end,
        'forward_progress': features['forward_progress'],
        'lateral_progress': features['lateral_progress'],
        'successful': successful,
        'length': features['length'],
    }
    
    # Add one-hot encoded features
    feature_dict[f'zone_start_{features["zone_start"]}'] = 1
    feature_dict[f'zone_end_{features["zone_end"]}'] = 1
    feature_dict[f'type_{pass_type}'] = 1
    
    # Convert to DataFrame
    feature_df = pd.DataFrame([feature_dict])
    
    try:
        # Predict
        if hasattr(model, 'predict'):
            value = model.predict(feature_df)[0]
        else:
            value = 0.0
    except Exception as e:
        # Fallback: simple heuristic
        forward = features['forward_progress']
        if forward > 0.2:
            value = 0.3
        elif forward > 0:
            value = 0.15
        else:
            value = 0.05
        print(f"Warning: Model prediction failed, using heuristic: {e}")
    
    # Clamp to [0, 1]
    return max(0.0, min(1.0, value))


# Example usage
if __name__ == "__main__":
    # Test xG prediction
    shot_features = {
        'x_shot': 0.85,
        'y_shot': 0.5,
        'body_part': 'foot',
        'shot_type': 'open_play'
    }
    
    try:
        xg = predict_shot_xg(shot_features)
        print(f"Shot xG: {xg:.3f}")
    except Exception as e:
        print(f"xG prediction error: {e}")
    
    # Test pass value prediction
    pass_features = {
        'x_start': 0.5,
        'y_start': 0.5,
        'x_end': 0.7,
        'y_end': 0.5,
        'pass_type': 'normal'
    }
    
    try:
        value = predict_pass_value(pass_features)
        print(f"Pass value: {value:.3f}")
    except NotImplementedError:
        print("Pass value model not trained yet")
    except Exception as e:
        print(f"Pass value prediction error: {e}")

