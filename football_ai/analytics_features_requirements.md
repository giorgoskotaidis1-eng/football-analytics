# Analytics Features Requirements for AI Analysis

This document describes the analytics features that depend on AI-generated events and their data requirements.

## Overview

The Football Analytics app includes several advanced analytics visualizations that require specific event data structures. The AI video analysis must generate events that are compatible with these features.

## Required Features

### 1. Summary
**Purpose**: Overall match statistics and key metrics

**Required Event Fields**:
- `type`: string (shot, pass, touch, tackle, interception, recovery, corner, free_kick)
- `team`: string ("home" or "away")
- `playerId`: number | null
- `x`: number | null (0-100, normalized pitch position)
- `y`: number | null (0-100, normalized pitch position)
- `minute`: number | null

**Event Types Needed**:
- `shot`: Shots on goal
- `pass`: Passes between players
- `touch`: Ball touches
- `tackle`: Defensive tackles
- `interception`: Ball interceptions
- `recovery`: Ball recoveries
- `corner`: Corner kicks
- `free_kick`: Free kicks

---

### 2. Network Analysis
**Purpose**: Visualize passing networks and player connections

**Required Event Fields**:
- `type`: "pass" (only passes are used)
- `team`: string ("home" or "away")
- `playerId`: number (REQUIRED - cannot be null)
- `x`: number (REQUIRED - pass start position, 0-100)
- `y`: number (REQUIRED - pass start position, 0-100)
- `metadata`: object with:
  - `toPlayerId`: number (REQUIRED - recipient player ID)
  - `toX`: number (pass end position, 0-100)
  - `toY`: number (pass end position, 0-100)
  - `successful`: boolean (pass completion status)

**Key Requirements**:
- Passes MUST have both `playerId` (sender) and `metadata.toPlayerId` (receiver)
- Both start (x, y) and end (toX, toY) positions are required
- Network analysis calculates total passes, key nodes, and active players

---

### 3. Sense Matrix
**Purpose**: Player performance matrix showing interaction intensity

**Required Event Fields**:
- `type`: string (shot, pass, touch, tackle)
- `team`: string ("home" or "away")
- `playerId`: number (REQUIRED - cannot be null)
- `x`: number | null
- `y`: number | null

**Key Requirements**:
- Events MUST have `playerId` to calculate per-player metrics
- Calculates Sense Score: (shots * 2 + passes * 0.5 + touches * 0.3 + tackles * 1.5) / 10
- Creates 8x8 interaction matrix between players
- Requires events from multiple players to show interactions

---

### 4. Distribution Map
**Purpose**: Show event distribution across pitch zones

**Required Event Fields**:
- `type`: string (pass, shot, touch)
- `team`: string ("home" or "away")
- `x`: number (REQUIRED - 0-100, normalized pitch position)
- `y`: number (REQUIRED - 0-100, normalized pitch position)

**Zone Definitions**:
- Self box: x = 0-20
- Def third: x = 20-40
- Middle: x = 40-60
- Att third: x = 60-80
- Opp box: x = 80-100

**Key Requirements**:
- Events MUST have valid x, y coordinates (not null)
- Groups events by zone and calculates passes, shots, touches per zone

---

### 5. Activity Field
**Purpose**: Heatmap showing zone activity intensity

**Required Event Fields**:
- `type`: string (any event type)
- `team`: string ("home" or "away")
- `x`: number (REQUIRED - 0-100)
- `y`: number (REQUIRED - 0-100)

**Key Requirements**:
- Events MUST have valid x, y coordinates
- Creates 6x5 grid heatmap (30 cells)
- Calculates intensity based on event frequency per zone

---

### 6. Vector Field
**Purpose**: Show movement vectors and pass directions

**Required Event Fields**:
- `type`: "pass" (only passes are used)
- `team`: string ("home" or "away")
- `x`: number (REQUIRED - pass start position, 0-100)
- `y`: number (REQUIRED - pass start position, 0-100)
- `metadata`: object with:
  - `toX`: number (REQUIRED - pass end position, 0-100)
  - `toY`: number (REQUIRED - pass end position, 0-100)
  - `angle`: number (optional - pass angle in degrees)
  - `intensity`: number (optional - pass intensity/speed)

