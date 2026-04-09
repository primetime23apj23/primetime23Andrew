"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Play } from "lucide-react";

interface ActiveGame {
  id: string;
  game_type: 'multiplication' | 'give-or-take';
  session_code: string;
  player_1_name: string;
  player_2_name?: string;
  status: 'waiting' | 'active' | 'finished';
  created_at: string;
  updated_at: string;
}

interface ActiveGamesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  gameType?: 'multiplication' | 'give-or-take';
  onResumeGame: (sessionId: string) => void;
}

export function ActiveGamesDialog({
  open,
  onOpenChange,
  userId,
  gameType,
  onResumeGame,
}: ActiveGamesDialogProps) {
  const [games, setGames] = useState<ActiveGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && userId) {
      fetchActiveGames();
    }
  }, [gameType, open, userId]);

  const fetchActiveGames = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ userId });
      if (gameType) {
        params.set("gameType", gameType);
      }

      const response = await fetch(`/api/active-games?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setGames(data.games);
      } else {
        setError(data.error || "Failed to fetch games");
      }
    } catch (err) {
      console.error("Error fetching active games:", err);
      setError("Failed to fetch active games");
    }

    setLoading(false);
  };

  const handleResume = (sessionId: string) => {
    onResumeGame(sessionId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your Active Games</DialogTitle>
          <DialogDescription>
            Resume one of your ongoing games from any device
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Loading your games...</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!loading && games.length === 0 && !error && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              You don&apos;t have any active games right now.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Create or join a game to get started!
            </p>
          </div>
        )}

        {!loading && games.length > 0 && (
          <ScrollArea className="h-max max-h-64 rounded-lg border">
            <div className="space-y-2 p-4">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {game.player_1_name} vs{" "}
                      {game.player_2_name || "Waiting..."}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Code: {game.session_code} • {game.status}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleResume(game.id)}
                    className="gap-1"
                  >
                    <Play className="h-3 w-3" />
                    Resume
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
