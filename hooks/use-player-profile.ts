"use client";

import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser, AuthUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase-multiplayer';

type GuestUser = { id: string; email: string; playerName: string };

const log = (...args: any[]) => console.debug('[usePlayerProfile]', ...args);

export function usePlayerProfile() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current user on mount
  useEffect(() => {
    const initUser = async () => {
      try {
        setLoading(true);
        log('init: fetching current user');
        const currentUser = await getCurrentUser();
        log('init: user', currentUser);
        if (currentUser) {
          setUser(currentUser);
        } else {
          const guestName = typeof window !== 'undefined' ? localStorage.getItem('pf_player_name') : null;
          if (guestName) {
            const guest: GuestUser = { id: 'guest', email: '', playerName: guestName };
            log('init: guest from localStorage', guestName);
            setUser(guest);
          } else {
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Error fetching user:', err);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    initUser();
  }, []);

  // Subscribe to auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      log('auth state change', event, session?.user?.id);
      if (session?.user) {
        const currentUser = await getCurrentUser();
        log('auth state user', currentUser);
        setUser(currentUser);
      } else {
        log('auth state: no session');
        setUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const updatePlayerName = useCallback(async (newName: string): Promise<boolean> => {
    if (!user) return false;

    try {
      log('updatePlayerName', newName, user?.id);
      const { error } = await supabase
        .from('game_players')
        .update({ player_name: newName })
        .eq('auth_user_id', user.id);

      if (error) throw error;

      setUser({ ...user, playerName: newName });
      return true;
    } catch (err) {
      console.error('Error updating player name:', err);
      return false;
    }
  }, [user]);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    updatePlayerName,
  };
}
