"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

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

      {/* Create Game Section */}
      <div className="space-y-3 pt-3 border-t">
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
    </div>
  );
}