**Key Requirements**:
- Passes MUST have both start (x, y) and end (toX, toY) positions
- Calculates vector angle and intensity if not provided
- Visualizes pass directions as arrows on pitch

---

### 7. Spotlight
**Purpose**: Highlight key moments and events

**Required Event Fields**:
- `type`: string (shot, pass, touch, tackle, etc.)
- `team`: string ("home" or "away")
- `playerId`: number | null
- `x`: number | null
- `y`: number | null
- `minute`: number | null
- `metadata`: object with:
  - `outcome`: string (optional - "goal", "saved", "missed", etc.)
  - `xg`: number (optional - expected goals value)

**Key Requirements**:
- Events should have `minute` for timeline display
- `metadata.xg` is important for shot quality
- `metadata.outcome` helps categorize events

---

## Event Data Structure

### Standard Event Format

```json
{
  "type": "pass",
  "team": "home",
  "playerId": 123,
  "x": 45.5,
  "y": 50.0,
  "minute": 23,
  "metadata": {
    "toPlayerId": 124,
    "toX": 60.0,
    "toY": 45.0,
    "successful": true,
    "angle": 45.0,
    "intensity": 0.8
  }
}
```

### Required vs Optional Fields

**Always Required**:
- `type`: string
- `team`: string ("home" or "away")

**Required for Network Analysis**:
- `playerId`: number (for passes)
- `metadata.toPlayerId`: number (for passes)

**Required for Position-Based Features** (Distribution Map, Activity Field, Vector Field):
- `x`: number (0-100)
- `y`: number (0-100)

**Required for Vector Field**:
- `metadata.toX`: number (0-100)
- `metadata.toY`: number (0-100)

**Optional but Recommended**:
- `minute`: number (for timeline features)
- `metadata.xg`: number (for shot quality)
- `metadata.outcome`: string (for event categorization)

---

## AI Analysis Recommendations

1. **Player Tracking**: Always try to identify and track players across frames to assign `playerId` to events
2. **Position Normalization**: Convert all positions to 0-100 scale (x: left to right, y: top to bottom)
3. **Pass Detection**: When detecting passes, try to identify both sender and receiver players
4. **Pass Endpoints**: For passes, calculate both start (x, y) and end (toX, toY) positions
5. **Event Types**: Classify events into specific types (shot, pass, touch, tackle, etc.)
6. **Metadata**: Include additional context in metadata (successful, outcome, xg, etc.)

---

## Testing Checklist

After generating events, verify:
- [ ] All events have `type` and `team`
- [ ] Pass events have `playerId` and `metadata.toPlayerId`
- [ ] Position-based events have valid `x` and `y` (0-100)
- [ ] Vector field passes have `metadata.toX` and `metadata.toY`
- [ ] Sense Matrix events have `playerId`
- [ ] Events are distributed across different players
- [ ] Events cover different pitch zones (x: 0-100)


This document describes the analytics features that depend on AI-generated events and their data requirements.

## Overview

The Football Analytics app includes several advanced analytics visualizations that require specific event data structures. The AI video analysis must generate events that are compatible with these features.

## Required Features

### 1. Summary
**Purpose**: Overall match statistics and key metrics

**Required Event Fields**:
- `type`: string (shot, pass, touch, tackle, interception, recovery, corner, free_kick)
- `team`: string ("home" or "away")
- `playerId`: number | null
- `x`: number | null (0-100, normalized pitch position)
- `y`: number | null (0-100, normalized pitch position)
- `minute`: number | null

**Event Types Needed**:
- `shot`: Shots on goal
- `pass`: Passes between players
- `touch`: Ball touches
- `tackle`: Defensive tackles
- `interception`: Ball interceptions
- `recovery`: Ball recoveries
- `corner`: Corner kicks
- `free_kick`: Free kicks

