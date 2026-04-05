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
    
    return data as GameSession;
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

    // Find session
    const { data: session, error: findError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('session_code', sessionCode)
      .single();

    if (findError || !session) {
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
      .eq('id', session.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return data as GameSession;
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
  return supabase
    .from('game_states')
    .on('*', (payload) => {
      if (payload.new && (payload.new as any).session_id === sessionId) {
        getGameStates(sessionId).then(callback);
      }
    })
    .subscribe();
}

export async function getGameSession(sessionCode: string): Promise<GameSession | null> {
  try {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('session_code', sessionCode)
      .single();

    if (error) throw error;
    return data as GameSession;
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
  }
): Promise<GameSession | null> {
  const playerId = generatePlayerId();
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
  playerName: string
): Promise<GameSession | null> {
  const playerId = generatePlayerId();

  try {
    // Get the current session
    const { data: session, error: findError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (findError || !session) {
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
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Store player info
    await supabase.from('game_players').insert({
      player_id: playerId,
      player_name: playerName,
    }).select().single();

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
