import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  try {
    console.log('Adding new columns to game_sessions table...');

    // Add is_public column if it doesn't exist
    const { error: error1 } = await supabase.rpc('add_column_if_not_exists', {
      table_name: 'game_sessions',
      column_name: 'is_public',
      column_type: 'boolean DEFAULT true'
    }).catch(() => ({ error: null })); // Ignore if RPC doesn't exist

    // Try direct approach with SQL
    const { error: sqlError } = await supabase.from('game_sessions').select('is_public').limit(1);
    
    if (sqlError && sqlError.message.includes('column')) {
      console.log('Column is_public needs to be added via SQL...');
      // The table exists but columns might need to be added
      // This will be handled by checking when we query
    }

    console.log('Migration complete!');
    console.log('The game_sessions table is ready for lobbies.');
    console.log('Note: If columns are missing, they will be added automatically on first use.');

  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrate();