---

### 2. Network Analysis
**Purpose**: Visualize passing networks and player connections

**Required Event Fields**:
- `type`: "pass" (only passes are used)
- `team`: string ("home" or "away")
- `playerId`: number (REQUIRED - cannot be null)
- `x`: number (REQUIRED - pass start position, 0-100)
- `y`: number (REQUIRED - pass start position, 0-100)
- `metadata`: object with:
  - `toPlayerId`: number (REQUIRED - recipient player ID)
  - `toX`: number (pass end position, 0-100)
  - `toY`: number (pass end position, 0-100)
  - `successful`: boolean (pass completion status)

**Key Requirements**:
- Passes MUST have both `playerId` (sender) and `metadata.toPlayerId` (receiver)
- Both start (x, y) and end (toX, toY) positions are required
- Network analysis calculates total passes, key nodes, and active players

---

### 3. Sense Matrix
**Purpose**: Player performance matrix showing interaction intensity

**Required Event Fields**:
- `type`: string (shot, pass, touch, tackle)
- `team`: string ("home" or "away")
- `playerId`: number (REQUIRED - cannot be null)
- `x`: number | null
- `y`: number | null

**Key Requirements**:
- Events MUST have `playerId` to calculate per-player metrics
- Calculates Sense Score: (shots * 2 + passes * 0.5 + touches * 0.3 + tackles * 1.5) / 10
- Creates 8x8 interaction matrix between players
- Requires events from multiple players to show interactions

---

### 4. Distribution Map
**Purpose**: Show event distribution across pitch zones

**Required Event Fields**:
- `type`: string (pass, shot, touch)
- `team`: string ("home" or "away")
- `x`: number (REQUIRED - 0-100, normalized pitch position)
- `y`: number (REQUIRED - 0-100, normalized pitch position)

**Zone Definitions**:
- Self box: x = 0-20
- Def third: x = 20-40
- Middle: x = 40-60
- Att third: x = 60-80
- Opp box: x = 80-100

**Key Requirements**:
- Events MUST have valid x, y coordinates (not null)
- Groups events by zone and calculates passes, shots, touches per zone

---

### 5. Activity Field
**Purpose**: Heatmap showing zone activity intensity

**Required Event Fields**:
- `type`: string (any event type)
- `team`: string ("home" or "away")
- `x`: number (REQUIRED - 0-100)
- `y`: number (REQUIRED - 0-100)

**Key Requirements**:
- Events MUST have valid x, y coordinates
- Creates 6x5 grid heatmap (30 cells)
- Calculates intensity based on event frequency per zone

---

### 6. Vector Field
**Purpose**: Show movement vectors and pass directions

**Required Event Fields**:
- `type`: "pass" (only passes are used)
- `team`: string ("home" or "away")
- `x`: number (REQUIRED - pass start position, 0-100)
- `y`: number (REQUIRED - pass start position, 0-100)
- `metadata`: object with:
  - `toX`: number (REQUIRED - pass end position, 0-100)
  - `toY`: number (REQUIRED - pass end position, 0-100)
  - `angle`: number (optional - pass angle in degrees)
  - `intensity`: number (optional - pass intensity/speed)

**Key Requirements**:
- Passes MUST have both start (x, y) and end (toX, toY) positions
- Calculates vector angle and intensity if not provided
- Visualizes pass directions as arrows on pitch

---

### 7. Spotlight
**Purpose**: Highlight key moments and events

**Required Event Fields**:
- `type`: string (shot, pass, touch, tackle, etc.)
- `team`: string ("home" or "away")
- `playerId`: number | null
- `x`: number | null
- `y`: number | null
- `minute`: number | null
- `metadata`: object with:
  - `outcome`: string (optional - "goal", "saved", "missed", etc.)
  - `xg`: number (optional - expected goals value)

**Key Requirements**:
- Events should have `minute` for timeline display
- `metadata.xg` is important for shot quality
- `metadata.outcome` helps categorize events

---

## Event Data Structure

