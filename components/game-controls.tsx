"use client";

import { Button } from "@/components/ui/button";
import { Dices, SkipForward, RotateCcw } from "lucide-react";

interface GameControlsProps {
  phase: string;
  canRoll: boolean;
  canEndTurn: boolean;
  hasValidMoves?: boolean;
  onRoll: () => void;
  onEndTurn: () => void;
  onNewRound: () => void;
  onNewGame: () => void;
  message: string;
}

export function GameControls({
  phase,
  canRoll,
  canEndTurn,
  hasValidMoves = false,
  onRoll,
  onEndTurn,
  onNewRound,
  onNewGame,
  message,
}: GameControlsProps) {
  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      {/* Message */}
      <div className="bg-muted rounded-lg p-3 text-center">
        <p className="text-sm font-medium">{message}</p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 justify-center">
        {phase === "rolling" && (
          <Button
            onClick={onRoll}
            disabled={!canRoll}
            className="gap-2"
            size="lg"
          >
            <Dices className="w-5 h-5" />
            Roll Dice
          </Button>
        )}

        {phase === "playing" && (
          <Button
            onClick={onEndTurn}
            disabled={!canEndTurn || hasValidMoves}
            variant="secondary"
            className="gap-2"
            title={hasValidMoves ? "You must play if you have valid moves" : "End your turn"}
          >
            <SkipForward className="w-4 h-4" />
            {hasValidMoves ? "Must Play" : "End Turn"}
          </Button>
        )}

        {phase === "roundEnd" && (
          <Button onClick={onNewRound} className="gap-2" size="lg">
            <Dices className="w-5 h-5" />
            Start Next Round
          </Button>
        )}

        {phase === "gameOver" && (
          <Button onClick={onNewGame} className="gap-2" size="lg">
            <RotateCcw className="w-5 h-5" />
            New Game
          </Button>
        )}
      </div>
    </div>
  );
}
