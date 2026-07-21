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
  roundNumber?: number;
  /** When true, the Round indicator + Roll Dice button are shown in the app header instead. */
  rollInHeader?: boolean;
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
  roundNumber = 1,
  rollInHeader = false,
}: GameControlsProps) {
  // Determine whether there is anything to render. When it's the playing phase
  // and the player has a forced move, no buttons/indicators show, so the card
  // would otherwise render as an empty box.
  const showRoundIndicator = phase === "rolling" && !rollInHeader;
  const showGameOver = phase === "gameOver";
  const showRollButton = phase === "rolling" && !rollInHeader;
  const showPlayingButtons =
    phase === "playing" &&
    (!hasValidMoves || (isMultiplayer && !!onReadyForNextRound));
  const showRoundEnd = phase === "roundEnd";
  const hasContent =
    showRoundIndicator ||
    showGameOver ||
    showRollButton ||
    showPlayingButtons ||
    showRoundEnd;

  if (!hasContent) {
    return null;
  }

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      {/* Round indicator for rolling phase (new round transition) */}
      {phase === "rolling" && !rollInHeader && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center">
          <p className="text-lg font-bold text-blue-900">Round {roundNumber}</p>
        </div>
      )}
      
      {/* Game Over indicator */}
      {phase === "gameOver" && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-amber-900">Game Over</p>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 justify-center">
        {phase === "rolling" && !rollInHeader && (
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

        {phase === "playing" && phase !== "gameOver" && (
          <>
            {!hasValidMoves && (
              <Button
                onClick={onEndTurn}
                disabled={!canEndTurn}
                variant="secondary"
                className="gap-2"
                title="End your turn"
              >
                <SkipForward className="w-4 h-4" />
                End Turn
              </Button>
            )}
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