### Standard Event Format

```json
{
  "type": "pass",
  "team": "home",
  "playerId": 123,
  "x": 45.5,
  "y": 50.0,
  "minute": 23,
  "metadata": {
    "toPlayerId": 124,
    "toX": 60.0,
    "toY": 45.0,
    "successful": true,
    "angle": 45.0,
    "intensity": 0.8
  }
}
```

### Required vs Optional Fields

**Always Required**:
- `type`: string
- `team`: string ("home" or "away")

**Required for Network Analysis**:
- `playerId`: number (for passes)
- `metadata.toPlayerId`: number (for passes)

**Required for Position-Based Features** (Distribution Map, Activity Field, Vector Field):
- `x`: number (0-100)
- `y`: number (0-100)

**Required for Vector Field**:
- `metadata.toX`: number (0-100)
- `metadata.toY`: number (0-100)

**Optional but Recommended**:
- `minute`: number (for timeline features)
- `metadata.xg`: number (for shot quality)
- `metadata.outcome`: string (for event categorization)

---

## AI Analysis Recommendations

1. **Player Tracking**: Always try to identify and track players across frames to assign `playerId` to events
2. **Position Normalization**: Convert all positions to 0-100 scale (x: left to right, y: top to bottom)
3. **Pass Detection**: When detecting passes, try to identify both sender and receiver players
4. **Pass Endpoints**: For passes, calculate both start (x, y) and end (toX, toY) positions
5. **Event Types**: Classify events into specific types (shot, pass, touch, tackle, etc.)
6. **Metadata**: Include additional context in metadata (successful, outcome, xg, etc.)

---

## Testing Checklist

After generating events, verify:
- [ ] All events have `type` and `team`
- [ ] Pass events have `playerId` and `metadata.toPlayerId`
- [ ] Position-based events have valid `x` and `y` (0-100)
- [ ] Vector field passes have `metadata.toX` and `metadata.toY`
- [ ] Sense Matrix events have `playerId`
- [ ] Events are distributed across different players
- [ ] Events cover different pitch zones (x: 0-100)



This document describes the analytics features that depend on AI-generated events and their data requirements.

## Overview

The Football Analytics app includes several advanced analytics visualizations that require specific event data structures. The AI video analysis must generate events that are compatible with these features.

## Required Features

### 1. Summary
**Purpose**: Overall match statistics and key metrics

**Required Event Fields**:
- `type`: string (shot, pass, touch, tackle, interception, recovery, corner, free_kick)
- `team`: string ("home" or "away")
- `playerId`: number | null
- `x`: number | null (0-100, normalized pitch position)
- `y`: number | null (0-100, normalized pitch position)
- `minute`: number | null

**Event Types Needed**:
- `shot`: Shots on goal
- `pass`: Passes between players
- `touch`: Ball touches
- `tackle`: Defensive tackles
- `interception`: Ball interceptions
- `recovery`: Ball recoveries
- `corner`: Corner kicks
- `free_kick`: Free kicks

---

### 2. Network Analysis
**Purpose**: Visualize passing networks and player connections

**Required Event Fields**:
- `type`: "pass" (only passes are used)
- `team`: string ("home" or "away")
- `playerId`: number (REQUIRED - cannot be null)
- `x`: number (REQUIRED - pass start position, 0-100)
- `y`: number (REQUIRED - pass start position, 0-100)
- `metadata`: object with:
  - `toPlayerId`: number (REQUIRED - recipient player ID)
  - `toX`: number (pass end position, 0-100)
  - `toY`: number (pass end position, 0-100)
  - `successful`: boolean (pass completion status)

**Key Requirements**:
- Passes MUST have both `playerId` (sender) and `metadata.toPlayerId` (receiver)
- Both start (x, y) and end (toX, toY) positions are required
- Network analysis calculates total passes, key nodes, and active players

---

### 3. Sense Matrix
**Purpose**: Player performance matrix showing interaction intensity

