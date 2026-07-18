"use client";

import { useEffect, useState } from "react";
import { usePlayerProfile } from "@/hooks/use-player-profile";
import { AuthDialog } from "./auth-dialog";
import { Button } from "@/components/ui/button";
import { LogOut, User, HelpCircle, X } from "lucide-react";
import { supabase } from "@/lib/supabase-multiplayer";
import { DiceSkinSettings, type DiceSkin } from "./dice-skin-settings";

const headerLog = (...args: any[]) => console.debug("[AppHeader]", ...args);

interface AppHeaderProps {
  title?: string;
  onShowRules?: () => void;
  onShowTutorial?: () => void;
  onExitGame?: () => void;
  diceSkins?: DiceSkin[];
  onDiceSkinsChange?: (skins: DiceSkin[]) => void;
}

export function AppHeader({ 
  title = "Times of Primes",
  onShowRules,
  onShowTutorial,
  onExitGame,
  diceSkins,
  onDiceSkinsChange,
}: AppHeaderProps) {
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
    try {
      await supabase.auth.signOut();
      headerLog("logout:signOut-complete");
    } catch (error) {
      headerLog("logout:signOut-error", error);
    }
    
    localStorage.removeItem("pf_player_name");
    localStorage.removeItem("pf_player_email");
    localStorage.removeItem("pf_player_id");
    headerLog("logout:complete -> reloading page");
    window.location.reload();
  };

  return (
    <>
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4 flex-wrap">
          {/* Left: Title and Patent */}
          <div className="flex items-center gap-6">
            <div className="font-bold text-lg">{title}</div>
            <div className="text-xs text-muted-foreground">
              <span>Patented by</span>
              <span className="mx-1 font-semibold text-foreground">Andrew Paul Jaffe</span>
            </div>
          </div>

          {/* Center: Brought to you by */}
          <div className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-muted-foreground whitespace-nowrap pointer-events-none">
            <span>Brought to you by</span>
            <span className="ml-1 font-semibold text-foreground">Sylinx Labs</span>
          </div>

          {/* Right: User and Auth */}
          <div className="flex items-center gap-3">
            {diceSkins && onDiceSkinsChange && (
              <DiceSkinSettings skins={diceSkins} onSkinsChange={onDiceSkinsChange} />
            )}
            {(isAuthenticated && user) || (userId && playerName) ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    {user?.playerName || playerName}
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

        {/* Second row: game controls */}
        {(onShowRules || onShowTutorial || onExitGame) && (
          <div className="border-t bg-muted/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-center gap-2">
              {onShowRules && (
                <Button variant="ghost" size="sm" onClick={onShowRules} className="gap-2">
                  <HelpCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Rules</span>
                </Button>
              )}
              {onShowTutorial && (
                <Button variant="ghost" size="sm" onClick={onShowTutorial} className="gap-2">
                  <HelpCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Tutorial</span>
                </Button>
              )}
              {onExitGame && (
                <Button variant="ghost" size="sm" onClick={onExitGame} className="gap-2">
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Exit</span>
                </Button>
              )}
            </div>
          </div>
        )}
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
