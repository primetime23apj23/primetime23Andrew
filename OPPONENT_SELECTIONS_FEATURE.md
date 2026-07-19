# Opponent Selections Feature

## Overview

In multiplayer games, players can now see their opponent's real-time selections (dice and squares) highlighted in subtle blue. This creates transparency around the opponent's thought process as they consider moves.

## Features

### Real-Time Dice Selection Visibility
- When the opponent selects a die, it's highlighted with a subtle blue ring and inner shadow
- Selections are updated every 500ms for near real-time feedback
- Selections automatically clear when a space is claimed

### Real-Time Square Selection Visibility
- When the opponent clicks on a board square to consider claiming it, it shows a subtle blue ring highlight
- This helps you see which spaces your opponent is thinking about
- Selections persist until a space is actually claimed by either player

## Implementation Details

### Database Schema

A new table `opponent_selections` tracks player selections:

```sql
CREATE TABLE opponent_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  player_id UUID NOT NULL,
  selection_type TEXT NOT NULL ('dice' | 'square'),
  selection_value TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### API Endpoint

**POST /api/opponent-selections** - Save a selection
- Body: `{ sessionId, playerId, selectionType, selectionValue }`
- Clears previous selections of same type automatically

**GET /api/opponent-selections** - Fetch opponent's selections
- Query: `?sessionId=XXX&opponentId=YYY`
- Returns: `{ diceSelections: [], squareSelections: [] }`
- Auto-cleans selections older than 30 seconds

**DELETE /api/opponent-selections** - Clear selections
- Body: `{ sessionId, playerId }`
- Called when a space is claimed

### Client-Side Integration

#### DiceTray Component
- Added `opponentSelectedDice` prop to display opponent's dice selections
- Blue highlight: `ring-2 ring-blue-400 dark:ring-blue-300 shadow-[inset_0_0_6px_1px_rgba(96,165,250,0.3)]`

#### GameBoard Component
- Added `opponentSelectedSpaces` prop to display opponent's square selections
- Blue highlight: `ring-2 ring-blue-400 dark:ring-blue-300 shadow-[inset_0_0_8px_1px_rgba(96,165,250,0.3)]`

#### PrimeFactorGame Component
- Tracks opponent selections in state: `opponentSelectedDice` and `opponentSelectedSquares`
- Broadcasts selections when dice/squares are clicked via `saveOpponentSelection()`
- Subscribes to opponent selection updates with `subscribeToOpponentSelections()`
- Clears selections when a space is claimed via `clearOpponentSelections()`
- Polls selections every 500ms for near real-time updates

### Functions

**saveOpponentSelection(sessionId, playerId, selectionType, selectionValue)**
- Saves a dice or square selection to the database
- Called when player clicks a die or board square
- Automatically clears previous selections of the same type

**getOpponentSelections(sessionId, opponentPlayerId)**
- Fetches opponent's current selections
- Filters out selections older than 30 seconds

**clearOpponentSelections(sessionId, playerId)**
- Removes all selections for a player in a session
- Called when a space is successfully claimed

**subscribeToOpponentSelections(sessionId, opponentPlayerId, callback)**
- Real-time subscription to opponent selection changes
- Provides live updates via Supabase channels

## User Experience

1. Player 1 clicks on a die → Player 2 sees it highlighted in blue
2. Player 1 clicks on a board square → Player 2 sees it highlighted in blue
3. Player 1 claims the square → Both players' selections are cleared
4. Selections automatically expire after 30 seconds of no updates

## Performance Considerations

- Polling interval: 500ms (configurable for latency trade-off)
- Auto-cleanup: Selections older than 30 seconds are removed
- Minimal payload: Only stores selection ID and type
- Unsubscribe on component unmount to prevent memory leaks

## Future Enhancements

- Add user preference toggle to disable opponent selection visibility
- Show which opponent (by name/color) made each selection
- Add sound effects for opponent selections
- Show selection count badge instead of individual dice for large selections
- Add animation when selections appear/disappear
