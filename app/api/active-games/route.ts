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
 * GET /api/active-games?userId=<userId>
 * Returns all active and waiting games for a user
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const userId = request.nextUrl.searchParams.get('userId');
    const gameType = request.nextUrl.searchParams.get('gameType');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    if (gameType && !['multiplication', 'give-or-take'].includes(gameType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid gameType parameter' },
        { status: 400 }
      );
    }

    // Query games where user is player 1 or player 2
    let query = supabaseAdmin
      .from('game_sessions_with_names')
      .select('*')
      .or(`player_1_id.eq.${userId},player_2_id.eq.${userId}`)
      .in('status', ['waiting', 'active']);

    if (gameType) {
      query = query.eq('game_type', gameType);
    }

    const { data: games, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching active games:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch games' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      games: games || [],
      count: games?.length || 0,
    });
  } catch (error) {
    console.error('Active games error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
