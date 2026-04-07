import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase env vars are not configured');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { sessionId, playerId } = await request.json();

    if (!sessionId || !playerId) {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId or playerId' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from('game_sessions')
      .update({
        current_turn_player_id: playerId,
        last_move_at: now,
      })
      .eq('id', sessionId);

    if (error) {
      console.error('[turn] failed to update current turn', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update current turn' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId,
      playerId,
      updatedAt: now,
    });
  } catch (error) {
    console.error('[turn] unexpected error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
