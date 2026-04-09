"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { getCurrentUser, getCurrentUserFromSession, AuthUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase-multiplayer';

type GuestUser = { id: string; email: string; playerName: string };

const log = (...args: any[]) => console.debug('[usePlayerProfile]', ...args);
let hookInstanceCounter = 0;

function buildOptimisticUser(sessionUser: Pick<User, 'id' | 'email' | 'user_metadata'>): AuthUser {
  const email = sessionUser.email || '';
  return {
    id: sessionUser.id,
    email,
    playerName:
      sessionUser.user_metadata?.player_name ||
      (email ? email.split('@')[0] : 'Player'),
  };
}

export function usePlayerProfile() {
  const instanceIdRef = useRef<number | null>(null);
  if (instanceIdRef.current === null) {
    hookInstanceCounter += 1;
    instanceIdRef.current = hookInstanceCounter;
  }

  const instanceId = instanceIdRef.current;
  const debug = useCallback((...args: any[]) => log(`#${instanceId}`, ...args), [instanceId]);
  const [user, setUser] = useState<AuthUser | GuestUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestUserRef = useRef<AuthUser | GuestUser | null>(null);
  const authChangeSequenceRef = useRef(0);
  const authSyncTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    latestUserRef.current = user;
  }, [user]);

  const readGuestFromStorage = useCallback((reason: string): GuestUser | null => {
    if (typeof window === 'undefined') {
      debug(reason, 'localStorage unavailable during SSR');
      return null;
    }

    const guestName = localStorage.getItem('pf_player_name');
    const guestEmail = localStorage.getItem('pf_player_email');
    debug(reason, 'localStorage snapshot', {
      guestName,
      guestEmail,
    });

    if (!guestName) {
      return null;
    }

    return {
      id: 'guest',
      email: guestEmail || '',
      playerName: guestName,
    };
  }, [debug]);

  useEffect(() => {
    debug('mount');
    return () => {
      debug('unmount');
    };
  }, [debug]);

  useEffect(() => {
    debug('state snapshot', {
      loading,
      error,
      userId: user?.id ?? null,
      playerName: user?.playerName ?? null,
      isAuthenticated: !!user,
    });
  }, [debug, error, loading, user]);

  // Fetch current user on mount
  useEffect(() => {
    const initUser = async () => {
      try {
        debug('init:start');
        setLoading(true);
        debug('init: fetching current user');
        const currentUser = await getCurrentUser();
        debug('init: user result', currentUser);
        if (currentUser) {
          debug('init: setting authed user', {
            id: currentUser.id,
            playerName: currentUser.playerName,
          });
          setUser(currentUser);
        } else {
          const guest = readGuestFromStorage('init:fallback-to-guest');
          if (guest) {
            debug('init: setting guest user', guest);
            setUser(guest);
          } else {
            debug('init: clearing user');
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Error fetching user:', err);
        debug('init:error', err);
        setError('Failed to load user profile');
      } finally {
        debug('init:complete -> loading false');
        setLoading(false);
      }
    };

    initUser();
  }, [debug, readGuestFromStorage]);

  // Subscribe to auth state changes
  useEffect(() => {
    debug('auth subscription: registering');
    const clearPendingSync = () => {
      if (authSyncTimeoutRef.current !== null) {
        window.clearTimeout(authSyncTimeoutRef.current);
        authSyncTimeoutRef.current = null;
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      debug('auth state change:start', {
        event,
        sessionUserId: session?.user?.id ?? null,
        sessionEmail: session?.user?.email ?? null,
        metadataName: session?.user?.user_metadata?.player_name ?? null,
        currentUserId: latestUserRef.current?.id ?? null,
        currentPlayerName: latestUserRef.current?.playerName ?? null,
      });

      const shouldBlockUi = !latestUserRef.current;
      debug('auth state change:ui loading decision', {
        shouldBlockUi,
        hasExistingUser: !!latestUserRef.current,
      });
      if (shouldBlockUi) {
        setLoading(true);
      }

      if (!session?.user) {
        clearPendingSync();
        debug('auth state change:no session');
        const guest = readGuestFromStorage(`auth state change:${event}:no-session`);
        debug('auth state change:setting fallback user', guest);
        setUser(guest);
        setLoading(false);
        return;
      }

      const optimisticUser = buildOptimisticUser(session.user);
      debug('auth state change:setting optimistic auth user', optimisticUser);
      setUser(optimisticUser);

      const sequenceId = authChangeSequenceRef.current + 1;
      authChangeSequenceRef.current = sequenceId;
      clearPendingSync();

      authSyncTimeoutRef.current = window.setTimeout(async () => {
        try {
          const currentUser = await getCurrentUserFromSession(session.user);
          debug('auth state change:getCurrentUserFromSession result', currentUser);
          if (authChangeSequenceRef.current !== sequenceId) {
            debug('auth state change:discarding stale sync result', {
              sequenceId,
              latestSequenceId: authChangeSequenceRef.current,
            });
            return;
          }

          if (currentUser) {
            debug('auth state change:setting authed user', {
              id: currentUser.id,
              playerName: currentUser.playerName,
            });
            setUser(currentUser);
            setError(null);
          } else {
            debug('auth state change:no resolved user, keeping optimistic session user', optimisticUser);
            setUser(optimisticUser);
          }
        } catch (err) {
          console.error('Error handling auth state change:', err);
          debug('auth state change:error', err);
          setUser(optimisticUser);
          setError('Failed to fully sync auth state');
        } finally {
          if (authChangeSequenceRef.current === sequenceId) {
            debug('auth state change:complete -> loading false', {
              event,
              nextKnownUserId: session.user.id,
              sequenceId,
            });
            setLoading(false);
          }
        }
      }, 0);
    });

    return () => {
      clearPendingSync();
      debug('auth subscription: unsubscribing');
      subscription?.unsubscribe();
    };
  }, [debug, readGuestFromStorage]);

  const updatePlayerName = useCallback(async (newName: string): Promise<boolean> => {
    if (!user) return false;

    try {
      debug('updatePlayerName:start', { newName, userId: user?.id });
      const { error } = await supabase
        .from('game_players')
        .update({ player_name: newName })
        .eq('auth_user_id', user.id);

      if (error) throw error;

      setUser({ ...user, playerName: newName });
      debug('updatePlayerName:success', { userId: user.id, newName });
      return true;
    } catch (err) {
      console.error('Error updating player name:', err);
      debug('updatePlayerName:error', err);
      return false;
    }
  }, [debug, user]);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    updatePlayerName,
  };
}
