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
    const trimmedEmail = email?.toLowerCase()?.trim();
    const trimmedPassword = password?.trim();
    const trimmedPlayerName = playerName?.trim();
    
    authLog('signUp:start', { email: trimmedEmail, playerName: trimmedPlayerName });
    
    if (!trimmedEmail || !trimmedPassword || !trimmedPlayerName) {
      return {
        success: false,
        error: 'Email, password, and player name are required',
      };
    }

    if (trimmedPassword.length < 6) {
      return {
        success: false,
        error: 'Password must be at least 6 characters',
      };
    }

    // Sign up with Supabase Auth first
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: trimmedPassword,
      options: {
        data: {
          player_name: trimmedPlayerName,
        },
      },
    });

    if (authError) {
      authLog('signUp:auth-error', {
        code: authError.code,
        message: authError.message,
        status: authError.status,
      });
      console.error('Auth sign up error:', authError);
      return {
        success: false,
        error: `Sign up failed: ${authError.message}`,
      };
    }

    if (!authData.user) {
      authLog('signUp:no-user-returned');
      return {
        success: false,
        error: 'Failed to create user account',
      };
    }

    authLog('signUp:auth-user-created', {
      id: authData.user.id,
      email: authData.user.email,
      metadataName: authData.user.user_metadata?.player_name,
    });

    // Create or update player profile
    const { error: profileError } = await supabase
      .from('game_players')
      .upsert({
        player_id: authData.user.id,
        player_name: trimmedPlayerName,
        email: trimmedEmail,
        auth_user_id: authData.user.id,
      });

    if (profileError) {
      authLog('signUp:profile-error', {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
      });
      console.error('Error creating player profile:', profileError);
      return {
        success: false,
        error: `Profile creation failed: ${profileError.message}`,
      };
    }

    authLog('signUp:profile-upserted', authData.user.id);
    cachePlayerIdentity(trimmedPlayerName, authData.user.email || '', authData.user.id);

    return {
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email || '',
        playerName: trimmedPlayerName,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    authLog('signUp:unexpected-error', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    console.error('Unexpected sign up error:', error);
    return {
      success: false,
      error: `Unexpected error: ${errorMessage}`,
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
    const trimmedEmail = email?.toLowerCase()?.trim();
    const trimmedPassword = password?.trim();
    
    authLog('signIn:start', { email: trimmedEmail });
    if (!trimmedEmail || !trimmedPassword) {
      return {
        success: false,
        error: 'Email and password are required',
      };
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: trimmedPassword,
    });

    if (authError) {
      authLog('signIn:auth-error', {
        code: authError.code,
        message: authError.message,
        status: authError.status,
      });
      console.error('Auth sign in error:', authError);
      return {
        success: false,
        error: `Sign in failed: ${authError.message}`,
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
      authLog('signIn:profile-error', {
        code: playerError.code,
        message: playerError.message,
      });
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    authLog('signIn:unexpected-error', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    console.error('Unexpected sign in error:', error);
    return {
      success: false,
      error: `Unexpected error: ${errorMessage}`,
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
    // Use getUser() instead of getSession() to fetch current user from server
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      authLog('getCurrentUser:no-user', {
        hasError: !!userError,
        error: userError?.message,
      });
      return null;
    }

    return await getCurrentUserFromSession(userData.user);
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
