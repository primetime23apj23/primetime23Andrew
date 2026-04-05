-- Add authentication and presence tracking columns to game_sessions
-- First, update game_sessions table to support authenticated users

ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS current_turn_player_id TEXT,
ADD COLUMN IF NOT EXISTS last_move_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS player_1_connected BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS player_2_connected BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS player_1_last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS player_2_last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_move_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update game_players to track auth user_id if available
ALTER TABLE game_players
ADD COLUMN IF NOT EXISTS auth_user_id UUID,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '{"games_played": 0, "wins": 0, "losses": 0, "win_streak": 0}'::jsonb,
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_game_players_auth_user_id ON game_players(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_current_turn_player ON game_sessions(current_turn_player_id);

-- Create a view for active game sessions with player info
CREATE OR REPLACE VIEW active_player_sessions AS
SELECT 
  s.id,
  s.session_code,
  s.player_1_id,
  s.player_2_id,
  s.status,
  s.current_turn_player_id,
  s.player_1_connected,
  s.player_2_connected,
  p1.player_name as player_1_name,
  p1.auth_user_id as player_1_auth_id,
  p2.player_name as player_2_name,
  p2.auth_user_id as player_2_auth_id,
  s.created_at,
  s.updated_at
FROM game_sessions s
LEFT JOIN game_players p1 ON s.player_1_id = p1.player_id
LEFT JOIN game_players p2 ON s.player_2_id = p2.player_id
WHERE s.status IN ('waiting', 'active');
