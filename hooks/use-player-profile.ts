"use client";

import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser, AuthUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase-multiplayer';

export function usePlayerProfile() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current user on mount
  useEffect(() => {
    const initUser = async () => {
      try {
        setLoading(true);
        const currentUser = await getCurrentUser();
        setUser(currentUser);
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
      if (session?.user) {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } else {
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
