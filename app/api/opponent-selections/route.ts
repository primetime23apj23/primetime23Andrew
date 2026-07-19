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

    // Check if this exact selection already exists
    const { data: existingSelection } = await supabase
      .from('opponent_selections')
      .select('id')
      .eq('session_id', sessionId)
      .eq('player_id', playerId)
      .eq('selection_type', selectionType)
      .eq('selection_value', selectionValue)
      .single();

    // Only insert if it doesn't already exist
    if (!existingSelection) {
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
    } else {
      console.log('[v0] Selection already exists, not inserting duplicate');
    }

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
 * DELETE - Clear opponent's selections
 * If selectionType and selectionValue provided: delete specific selection
 * Otherwise: delete all selections for the player (when square is claimed)
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, playerId, selectionType, selectionValue } = body;

    if (!sessionId || !playerId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('opponent_selections')
      .delete()
      .eq('session_id', sessionId)
      .eq('player_id', playerId);

    // If specific selection is provided, delete only that one (deselection)
    if (selectionType && selectionValue) {
      query = query
        .eq('selection_type', selectionType)
        .eq('selection_value', selectionValue);
      console.log('[v0] Deleting specific selection:', { sessionId, playerId, selectionType, selectionValue });
    } else {
      // Otherwise delete all selections (when square is claimed)
      console.log('[v0] Deleting all selections for player:', { sessionId, playerId });
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Error clearing opponent selections:', error);
    return NextResponse.json(
      { error: 'Failed to clear selections' },
      { status: 500 }
    );
  }
}
