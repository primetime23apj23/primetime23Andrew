"use client";

import { useEffect, useState } from "react";
import { usePlayerProfile } from "@/hooks/use-player-profile";
import { AuthDialog } from "./auth-dialog";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { supabase } from "@/lib/supabase-multiplayer";

const headerLog = (...args: any[]) => console.debug("[AppHeader]", ...args);

interface AppHeaderProps {
  title?: string;
}

export function AppHeader({ title = "Prime Factorization Game" }: AppHeaderProps) {
  const { user, isAuthenticated, loading } = usePlayerProfile();
  const [showAuth, setShowAuth] = useState(false);
  const [cachedPlayerName, setCachedPlayerName] = useState<string | null>(null);
  const userId = user?.id ?? null;
  const playerName = user?.playerName ?? null;
  const displayPlayerName = playerName || cachedPlayerName;

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCachedPlayerName(localStorage.getItem("pf_player_name"));
  }, []);

  useEffect(() => {
    headerLog("state snapshot", {
      loading,
      isAuthenticated,
      showAuth,
      userId,
      playerName,
      cachedPlayerName,
    });
  }, [cachedPlayerName, isAuthenticated, loading, playerName, showAuth, userId]);

  const handleLogout = async () => {
    headerLog("logout:start", {
      userId,
      playerName,
    });
    await supabase.auth.signOut();
    localStorage.removeItem("pf_player_name");
    localStorage.removeItem("pf_player_email");
    localStorage.removeItem("pf_player_id");
    headerLog("logout:complete -> reloading page");
    window.location.reload();
  };

  return (
    <>
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="font-bold text-lg">{title}</div>

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
            ) : displayPlayerName ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/60 text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{displayPlayerName}</span>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  headerLog("open auth dialog");
                  setShowAuth(true);
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                Sign In / Sign Up
              </Button>
            )}
          </div>
        </div>
      </header>

      <AuthDialog
        open={showAuth}
        onOpenChange={(open) => {
          headerLog("auth dialog open change", open);
          setShowAuth(open);
        }}
        onAuthed={() => {
          headerLog("auth dialog onAuthed -> closing without reload");
          if (typeof window !== "undefined") {
            setCachedPlayerName(localStorage.getItem("pf_player_name"));
          }
          setShowAuth(false);
        }}
      />
    </>
  );
}
