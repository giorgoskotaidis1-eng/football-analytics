# AI Shot Detection & Player Identification

## Πώς λειτουργεί τώρα:

### 1. **AI Detection (Python Script)**
Το Python AI script (`football_ai/analysis.py` και `enhanced_event_detection.py`):
- ✅ Εντοπίζει σουτ στο βίντεο
- ✅ Εντοπίζει παίκτες με tracking IDs (1, 2, 3...)
- ✅ Δίνει `playerId` σε κάθε shot event (tracking ID)

### 2. **Database Storage**
Όταν το AI εντοπίζει ένα shot:
- Το `playerId` αποθηκεύεται στο `MatchEvent` table
- Αλλά αυτό είναι ένα **tracking ID** (temporary), όχι database Player ID

### 3. **Player Name Display**
Στο Shot Analytics:
- Φορτώνουμε events με `include: { player: { name } }`
- Αν το `playerId` αντιστοιχεί σε database Player → δείχνει όνομα
- Αν δεν αντιστοιχεί → δείχνει "Unknown"

## Το πρόβλημα:

Το AI δίνει **tracking IDs** (1, 2, 3...) που δεν αντιστοιχούν σε **database Player IDs**.

## Λύσεις:

### Option 1: Manual Mapping (Τώρα)
- Χρήστης προσθέτει παίκτες στο match lineup
- Χειροκίνητα συνδέει tracking IDs με Player IDs

### Option 2: Jersey Number Recognition (Μέλλον)
- AI αναγνωρίζει αριθμό φανέλας
- Mapping: jersey number → Player (από lineup)

### Option 3: Automatic Player Assignment (Μέλλον)
- AI χρησιμοποιεί position + team για να match-άρει με lineup
- Αυτόματο mapping με confidence score

## Τι μπορούμε να κάνουμε τώρα:

1. **Βελτιώσουμε το display**: Αν δεν υπάρχει player, δείχνουμε "Player #X" (tracking ID)
2. **Προσθέτουμε manual assignment**: UI για να συνδέσει tracking ID → Player
3. **Βελτιώνουμε το AI**: Προσθήκη jersey number recognition

## Current Status:

✅ **Shots detected**: Ναι, το AI εντοπίζει σουτ
✅ **Player tracking**: Ναι, το AI track-άρει παίκτες
⚠️ **Player identification**: Χρειάζεται mapping από tracking ID → database Player ID

## Next Steps:

1. Προσθήκη UI για manual player assignment
2. Βελτίωση AI για jersey number recognition
3. Automatic matching με lineup data





