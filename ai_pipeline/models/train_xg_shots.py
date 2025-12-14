"""
Train xG (Expected Goals) model using shot dataset.

Uses gradient boosting (LightGBM preferred, falls back to XGBoost or sklearn).
"""

import os
import pandas as pd
import numpy as np
from pathlib import Path
import joblib

# Try to import LightGBM, XGBoost, or sklearn
try:
    import lightgbm as lgb
    MODEL_TYPE = "lightgbm"
    print("Using LightGBM")
except ImportError:
    try:
        import xgboost as xgb
        MODEL_TYPE = "xgboost"
        print("Using XGBoost")
    except ImportError:
        from sklearn.ensemble import GradientBoostingClassifier
        MODEL_TYPE = "sklearn"
        print("Using sklearn GradientBoostingClassifier")

from sklearn.metrics import roc_auc_score, log_loss, brier_score_loss

TRAIN_DATA = "data/processed/shots_train.parquet"
VALID_DATA = "data/processed/shots_valid.parquet"
MODEL_PATH = "ai_pipeline/models/xg_shots_model.pkl"


def load_data():
    """Load train and validation datasets."""
    train_path = Path(TRAIN_DATA)
    valid_path = Path(VALID_DATA)
    
    if not train_path.exists():
        raise FileNotFoundError(f"Train data not found: {TRAIN_DATA}")
    if not valid_path.exists():
        raise FileNotFoundError(f"Valid data not found: {VALID_DATA}")
    
    print("Loading datasets...")
    train_df = pd.read_parquet(train_path)
    valid_df = pd.read_parquet(valid_path)
    
    print(f"  Train: {len(train_df)} shots")
    print(f"  Valid: {len(valid_df)} shots")
    
    return train_df, valid_df


def prepare_features(df):
    """Separate features and target."""
    # Target is 'is_goal'
    if 'is_goal' not in df.columns:
        raise ValueError("Target column 'is_goal' not found in dataset!")
    
    y = df['is_goal'].values
    X = df.drop('is_goal', axis=1)
    
    return X, y


def train_model(X_train, y_train, X_valid, y_valid):
    """Train gradient boosting model."""
    print()
    print("Training model...")
    
    if MODEL_TYPE == "lightgbm":
        # LightGBM
        train_data = lgb.Dataset(X_train, label=y_train)
        valid_data = lgb.Dataset(X_valid, label=y_valid, reference=train_data)
        
        params = {
            'objective': 'binary',
            'metric': 'binary_logloss',
            'boosting_type': 'gbdt',
            'num_leaves': 31,
            'learning_rate': 0.05,
            'feature_fraction': 0.9,
            'bagging_fraction': 0.8,
            'bagging_freq': 5,
            'verbose': -1
        }
        
        model = lgb.train(
            params,
            train_data,
            num_boost_round=100,
            valid_sets=[valid_data],
            callbacks=[lgb.early_stopping(stopping_rounds=10), lgb.log_evaluation(period=10)]
        )
        
    elif MODEL_TYPE == "xgboost":
        # XGBoost
        model = xgb.XGBClassifier(
            objective='binary:logistic',
            n_estimators=100,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.9,
            eval_metric='logloss',
            early_stopping_rounds=10
        )
        
        model.fit(
            X_train, y_train,
            eval_set=[(X_valid, y_valid)],
            verbose=10
        )
        
    else:
        # sklearn GradientBoostingClassifier
        model = GradientBoostingClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            random_state=42,
            verbose=1
        )
        
        model.fit(X_train, y_train)
    
    return model


def evaluate_model(model, X_valid, y_valid):
    """Evaluate model and print metrics."""
    print()
    print("Evaluating model...")
    
    # Predictions
    if MODEL_TYPE == "lightgbm":
        y_pred_proba = model.predict(X_valid, num_iteration=model.best_iteration)
    else:
        y_pred_proba = model.predict_proba(X_valid)[:, 1]
    
    y_pred = (y_pred_proba >= 0.5).astype(int)
    
    # Metrics
    auc = roc_auc_score(y_valid, y_pred_proba)
    logloss = log_loss(y_valid, y_pred_proba)
    brier = brier_score_loss(y_valid, y_pred_proba)
    
    print(f"  AUC: {auc:.4f}")
    print(f"  Log Loss: {logloss:.4f}")
    print(f"  Brier Score: {brier:.4f}")
    print()
    
    # Feature importance
    print("Top 10 Feature Importances:")
    if MODEL_TYPE == "lightgbm":
        importances = model.feature_importance(importance_type='gain')
        feature_names = X_valid.columns
        importance_df = pd.DataFrame({
            'feature': feature_names,
            'importance': importances
        }).sort_values('importance', ascending=False)
    elif MODEL_TYPE == "xgboost":
        importances = model.feature_importances_
        feature_names = X_valid.columns
        importance_df = pd.DataFrame({
            'feature': feature_names,
            'importance': importances
        }).sort_values('importance', ascending=False)
    else:
        importances = model.feature_importances_
        feature_names = X_valid.columns
        importance_df = pd.DataFrame({
            'feature': feature_names,
            'importance': importances
        }).sort_values('importance', ascending=False)
    
    for idx, row in importance_df.head(10).iterrows():
        print(f"  {row['feature']}: {row['importance']:.4f}")
    
    return {
        'auc': auc,
        'logloss': logloss,
        'brier': brier
    }


def main():
    print("=" * 60)
    print("Training xG Model (Expected Goals)")
    print("=" * 60)
    
    # Load data
    train_df, valid_df = load_data()
    
    # Prepare features
    X_train, y_train = prepare_features(train_df)
    X_valid, y_valid = prepare_features(valid_df)
    
    print(f"Features: {X_train.shape[1]}")
    print(f"Goal rate (train): {y_train.mean():.2%}")
    print(f"Goal rate (valid): {y_valid.mean():.2%}")
    
    # Train model
    model = train_model(X_train, y_train, X_valid, y_valid)
    
    # Evaluate
    metrics = evaluate_model(model, X_valid, y_valid)
    
    # Save model
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    
    print("=" * 60)
    print("✅ Training complete!")
    print("=" * 60)
    print(f"Model saved: {MODEL_PATH}")
    print(f"Final AUC: {metrics['auc']:.4f}")
    print("=" * 60)


if __name__ == "__main__":
    main()

