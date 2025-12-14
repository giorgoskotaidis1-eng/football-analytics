"""
Runtime inference functions for AI models.

This module provides functions that can be called from the backend
to get predictions for shots (xG) and passes (value).
"""

from .xg_runtime import predict_shot_xg, predict_pass_value, get_zone

__all__ = ['predict_shot_xg', 'predict_pass_value', 'get_zone']

