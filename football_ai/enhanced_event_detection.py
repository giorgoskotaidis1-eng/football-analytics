"""
Enhanced Event Detection for Football Analytics
Detects all events needed for complete statistics

IMPORTANT: Events must include all fields required by analytics features:
- Summary: type, team, playerId, x, y, minute
- Network Analysis: passes need playerId, metadata.toPlayerId, metadata.toX, metadata.toY
- Sense Matrix: all events need playerId, type, team
- Distribution Map: all events need x, y, type, team
- Activity Field: all events need x, y, team
- Vector Field: passes need x, y, metadata.toX, metadata.toY, metadata.angle, metadata.intensity
- Spotlight: all events need type, team, playerId, x, y, minute, metadata.xg, metadata.outcome

See analytics_features_requirements.md for complete documentation.
"""

import numpy as np
from typing import List, Dict, Tuple, Optional
from collections import deque


class EnhancedEventDetector:
    """
    Detects all football events from frame-by-frame detections:
    - Shots (with xG calculation)
    - Passes (successful/unsuccessful, key passes, with sender/receiver tracking)
    - Touches
    - Tackles
    - Interceptions
    - Recoveries
    - Corners
    - Free kicks
    - Throw-ins
    - And more...
    
    All events are formatted to be compatible with analytics features:
    - Network Analysis (passing networks)
    - Sense Matrix (player interaction matrix)
    - Distribution Map (zone-based statistics)
    - Activity Field (heatmap visualization)
    - Vector Field (movement vectors)
    - Spotlight (key moments)
    """
    
    def __init__(self, fps: float = 30.0):
        self.fps = fps
        self.ball_history = deque(maxlen=30)  # Track ball for 1 second
        self.player_history = deque(maxlen=30)  # Track players
        self.event_buffer = []  # Buffer for events
        self.player_tracking = {}  # Track player IDs across frames
        self.next_player_id = 1  # Assign unique player IDs
        
        # Thresholds
        self.shot_velocity_threshold = 5.0  # pixels per frame
        self.pass_distance_threshold = 50.0  # pixels
        self.touch_distance_threshold = 30.0  # pixels
        self.tackle_distance_threshold = 20.0  # pixels
        
    def detect_all_events(
        self,
        frames_data: List[Dict]
    ) -> List[Dict]:
        """
        Detect all events from frame detections
        
        Returns list of events with all required fields for analytics features:
        - type: "shot", "pass", "touch", "tackle", "interception", etc.
        - team: "home" or "away" (determined by position)
        - playerId: unique player identifier (tracked across frames)
        - x: normalized position 0-100 (left to right)
        - y: normalized position 0-100 (top to bottom)
        - minute: match minute
        - metadata: event-specific data (toPlayerId, toX, toY for passes, xg for shots, etc.)
        """
        events = []
        
        for i, frame_data in enumerate(frames_data):
            ball_detections = [d for d in frame_data["detections"] if d["class"] == "ball"]
            player_detections = [d for d in frame_data["detections"] if d["class"] == "player"]
            
            # Track players and assign IDs
            tracked_players = self._track_players(player_detections, frame_data["frame"])
            
            # Update history
            if ball_detections:
                self.ball_history.append({
                    "frame": frame_data["frame"],
                    "timestamp": frame_data["timestamp"],
                    "position": ball_detections[0]["position"],
                    "bbox": ball_detections[0]["bbox"]
                })
            
            self.player_history.append({
                "frame": frame_data["frame"],
                "timestamp": frame_data["timestamp"],
                "players": tracked_players
            })
            
            # Detect events
            frame_events = []
            
            # 1. Shot Detection
            shots = self._detect_shots(frame_data, ball_detections, tracked_players)
            frame_events.extend(shots)
            
            # 2. Pass Detection (most important for Network Analysis and Vector Field)
            passes = self._detect_passes(frame_data, ball_detections, tracked_players)
            frame_events.extend(passes)
            
            # 3. Touch Detection
            touches = self._detect_touches(frame_data, ball_detections, tracked_players)
            frame_events.extend(touches)
            
            # 4. Tackle Detection
            tackles = self._detect_tackles(frame_data, ball_detections, tracked_players)
            frame_events.extend(tackles)
            
            # 5. Interception Detection
            interceptions = self._detect_interceptions(frame_data, ball_detections, tracked_players)
            frame_events.extend(interceptions)
            
            # 6. Recovery Detection
            recoveries = self._detect_recoveries(frame_data, ball_detections, tracked_players)
            frame_events.extend(recoveries)
            
            # 7. Corner Detection
            corners = self._detect_corners(frame_data, ball_detections, tracked_players)
            frame_events.extend(corners)
            
            # 8. Free Kick Detection
            free_kicks = self._detect_free_kicks(frame_data, ball_detections, tracked_players)
            frame_events.extend(free_kicks)
            
            events.extend(frame_events)
        
        return events
    
    def _track_players(self, player_detections: List[Dict], frame: int) -> List[Dict]:
        """
        Track players across frames and assign consistent IDs
        Required for Network Analysis and Sense Matrix
        """
        tracked = []
        
        for player in player_detections:
            pos = player["position"]
            bbox = player.get("bbox", {})
            
            # Simple tracking: match by position proximity
            # In production, use more sophisticated tracking (Kalman filter, etc.)
            matched_id = None
            min_distance = float('inf')
            
            for pid, pdata in self.player_tracking.items():
                last_pos = pdata.get("last_position")
                if last_pos:
                    distance = np.sqrt(
                        (pos["x"] - last_pos["x"])**2 + (pos["y"] - last_pos["y"])**2
                    )
                    if distance < 10 and distance < min_distance:  # Same player if close
                        min_distance = distance
                        matched_id = pid
            
            if matched_id is None:
                # New player
                matched_id = self.next_player_id
                self.next_player_id += 1
            
            # Update tracking
            self.player_tracking[matched_id] = {
                "last_position": pos,
                "last_frame": frame,
                "bbox": bbox
            }
            
            # Add playerId to detection
            tracked_player = player.copy()
            tracked_player["playerId"] = matched_id
            tracked = tracked_player
        
        # Clean up old players (not seen for 30 frames)
        to_remove = [
            pid for pid, pdata in self.player_tracking.items()
            if frame - pdata.get("last_frame", 0) > 30
        ]
        for pid in to_remove:
            del self.player_tracking[pid]
        
        return tracked
    
    def _determine_team(self, position: Dict) -> str:
        """
        Determine team based on position
        Simple heuristic: left side = home, right side = away
        Can be enhanced with more sophisticated logic
        """
        # Assuming video shows full pitch, left side is typically home team
        # This is a simplification - in production, use jersey colors or other features
        return "home" if position["x"] < 50 else "away"
    
    def _detect_shots(
        self,
        frame_data: Dict,
        ball_detections: List[Dict],
        player_detections: List[Dict]
    ) -> List[Dict]:
        """
        Detect shots with enhanced logic
        Required fields for Spotlight and Summary features
        """
        shots = []
        
        if not ball_detections or len(self.ball_history) < 5:
            return shots
        
        ball = ball_detections[0]
        ball_pos = ball["position"]
        
        # Find nearest player (shooter)
        shooter_id = None
        if player_detections:
            min_dist = float('inf')
            for player in player_detections:
                player_pos = player.get("position", {})
                if "x" in player_pos and "y" in player_pos:
                    distance = np.sqrt(
                        (ball_pos["x"] - player_pos["x"])**2 +
                        (ball_pos["y"] - player_pos["y"])**2
                    )
                    if distance < min_dist and distance < 15:  # Close to ball
                        min_dist = distance
                        shooter_id = player.get("playerId")
        
        # Check if ball is moving fast toward goal
        if len(self.ball_history) >= 3:
            recent_balls = list(self.ball_history)[-3:]
            velocities = []
            
            for i in range(1, len(recent_balls)):
                prev_pos = recent_balls[i-1]["position"]
                curr_pos = recent_balls[i]["position"]
                dx = curr_pos["x"] - prev_pos["x"]
                dy = curr_pos["y"] - prev_pos["y"]
                velocity = np.sqrt(dx**2 + dy**2)
                velocities.append(velocity)
            
            avg_velocity = np.mean(velocities) if velocities else 0
            
            # Shot detection: fast movement toward goal area (x > 66 = attacking third)
            if avg_velocity > self.shot_velocity_threshold and ball_pos["x"] > 66:
                # Calculate xG based on position
                xg = self._calculate_xg(ball_pos)
                
                # Determine shot type
                shot_type = "open_play"
                if ball_pos["x"] > 90:  # Very close to goal
                    shot_type = "close_range"
                
                # Determine team based on position
                team = self._determine_team(ball_pos)
                
                shots.append({
                    "type": "shot",
                    "team": team,
                    "playerId": shooter_id,
                    "frame": frame_data["frame"],
                    "timestamp": frame_data["timestamp"],
                    "minute": int(frame_data["timestamp"] / 60),
                    "x": ball_pos["x"],
                    "y": ball_pos["y"],
                    "metadata": {
                        "xg": round(xg, 3),  # Required for Spotlight
                        "shotType": shot_type,
                        "bodyPart": "foot",  # Default, can be enhanced
                        "outcome": "unknown"  # Can be enhanced with goal detection
                    }
                })
        
        return shots
    
    def _detect_passes(
        self,
        frame_data: Dict,
        ball_detections: List[Dict],
        player_detections: List[Dict]
    ) -> List[Dict]:
        """
        Detect passes between players
        CRITICAL: Must include playerId, metadata.toPlayerId, metadata.toX, metadata.toY
        Required for Network Analysis and Vector Field features
        """
        passes = []
        
        if not ball_detections or len(player_detections) < 2:
            return passes
        
        ball = ball_detections[0]
        ball_pos = ball["position"]
        
        # Find nearest players with their IDs
        player_distances = []
        for player in player_detections:
            player_pos = player.get("position", {})
            if "x" in player_pos and "y" in player_pos:
                distance = np.sqrt(
                    (ball_pos["x"] - player_pos["x"])**2 +
                    (ball_pos["y"] - player_pos["y"])**2
                )
                player_distances.append((player, distance))
        
        player_distances.sort(key=lambda x: x[1])
        
        # If ball is near a player and moving, it's likely a pass
        if len(player_distances) >= 2:
            nearest_player, nearest_dist = player_distances[0]
            second_nearest, second_dist = player_distances[1]
            
            sender_pos = nearest_player.get("position", {})
            receiver_pos = second_nearest.get("position", {})
            sender_id = nearest_player.get("playerId")
            receiver_id = second_nearest.get("playerId")
            
            # Check if ball is moving between players
            if len(self.ball_history) >= 3:
                recent_balls = list(self.ball_history)[-3:]
                ball_moved = any(
                    abs(recent_balls[i]["position"]["x"] - recent_balls[i-1]["position"]["x"]) > 2
                    or abs(recent_balls[i]["position"]["y"] - recent_balls[i-1]["position"]["y"]) > 2
                    for i in range(1, len(recent_balls))
                )
                
                if nearest_dist < self.pass_distance_threshold and ball_moved and sender_id and receiver_id:
                    # Determine if pass is successful (ball reaches second player)
                    successful = second_dist < self.pass_distance_threshold
                    
                    # Calculate pass angle and intensity for Vector Field
                    if "x" in receiver_pos and "y" in receiver_pos:
                        dx = receiver_pos["x"] - sender_pos.get("x", ball_pos["x"])
                        dy = receiver_pos["y"] - sender_pos.get("y", ball_pos["y"])
                        angle = np.degrees(np.arctan2(dy, dx))
                        intensity = min(1.0, np.sqrt(dx**2 + dy**2) / 50.0)  # Normalize to 0-1
                    else:
                        angle = 0.0
                        intensity = 0.5
                    
                    # Determine team
                    team = self._determine_team(ball_pos)
                    
                    passes.append({
                        "type": "pass",
                        "team": team,
                        "playerId": sender_id,  # REQUIRED for Network Analysis
                        "frame": frame_data["frame"],
                        "timestamp": frame_data["timestamp"],
                        "minute": int(frame_data["timestamp"] / 60),
                        "x": sender_pos.get("x", ball_pos["x"]),  # Pass start position
                        "y": sender_pos.get("y", ball_pos["y"]),
                        "metadata": {
                            "toPlayerId": receiver_id,  # REQUIRED for Network Analysis
                            "toX": receiver_pos.get("x", ball_pos["x"]),  # REQUIRED for Vector Field
                            "toY": receiver_pos.get("y", ball_pos["y"]),  # REQUIRED for Vector Field
                            "angle": round(angle, 1),  # For Vector Field visualization
                            "intensity": round(intensity, 2),  # For Vector Field visualization
                            "successful": successful,
                            "passType": "short" if nearest_dist < 30 else "long"
                        }
                    })
        
        return passes
    
    def _detect_touches(
        self,
        frame_data: Dict,
        ball_detections: List[Dict],
        player_detections: List[Dict]
    ) -> List[Dict]:
        """
        Detect player touches on ball
        Required for Sense Matrix and Distribution Map
        """
        touches = []
        
        if not ball_detections:
            return touches
        
        ball = ball_detections[0]
        ball_pos = ball["position"]
        team = self._determine_team(ball_pos)
        
        # Find players near ball
        for player in player_detections:
            player_pos = player.get("position", {})
            if "x" in player_pos and "y" in player_pos:
                distance = np.sqrt(
                    (ball_pos["x"] - player_pos["x"])**2 +
                    (ball_pos["y"] - player_pos["y"])**2
                )
                
                if distance < self.touch_distance_threshold:
                    player_id = player.get("playerId")
                    touches.append({
                        "type": "touch",
                        "team": team,
                        "playerId": player_id,
                        "frame": frame_data["frame"],
                        "timestamp": frame_data["timestamp"],
                        "minute": int(frame_data["timestamp"] / 60),
                        "x": ball_pos["x"],
                        "y": ball_pos["y"]
                    })
                    break  # One touch per frame
        
        return touches
    
    def _detect_tackles(
        self,
        frame_data: Dict,
        ball_detections: List[Dict],
        player_detections: List[Dict]
    ) -> List[Dict]:
        """
        Detect tackles (defensive challenges)
        Required for Sense Matrix
        """
        tackles = []
        
        if not ball_detections or len(player_detections) < 2:
            return tackles
        
        ball = ball_detections[0]
        ball_pos = ball["position"]
        team = self._determine_team(ball_pos)
        
        # Find players near ball
        nearby_players = []
        for player in player_detections:
            player_pos = player.get("position", {})
            if "x" in player_pos and "y" in player_pos:
                distance = np.sqrt(
                    (ball_pos["x"] - player_pos["x"])**2 +
                    (ball_pos["y"] - player_pos["y"])**2
                )
                if distance < self.tackle_distance_threshold:
                    nearby_players.append((player, distance))
        
        # Tackle: multiple players competing for ball
        if len(nearby_players) >= 2:
            # Use the closest player as the tackler
            nearby_players.sort(key=lambda x: x[1])
            tackler = nearby_players[0][0]
            player_id = tackler.get("playerId")
            
            tackles.append({
                "type": "tackle",
                "team": team,
                "playerId": player_id,
                "frame": frame_data["frame"],
                "timestamp": frame_data["timestamp"],
                "minute": int(frame_data["timestamp"] / 60),
                "x": ball_pos["x"],
                "y": ball_pos["y"]
            })
        
        return tackles
    
    def _detect_interceptions(
        self,
        frame_data: Dict,
        ball_detections: List[Dict],
        player_detections: List[Dict]
    ) -> List[Dict]:
        """
        Detect interceptions (ball change without contact)
        Required for Summary statistics
        """
        interceptions = []
        
        # Simplified: ball changes direction quickly without player contact
        if len(self.ball_history) >= 5 and ball_detections:
            recent_balls = list(self.ball_history)[-5:]
            ball = ball_detections[0]
            ball_pos = ball["position"]
            team = self._determine_team(ball_pos)
            
            # Find nearest player
            player_id = None
            if player_detections:
                min_dist = float('inf')
                for player in player_detections:
                    player_pos = player.get("position", {})
                    if "x" in player_pos and "y" in player_pos:
                        distance = np.sqrt(
                            (ball_pos["x"] - player_pos["x"])**2 +
                            (ball_pos["y"] - player_pos["y"])**2
                        )
                        if distance < min_dist and distance < 20:
                            min_dist = distance
                            player_id = player.get("playerId")
            
            # Check for sudden direction change
            directions = []
            for i in range(1, len(recent_balls)):
                prev_pos = recent_balls[i-1]["position"]
                curr_pos = recent_balls[i]["position"]
                dx = curr_pos["x"] - prev_pos["x"]
                dy = curr_pos["y"] - prev_pos["y"]
                direction = np.arctan2(dy, dx)
                directions.append(direction)
            
            # If direction changes significantly, might be interception
            if len(directions) >= 2:
                direction_change = abs(directions[-1] - directions[0])
                if direction_change > np.pi / 2:  # 90 degree change
                    interceptions.append({
                        "type": "interception",
                        "team": team,
                        "playerId": player_id,
                        "frame": frame_data["frame"],
                        "timestamp": frame_data["timestamp"],
                        "minute": int(frame_data["timestamp"] / 60),
                        "x": ball_pos["x"],
                        "y": ball_pos["y"]
                    })
        
        return interceptions
    
    def _detect_recoveries(
        self,
        frame_data: Dict,
        ball_detections: List[Dict],
        player_detections: List[Dict]
    ) -> List[Dict]:
        """
        Detect ball recoveries
        Required for Summary statistics
        """
        recoveries = []
        
        # Simplified: ball near player after being away
        if ball_detections and len(self.ball_history) >= 10:
            ball = ball_detections[0]
            ball_pos = ball["position"]
            team = self._determine_team(ball_pos)
            
            # Check if ball was away and now is near a player
            recent_balls = list(self.ball_history)[-10:-5]
            old_ball_pos = recent_balls[0]["position"] if recent_balls else None
            
            if old_ball_pos:
                # Check if ball moved significantly
                distance_moved = np.sqrt(
                    (ball_pos["x"] - old_ball_pos["x"])**2 +
                    (ball_pos["y"] - old_ball_pos["y"])**2
                )
                
                # Check if ball is now near a player
                for player in player_detections:
                    player_pos = player.get("position", {})
                    if "x" in player_pos and "y" in player_pos:
                        distance = np.sqrt(
                            (ball_pos["x"] - player_pos["x"])**2 +
                            (ball_pos["y"] - player_pos["y"])**2
                        )
                        
                        if distance < self.touch_distance_threshold and distance_moved > 20:
                            player_id = player.get("playerId")
                            recoveries.append({
                                "type": "recovery",
                                "team": team,
                                "playerId": player_id,
                                "frame": frame_data["frame"],
                                "timestamp": frame_data["timestamp"],
                                "minute": int(frame_data["timestamp"] / 60),
                                "x": ball_pos["x"],
                                "y": ball_pos["y"]
                            })
                            break
        
        return recoveries
    
    def _detect_corners(
        self,
        frame_data: Dict,
        ball_detections: List[Dict],
        player_detections: List[Dict]
    ) -> List[Dict]:
        """
        Detect corner kicks
        Required for Summary statistics
        """
        corners = []
        
        # Simplified: ball out of bounds near corner
        if ball_detections:
            ball = ball_detections[0]
            ball_pos = ball["position"]
            team = self._determine_team(ball_pos)
            
            # Find nearest player
            player_id = None
            if player_detections:
                min_dist = float('inf')
                for player in player_detections:
                    player_pos = player.get("position", {})
                    if "x" in player_pos and "y" in player_pos:
                        distance = np.sqrt(
                            (ball_pos["x"] - player_pos["x"])**2 +
                            (ball_pos["y"] - player_pos["y"])**2
                        )
                        if distance < min_dist and distance < 15:
                            min_dist = distance
                            player_id = player.get("playerId")
            
            # Check if ball is near corner (x near 0 or 100, y near 0)
            if (ball_pos["x"] < 5 or ball_pos["x"] > 95) and ball_pos["y"] < 10:
                corners.append({
                    "type": "corner",
                    "team": team,
                    "playerId": player_id,
                    "frame": frame_data["frame"],
                    "timestamp": frame_data["timestamp"],
                    "minute": int(frame_data["timestamp"] / 60),
                    "x": ball_pos["x"],
                    "y": ball_pos["y"]
                })
        
        return corners
    
    def _detect_free_kicks(
        self,
        frame_data: Dict,
        ball_detections: List[Dict],
        player_detections: List[Dict]
    ) -> List[Dict]:
        """
        Detect free kicks
        Required for Summary statistics
        """
        free_kicks = []
        
        # Simplified: ball stationary in dangerous area
        if ball_detections and len(self.ball_history) >= 5:
            recent_balls = list(self.ball_history)[-5:]
            ball = ball_detections[0]
            ball_pos = ball["position"]
            team = self._determine_team(ball_pos)
            
            # Find nearest player
            player_id = None
            if player_detections:
                min_dist = float('inf')
                for player in player_detections:
                    player_pos = player.get("position", {})
                    if "x" in player_pos and "y" in player_pos:
                        distance = np.sqrt(
                            (ball_pos["x"] - player_pos["x"])**2 +
                            (ball_pos["y"] - player_pos["y"])**2
                        )
                        if distance < min_dist and distance < 15:
                            min_dist = distance
                            player_id = player.get("playerId")
            
            # Check if ball is stationary
            positions = [b["position"] for b in recent_balls]
            x_positions = [p["x"] for p in positions]
            y_positions = [p["y"] for p in positions]
            
            x_variance = np.var(x_positions)
            y_variance = np.var(y_positions)
            
            # Ball is stationary (low variance) and in dangerous area
            if x_variance < 1 and y_variance < 1:
                if 50 < ball_pos["x"] < 90 and ball_pos["y"] < 30:  # Attacking third
                    free_kicks.append({
                        "type": "free_kick",
                        "team": team,
                        "playerId": player_id,
                        "frame": frame_data["frame"],
                        "timestamp": frame_data["timestamp"],
                        "minute": int(frame_data["timestamp"] / 60),
                        "x": ball_pos["x"],
                        "y": ball_pos["y"]
                    })
        
        return free_kicks
    
    def _calculate_xg(self, position: Dict) -> float:
        """Calculate xG based on shot position"""
        x = position["x"]  # 0-100 (left to right)
        y = position["y"]  # 0-100 (attacking to defending)
        
        # Convert to meters (pitch: 105m x 68m)
        pitch_length = 105
        pitch_width = 68
        goal_width = 7.32
        
        x_meters = (x / 100) * pitch_width
        y_meters = (y / 100) * pitch_length
        
        # Distance from goal center
        goal_center_x = pitch_width / 2
        distance = np.sqrt((x_meters - goal_center_x)**2 + y_meters**2)
        
        # Simple xG model (can be enhanced)
        if distance < 6:
            return 0.65
        elif distance < 12:
            return 0.35
        elif distance < 18:
            return 0.17
        elif distance < 25:
            return 0.08
        else:
            return 0.03


            recent_balls = list(self.ball_history)[-5:]
            ball = ball_detections[0]
            ball_pos = ball["position"]
            team = self._determine_team(ball_pos)
            
            # Find nearest player
            player_id = None
            if player_detections:
                min_dist = float('inf')
                for player in player_detections:
                    player_pos = player.get("position", {})
                    if "x" in player_pos and "y" in player_pos:
                        distance = np.sqrt(
                            (ball_pos["x"] - player_pos["x"])**2 +
                            (ball_pos["y"] - player_pos["y"])**2
                        )
                        if distance < min_dist and distance < 20:
                            min_dist = distance
                            player_id = player.get("playerId")
            
            # Check for sudden direction change
            directions = []
            for i in range(1, len(recent_balls)):
                prev_pos = recent_balls[i-1]["position"]
                curr_pos = recent_balls[i]["position"]
                dx = curr_pos["x"] - prev_pos["x"]
                dy = curr_pos["y"] - prev_pos["y"]
                direction = np.arctan2(dy, dx)
                directions.append(direction)
            
            # If direction changes significantly, might be interception
            if len(directions) >= 2:
                direction_change = abs(directions[-1] - directions[0])
                if direction_change > np.pi / 2:  # 90 degree change
                    interceptions.append({
                        "type": "interception",
                        "team": team,
                        "playerId": player_id,
                        "frame": frame_data["frame"],
                        "timestamp": frame_data["timestamp"],
                        "minute": int(frame_data["timestamp"] / 60),
                        "x": ball_pos["x"],
                        "y": ball_pos["y"]
                    })
        
        return interceptions
    
    def _detect_recoveries(
        self,
        frame_data: Dict,
        ball_detections: List[Dict],
        player_detections: List[Dict]
    ) -> List[Dict]:
        """
        Detect ball recoveries
        Required for Summary statistics
        """
        recoveries = []
        
        # Simplified: ball near player after being away
        if ball_detections and len(self.ball_history) >= 10:
            ball = ball_detections[0]
            ball_pos = ball["position"]
            team = self._determine_team(ball_pos)
            
            # Check if ball was away and now is near a player
            recent_balls = list(self.ball_history)[-10:-5]
            old_ball_pos = recent_balls[0]["position"] if recent_balls else None
            
            if old_ball_pos:
                # Check if ball moved significantly
                distance_moved = np.sqrt(
                    (ball_pos["x"] - old_ball_pos["x"])**2 +
                    (ball_pos["y"] - old_ball_pos["y"])**2
                )
                
                # Check if ball is now near a player
                for player in player_detections:
                    player_pos = player.get("position", {})
                    if "x" in player_pos and "y" in player_pos:
                        distance = np.sqrt(
                            (ball_pos["x"] - player_pos["x"])**2 +
                            (ball_pos["y"] - player_pos["y"])**2
                        )
                        
                        if distance < self.touch_distance_threshold and distance_moved > 20:
                            player_id = player.get("playerId")
                            recoveries.append({
                                "type": "recovery",
                                "team": team,
                                "playerId": player_id,
                                "frame": frame_data["frame"],
                                "timestamp": frame_data["timestamp"],
                                "minute": int(frame_data["timestamp"] / 60),
                                "x": ball_pos["x"],
                                "y": ball_pos["y"]
                            })
                            break
        
        return recoveries
    
    def _detect_corners(
        self,
        frame_data: Dict,
        ball_detections: List[Dict],
        player_detections: List[Dict]
    ) -> List[Dict]:
        """
        Detect corner kicks
        Required for Summary statistics
        """
        corners = []
        
        # Simplified: ball out of bounds near corner
        if ball_detections:
            ball = ball_detections[0]
            ball_pos = ball["position"]
            team = self._determine_team(ball_pos)
            
            # Find nearest player
            player_id = None
            if player_detections:
                min_dist = float('inf')
                for player in player_detections:
                    player_pos = player.get("position", {})
                    if "x" in player_pos and "y" in player_pos:
                        distance = np.sqrt(
                            (ball_pos["x"] - player_pos["x"])**2 +
                            (ball_pos["y"] - player_pos["y"])**2
                        )
                        if distance < min_dist and distance < 15:
                            min_dist = distance
                            player_id = player.get("playerId")
            
            # Check if ball is near corner (x near 0 or 100, y near 0)
            if (ball_pos["x"] < 5 or ball_pos["x"] > 95) and ball_pos["y"] < 10:
                corners.append({
                    "type": "corner",
                    "team": team,
                    "playerId": player_id,
                    "frame": frame_data["frame"],
                    "timestamp": frame_data["timestamp"],
                    "minute": int(frame_data["timestamp"] / 60),
                    "x": ball_pos["x"],
                    "y": ball_pos["y"]
                })
        
        return corners
    
    def _detect_free_kicks(
        self,
        frame_data: Dict,
        ball_detections: List[Dict],
        player_detections: List[Dict]
    ) -> List[Dict]:
        """
        Detect free kicks
        Required for Summary statistics
        """
        free_kicks = []
        
        # Simplified: ball stationary in dangerous area
        if ball_detections and len(self.ball_history) >= 5:
            recent_balls = list(self.ball_history)[-5:]
            ball = ball_detections[0]
            ball_pos = ball["position"]
            team = self._determine_team(ball_pos)
            
            # Find nearest player
            player_id = None
            if player_detections:
                min_dist = float('inf')
                for player in player_detections:
                    player_pos = player.get("position", {})
                    if "x" in player_pos and "y" in player_pos:
                        distance = np.sqrt(
                            (ball_pos["x"] - player_pos["x"])**2 +
                            (ball_pos["y"] - player_pos["y"])**2
                        )
                        if distance < min_dist and distance < 15:
                            min_dist = distance
                            player_id = player.get("playerId")
            
            # Check if ball is stationary
            positions = [b["position"] for b in recent_balls]
            x_positions = [p["x"] for p in positions]
            y_positions = [p["y"] for p in positions]
            
            x_variance = np.var(x_positions)
            y_variance = np.var(y_positions)
            
            # Ball is stationary (low variance) and in dangerous area
            if x_variance < 1 and y_variance < 1:
                if 50 < ball_pos["x"] < 90 and ball_pos["y"] < 30:  # Attacking third
                    free_kicks.append({
                        "type": "free_kick",
                        "team": team,
                        "playerId": player_id,
                        "frame": frame_data["frame"],
                        "timestamp": frame_data["timestamp"],
                        "minute": int(frame_data["timestamp"] / 60),
                        "x": ball_pos["x"],
                        "y": ball_pos["y"]
                    })
        
        return free_kicks
    
    def _calculate_xg(self, position: Dict) -> float:
        """Calculate xG based on shot position"""
        x = position["x"]  # 0-100 (left to right)
        y = position["y"]  # 0-100 (attacking to defending)
        
        # Convert to meters (pitch: 105m x 68m)
        pitch_length = 105
        pitch_width = 68
        goal_width = 7.32
        
        x_meters = (x / 100) * pitch_width
        y_meters = (y / 100) * pitch_length
        
        # Distance from goal center
        goal_center_x = pitch_width / 2
        distance = np.sqrt((x_meters - goal_center_x)**2 + y_meters**2)
        
        # Simple xG model (can be enhanced)
        if distance < 6:
            return 0.65
        elif distance < 12:
            return 0.35
        elif distance < 18:
            return 0.17
        elif distance < 25:
            return 0.08
        else:
            return 0.03


            recent_balls = list(self.ball_history)[-5:]
            ball = ball_detections[0]
            ball_pos = ball["position"]
            team = self._determine_team(ball_pos)
            
            # Find nearest player
            player_id = None
            if player_detections:
                min_dist = float('inf')
                for player in player_detections:
                    player_pos = player.get("position", {})
                    if "x" in player_pos and "y" in player_pos:
                        distance = np.sqrt(
                            (ball_pos["x"] - player_pos["x"])**2 +
                            (ball_pos["y"] - player_pos["y"])**2
                        )
                        if distance < min_dist and distance < 20:
                            min_dist = distance
                            player_id = player.get("playerId")
            
            # Check for sudden direction change
            directions = []
            for i in range(1, len(recent_balls)):
                prev_pos = recent_balls[i-1]["position"]
                curr_pos = recent_balls[i]["position"]
                dx = curr_pos["x"] - prev_pos["x"]
                dy = curr_pos["y"] - prev_pos["y"]
                direction = np.arctan2(dy, dx)
                directions.append(direction)
            
            # If direction changes significantly, might be interception
            if len(directions) >= 2:
                direction_change = abs(directions[-1] - directions[0])
                if direction_change > np.pi / 2:  # 90 degree change
                    interceptions.append({
                        "type": "interception",
                        "team": team,
                        "playerId": player_id,
                        "frame": frame_data["frame"],
                        "timestamp": frame_data["timestamp"],
                        "minute": int(frame_data["timestamp"] / 60),
                        "x": ball_pos["x"],
                        "y": ball_pos["y"]
                    })
        
        return interceptions
    
    def _detect_recoveries(
        self,
        frame_data: Dict,
        ball_detections: List[Dict],
        player_detections: List[Dict]
    ) -> List[Dict]:
        """
        Detect ball recoveries
        Required for Summary statistics
        """
        recoveries = []
        
        # Simplified: ball near player after being away
        if ball_detections and len(self.ball_history) >= 10:
            ball = ball_detections[0]
            ball_pos = ball["position"]
            team = self._determine_team(ball_pos)
            
            # Check if ball was away and now is near a player
            recent_balls = list(self.ball_history)[-10:-5]
            old_ball_pos = recent_balls[0]["position"] if recent_balls else None
            
            if old_ball_pos:
                # Check if ball moved significantly
                distance_moved = np.sqrt(
                    (ball_pos["x"] - old_ball_pos["x"])**2 +
                    (ball_pos["y"] - old_ball_pos["y"])**2
                )
                
                # Check if ball is now near a player
                for player in player_detections:
                    player_pos = player.get("position", {})
                    if "x" in player_pos and "y" in player_pos:
                        distance = np.sqrt(
                            (ball_pos["x"] - player_pos["x"])**2 +
                            (ball_pos["y"] - player_pos["y"])**2
                        )
                        
                        if distance < self.touch_distance_threshold and distance_moved > 20:
                            player_id = player.get("playerId")
                            recoveries.append({
                                "type": "recovery",
                                "team": team,
                                "playerId": player_id,
                                "frame": frame_data["frame"],
                                "timestamp": frame_data["timestamp"],
                                "minute": int(frame_data["timestamp"] / 60),
                                "x": ball_pos["x"],
                                "y": ball_pos["y"]
                            })
                            break
        
        return recoveries
    
    def _detect_corners(
        self,
        frame_data: Dict,
        ball_detections: List[Dict],
        player_detections: List[Dict]
    ) -> List[Dict]:
        """
        Detect corner kicks
        Required for Summary statistics
        """
        corners = []
        
        # Simplified: ball out of bounds near corner
        if ball_detections:
            ball = ball_detections[0]
            ball_pos = ball["position"]
            team = self._determine_team(ball_pos)
            
            # Find nearest player
            player_id = None
            if player_detections:
                min_dist = float('inf')
                for player in player_detections:
                    player_pos = player.get("position", {})
                    if "x" in player_pos and "y" in player_pos:
                        distance = np.sqrt(
                            (ball_pos["x"] - player_pos["x"])**2 +
                            (ball_pos["y"] - player_pos["y"])**2
                        )
                        if distance < min_dist and distance < 15:
                            min_dist = distance
                            player_id = player.get("playerId")
            
            # Check if ball is near corner (x near 0 or 100, y near 0)
            if (ball_pos["x"] < 5 or ball_pos["x"] > 95) and ball_pos["y"] < 10:
                corners.append({
                    "type": "corner",
                    "team": team,
                    "playerId": player_id,
                    "frame": frame_data["frame"],
                    "timestamp": frame_data["timestamp"],
                    "minute": int(frame_data["timestamp"] / 60),
                    "x": ball_pos["x"],
                    "y": ball_pos["y"]
                })
        
        return corners
    
    def _detect_free_kicks(
        self,
        frame_data: Dict,
        ball_detections: List[Dict],
        player_detections: List[Dict]
    ) -> List[Dict]:
        """
        Detect free kicks
        Required for Summary statistics
        """
        free_kicks = []
        
        # Simplified: ball stationary in dangerous area
        if ball_detections and len(self.ball_history) >= 5:
            recent_balls = list(self.ball_history)[-5:]
            ball = ball_detections[0]
            ball_pos = ball["position"]
            team = self._determine_team(ball_pos)
            
            # Find nearest player
            player_id = None
            if player_detections:
                min_dist = float('inf')
                for player in player_detections:
                    player_pos = player.get("position", {})
                    if "x" in player_pos and "y" in player_pos:
                        distance = np.sqrt(
                            (ball_pos["x"] - player_pos["x"])**2 +
                            (ball_pos["y"] - player_pos["y"])**2
                        )
                        if distance < min_dist and distance < 15:
                            min_dist = distance
                            player_id = player.get("playerId")
            
            # Check if ball is stationary
            positions = [b["position"] for b in recent_balls]
            x_positions = [p["x"] for p in positions]
            y_positions = [p["y"] for p in positions]
            
            x_variance = np.var(x_positions)
            y_variance = np.var(y_positions)
            
            # Ball is stationary (low variance) and in dangerous area
            if x_variance < 1 and y_variance < 1:
                if 50 < ball_pos["x"] < 90 and ball_pos["y"] < 30:  # Attacking third
                    free_kicks.append({
                        "type": "free_kick",
                        "team": team,
                        "playerId": player_id,
                        "frame": frame_data["frame"],
                        "timestamp": frame_data["timestamp"],
                        "minute": int(frame_data["timestamp"] / 60),
                        "x": ball_pos["x"],
                        "y": ball_pos["y"]
                    })
        
        return free_kicks
    
    def _calculate_xg(self, position: Dict) -> float:
        """Calculate xG based on shot position"""
        x = position["x"]  # 0-100 (left to right)
        y = position["y"]  # 0-100 (attacking to defending)
        
        # Convert to meters (pitch: 105m x 68m)
        pitch_length = 105
        pitch_width = 68
        goal_width = 7.32
        
        x_meters = (x / 100) * pitch_width
        y_meters = (y / 100) * pitch_length
        
        # Distance from goal center
        goal_center_x = pitch_width / 2
        distance = np.sqrt((x_meters - goal_center_x)**2 + y_meters**2)
        
        # Simple xG model (can be enhanced)
        if distance < 6:
            return 0.65
        elif distance < 12:
            return 0.35
        elif distance < 18:
            return 0.17
        elif distance < 25:
            return 0.08
        else:
            return 0.03


            recent_balls = list(self.ball_history)[-5:]
            ball = ball_detections[0]
            ball_pos = ball["position"]
            team = self._determine_team(ball_pos)
            
            # Find nearest player
            player_id = None
            if player_detections:
                min_dist = float('inf')
                for player in player_detections:
                    player_pos = player.get("position", {})
                    if "x" in player_pos and "y" in player_pos:
                        distance = np.sqrt(
                            (ball_pos["x"] - player_pos["x"])**2 +
                            (ball_pos["y"] - player_pos["y"])**2
                        )
                        if distance < min_dist and distance < 20:
                            min_dist = distance
                            player_id = player.get("playerId")
            
            # Check for sudden direction change
            directions = []
            for i in range(1, len(recent_balls)):
                prev_pos = recent_balls[i-1]["position"]
                curr_pos = recent_balls[i]["position"]
                dx = curr_pos["x"] - prev_pos["x"]
                dy = curr_pos["y"] - prev_pos["y"]
                direction = np.arctan2(dy, dx)
                directions.append(direction)
            
            # If direction changes significantly, might be interception
            if len(directions) >= 2:
                direction_change = abs(directions[-1] - directions[0])
                if direction_change > np.pi / 2:  # 90 degree change
                    interceptions.append({
                        "type": "interception",
                        "team": team,
                        "playerId": player_id,
                        "frame": frame_data["frame"],
                        "timestamp": frame_data["timestamp"],
                        "minute": int(frame_data["timestamp"] / 60),
                        "x": ball_pos["x"],
                        "y": ball_pos["y"]
                    })
        
        return interceptions
    
    def _detect_recoveries(
        self,
        frame_data: Dict,
        ball_detections: List[Dict],
        player_detections: List[Dict]
    ) -> List[Dict]:
        """
        Detect ball recoveries
        Required for Summary statistics
        """
        recoveries = []
        
        # Simplified: ball near player after being away
        if ball_detections and len(self.ball_history) >= 10:
            ball = ball_detections[0]
            ball_pos = ball["position"]
            team = self._determine_team(ball_pos)
            
            # Check if ball was away and now is near a player
            recent_balls = list(self.ball_history)[-10:-5]
            old_ball_pos = recent_balls[0]["position"] if recent_balls else None
            
            if old_ball_pos:
                # Check if ball moved significantly
                distance_moved = np.sqrt(
                    (ball_pos["x"] - old_ball_pos["x"])**2 +
                    (ball_pos["y"] - old_ball_pos["y"])**2
                )
                
                # Check if ball is now near a player
                for player in player_detections:
                    player_pos = player.get("position", {})
                    if "x" in player_pos and "y" in player_pos:
                        distance = np.sqrt(
                            (ball_pos["x"] - player_pos["x"])**2 +
                            (ball_pos["y"] - player_pos["y"])**2
                        )
                        
                        if distance < self.touch_distance_threshold and distance_moved > 20:
                            player_id = player.get("playerId")
                            recoveries.append({
                                "type": "recovery",
                                "team": team,
                                "playerId": player_id,
                                "frame": frame_data["frame"],
                                "timestamp": frame_data["timestamp"],
                                "minute": int(frame_data["timestamp"] / 60),
                                "x": ball_pos["x"],
                                "y": ball_pos["y"]
                            })
                            break
        
        return recoveries
    
    def _detect_corners(
        self,
        frame_data: Dict,
        ball_detections: List[Dict],
        player_detections: List[Dict]
    ) -> List[Dict]:
        """
        Detect corner kicks
        Required for Summary statistics
        """
        corners = []
        
        # Simplified: ball out of bounds near corner
        if ball_detections:
            ball = ball_detections[0]
            ball_pos = ball["position"]
            team = self._determine_team(ball_pos)
            
            # Find nearest player
            player_id = None
            if player_detections:
                min_dist = float('inf')
                for player in player_detections:
                    player_pos = player.get("position", {})
                    if "x" in player_pos and "y" in player_pos:
                        distance = np.sqrt(
                            (ball_pos["x"] - player_pos["x"])**2 +
                            (ball_pos["y"] - player_pos["y"])**2
                        )
                        if distance < min_dist and distance < 15:
                            min_dist = distance
                            player_id = player.get("playerId")
            
            # Check if ball is near corner (x near 0 or 100, y near 0)
            if (ball_pos["x"] < 5 or ball_pos["x"] > 95) and ball_pos["y"] < 10:
                corners.append({
                    "type": "corner",
                    "team": team,
                    "playerId": player_id,
                    "frame": frame_data["frame"],
                    "timestamp": frame_data["timestamp"],
                    "minute": int(frame_data["timestamp"] / 60),
                    "x": ball_pos["x"],
                    "y": ball_pos["y"]
                })
        
        return corners
    
    def _detect_free_kicks(
        self,
        frame_data: Dict,
        ball_detections: List[Dict],
        player_detections: List[Dict]
    ) -> List[Dict]:
        """
        Detect free kicks
        Required for Summary statistics
        """
        free_kicks = []
        
        # Simplified: ball stationary in dangerous area
        if ball_detections and len(self.ball_history) >= 5:
            recent_balls = list(self.ball_history)[-5:]
            ball = ball_detections[0]
            ball_pos = ball["position"]
            team = self._determine_team(ball_pos)
            
            # Find nearest player
            player_id = None
            if player_detections:
                min_dist = float('inf')
                for player in player_detections:
                    player_pos = player.get("position", {})
                    if "x" in player_pos and "y" in player_pos:
                        distance = np.sqrt(
                            (ball_pos["x"] - player_pos["x"])**2 +
                            (ball_pos["y"] - player_pos["y"])**2
                        )
                        if distance < min_dist and distance < 15:
                            min_dist = distance
                            player_id = player.get("playerId")
            
            # Check if ball is stationary
            positions = [b["position"] for b in recent_balls]
            x_positions = [p["x"] for p in positions]
            y_positions = [p["y"] for p in positions]
            
            x_variance = np.var(x_positions)
            y_variance = np.var(y_positions)
            
            # Ball is stationary (low variance) and in dangerous area
            if x_variance < 1 and y_variance < 1:
                if 50 < ball_pos["x"] < 90 and ball_pos["y"] < 30:  # Attacking third
                    free_kicks.append({
                        "type": "free_kick",
                        "team": team,
                        "playerId": player_id,
                        "frame": frame_data["frame"],
                        "timestamp": frame_data["timestamp"],
                        "minute": int(frame_data["timestamp"] / 60),
                        "x": ball_pos["x"],
                        "y": ball_pos["y"]
                    })
        
        return free_kicks
    
    def _calculate_xg(self, position: Dict) -> float:
        """Calculate xG based on shot position"""
        x = position["x"]  # 0-100 (left to right)
        y = position["y"]  # 0-100 (attacking to defending)
        
        # Convert to meters (pitch: 105m x 68m)
        pitch_length = 105
        pitch_width = 68
        goal_width = 7.32
        
        x_meters = (x / 100) * pitch_width
        y_meters = (y / 100) * pitch_length
        
        # Distance from goal center
        goal_center_x = pitch_width / 2
        distance = np.sqrt((x_meters - goal_center_x)**2 + y_meters**2)
        
        # Simple xG model (can be enhanced)
        if distance < 6:
            return 0.65
        elif distance < 12:
            return 0.35
        elif distance < 18:
            return 0.17
        elif distance < 25:
            return 0.08
        else:
            return 0.03

