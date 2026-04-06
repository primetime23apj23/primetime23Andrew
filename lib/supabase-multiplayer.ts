import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function generateSessionCode(): Promise<string> {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function generatePlayerId(): string {
  if (typeof window === 'undefined') return '';
  
  let playerId = localStorage.getItem('game_player_id');
  const isUuid = playerId ? /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(playerId) : false;
  if (!playerId || !isUuid) {
    if (playerId && !isUuid) {
      console.warn('Found legacy non-UUID player id in storage, regenerating', playerId);
      localStorage.removeItem('game_player_id');
    }
    // Use real UUIDs to satisfy DB uuid columns
    const uuid = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
    playerId = uuid;
    localStorage.setItem('game_player_id', playerId);
  }
  return playerId;
}

// Prefer authenticated user id when available
export async function getAuthPlayerId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    const id = data.user?.id ?? null;
    if (id) return id;
    return null;
  } catch (error) {
    console.warn('No auth user', error);
    return null;
  }
}

export interface GameSession {
  id: string;
  game_type: 'multiplication' | 'give-or-take';
  session_code: string;
  player_1_id: string;
  player_2_id: string | null;
  status: 'waiting' | 'active' | 'finished';
  winner_id: string | null;
  created_at: string;
  updated_at: string;
  player_1_name?: string;
  player_2_name?: string;
}

async function fetchSessionById(id: string): Promise<GameSession | null> {
  try {
    const { data: sessionData, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    if (!sessionData) return null;

    // Manually fetch player names
    let player_1_name = 'Player 1';
    let player_2_name = 'Player 2';

    if (sessionData.player_1_id) {
      const { data: p1 } = await supabase
        .from('game_players')
        .select('player_name')
        .eq('player_id', sessionData.player_1_id)
        .single();
      if (p1) player_1_name = p1.player_name;
    }

    if (sessionData.player_2_id) {
      const { data: p2 } = await supabase
        .from('game_players')
        .select('player_name')
        .eq('player_id', sessionData.player_2_id)
        .single();
      if (p2) player_2_name = p2.player_name;
    }

    return {
      ...sessionData,
      player_1_name,
      player_2_name,
    } as GameSession;
  } catch (error) {
    console.error('Error fetching session by id:', error);
    return null;
  }
}

export interface GamePlayer {
  id: string;
  player_id: string;
  player_name: string;
  created_at: string;
}

export interface GameState {
  id: string;
  session_id: string;
  player_id: string;
  game_data: Record<string, any>;
  current_turn: number;
  updated_at: string;
}

export async function createGameSession(
  gameType: 'multiplication' | 'give-or-take',
  playerName: string
): Promise<GameSession | null> {
  const playerId = generatePlayerId();
  const sessionCode = await generateSessionCode();

  try {
    // Ensure player exists before referencing in session
    await supabase.from('game_players').upsert({
      player_id: playerId,
      player_name: playerName,
    });

    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        game_type: gameType,
        session_code: sessionCode,
        player_1_id: playerId,
        player_2_id: null,
        status: 'waiting',
      })
      .select()
      .single();

    if (error) throw error;
    return await fetchSessionById((data as GameSession).id);
  } catch (error) {
    console.error('Error creating game session:', error);
    return null;
  }
}

export async function joinGameSession(
  sessionCode: string,
  playerName: string
): Promise<GameSession | null> {
  const playerId = generatePlayerId();

  try {
    // Ensure player exists before joining session
    await supabase.from('game_players').upsert({
      player_id: playerId,
      player_name: playerName,
    });

    // Find session by code
    const { data: sessionData, error: findError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('session_code', sessionCode)
      .single();

    if (findError || !sessionData) {
      console.error('Session not found');
      return null;
    }

    // Update session with second player
    const { data, error: updateError } = await supabase
      .from('game_sessions')
      .update({
        player_2_id: playerId,
        status: 'active',
      })
      .eq('id', sessionData.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return await fetchSessionById((data as GameSession).id);
  } catch (error) {
    console.error('Error joining game session:', error);
    return null;
  }
}

export async function updateGameState(
  sessionId: string,
  playerId: string,
  gameData: Record<string, any>,
  currentTurn: number
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('game_states')
      .upsert({
        session_id: sessionId,
        player_id: playerId,
        game_data: gameData,
        current_turn: currentTurn,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'session_id,player_id',
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating game state:', error);
    return false;
  }
}

export async function getGameStates(sessionId: string): Promise<GameState[]> {
  try {
    const { data, error } = await supabase
      .from('game_states')
      .select('*')
      .eq('session_id', sessionId);

    if (error) throw error;
    return data as GameState[];
  } catch (error) {
    console.error('Error fetching game states:', error);
    return [];
  }
}

export function subscribeToGameState(
  sessionId: string,
  callback: (gameStates: GameState[]) => void
) {
  const channel = supabase.channel(`game_states:${sessionId}`);

  channel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_states',
        filter: `session_id=eq.${sessionId}`,
      },
      () => {
        getGameStates(sessionId).then(callback);
      }
    )
    .subscribe();

  return channel;
}

export function subscribeToSession(
  sessionCode: string,
  callback: (session: GameSession | null) => void
) {
  const channel = supabase.channel(`session:${sessionCode}`);

  channel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_sessions',
        filter: `session_code=eq.${sessionCode}`,
      },
      async () => {
        const session = await getGameSession(sessionCode);
        callback(session);
      }
    )
    .subscribe();

  return channel;
}

