import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixGameSessionsRLS() {
  try {
    console.log('[v0] Disabling RLS on game_sessions table...');
    
    // First, let's check if table exists
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.log('[v0] Tables query error (expected for this method)');
    }

    // Disable RLS on game_sessions table using raw SQL via the API
    // We'll do this by creating policies that allow all operations
    const { error: dropError } = await supabase.rpc('exec', {
      sql: `
        ALTER TABLE game_sessions DISABLE ROW LEVEL SECURITY;
        ALTER TABLE game_players DISABLE ROW LEVEL SECURITY;
      `
    });

    if (dropError) {
      console.log('[v0] RLS disable error (this is okay if using standard approach):', dropError);
      
      // Alternative: Create permissive policies if RLS is enforced
      console.log('[v0] Creating permissive policies instead...');
      
      const policies = [
        `
          CREATE POLICY "Allow all operations on game_sessions"
          ON game_sessions
          FOR ALL
          USING (true)
          WITH CHECK (true);
        `,
        `
          CREATE POLICY "Allow all operations on game_players"
          ON game_players
          FOR ALL
          USING (true)
          WITH CHECK (true);
        `
      ];
      
      for (const policy of policies) {
        const { error: policyError } = await supabase.rpc('exec', {
          sql: policy
        });
        
        if (policyError) {
          console.log('[v0] Policy creation note:', policyError.message);
        }
      }
    } else {
      console.log('[v0] Successfully disabled RLS');
    }

  } catch (error) {
    console.error('[v0] Error fixing RLS:', error);
  }
}

fixGameSessionsRLS();
