"use client";

import { useEffect, useState } from "react";
import { usePlayerProfile } from "@/hooks/use-player-profile";
import { AuthDialog } from "./auth-dialog";
import { Button } from "@/components/ui/button";
import { LogOut, User, HelpCircle, X, Dices } from "lucide-react";
import { supabase } from "@/lib/supabase-multiplayer";
import { DiceSkinSettings, type DiceSkin } from "./dice-skin-settings";

const headerLog = (...args: any[]) => console.debug("[AppHeader]", ...args);

interface HeaderRollControls {
  phase: string;
  roundNumber: number;
  canRoll: boolean;
  currentPlayerName: string;
}

interface AppHeaderProps {
  title?: string;
  onShowRules?: () => void;
  onShowTutorial?: () => void;
  onExitGame?: () => void;
  diceSkins?: DiceSkin[];
  onDiceSkinsChange?: (skins: DiceSkin[]) => void;
  rollControls?: HeaderRollControls | null;
  onRoll?: () => void;
}

export function AppHeader({ 
  title = "Times of Primes",
  onShowRules,
  onShowTutorial,
  onExitGame,
  diceSkins,
  onDiceSkinsChange,
  rollControls,
  onRoll,
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
          {/* Left: Title and stacked credits (saves horizontal space) */}
          <div className="flex items-center gap-4">
            <div className="font-bold text-lg leading-none">{title}</div>
            <div className="flex flex-col text-xs text-muted-foreground leading-tight">
              <span>
                Patented by
                <span className="ml-1 font-semibold text-foreground">Andrew Paul Jaffe</span>
              </span>
              <span>
                Brought to you by
                <span className="ml-1 font-semibold text-foreground">Sylinx Labs</span>
              </span>
            </div>
          </div>

          {/* Center: Round indicator + current player + Roll Dice */}
          {rollControls && (
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
                  <span className="text-sm font-bold text-primary whitespace-nowrap">
                    Round {rollControls.roundNumber}
                  </span>
                </div>
                <div className="rounded-full bg-pink-200 dark:bg-pink-900 px-3 py-1">
                  <span className="text-sm sm:text-base md:text-lg font-bold text-primary whitespace-nowrap truncate max-w-[12rem]">
                    {rollControls.currentPlayerName}
                  </span>
                </div>
              </div>
              {rollControls.phase === "rolling" && (
                <Button
                  onClick={onRoll}
                  disabled={!rollControls.canRoll}
                  size="sm"
                  className="gap-2"
                >
                  <Dices className="w-4 h-4" />
                  Roll Dice
                </Button>
              )}
              {diceSkins && onDiceSkinsChange && (
                <DiceSkinSettings skins={diceSkins} onSkinsChange={onDiceSkinsChange} />
              )}
            </div>
          )}

          {/* Right: User and Auth */}
          <div className="flex items-center gap-3">
            {onShowRules && (
              <Button
                variant="outline"
                size="sm"
                onClick={onShowRules}
                className="gap-2"
              >
                <HelpCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Rules</span>
              </Button>
            )}
            {onExitGame && (
              <Button variant="ghost" size="sm" onClick={onExitGame} className="gap-2">
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Exit</span>
              </Button>
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