**Required Event Fields**:
- `type`: string (shot, pass, touch, tackle)
- `team`: string ("home" or "away")
- `playerId`: number (REQUIRED - cannot be null)
- `x`: number | null
- `y`: number | null

**Key Requirements**:
- Events MUST have `playerId` to calculate per-player metrics
- Calculates Sense Score: (shots * 2 + passes * 0.5 + touches * 0.3 + tackles * 1.5) / 10
- Creates 8x8 interaction matrix between players
- Requires events from multiple players to show interactions

---

### 4. Distribution Map
**Purpose**: Show event distribution across pitch zones

**Required Event Fields**:
- `type`: string (pass, shot, touch)
- `team`: string ("home" or "away")
- `x`: number (REQUIRED - 0-100, normalized pitch position)
- `y`: number (REQUIRED - 0-100, normalized pitch position)

**Zone Definitions**:
- Self box: x = 0-20
- Def third: x = 20-40
- Middle: x = 40-60
- Att third: x = 60-80
- Opp box: x = 80-100

**Key Requirements**:
- Events MUST have valid x, y coordinates (not null)
- Groups events by zone and calculates passes, shots, touches per zone

---

### 5. Activity Field
**Purpose**: Heatmap showing zone activity intensity

**Required Event Fields**:
- `type`: string (any event type)
- `team`: string ("home" or "away")
- `x`: number (REQUIRED - 0-100)
- `y`: number (REQUIRED - 0-100)

**Key Requirements**:
- Events MUST have valid x, y coordinates
- Creates 6x5 grid heatmap (30 cells)
- Calculates intensity based on event frequency per zone

---

### 6. Vector Field
**Purpose**: Show movement vectors and pass directions

**Required Event Fields**:
- `type`: "pass" (only passes are used)
- `team`: string ("home" or "away")
- `x`: number (REQUIRED - pass start position, 0-100)
- `y`: number (REQUIRED - pass start position, 0-100)
- `metadata`: object with:
  - `toX`: number (REQUIRED - pass end position, 0-100)
  - `toY`: number (REQUIRED - pass end position, 0-100)
  - `angle`: number (optional - pass angle in degrees)
  - `intensity`: number (optional - pass intensity/speed)

**Key Requirements**:
- Passes MUST have both start (x, y) and end (toX, toY) positions
- Calculates vector angle and intensity if not provided
- Visualizes pass directions as arrows on pitch

---

### 7. Spotlight
**Purpose**: Highlight key moments and events

**Required Event Fields**:
- `type`: string (shot, pass, touch, tackle, etc.)
- `team`: string ("home" or "away")
- `playerId`: number | null
- `x`: number | null
- `y`: number | null
- `minute`: number | null
- `metadata`: object with:
  - `outcome`: string (optional - "goal", "saved", "missed", etc.)
  - `xg`: number (optional - expected goals value)

**Key Requirements**:
- Events should have `minute` for timeline display
- `metadata.xg` is important for shot quality
- `metadata.outcome` helps categorize events

---

## Event Data Structure

### Standard Event Format

```json
{
  "type": "pass",
  "team": "home",
  "playerId": 123,
  "x": 45.5,
  "y": 50.0,
  "minute": 23,
  "metadata": {
    "toPlayerId": 124,
    "toX": 60.0,
    "toY": 45.0,
    "successful": true,
    "angle": 45.0,
    "intensity": 0.8
  }
}
```

### Required vs Optional Fields

**Always Required**:
- `type`: string
- `team`: string ("home" or "away")

**Required for Network Analysis**:
- `playerId`: number (for passes)
- `metadata.toPlayerId`: number (for passes)

**Required for Position-Based Features** (Distribution Map, Activity Field, Vector Field):
- `x`: number (0-100)
- `y`: number (0-100)

**Required for Vector Field**:
- `metadata.toX`: number (0-100)
- `metadata.toY`: number (0-100)

**Optional but Recommended**:
- `minute`: number (for timeline features)
- `metadata.xg`: number (for shot quality)
- `metadata.outcome`: string (for event categorization)

