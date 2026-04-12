-- Add dice_skin and timer_mode columns to game_sessions
ALTER TABLE game_sessions
ADD COLUMN IF NOT EXISTS dice_skin TEXT DEFAULT 'standard';

ALTER TABLE game_sessions
ADD COLUMN IF NOT EXISTS timer_mode TEXT DEFAULT '1_minute';
