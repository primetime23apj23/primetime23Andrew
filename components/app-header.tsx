"use client";

import { useState } from "react";
import { usePlayerProfile } from "@/hooks/use-player-profile";
import { AuthDialog } from "./auth-dialog";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { supabase } from "@/lib/supabase-multiplayer";

export function AppHeader() {
  const { user, isAuthenticated, loading } = usePlayerProfile();
  const [showAuth, setShowAuth] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("pf_player_name");
    localStorage.removeItem("pf_player_email");
    window.location.reload();
  };

  if (loading) {
    return (
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="font-bold text-lg">Prime Factorization Game</div>
          <div className="h-8 w-24 bg-muted rounded animate-pulse" />
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="font-bold text-lg">Prime Factorization Game</div>

          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    {user.playerName}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => setShowAuth(true)}
              >
                Sign In / Sign Up
              </Button>
            )}
          </div>
        </div>
      </header>

      <AuthDialog
        open={showAuth}
        onOpenChange={setShowAuth}
        onAuthed={() => {
          setShowAuth(false);
          window.location.reload();
        }}
      />
    </>
  );
}
