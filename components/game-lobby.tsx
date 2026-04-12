"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getAvailableLobbies, subscribeToLobbies, type GameLobby as GameLobbyType } from "@/lib/supabase-multiplayer";

interface GameLobbyProps {
  onSelectLobby: (lobbyId: string) => void;
  onCreateNew: () => void;
  isOpen: boolean;
}

export function GameLobby({
  onSelectLobby,
  onCreateNew,
  isOpen,
}: GameLobbyProps) {
  const [lobbies, setLobbies] = useState<GameLobbyType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    // Initial fetch
    const fetchLobbies = async () => {
      setLoading(true);
      const data = await getAvailableLobbies();
      setLobbies(data);
      setLoading(false);
    };

    fetchLobbies();

    // Subscribe to real-time updates
    const channel = subscribeToLobbies((data) => {
      setLobbies(data);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [isOpen]);

  const waitingLobbies = lobbies.filter(lobby => lobby.status === 'waiting');

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Create Game Section */}
      <div className="space-y-3">
        <Button
          onClick={onCreateNew}
          size="lg"
          className="w-full gap-2"
        >
          <Plus className="h-4 w-4" />
          Create New Game
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Create a game and share the link with a friend to play
        </p>
      </div>

      {/* Active Games Section */}
      {waitingLobbies.length > 0 && (
        <div className="space-y-3 border-t pt-6">
          <h3 className="font-semibold text-sm">Active Games</h3>
          <p className="text-xs text-muted-foreground">
            Join an existing game
          </p>
          <div className="space-y-2">
            {waitingLobbies.map((lobby) => (
              <button
                key={lobby.id}
                onClick={() => onSelectLobby(lobby.id)}
                className="w-full p-3 text-left rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                      {lobby.player_1_name || "Player"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Target: {lobby.target_score || 37} points
                    </p>
                  </div>
                  <span className="ml-2 text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                    Waiting
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && waitingLobbies.length === 0 && (
        <div className="text-center py-8 border-t">
          <p className="text-sm text-muted-foreground">
            No active games available
          </p>
        </div>
      )}

      {loading && (
        <div className="text-center py-8 border-t">
          <p className="text-sm text-muted-foreground">
            Loading games...
          </p>
        </div>
      )}
    </div>
  );
}

