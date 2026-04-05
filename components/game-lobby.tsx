"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Users, Plus, Loader2 } from "lucide-react";
import { getAvailableLobbies, subscribeToLobbies, type GameLobby } from "@/lib/supabase-multiplayer";

interface GameLobbyProps {
  gameType: "multiplication" | "give-or-take";
  onSelectLobby: (lobbyId: string, playerName?: string) => void;
  onCreateNew: () => void;
  isOpen: boolean;
}

export function GameLobby({
  gameType,
  onSelectLobby,
  onCreateNew,
  isOpen,
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

  const gameTypeLabel = gameType === "multiplication" ? "Times of Primes" : "Give or Take";

  return (
    <div className="flex flex-col gap-4 py-4">
      <div>
        <h2 className="text-lg font-semibold mb-2">Available Lobbies</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {gameTypeLabel} • {lobbies.length} game{lobbies.length !== 1 ? "s" : ""} waiting
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : lobbies.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 text-center">
            <Users className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-muted-foreground text-sm">No games waiting right now</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Be the first to create one!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {lobbies.map((lobby) => (
              <button
                key={lobby.id}
                onClick={() => onSelectLobby(lobby.id, lobby.player_1_name)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-primary/5 hover:border-primary/30 transition group"
              >
                <div className="text-left flex-1">
                  <p className="font-medium text-sm group-hover:text-primary transition">
                    {lobby.player_1_name || "Player"}
                  </p>
                  {gameType === "multiplication" && lobby.target_score && (
                    <p className="text-xs text-muted-foreground">
                      Target: {lobby.target_score} points
                    </p>
                  )}
                  {gameType === "give-or-take" && lobby.bot_difficulty && (
                    <p className="text-xs text-muted-foreground capitalize">
                      Difficulty: {lobby.bot_difficulty}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-xs font-medium">
                    <Users className="h-3 w-3" />
                    1/2
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="group-hover:border-primary/50 group-hover:text-primary transition"
                  >
                    Join
                  </Button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2 border-t">
        <Button
          onClick={onCreateNew}
          className="flex-1 gap-2"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          Create Game
        </Button>
      </div>
    </div>
  );
}