---

## AI Analysis Recommendations

1. **Player Tracking**: Always try to identify and track players across frames to assign `playerId` to events
2. **Position Normalization**: Convert all positions to 0-100 scale (x: left to right, y: top to bottom)
3. **Pass Detection**: When detecting passes, try to identify both sender and receiver players
4. **Pass Endpoints**: For passes, calculate both start (x, y) and end (toX, toY) positions
5. **Event Types**: Classify events into specific types (shot, pass, touch, tackle, etc.)
6. **Metadata**: Include additional context in metadata (successful, outcome, xg, etc.)

---

## Testing Checklist

After generating events, verify:
- [ ] All events have `type` and `team`
- [ ] Pass events have `playerId` and `metadata.toPlayerId`
- [ ] Position-based events have valid `x` and `y` (0-100)
- [ ] Vector field passes have `metadata.toX` and `metadata.toY`
- [ ] Sense Matrix events have `playerId`
- [ ] Events are distributed across different players
- [ ] Events cover different pitch zones (x: 0-100)


This document describes the analytics features that depend on AI-generated events and their data requirements.

## Overview

The Football Analytics app includes several advanced analytics visualizations that require specific event data structures. The AI video analysis must generate events that are compatible with these features.

## Required Features

### 1. Summary
**Purpose**: Overall match statistics and key metrics

**Required Event Fields**:
- `type`: string (shot, pass, touch, tackle, interception, recovery, corner, free_kick)
- `team`: string ("home" or "away")
- `playerId`: number | null
- `x`: number | null (0-100, normalized pitch position)
- `y`: number | null (0-100, normalized pitch position)
- `minute`: number | null

**Event Types Needed**:
- `shot`: Shots on goal
- `pass`: Passes between players
- `touch`: Ball touches
- `tackle`: Defensive tackles
- `interception`: Ball interceptions
- `recovery`: Ball recoveries
- `corner`: Corner kicks
- `free_kick`: Free kicks

---

### 2. Network Analysis
**Purpose**: Visualize passing networks and player connections

**Required Event Fields**:
- `type`: "pass" (only passes are used)
- `team`: string ("home" or "away")
- `playerId`: number (REQUIRED - cannot be null)
- `x`: number (REQUIRED - pass start position, 0-100)
- `y`: number (REQUIRED - pass start position, 0-100)
- `metadata`: object with:
  - `toPlayerId`: number (REQUIRED - recipient player ID)
  - `toX`: number (pass end position, 0-100)
  - `toY`: number (pass end position, 0-100)
  - `successful`: boolean (pass completion status)

**Key Requirements**:
- Passes MUST have both `playerId` (sender) and `metadata.toPlayerId` (receiver)
- Both start (x, y) and end (toX, toY) positions are required
- Network analysis calculates total passes, key nodes, and active players

---

### 3. Sense Matrix
**Purpose**: Player performance matrix showing interaction intensity

**Required Event Fields**:
- `type`: string (shot, pass, touch, tackle)
- `team`: string ("home" or "away")
- `playerId`: number (REQUIRED - cannot be null)
- `x`: number | null
- `y`: number | null

**Key Requirements**:
- Events MUST have `playerId` to calculate per-player metrics
- Calculates Sense Score: (shots * 2 + passes * 0.5 + touches * 0.3 + tackles * 1.5) / 10
- Creates 8x8 interaction matrix between players
- Requires events from multiple players to show interactions

---

### 4. Distribution Map
**Purpose**: Show event distribution across pitch zones

**Required Event Fields**:
- `type`: string (pass, shot, touch)
- `team`: string ("home" or "away")
- `x`: number (REQUIRED - 0-100, normalized pitch position)
- `y`: number (REQUIRED - 0-100, normalized pitch position)

**Zone Definitions**:
- Self box: x = 0-20
- Def third: x = 20-40
- Middle: x = 40-60
- Att third: x = 60-80
- Opp box: x = 80-100

