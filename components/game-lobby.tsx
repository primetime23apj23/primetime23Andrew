"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Users, Plus, Loader2, ArrowRight } from "lucide-react";
import { getAvailableLobbies, subscribeToLobbies, type GameLobby } from "@/lib/supabase-multiplayer";

interface GameLobbyProps {
  gameType: "multiplication" | "give-or-take";
  onSelectLobby: (lobbyId: string) => void;
  onCreateNew: () => void;
  isOpen: boolean;
  onChangeGameType?: (gameType: "multiplication" | "give-or-take") => void;
}

export function GameLobby({
  gameType,
  onSelectLobby,
  onCreateNew,
  isOpen,
  onChangeGameType,
}: GameLobbyProps) {
  const [lobbies, setLobbies] = useState<GameLobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadLobbies = async () => {
      setLoading(true);
      const availableLobbies = await getAvailableLobbies(gameType);
      setLobbies(availableLobbies);
      setLoading(false);
    };

    loadLobbies();

    // Subscribe to real-time updates
    const sub = subscribeToLobbies(gameType, (updatedLobbies) => {
      setLobbies(updatedLobbies);
    });

    setSubscription(sub);

    return () => {
      if (sub) {
        sub.unsubscribe();
      }
    };
  }, [isOpen, gameType]);

  const gameTypeLabel = gameType === "multiplication" ? "Multiplication Game" : "Give or Take Game";
  const gameTypeDesc = gameType === "multiplication" 
    ? "Multiply numbers to reach the target"
    : "Add or subtract numbers to reach the target";

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Game Type Selector */}
      {onChangeGameType && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Choose Game Type</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onChangeGameType("multiplication")}
              className={`p-3 rounded-lg border-2 transition text-left ${
                gameType === "multiplication"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50 hover:bg-primary/5"
              }`}
            >
              <div className="font-semibold text-sm">Multiplication Game</div>
              <div className="text-xs text-muted-foreground mt-1">Multiply to target</div>
            </button>
            <button
              onClick={() => onChangeGameType("give-or-take")}
              className={`p-3 rounded-lg border-2 transition text-left ${
                gameType === "give-or-take"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50 hover:bg-primary/5"
              }`}
            >
              <div className="font-semibold text-sm">Give or Take Game</div>
              <div className="text-xs text-muted-foreground mt-1">Add/subtract to target</div>
            </button>
          </div>
        </div>
      )}

      {/* Available Games Section */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold mb-1">Open Games</h2>
          <p className="text-sm text-muted-foreground">
            {gameTypeLabel} • {lobbies.length} game{lobbies.length !== 1 ? "s" : ""} waiting
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : lobbies.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 text-center">
            <Users className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-muted-foreground text-sm font-medium">No open games</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Be the first to create one!</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {lobbies.map((lobby) => (
              <button
                key={lobby.id}
                onClick={() => onSelectLobby(lobby.id)}
                className="w-full flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition group"
              >
                <div className="text-left flex-1">
                  <p className="font-semibold text-sm group-hover:text-primary transition">
                    {lobby.player_1_name || "Anonymous Player"}
                  </p>
                  {gameType === "multiplication" && lobby.target_score && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Target: {lobby.target_score} points
                    </p>
                  )}
                  {gameType === "give-or-take" && lobby.bot_difficulty && (
                    <p className="text-xs text-muted-foreground mt-1 capitalize">
                      Difficulty: {lobby.bot_difficulty}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-3">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-xs font-medium">
                    <Users className="h-3 w-3" />
                    1/2
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create Game Button */}
      <div className="pt-3 border-t">
        <Button
          onClick={onCreateNew}
          size="lg"
          className="w-full gap-2"
        >
          <Plus className="h-4 w-4" />
          Create New Game
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Can&apos;t find a game? Start your own and wait for others to join
        </p>
      </div>
    </div>
  );
}
