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

function looksLikeMissingColumn(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;

  const message = error.message || '';
  return error.code === 'PGRST204' || /column/i.test(message) || /schema cache/i.test(message);
}

/**
 * POST /api/heartbeat
 * Updates player presence for an active session. Presence is best-effort:
 * if the optional heartbeat columns are not in the database yet, we keep the
 * request alive by falling back to updating only `updated_at`.
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { userId, sessionId, isOnline } = await request.json();

    if (!userId || !sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId or sessionId' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { data: session, error: fetchError } = await supabaseAdmin
      .from('game_sessions')
      .select('id, player_1_id, player_2_id')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    let updateData: Record<string, unknown> = { updated_at: now };

    if (session.player_1_id === userId) {
      updateData = {
        ...updateData,
        player_1_last_heartbeat: now,
        player_1_connected: isOnline !== false,
      };
    } else if (session.player_2_id === userId) {
      updateData = {
        ...updateData,
        player_2_last_heartbeat: now,
        player_2_connected: isOnline !== false,
      };
    }

    let { error: updateError } = await supabaseAdmin
      .from('game_sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (updateError && looksLikeMissingColumn(updateError)) {
      console.warn('[heartbeat] presence columns missing, falling back to updated_at only', updateError);

      const fallback = await supabaseAdmin
        .from('game_sessions')
        .update({ updated_at: now })
        .eq('id', sessionId);

      updateError = fallback.error;
    }

    if (updateError) {
      console.error('[heartbeat] update failed:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update heartbeat', details: updateError.message },
        { status: 500 }
      );
    }

    const { error: playerError } = await supabaseAdmin
      .from('game_players')
      .update({ last_seen_at: now })
      .eq('player_id', userId);

    if (playerError) {
      if (looksLikeMissingColumn(playerError)) {
        console.warn('[heartbeat] last_seen_at column missing on game_players, skipping profile heartbeat');
      } else {
        console.warn('[heartbeat] Could not update player last_seen:', playerError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Heartbeat received',
      timestamp: now,
    });
  } catch (error) {
    console.error('[heartbeat] unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
