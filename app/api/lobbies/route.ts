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

    if (!gameType || !['multiplication', 'give-or-take'].includes(gameType)) {
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
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await request.json();
    const {
      gameType,
      sessionCode,
      playerId,
      playerName,
      targetScore,
      botDifficulty,
      joinSessionId,
    } = body;

    // Join existing lobby
    if (joinSessionId) {
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

    console.log('[v0] Creating lobby with:', { gameType, sessionCode, playerId, playerName });

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(playerId)) {
      console.error('[v0] Invalid playerId format (expected UUID):', playerId);
      return NextResponse.json({ error: 'invalid player id format' }, { status: 400 });
    }

    // Ensure player exists before referencing as FK
    const { error: playerError } = await supabaseAdmin.from('game_players').upsert({
      player_id: playerId,
      player_name: playerName,
    });

    if (playerError) {
      console.error('[v0] Player error:', playerError);
      throw playerError;
    }

    // Build insert object with only the columns that exist
    const insertData: any = {
      game_type: gameType,
      session_code: sessionCode,
      player_1_id: playerId,
      status: 'waiting',
    };

    // Add optional fields if provided
    if (targetScore) insertData.target_score = targetScore;
    if (botDifficulty) insertData.bot_difficulty = botDifficulty;

    // Create game session
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('game_sessions')
      .insert(insertData)
      .select()
      .single();

    if (sessionError) {
      console.error('[v0] Session error:', sessionError);
      throw sessionError;
    }

    console.log('[v0] Session created:', sessionData);

    // Fetch from the view to include names
    const { data: viewData, error: viewError } = await supabaseAdmin
      .from('game_sessions_with_names')
      .select('*')
      .eq('id', sessionData.id)
      .single();

    if (viewError) {
      console.error('[v0] View fetch error:', viewError);
      return NextResponse.json(sessionData);
    }

    return NextResponse.json(viewData);
  } catch (error) {
    console.error('[v0] Error creating lobby:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
