-- Create game_sessions table for storing active games
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type TEXT NOT NULL CHECK (game_type IN ('multiplication', 'give-or-take')),
  session_code TEXT NOT NULL UNIQUE,
  player_1_id UUID NOT NULL,
  player_2_id UUID,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  winner_id UUID,
  is_public BOOLEAN DEFAULT true,
  target_score INTEGER,
  bot_difficulty TEXT,
  created_by_player_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game_players table for storing player info
CREATE TABLE IF NOT EXISTS game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id TEXT NOT NULL UNIQUE,
  player_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game_states table for storing game progression
CREATE TABLE IF NOT EXISTS game_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  game_data JSONB NOT NULL,
  current_turn INT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indices for faster queries
CREATE INDEX IF NOT EXISTS idx_game_sessions_session_code ON game_sessions(session_code);
CREATE INDEX IF NOT EXISTS idx_game_sessions_player_1_id ON game_sessions(player_1_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_game_states_session_id ON game_states(session_id);
CREATE INDEX IF NOT EXISTS idx_game_states_player_id ON game_states(player_id);

-- Enable RLS (Row Level Security)
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_sessions - allow anonymous read/write
CREATE POLICY "Allow anonymous users to create sessions" ON game_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous users to read sessions" ON game_sessions
  FOR SELECT USING (true);

CREATE POLICY "Allow players to update their session" ON game_sessions
  FOR UPDATE USING (true);

-- RLS Policies for game_players - allow anonymous read/write
CREATE POLICY "Allow anonymous users to create players" ON game_players
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous users to read players" ON game_players
  FOR SELECT USING (true);

-- RLS Policies for game_states - allow anonymous read/write
CREATE POLICY "Allow anonymous users to create game states" ON game_states
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous users to read game states" ON game_states
  FOR SELECT USING (true);

CREATE POLICY "Allow players to update game states" ON game_states
  FOR UPDATE USING (true);
