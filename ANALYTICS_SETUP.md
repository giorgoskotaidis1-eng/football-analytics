# 📊 Football Analytics Setup

## ✅ What's Been Added

### 1. Database Schema
- **MatchEvent model**: Stores all match events (shots, passes, touches) with coordinates
- Tracks: x, y coordinates, event type, team, player, minute, metadata, xG

### 2. Analytics Library (`src/lib/analytics.ts`)
- **xG Calculation**: Calculates expected goals based on shot location, angle, type
- **Possession Calculation**: Calculates possession % from pass/touch events
- **Heatmap Generation**: Creates heatmap data from event coordinates
- **Shot Statistics**: Calculates shot stats (total, on target, goals, conversion rate)

### 3. API Routes
- `GET /api/matches/[id]/analytics` - Get all analytics for a match
- `GET /api/matches/[id]/events` - Get all events for a match
- `POST /api/matches/[id]/events` - Add new event to match

### 4. UI Components
- **Heatmap Component**: Visualizes heatmaps on pitch

## 🚀 How to Use

### Step 1: Run Migration

```bash
npx prisma migrate dev --name add_match_events_analytics
```

### Step 2: Add Events to Match

You can add events via API:

```javascript
// Add a shot
POST /api/matches/1/events
{
  "type": "shot",
  "team": "home",
  "playerId": 1,
  "x": 75,  // 0-100 (left to right)
  "y": 15,  // 0-100 (attacking end to defending end)
  "minute": 23,
  "metadata": {
    "shotType": "open_play",
    "bodyPart": "foot",
    "outcome": "goal"
  }
}

// Add a pass
POST /api/matches/1/events
{
  "type": "pass",
  "team": "home",
  "playerId": 2,
  "x": 50,
  "y": 50,
  "minute": 23,
  "metadata": {
    "successful": true
  }
}

// Add a touch
POST /api/matches/1/events
{
  "type": "touch",
  "team": "home",
  "playerId": 3,
  "x": 60,
  "y": 40,
  "minute": 25
}
```

### Step 3: Get Analytics

```javascript
GET /api/matches/1/analytics

Response:
{
  "ok": true,
  "analytics": {
    "xg": {
      "home": 1.85,
      "away": 0.92
    },
    "possession": {
      "home": 62.3,
      "away": 37.7
    },
    "shots": {
      "home": {
        "total": 12,
        "onTarget": 7,
        "goals": 2,
        "totalXG": 1.85,
        "averageXG": 0.15,
        "conversionRate": 16.7
      },
      "away": { ... }
    },
    "heatmaps": {
      "home": [[...], [...]], // 20x20 grid
      "away": [[...], [...]]
    },
    "shotMaps": {
      "home": [[...], [...]],
      "away": [[...], [...]]
    }
  }
}
```

## 📐 Coordinate System

- **x**: 0 = left touchline, 100 = right touchline
- **y**: 0 = attacking end (goal), 100 = defending end
- Standard pitch: 105m x 68m

## 🎯 xG Model

The xG calculation considers:
- **Distance from goal**: Closer = higher xG
- **Angle to goal**: Center = higher xG
- **Shot type**: Penalty = 0.76, open play varies
- **Body part**: Foot typically higher than head

## 📊 Heatmap

- Divides pitch into 20x20 grid (400 cells)
- Counts events per cell
- Color intensity: Green (low) → Blue → Yellow → Red (high)

## 🔄 Next Steps

1. Run migration to add MatchEvent model
2. Integrate analytics into match detail page
3. Add event input form for manual data entry
4. Connect to tracking data provider (optional)

---

**Ready to track real match data!** ⚽📊

