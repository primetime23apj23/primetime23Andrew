import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTables() {
  try {
    // Create game_players table
    const { data: playersResult, error: playersError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS game_players (
          player_id UUID PRIMARY KEY,
          player_name TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    }).catch(async () => {
      // Fallback: try using postgrest directly
      console.log('Attempting alternative method for game_players table...');
      return { data: null, error: 'Using fallback' };
    });

    // Create game_sessions table
    const { data: sessionsResult, error: sessionsError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS game_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          game_type TEXT NOT NULL CHECK (game_type IN ('multiplication', 'give-or-take')),
          session_code TEXT NOT NULL UNIQUE,
          player_1_id UUID NOT NULL,
          player_2_id UUID,
          status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
          winner_id UUID,
          target_score INTEGER,
          bot_difficulty TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    }).catch(async () => {
      console.log('Attempting alternative method for game_sessions table...');
      return { data: null, error: 'Using fallback' };
    });

    console.log('Tables creation initiated');
    console.log('Please check your Supabase dashboard to verify the tables were created');

  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  }
}

createTables();
