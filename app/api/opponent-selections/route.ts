import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

/**
 * POST - Save opponent's selection (dice or square)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, playerId, selectionType, selectionValue } = body;
    console.log('[v0] POST opponent selection:', { sessionId, playerId, selectionType, selectionValue });

    if (!sessionId || !playerId || !selectionType || !selectionValue) {
      console.log('[v0] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // First, clear any previous selections from this player to avoid duplicates
    await supabase
      .from('opponent_selections')
      .delete()
      .eq('session_id', sessionId)
      .eq('player_id', playerId)
      .eq('selection_type', selectionType);

    // Insert the new selection
    const { error } = await supabase
      .from('opponent_selections')
      .insert({
        session_id: sessionId,
        player_id: playerId,
        selection_type: selectionType,
        selection_value: selectionValue,
      });

    if (error) {
      console.error('[v0] Supabase insert error:', error);
      throw error;
    }

    console.log('[v0] Selection saved successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Error saving opponent selection:', error);
    return NextResponse.json(
      { error: 'Failed to save selection' },
      { status: 500 }
    );
  }
}

/**
 * GET - Retrieve opponent's current selections
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    const opponentId = searchParams.get('opponentId');
    console.log('[v0] GET opponent selections:', { sessionId, opponentId });

    if (!sessionId || !opponentId) {
      console.log('[v0] Missing query parameters');
      return NextResponse.json(
        { error: 'Missing required query parameters' },
        { status: 400 }
      );
    }

    // Clean up old selections (older than 30 seconds)
    await supabase
      .from('opponent_selections')
      .delete()
      .eq('session_id', sessionId)
      .lt('created_at', new Date(Date.now() - 30000).toISOString());

    // Fetch current selections for opponent
    const { data, error } = await supabase
      .from('opponent_selections')
      .select('selection_type, selection_value')
      .eq('session_id', sessionId)
      .eq('player_id', opponentId);

    if (error) {
      console.error('[v0] Supabase fetch error:', error);
      throw error;
    }

    console.log('[v0] Fetched selections:', { data });

    const diceSelections = (data || [])
      .filter((d) => d.selection_type === 'dice')
      .map((d) => d.selection_value);

    const squareSelections = (data || [])
      .filter((d) => d.selection_type === 'square')
      .map((d) => d.selection_value);

    console.log('[v0] Returning selections:', { diceSelections, squareSelections });

    return NextResponse.json({
      diceSelections,
      squareSelections,
    });
  } catch (error) {
    console.error('[v0] Error fetching opponent selections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch selections' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Clear opponent's selections (when square is claimed)
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, playerId } = body;

    if (!sessionId || !playerId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Delete all selections for this player in this session
    const { error } = await supabase
      .from('opponent_selections')
      .delete()
      .eq('session_id', sessionId)
      .eq('player_id', playerId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing opponent selections:', error);
    return NextResponse.json(
      { error: 'Failed to clear selections' },
      { status: 500 }
    );
  }
}
