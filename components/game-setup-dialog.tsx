"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface GameSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameType: "multiplication" | "give-or-take";
  onCreateLobby: (settings: {
    playerName: string;
    targetScore?: number;
    botDifficulty?: "easy" | "medium" | "hard";
  }) => void;
  isLoading?: boolean;
}

export function GameSetupDialog({
  open,
  onOpenChange,
  gameType,
  onCreateLobby,
  isLoading = false,
}: GameSetupDialogProps) {
  const [playerName, setPlayerName] = useState("");
  const [targetScore, setTargetScore] = useState("37");
  const [botDifficulty, setBotDifficulty] = useState<"easy" | "medium" | "hard">(
    "medium"
  );

  const handleCreate = () => {
    if (!playerName.trim()) return;

    const settings =
      gameType === "multiplication"
        ? {
            playerName,
            targetScore: parseInt(targetScore),
          }
        : {
            playerName,
            botDifficulty,
          };

    onCreateLobby(settings);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Up Your Game</DialogTitle>
          <DialogDescription>
            Configure your settings before creating a lobby.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="player-name" className="text-sm font-medium">
              Your Name
            </Label>
            <Input
              id="player-name"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && playerName.trim()) handleCreate();
              }}
              className="mt-2"
            />
          </div>

          {gameType === "multiplication" && (
            <div>
              <Label htmlFor="target-score" className="text-sm font-medium">
                Target Score
              </Label>
              <Select value={targetScore} onValueChange={setTargetScore}>
                <SelectTrigger id="target-score" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 Points</SelectItem>
                  <SelectItem value="31">31 Points</SelectItem>
                  <SelectItem value="37">37 Points (Standard)</SelectItem>
                  <SelectItem value="43">43 Points</SelectItem>
                  <SelectItem value="50">50 Points</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {gameType === "give-or-take" && (
            <div>
              <Label htmlFor="difficulty" className="text-sm font-medium">
                Difficulty
              </Label>
              <Select
                value={botDifficulty}
                onValueChange={(value) =>
                  setBotDifficulty(value as "easy" | "medium" | "hard")
                }
              >
                <SelectTrigger id="difficulty" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleCreate}
              disabled={!playerName.trim() || isLoading}
              className="flex-1"
            >
              {isLoading ? "Creating..." : "Create Lobby"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
