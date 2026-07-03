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
  onReadyForNextRound?: () => void;
  onNewGame: () => void;
  message: string;
  player1Ready?: boolean;
  player2Ready?: boolean;
  isMultiplayer?: boolean;
}

export function GameControls({
  phase,
  canRoll,
  canEndTurn,
  hasValidMoves = false,
  onRoll,
  onEndTurn,
  onNewRound,
  onReadyForNextRound,
  onNewGame,
  message,
  player1Ready = false,
  player2Ready = false,
  isMultiplayer = false,
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
          <>
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
            {isMultiplayer && onReadyForNextRound && (
              <Button 
                onClick={onReadyForNextRound}
                variant="outline"
                className="gap-2"
              >
                <Dices className="w-5 h-5" />
                Ready for Next Round
              </Button>
            )}
          </>
        )}

        {phase === "roundEnd" && (
          <>
            {isMultiplayer ? (
              <>
                <Button 
                  onClick={onReadyForNextRound} 
                  className="gap-2" 
                  size="lg"
                  variant={player1Ready || player2Ready ? "default" : "secondary"}
                >
                  <Dices className="w-5 h-5" />
                  {player1Ready || player2Ready ? "Ready!" : "Ready for Next Round"}
                </Button>
                {(player1Ready || player2Ready) && (
                  <div className="w-full text-center text-sm text-muted-foreground">
                    {player1Ready && player2Ready 
                      ? "Both players ready - starting next round..." 
                      : player1Ready 
                      ? "Waiting for Player 2..." 
                      : "Waiting for Player 1..."}
                  </div>
                )}
              </>
            ) : (
              <Button onClick={onNewRound} className="gap-2" size="lg">
                <Dices className="w-5 h-5" />
                Start Next Round
              </Button>
            )}
          </>
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
