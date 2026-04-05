import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Service role client bypasses RLS
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function GET(request: NextRequest) {
  const gameType = request.nextUrl.searchParams.get('gameType');

  if (!gameType || !['multiplication', 'give-or-take'].includes(gameType)) {
    return NextResponse.json(
      { error: 'Invalid game type' },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('game_sessions')
      .select(`
        *,
        player_1:game_players!game_sessions_player_1_id_fkey(player_name)
      `)
      .eq('game_type', gameType)
      .eq('status', 'waiting');

    if (error) throw error;

    const lobbies = (data || []).map((session: any) => ({
      ...session,
      player_1_name: session.player_1?.[0]?.player_name || 'Unknown Player',
    }));

    return NextResponse.json(lobbies);
  } catch (error) {
    console.error('[v0] Error fetching lobbies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lobbies' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      gameType,
      sessionCode,
      playerId,
      playerName,
      targetScore,
      botDifficulty,
    } = body;

    // Create game session
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('game_sessions')
      .insert({
        game_type: gameType,
        session_code: sessionCode,
        player_1_id: playerId,
        player_2_id: null,
        status: 'waiting',
        target_score: targetScore,
        bot_difficulty: botDifficulty,
        created_by_player_id: playerId,
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    // Create player record
    await supabaseAdmin.from('game_players').insert({
      player_id: playerId,
      player_name: playerName,
    });

    return NextResponse.json(sessionData);
  } catch (error) {
    console.error('[v0] Error creating lobby:', error);
    return NextResponse.json(
      { error: 'Failed to create lobby' },
      { status: 500 }
    );
  }
}
