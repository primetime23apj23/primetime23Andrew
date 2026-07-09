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

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const sessionId = request.nextUrl.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('game_states')
      .select('*')
      .eq('session_id', sessionId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[game-states] fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch game states', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('[game-states] unexpected GET error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch game states', details: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { sessionId, playerId, gameData, currentTurn } = await request.json();

    if (!sessionId || !playerId || !gameData) {
      return NextResponse.json(
        { error: 'Missing sessionId, playerId, or gameData' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { data: existingState, error: existingError } = await supabaseAdmin
      .from('game_states')
      .select('id')
      .eq('session_id', sessionId)
      .eq('player_id', playerId)
      .maybeSingle();

    if (existingError) {
      console.error('[game-states] lookup error:', existingError);
      return NextResponse.json(
        { error: 'Failed to look up game state', details: existingError.message },
        { status: 500 }
      );
    }

    if (existingState?.id) {
      const { data, error } = await supabaseAdmin
        .from('game_states')
        .update({
          game_data: gameData,
          current_turn: currentTurn ?? 0,
          updated_at: now,
        })
        .eq('id', existingState.id)
        .select()
        .single();

      if (error) {
        console.error('[game-states] update error:', error);
        return NextResponse.json(
          { error: 'Failed to update game state', details: error.message },
          { status: 500 }
        );
      }

      // Sync the current player to game_sessions so turn validation uses the same source of truth
      // We need to look up the actual player IDs from the session, not from the game data
      if (gameData.currentPlayer !== undefined) {
        const currentPlayerIndex = gameData.currentPlayer;
        
        // Fetch session to get the real player IDs
        const { data: session, error: sessionError } = await supabaseAdmin
          .from('game_sessions')
          .select('player_1_id, player_2_id')
          .eq('id', sessionId)
          .single();
        
        if (sessionError) {
          console.error('[game-states] error fetching session for turn sync:', sessionError);
        } else if (session) {
          // Map the current player index to the actual session player ID
          const currentPlayerId = currentPlayerIndex === 0 ? session.player_1_id : session.player_2_id;
          
          console.log('[game-states] UPDATE: syncing turn player', {
            sessionId,
            currentPlayerIndex,
            currentPlayerId,
            player_1_id: session.player_1_id,
            player_2_id: session.player_2_id,
            roundNumber: gameData.roundNumber,
            gameStarterIndex: gameData.gameStarterIndex,
            actionType: gameData.actionType,
          });
          
          if (currentPlayerId) {
            const { error: syncError } = await supabaseAdmin
              .from('game_sessions')
              .update({
                current_turn_player_id: currentPlayerId,
                updated_at: now,
              })
              .eq('id', sessionId);
            
            if (syncError) {
              console.error('[game-states] sync turn player error:', syncError);
              // Don't fail the request, just log the error
            } else {
              console.log('[game-states] synced current_turn_player_id to:', currentPlayerId);
            }
          }
        }
      }

      return NextResponse.json(data);
    }

    const { data, error } = await supabaseAdmin
      .from('game_states')
      .insert({
        session_id: sessionId,
        player_id: playerId,
        game_data: gameData,
        current_turn: currentTurn ?? 0,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      console.error('[game-states] insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create game state', details: error.message },
        { status: 500 }
      );
    }

    // Sync the current player to game_sessions for new game states too
    // We need to look up the actual player IDs from the session, not from the game data
    if (gameData.currentPlayer !== undefined) {
      const currentPlayerIndex = gameData.currentPlayer;
      
      // Fetch session to get the real player IDs
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('game_sessions')
        .select('player_1_id, player_2_id')
        .eq('id', sessionId)
        .single();
      
      if (sessionError) {
        console.error('[game-states] error fetching session for turn sync on insert:', sessionError);
      } else if (session) {
        // Map the current player index to the actual session player ID
        const currentPlayerId = currentPlayerIndex === 0 ? session.player_1_id : session.player_2_id;
        
        console.log('[game-states] INSERT: syncing turn player', {
          sessionId,
          currentPlayerIndex,
          currentPlayerId,
          player_1_id: session.player_1_id,
          player_2_id: session.player_2_id,
        });
        
        if (currentPlayerId) {
          const { error: syncError } = await supabaseAdmin
            .from('game_sessions')
            .update({
              current_turn_player_id: currentPlayerId,
              updated_at: now,
            })
            .eq('id', sessionId);
          
          if (syncError) {
            console.error('[game-states] sync turn player error on insert:', syncError);
            // Don't fail the request, just log the error
          } else {
            console.log('[game-states] synced current_turn_player_id on insert to:', currentPlayerId);
          }
        }
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[game-states] unexpected POST error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to save game state', details: message },
      { status: 500 }
    );
  }
}
