import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase env vars are not configured');
  }

  // Service role client bypasses RLS
  return createClient(supabaseUrl, serviceRoleKey);
}

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const gameType = request.nextUrl.searchParams.get('gameType');
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    const sessionCode = request.nextUrl.searchParams.get('sessionCode');

    if (sessionId || sessionCode) {
      const query = supabaseAdmin
        .from('game_sessions_with_names')
        .select('*');

      const { data, error } = await (sessionId
        ? query.eq('id', sessionId).single()
        : query.eq('session_code', sessionCode).single());

      if (error) {
        console.error('[v0] Error fetching session:', error);
        return NextResponse.json(
          { error: 'Failed to fetch session', details: error.message },
          { status: 404 }
        );
      }

      return NextResponse.json(data);
    }

    if (!gameType || !['multiplication'].includes(gameType)) {
      return NextResponse.json(
        { error: 'Invalid game type' },
        { status: 400 }
      );
    }

    console.log('[v0] Fetching lobbies for gameType:', gameType);

    const { data, error } = await supabaseAdmin
      .from('game_sessions_with_names')
      .select('*')
      .eq('game_type', gameType)
      .eq('status', 'waiting');

    if (error) {
      console.error('[v0] Supabase error:', error);
      throw error;
    }

    console.log('[v0] Found lobbies:', data?.length || 0);

    const lobbies = (data || []).map((session: any) => ({
      ...session,
      player_1_name: session.player_1_name ?? 'Unknown Player',
    }));

    return NextResponse.json(lobbies);
  } catch (error) {
    console.error('[v0] Error fetching lobbies:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch lobbies', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('[v0] ========== POST /api/lobbies START ==========');
  try {
    console.log('[v0] Step 1: Request received');
    console.log('[v0] Step 2: Getting Supabase admin client');
    const supabaseAdmin = getSupabaseAdmin();
    console.log('[v0] Step 3: Admin client obtained');
    
    console.log('[v0] Step 4: Parsing request body');
    let body;
    try {
      body = await request.json();
      console.log('[v0] Step 5: Request body parsed successfully:', JSON.stringify(body));
    } catch (parseError) {
      console.error('[v0] Step 5 ERROR - Failed to parse request JSON:', parseError);
      return NextResponse.json({ error: 'Invalid JSON in request body', details: String(parseError) }, { status: 400 });
    }
    
    const {
      gameType,
      sessionCode,
      playerId,
      playerName,
      targetScore,
      botDifficulty,
      timerMode,
      joinSessionId,
    } = body;
    console.log('[v0] Step 6: Values destructured:', { gameType, sessionCode, playerId, playerName, targetScore, botDifficulty, timerMode, joinSessionId });

    // Join existing lobby
    console.log('[v0] Step 7: Checking if joinSessionId exists (for joining game)');
    if (joinSessionId) {
      console.log('[v0] Step 8a: Joining existing session:', joinSessionId);
      console.log('[v0] Joining lobby via service role:', joinSessionId, playerName);

      // Ensure player exists
      const { error: playerError } = await supabaseAdmin.from('game_players').upsert({
        player_id: playerId,
        player_name: playerName,
      });
      if (playerError) {
        console.error('[v0] Join player upsert error:', playerError);
        return NextResponse.json({ error: 'player upsert failed', details: playerError.message }, { status: 400 });
      }

      // Try to claim empty slot
      const { data: updatedSession, error: updateError } = await supabaseAdmin
        .from('game_sessions')
        .update({
          player_2_id: playerId,
          status: 'active',
          current_turn_player_id: null,
          last_move_at: null,
        })
        .eq('id', joinSessionId)
        .is('player_2_id', null)
        .select()
        .single();

      if (updateError) {
        console.error('[v0] Join update error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 409 });
      }

      // Return from view with names
      const { data: viewSession, error: viewError } = await supabaseAdmin
        .from('game_sessions_with_names')
        .select('*')
        .eq('id', updatedSession.id)
        .single();

      if (viewError) {
        console.error('[v0] Join view error:', viewError);
        return NextResponse.json(updatedSession);
      }

      return NextResponse.json(viewSession);
    }

    console.log('[v0] Step 9: Creating new lobby');
    console.log('[v0] Step 10: Validating player ID format');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(playerId)) {
      console.error('[v0] Step 10 ERROR: Invalid playerId format (expected UUID):', playerId);
      return NextResponse.json({ error: 'invalid player id format' }, { status: 400 });
    }
    console.log('[v0] Step 11: Player ID format valid');

    // Ensure player exists before referencing as FK
    console.log('[v0] Step 12: Upserting player to game_players table');
    console.log('[v0] Step 12a: Player data:', { playerId, playerName });
    const { error: playerError } = await supabaseAdmin.from('game_players').upsert({
      player_id: playerId,
      player_name: playerName,
    });

    if (playerError) {
      console.error('[v0] Step 12 ERROR - Player upsert failed');
      console.error('[v0] Player error object:', playerError);
      console.error('[v0] Player error message:', playerError.message);
      console.error('[v0] Player error code:', playerError.code);
      console.error('[v0] Player error details:', playerError.details);
      throw playerError;
    }
    console.log('[v0] Step 13: Player upsert successful');

    // Build insert object with only the columns that exist
    console.log('[v0] Step 14: Building game_sessions insert data');
    const insertData: any = {
      game_type: gameType,
      session_code: sessionCode,
      player_1_id: playerId,
      status: 'waiting',
    };

    // Add optional fields if provided
    if (targetScore) insertData.target_score = targetScore;
    if (botDifficulty) insertData.bot_difficulty = botDifficulty;
    if (timerMode) insertData.timer_mode = timerMode;

    console.log('[v0] Step 15: Insert data prepared:', JSON.stringify(insertData));

    // Create game session
    console.log('[v0] Step 16: Inserting into game_sessions table');
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('game_sessions')
      .insert(insertData)
      .select()
      .single();

    if (sessionError) {
      console.error('[v0] Step 16 ERROR - Session insert failed');
      console.error('[v0] Session error object:', sessionError);
      console.error('[v0] Session error code:', sessionError.code);
      console.error('[v0] Session error message:', sessionError.message);
      console.error('[v0] Session error details:', sessionError.details);
      throw sessionError;
    }

    console.log('[v0] Step 17: Session created successfully:', sessionData);

    // Fetch from the view to include names
    console.log('[v0] Step 18: Fetching from game_sessions_with_names view');
    const { data: viewData, error: viewError } = await supabaseAdmin
      .from('game_sessions_with_names')
      .select('*')
      .eq('id', sessionData.id)
      .single();

    if (viewError) {
      console.error('[v0] Step 18 ERROR - View fetch failed (non-critical):', viewError);
      console.log('[v0] Step 19: Returning raw session data instead');
      return NextResponse.json(sessionData);
    }

    console.log('[v0] Step 19: View data fetched successfully');
    console.log('[v0] ========== POST /api/lobbies SUCCESS ==========');
    return NextResponse.json(viewData);
  } catch (error) {
    console.error('[v0] ========== POST /api/lobbies ERROR ==========');
    console.error('[v0] ERROR CAUGHT in catch block');
    console.error('[v0] Error type:', typeof error);
    console.error('[v0] Error constructor:', error?.constructor?.name);
    
    if (error instanceof Error) {
      console.error('[v0] Error is Error instance');
      console.error('[v0] Error.message:', error.message);
      console.error('[v0] Error.name:', error.name);
      console.error('[v0] Error.stack:', error.stack);
    } else if (typeof error === 'object' && error !== null) {
      console.error('[v0] Error is object (likely Supabase error):');
      console.error('[v0] Error.code:', (error as any).code);
      console.error('[v0] Error.message:', (error as any).message);
      console.error('[v0] Error.details:', (error as any).details);
      console.error('[v0] Error.hint:', (error as any).hint);
      console.error('[v0] Full error:', JSON.stringify(error, null, 2));
    } else {
      console.error('[v0] Error is primitive:', error);
    }
    
    console.error('[v0] Full error stringified:', String(error));
    console.error('[v0] ========== END ERROR ==========');
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to create lobby', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await request.json();
    const { sessionCode, sessionId } = body;

    if (!sessionCode && !sessionId) {
      return NextResponse.json({ error: 'sessionCode or sessionId required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('game_sessions')
      .delete()
      .match(sessionId ? { id: sessionId } : { session_code: sessionCode });

    if (error) {
      console.error('[v0] Delete lobby error:', error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Error deleting lobby:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to delete lobby', details: errorMessage },
      { status: 500 }
    );
  }
}
