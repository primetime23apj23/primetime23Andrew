import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase-multiplayer';

const authLog = (...args: any[]) => console.debug('[auth]', ...args);

function cachePlayerIdentity(playerName: string, email: string, id: string) {
  if (typeof window === 'undefined') return;
  if (playerName) localStorage.setItem('pf_player_name', playerName);
  if (email) localStorage.setItem('pf_player_email', email);
  if (id) localStorage.setItem('pf_player_id', id);
}

export interface AuthUser {
  id: string;
  email: string;
  playerName: string;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

type SessionAuthUser = Pick<User, 'id' | 'email' | 'user_metadata'>;

function buildFallbackPlayerName(user: SessionAuthUser): string {
  return user.user_metadata?.player_name || (user.email ? user.email.split('@')[0] : 'Player');
}

async function resolveAuthUser(user: SessionAuthUser): Promise<AuthUser> {
  authLog('resolveAuthUser:start', {
    id: user.id,
    email: user.email,
    metadataName: user.user_metadata?.player_name,
  });

  const { data: playerData, error: playerError } = await supabase
    .from('game_players')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (playerError) {
    console.error('Error fetching player profile:', playerError);
  } else {
    authLog('resolveAuthUser:profile-result', playerData);
  }

  let playerName = playerData?.player_name || user.user_metadata?.player_name || '';

  if (!playerData) {
    const fallbackName = buildFallbackPlayerName(user);
    authLog('resolveAuthUser:creating-profile', {
      userId: user.id,
      fallbackName,
    });

    const { error: upsertError } = await supabase.from('game_players').upsert({
      player_id: user.id,
      auth_user_id: user.id,
      email: user.email?.toLowerCase() || null,
      player_name: fallbackName,
    });

    if (upsertError) {
      console.error('Error creating player profile:', upsertError);
    } else {
      authLog('resolveAuthUser:profile-created', user.id);
      playerName = fallbackName;
    }
  }

  if (!playerName && user.email) {
    playerName = user.email.split('@')[0];
    authLog('resolveAuthUser:fallback-email-name', playerName);
  }

  const resolvedUser = {
    id: user.id,
    email: user.email || '',
    playerName,
  };

  authLog('resolveAuthUser:return', resolvedUser);
  cachePlayerIdentity(playerName, user.email || '', user.id);
  return resolvedUser;
}

/**
 * Sign up a new user with email and password
 */
export async function signUp(
  email: string,
  password: string,
  playerName: string
): Promise<AuthResponse> {
  try {
    authLog('signUp:start', { email: email?.toLowerCase(), playerName });
    if (!email || !password || !playerName) {
      return {
        success: false,
        error: 'Email, password, and player name are required',
      };
    }

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('game_players')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing user:', checkError);
    }

    if (existingUser) {
      authLog('signUp:existing-user', existingUser.email);
      return {
        success: false,
        error: 'Email already registered',
      };
    }

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: {
        data: {
          player_name: playerName,
        },
      },
    });

    if (authError) {
      console.error('Auth sign up error:', authError);
      return {
        success: false,
        error: authError.message,
      };
    }

    if (!authData.user) {
      authLog('signUp:no-user-returned');
      return {
        success: false,
        error: 'Failed to create user',
      };
    }

    authLog('signUp:auth-user-created', {
      id: authData.user.id,
      email: authData.user.email,
      metadataName: authData.user.user_metadata?.player_name,
    });

    // Create player profile
    const { error: profileError } = await supabase
      .from('game_players')
      .upsert({
        player_id: authData.user.id,
        player_name: playerName,
        email: email.toLowerCase(),
        auth_user_id: authData.user.id,
      });

    if (profileError) {
      console.error('Error creating player profile:', profileError);
      // Auth user was created, but profile failed. This is okay.
    } else {
      authLog('signUp:profile-upserted', authData.user.id);
    }

    cachePlayerIdentity(playerName, authData.user.email || '', authData.user.id);

    return {
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email || '',
        playerName,
      },
    };
  } catch (error) {
    console.error('Unexpected sign up error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Sign in with email and password
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    authLog('signIn:start', { email: email?.toLowerCase() });
    if (!email || !password) {
      return {
        success: false,
        error: 'Email and password are required',
      };
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (authError) {
      console.error('Auth sign in error:', authError);
      return {
        success: false,
        error: authError.message,
      };
    }

    if (!authData.user) {
      authLog('signIn:no-user-returned');
      return {
        success: false,
        error: 'Failed to sign in',
      };
    }

    authLog('signIn:auth-user', {
      id: authData.user.id,
      email: authData.user.email,
      metadataName: authData.user.user_metadata?.player_name,
    });

    // Get player profile
    const { data: playerData, error: playerError } = await supabase
      .from('game_players')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .maybeSingle();

    if (playerError) {
      console.error('Error fetching player profile:', playerError);
    } else {
      authLog('signIn:profile-result', playerData);
    }

    const playerName = playerData?.player_name || authData.user.user_metadata?.player_name || '';
    cachePlayerIdentity(playerName, authData.user.email || '', authData.user.id);

    return {
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email || '',
        playerName,
      },
    };
  } catch (error) {
    console.error('Unexpected sign in error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Sign out error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Unexpected sign out error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    authLog('getCurrentUser:start');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      authLog('getCurrentUser:no-session', {
        hasError: !!sessionError,
        error: sessionError?.message,
      });
      return null;
    }

    return await getCurrentUserFromSession(sessionData.session.user);
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function getCurrentUserFromSession(user: SessionAuthUser | null | undefined): Promise<AuthUser | null> {
  if (!user) {
    authLog('getCurrentUserFromSession:no-user');
    return null;
  }

  try {
    return await resolveAuthUser(user);
  } catch (error) {
    console.error('Error resolving current user from session:', error);
    return {
      id: user.id,
      email: user.email || '',
      playerName: buildFallbackPlayerName(user),
    };
  }
}

/**
 * Update player profile stats
 */
export async function updatePlayerStats(
  userId: string,
  stats: {
    games_played?: number;
    wins?: number;
    losses?: number;
    win_streak?: number;
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('game_players')
      .update({
        stats,
      })
      .eq('auth_user_id', userId);

    if (error) {
      console.error('Error updating player stats:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error updating stats:', error);
    return false;
  }
}

/**
 * Check if email is available
 */
export async function checkEmailAvailable(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('game_players')
      .select('email')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking email:', error);
      return false;
    }

    return !data;
  } catch (error) {
    console.error('Unexpected error checking email:', error);
    return false;
  }
}
