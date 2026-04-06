-- Drop existing view if it exists
DROP VIEW IF EXISTS game_sessions_with_names CASCADE;

-- Create a view that joins game_sessions with player names
CREATE VIEW game_sessions_with_names AS
SELECT 
  gs.id,
  gs.game_type,
  gs.session_code,
  gs.player_1_id::text AS player_1_id,
  gs.player_2_id::text AS player_2_id,
  gs.status,
  gs.winner_id,
  gs.target_score,
  gs.bot_difficulty,
  gs.created_at,
  gs.updated_at,
  COALESCE(p1.player_name, 'Player 1') AS player_1_name,
  COALESCE(p2.player_name, 'Player 2') AS player_2_name
FROM game_sessions gs
LEFT JOIN game_players p1 ON gs.player_1_id::text = p1.player_id
LEFT JOIN game_players p2 ON gs.player_2_id::text = p2.player_id;
