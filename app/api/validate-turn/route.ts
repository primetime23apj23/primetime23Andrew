import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase env vars are not configured');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

/**
 * POST /api/validate-turn
 * Validates that the current player can make a move
 * Returns success if valid turn, error otherwise
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { sessionId, playerId, timestamp } = await request.json();

    if (!sessionId || !playerId) {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId or playerId' },
        { status: 400 }
      );
    }

    // Fetch the current game session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    if (!session.current_turn_player_id) {
      const initialTurnPlayerId = session.player_1_id;

      const { error: initTurnError } = await supabaseAdmin
        .from('game_sessions')
        .update({
          current_turn_player_id: initialTurnPlayerId,
          last_move_at: session.last_move_at || new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (initTurnError) {
        console.error('Error initializing turn owner:', initTurnError);
        return NextResponse.json(
          { success: false, error: 'Failed to initialize turn owner' },
          { status: 500 }
        );
      }

      session.current_turn_player_id = initialTurnPlayerId;
    }

    // Validate that it's this player's turn
    if (session.current_turn_player_id !== playerId) {
      return NextResponse.json(
        { success: false, error: 'Not your turn', currentTurnPlayer: session.current_turn_player_id },
        { status: 403 }
      );
    }

    // Only reject moves that were created against older state than the current turn state.
    if (session.last_move_at && timestamp) {
      const lastMoveTime = new Date(session.last_move_at).getTime();
      const moveTime = new Date(timestamp).getTime();

      if (Number.isFinite(moveTime) && moveTime < lastMoveTime) {
        console.warn(
          `Move rejected: stale client state. Last move: ${lastMoveTime}, Move time: ${moveTime}`
        );
        return NextResponse.json(
          { success: false, error: 'Move is based on older game state' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Turn validated',
      sessionId,
      playerId,
    });
  } catch (error) {
    console.error('Turn validation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
