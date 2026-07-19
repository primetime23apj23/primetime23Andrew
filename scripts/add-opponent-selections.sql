-- Create opponent_selections table for tracking real-time selections
CREATE TABLE IF NOT EXISTS opponent_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  selection_type TEXT NOT NULL CHECK (selection_type IN ('dice', 'square')),
  selection_value TEXT, -- die ID for dice, space number for squares
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indices for faster queries
CREATE INDEX IF NOT EXISTS idx_opponent_selections_session_id ON opponent_selections(session_id);
CREATE INDEX IF NOT EXISTS idx_opponent_selections_player_id ON opponent_selections(player_id);
CREATE INDEX IF NOT EXISTS idx_opponent_selections_created_at ON opponent_selections(created_at);

-- Enable RLS
ALTER TABLE opponent_selections ENABLE ROW LEVEL SECURITY;

-- RLS Policies - allow anonymous read/write
CREATE POLICY "Allow users to create selections" ON opponent_selections
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow users to read selections" ON opponent_selections
  FOR SELECT USING (true);

CREATE POLICY "Allow users to delete selections" ON opponent_selections
  FOR DELETE USING (true);

-- Auto-cleanup function to delete old selections (older than 30 seconds)
CREATE OR REPLACE FUNCTION cleanup_old_selections()
RETURNS void AS $$
BEGIN
  DELETE FROM opponent_selections
  WHERE created_at < NOW() - INTERVAL '30 seconds';
END;
$$ LANGUAGE plpgsql;

-- Note: To run this cleanup periodically, you would need to set up a Postgres cron job
-- For now, we'll handle cleanup in the application code
