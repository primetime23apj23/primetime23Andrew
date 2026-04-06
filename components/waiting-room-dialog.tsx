"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getAvailableLobbies, type GameLobby } from "@/lib/supabase-multiplayer";
import { Copy, Check, ArrowRight } from "lucide-react";

interface WaitingRoomProps {
  sessionCode: string;
  playerName: string;
  isOpen?: boolean;
  onCancel: () => void;
  onOpponentJoined?: () => void;
  gameType?: "multiplication" | "give-or-take";
  onJoinLobby?: (lobbyId: string) => void;
  onCreateNew?: () => void;
  opponentHasJoined?: boolean;
}

export function WaitingRoomDialog({
  sessionCode,
  playerName,
  isOpen = true,
  onCancel,
  onOpponentJoined,
  gameType,
  onJoinLobby,
  onCreateNew,
  opponentHasJoined = false,
}: WaitingRoomProps) {
  const [copied, setCopied] = useState(false);
  const [lobbies, setLobbies] = useState<GameLobby[]>([]);
  const [loadingLobbies, setLoadingLobbies] = useState(false);
  const [gameLink, setGameLink] = useState<string>("");

  // Generate shareable link
  useEffect(() => {
    if (typeof window !== "undefined" && sessionCode) {
      const baseUrl = window.location.origin;
      const link = `${baseUrl}?join=${sessionCode}`;
      setGameLink(link);
    }
  }, [sessionCode]);

  // Auto-trigger opponent joined callback when opponent joins
  useEffect(() => {
    if (opponentHasJoined && onOpponentJoined) {
      // Small delay to ensure smooth UI transition
      const timer = setTimeout(() => {
        onOpponentJoined();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [opponentHasJoined, onOpponentJoined]);

  useEffect(() => {
    if (!gameType || !isOpen) return;
    let mounted = true;
    const load = async () => {
      setLoadingLobbies(true);
      const data = await getAvailableLobbies(gameType);
      if (mounted) setLobbies(data);
      setLoadingLobbies(false);
    };
    load();
    const interval = setInterval(load, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [gameType, isOpen]);

  const copyGameLink = () => {
    navigator.clipboard.writeText(gameLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const otherLobbies = lobbies.filter((lobby) => lobby.session_code !== sessionCode);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Waiting for Opponent...</DialogTitle>
          <DialogDescription>
            Share the session code or wait here while another player joins your multiplayer match.
          </DialogDescription>
        </DialogHeader>
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">Your Name</p>
        <p className="text-lg font-semibold">{playerName}</p>
      </div>

      <div className="space-y-3 p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-sm font-medium text-foreground">Game Link</p>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={gameLink}
            readOnly
            className="flex-1 px-3 py-2 rounded bg-background border border-border text-sm font-mono text-foreground"
          />
          <Button
            onClick={copyGameLink}
            variant="outline"
            size="sm"
            className="shrink-0"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Share this link with others to invite them to your game.
        </p>
      </div>

      <div className="text-center">
        <div className="flex justify-center gap-1 mb-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
        <p className="text-sm text-muted-foreground">{opponentHasJoined ? 'Opponent joined! Ready to start.' : 'Waiting for opponent to join...'}</p>
      </div>

      {gameType && onJoinLobby && (
        <div className="space-y-3 border-t pt-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Other open games</p>
            {loadingLobbies && <span className="text-xs text-muted-foreground">Refreshing…</span>}
          </div>
          {otherLobbies.length === 0 ? (
            <p className="text-xs text-muted-foreground">No other games waiting right now.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {otherLobbies.map((lobby) => (
                <button
                  key={lobby.id}
                  onClick={() => onJoinLobby(lobby.id)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-primary/5 hover:border-primary/30 transition"
                >
                  <div className="text-left">
                    <p className="text-sm font-semibold">{lobby.player_1_name || "Player"}</p>
                    <p className="text-xs text-muted-foreground">{lobby.session_code}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-xs font-medium">
                    <Users className="h-3 w-3" /> 1/2
                  </span>
                </button>
              ))}
            </div>
          )}
          {onCreateNew && (
            <Button variant="outline" size="sm" onClick={onCreateNew} className="w-full">
              Create new game
            </Button>
          )}
        </div>
      )}

      {onOpponentJoined && opponentHasJoined && (
        <Button onClick={onOpponentJoined} className="w-full">
          Opponent Joined — Start Match
        </Button>
      )}

      <Button onClick={onCancel} variant="outline" className="w-full">
        Cancel
      </Button>
    </div>
  </DialogContent>
    </Dialog>
  );
}
