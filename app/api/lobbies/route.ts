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
    console.log('[v0] Fetching lobbies for gameType:', gameType);
    
    const { data, error } = await supabaseAdmin
      .from('game_sessions')
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
      player_1_name: 'Unknown Player',
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
    const body = await request.json();
    const {
      gameType,
      sessionCode,
      playerId,
      playerName,
      targetScore,
      botDifficulty,
    } = body;

    console.log('[v0] Creating lobby with:', { gameType, sessionCode, playerId, playerName });

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

    // Create player record
    const { error: playerError } = await supabaseAdmin.from('game_players').insert({
      player_id: playerId,
      player_name: playerName,
    });

    if (playerError) {
      console.error('[v0] Player error:', playerError);
      // Don't throw - player creation failure shouldn't block lobby creation
    }

    return NextResponse.json(sessionData);
  } catch (error) {
    console.error('[v0] Error creating lobby:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create lobby', details: errorMessage },
      { status: 500 }
    );
  }
}
