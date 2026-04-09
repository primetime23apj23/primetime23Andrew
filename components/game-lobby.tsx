"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

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
    </div>
  );
}
