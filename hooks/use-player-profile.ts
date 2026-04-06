"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentUser, AuthUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase-multiplayer';

type GuestUser = { id: string; email: string; playerName: string };

const log = (...args: any[]) => console.debug('[usePlayerProfile]', ...args);
let hookInstanceCounter = 0;

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      debug('auth state change:start', {
        event,
        sessionUserId: session?.user?.id ?? null,
        sessionEmail: session?.user?.email ?? null,
        metadataName: session?.user?.user_metadata?.player_name ?? null,
        currentUserId: latestUserRef.current?.id ?? null,
        currentPlayerName: latestUserRef.current?.playerName ?? null,
      });

      setLoading(true);

      try {
        if (session?.user) {
          const currentUser = await getCurrentUser();
          debug('auth state change:getCurrentUser result', currentUser);
          if (currentUser) {
            debug('auth state change:setting authed user', {
              id: currentUser.id,
              playerName: currentUser.playerName,
            });
            setUser(currentUser);
          } else {
            const guest = readGuestFromStorage(`auth state change:${event}:guest-fallback`);
            debug('auth state change:no current user after session, using guest', guest);
            setUser(guest);
          }
        } else {
          debug('auth state change:no session');
          const guest = readGuestFromStorage(`auth state change:${event}:no-session`);
          debug('auth state change:setting fallback user', guest);
          setUser(guest);
        }
      } catch (err) {
        console.error('Error handling auth state change:', err);
        debug('auth state change:error', err);
        setError('Failed to sync auth state');
      } finally {
        debug('auth state change:complete -> loading false', {
          event,
          nextKnownUserId: session?.user?.id ?? latestUserRef.current?.id ?? null,
        });
        setLoading(false);
      }
    });

    return () => {
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
