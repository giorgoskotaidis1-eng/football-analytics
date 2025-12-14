# 🎥 Video Analysis Setup (AI-Powered)

## 🎯 What This Does

Like **StepOut** and **Wyscout**, this system:
1. **Uploads match video**
2. **AI analyzes video** frame-by-frame
3. **Automatically detects**:
   - Shots (with xG calculation)
   - Passes (successful/unsuccessful)
   - Touches
   - Player positions
   - Ball position
4. **Calculates automatically**:
   - xG from shot positions
   - Possession from passes/touches
   - Heatmaps from player/ball positions
   - Shot maps

## 🏗️ Architecture

```
Video Upload → AI Processing → Event Detection → Database → Analytics
```

## 🔧 Integration Options

### Option 1: OpenCV + YOLO (Local Processing)
**Best for**: Full control, no API costs

```bash
npm install opencv4nodejs @tensorflow/tfjs-node
```

**Setup**:
- Install OpenCV
- Download YOLO model weights
- Process video server-side

### Option 2: AWS Rekognition Video
**Best for**: Production, scalable

```bash
npm install @aws-sdk/client-rekognition
```

**Setup**:
- AWS account
- Rekognition Video API
- S3 for video storage

### Option 3: Google Video Intelligence API
**Best for**: Easy integration, good accuracy

```bash
npm install @google-cloud/video-intelligence
```

**Setup**:
- Google Cloud account
- Video Intelligence API enabled
- Service account key

### Option 4: Custom ML Model
**Best for**: Specific requirements

- Train your own model
- Deploy as API
- Integrate via REST

## 📋 Implementation Steps

### Step 1: Choose Provider

Edit `src/lib/video-analysis.ts` and implement `analyzeVideo()`:

```typescript
export async function analyzeVideo(
  videoUrl: string,
  matchId: number,
  config: VideoAnalysisConfig
): Promise<VideoAnalysisResult> {
  // Implement based on your chosen provider
  
  // Example with OpenCV:
  // const cv = require('opencv4nodejs');
  // const video = cv.VideoCapture(videoUrl);
  // ... process frames ...
  
  // Example with AWS:
  // const rekognition = new RekognitionClient({});
  // const result = await rekognition.startLabelDetection({...});
  
  // Example with Google:
  // const videoIntelligence = new VideoIntelligenceServiceClient();
  // const [operation] = await videoIntelligence.annotateVideo({...});
}
```

### Step 2: Object Detection

Detect:
- **Players** (jersey numbers, teams)
- **Ball** (position tracking)
- **Goal posts**
- **Field lines** (for coordinate mapping)

### Step 3: Event Detection

Detect events by analyzing:
- **Shots**: Ball trajectory toward goal
- **Passes**: Ball movement between players
- **Touches**: Player-ball contact
- **Tackles**: Defensive actions

### Step 4: Coordinate Mapping

Map screen coordinates to pitch coordinates (0-100):
- Detect field boundaries
- Normalize to standard pitch size
- Track ball/player positions

### Step 5: Save Events

Events are automatically saved to `MatchEvent` table and analytics are calculated.

## 🎬 Example Flow

1. **User uploads video** → `/api/matches/1/video/analyze`
2. **Video stored** → S3/Cloudinary/Local
3. **AI processes video**:
   - Frame 1: Detect players at positions...
   - Frame 150: Ball at (x, y), player shoots
   - Frame 151: Shot detected! Calculate xG...
4. **Events saved** → Database
5. **Analytics calculated** → xG, possession, heatmaps
6. **UI updates** → Match detail page shows results

## 🔌 Quick Start (Mock Implementation)

For testing without full AI setup:

```typescript
// src/lib/video-analysis.ts
export async function analyzeVideo(...) {
  // Mock implementation for testing
  return {
    events: [
      {
        type: "shot",
        timestamp: 120,
        team: "home",
        pitchPosition: { x: 75, y: 15 },
        confidence: 0.9,
      },
      // ... more mock events
    ],
    // ...
  };
}
```

## 📊 What Gets Detected

### Shots
- Location on pitch
- Shot type (open play, set piece, penalty)
- Body part (foot, head)
- Outcome (goal, saved, blocked, off target)
- xG calculated automatically

### Passes
- Start/end positions
- Successful/unsuccessful
- Pass type (short, long, through ball)

### Touches
- Player position
- Ball position
- Time on ball

### Player Tracking
- Positions throughout match
- Heatmaps per player
- Distance covered

## 🚀 Production Setup

1. **Video Storage**: S3, Cloudinary, or similar
2. **Processing Queue**: Bull/BullMQ for async processing
3. **AI Service**: Choose provider (AWS/Google/Custom)
4. **Caching**: Cache analysis results
5. **Webhooks**: Notify when analysis complete

## 💡 Integration Examples

See `VIDEO_ANALYSIS_EXAMPLES.md` for code examples with:
- OpenCV + YOLO
- AWS Rekognition
- Google Video Intelligence
- Custom ML models

---

**Ready to analyze videos like StepOut and Wyscout!** 🎥⚽🤖