export async function getGameSession(sessionCode: string): Promise<GameSession | null> {
  try {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('session_code', sessionCode)
      .single();

    if (error) throw error;
    if (!data) return null;

    // Manually fetch player names
    let player_1_name = 'Player 1';
    let player_2_name = 'Player 2';

    if (data.player_1_id) {
      const { data: p1 } = await supabase
        .from('game_players')
        .select('player_name')
        .eq('player_id', data.player_1_id)
        .single();
      if (p1) player_1_name = p1.player_name;
    }

    if (data.player_2_id) {
      const { data: p2 } = await supabase
        .from('game_players')
        .select('player_name')
        .eq('player_id', data.player_2_id)
        .single();
      if (p2) player_2_name = p2.player_name;
    }

    return {
      ...data,
      player_1_name,
      player_2_name,
    } as GameSession;
  } catch (error) {
    console.error('Error fetching game session:', error);
    return null;
  }
}

export interface GameLobby extends GameSession {
  player_1_name?: string;
  target_score?: number;
  bot_difficulty?: string;
  is_public?: boolean;
  created_by_player_id?: string;
}

export async function cancelGameLobby(sessionCode: string): Promise<boolean> {
  try {
    const response = await fetch('/api/lobbies', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionCode }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Lobby cancel failed HTTP', response.status, text);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error canceling game lobby:', error);
    return false;
  }
}

export async function getAvailableLobbies(
  gameType: 'multiplication' | 'give-or-take'
): Promise<GameLobby[]> {
  try {
    const response = await fetch(`/api/lobbies?gameType=${gameType}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data as GameLobby[];
  } catch (error) {
    console.error('Error fetching available lobbies:', error);
    return [];
  }
}

export async function createGameLobby(
  gameType: 'multiplication' | 'give-or-take',
  playerName: string,
  settings: {
    targetScore?: number;
    botDifficulty?: string;
  },
  authUserId?: string
): Promise<GameSession | null> {
  const playerId = authUserId || generatePlayerId();
  const sessionCode = await generateSessionCode();

  try {
    const response = await fetch('/api/lobbies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameType,
        sessionCode,
        playerId,
        playerName,
        targetScore: settings.targetScore,
        botDifficulty: settings.botDifficulty,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Lobby create failed HTTP', response.status, text);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as GameSession;
  } catch (error) {
    console.error('Error creating game lobby:', error);
    return null;
  }
}

export async function joinGameLobby(
  sessionId: string,
  playerName: string,
  authUserId?: string
): Promise<GameSession | null> {
  const playerId = authUserId || generatePlayerId();

  try {
    const response = await fetch('/api/lobbies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ joinSessionId: sessionId, playerId, playerName }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Lobby join failed HTTP', response.status, text);
      return null;
    }

    const data = await response.json();
    return data as GameSession;
  } catch (error) {
    console.error('Error joining game lobby:', error);
    return null;
  }
}

export function subscribeToLobbies(
  gameType: 'multiplication' | 'give-or-take',
  callback: (lobbies: GameLobby[]) => void
) {
  const channel = supabase.channel(`lobbies:${gameType}`);
  
  channel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_sessions',
        filter: `game_type=eq.${gameType}`,
      },
      () => {
        getAvailableLobbies(gameType).then(callback);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Validate that it's the current player's turn before making a move
 */
export async function validateTurn(
  sessionId: string,
  playerId: string,
  timestamp?: string
): Promise<{ valid: boolean; error?: string; currentTurnPlayer?: string }> {
  try {
    const response = await fetch('/api/validate-turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, playerId, timestamp }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        valid: false,
        error: errorData.error,
        currentTurnPlayer: errorData.currentTurnPlayer,
      };
    }

    const data = await response.json();
    return { valid: data.success };
  } catch (error) {
    console.error('Error validating turn:', error);
    return { valid: false, error: 'Failed to validate turn' };
  }
}

/**
 * Send heartbeat to track player presence
 */
export async function sendHeartbeat(
  userId: string,
  sessionId: string,
  isOnline: boolean = true
): Promise<boolean> {
  try {
    const response = await fetch('/api/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, sessionId, isOnline }),
    });

    if (!response.ok) {
      console.warn('Heartbeat failed:', response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending heartbeat:', error);
    return false;
  }
}

/**
 * Update the current turn player in a session
 */
export async function updateCurrentTurn(
  sessionId: string,
  playerId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('game_sessions')
      .update({
        current_turn_player_id: playerId,
        last_move_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error updating turn:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error updating turn:', error);
    return false;
  }
}
