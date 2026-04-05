-- Create game_players table
CREATE TABLE IF NOT EXISTS game_players (
  player_id UUID PRIMARY KEY,
  player_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game_sessions table for storing active games
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type TEXT NOT NULL CHECK (game_type IN ('multiplication', 'give-or-take')),
  session_code TEXT NOT NULL UNIQUE,
  player_1_id UUID NOT NULL REFERENCES game_players(player_id),
  player_2_id UUID REFERENCES game_players(player_id),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  winner_id UUID REFERENCES game_players(player_id),
  target_score INTEGER,
  bot_difficulty TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_type_status ON game_sessions(game_type, status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_player_1_id ON game_sessions(player_1_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_player_2_id ON game_sessions(player_2_id);