**Key Requirements**:
- Events MUST have valid x, y coordinates (not null)
- Groups events by zone and calculates passes, shots, touches per zone

---

### 5. Activity Field
**Purpose**: Heatmap showing zone activity intensity

**Required Event Fields**:
- `type`: string (any event type)
- `team`: string ("home" or "away")
- `x`: number (REQUIRED - 0-100)
- `y`: number (REQUIRED - 0-100)

**Key Requirements**:
- Events MUST have valid x, y coordinates
- Creates 6x5 grid heatmap (30 cells)
- Calculates intensity based on event frequency per zone

---

### 6. Vector Field
**Purpose**: Show movement vectors and pass directions

**Required Event Fields**:
- `type`: "pass" (only passes are used)
- `team`: string ("home" or "away")
- `x`: number (REQUIRED - pass start position, 0-100)
- `y`: number (REQUIRED - pass start position, 0-100)
- `metadata`: object with:
  - `toX`: number (REQUIRED - pass end position, 0-100)
  - `toY`: number (REQUIRED - pass end position, 0-100)
  - `angle`: number (optional - pass angle in degrees)
  - `intensity`: number (optional - pass intensity/speed)

**Key Requirements**:
- Passes MUST have both start (x, y) and end (toX, toY) positions
- Calculates vector angle and intensity if not provided
- Visualizes pass directions as arrows on pitch

---

### 7. Spotlight
**Purpose**: Highlight key moments and events

**Required Event Fields**:
- `type`: string (shot, pass, touch, tackle, etc.)
- `team`: string ("home" or "away")
- `playerId`: number | null
- `x`: number | null
- `y`: number | null
- `minute`: number | null
- `metadata`: object with:
  - `outcome`: string (optional - "goal", "saved", "missed", etc.)
  - `xg`: number (optional - expected goals value)

**Key Requirements**:
- Events should have `minute` for timeline display
- `metadata.xg` is important for shot quality
- `metadata.outcome` helps categorize events

---

## Event Data Structure

### Standard Event Format

```json
{
  "type": "pass",
  "team": "home",
  "playerId": 123,
  "x": 45.5,
  "y": 50.0,
  "minute": 23,
  "metadata": {
    "toPlayerId": 124,
    "toX": 60.0,
    "toY": 45.0,
    "successful": true,
    "angle": 45.0,
    "intensity": 0.8
  }
}
```

### Required vs Optional Fields

**Always Required**:
- `type`: string
- `team`: string ("home" or "away")

**Required for Network Analysis**:
- `playerId`: number (for passes)
- `metadata.toPlayerId`: number (for passes)

**Required for Position-Based Features** (Distribution Map, Activity Field, Vector Field):
- `x`: number (0-100)
- `y`: number (0-100)

**Required for Vector Field**:
- `metadata.toX`: number (0-100)
- `metadata.toY`: number (0-100)

**Optional but Recommended**:
- `minute`: number (for timeline features)
- `metadata.xg`: number (for shot quality)
- `metadata.outcome`: string (for event categorization)

---

## AI Analysis Recommendations

1. **Player Tracking**: Always try to identify and track players across frames to assign `playerId` to events
2. **Position Normalization**: Convert all positions to 0-100 scale (x: left to right, y: top to bottom)
3. **Pass Detection**: When detecting passes, try to identify both sender and receiver players
4. **Pass Endpoints**: For passes, calculate both start (x, y) and end (toX, toY) positions
5. **Event Types**: Classify events into specific types (shot, pass, touch, tackle, etc.)
6. **Metadata**: Include additional context in metadata (successful, outcome, xg, etc.)

---

## Testing Checklist

After generating events, verify:
- [ ] All events have `type` and `team`
- [ ] Pass events have `playerId` and `metadata.toPlayerId`
- [ ] Position-based events have valid `x` and `y` (0-100)
- [ ] Vector field passes have `metadata.toX` and `metadata.toY`
- [ ] Sense Matrix events have `playerId`
- [ ] Events are distributed across different players
- [ ] Events cover different pitch zones (x: 0-100)




