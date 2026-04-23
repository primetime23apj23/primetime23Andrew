-- Add dice_skin column to game_sessions
ALTER TABLE game_sessions
ADD COLUMN IF NOT EXISTS dice_skin TEXT DEFAULT 'standard';
