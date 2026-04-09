"use client";

import type { BoardSpace, Die } from "@/lib/game-utils";
import { PLAYER_COLORS } from "@/lib/game-utils";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface SpaceDetailProps {
  space: BoardSpace | null;
  selectedDice: Die[];
  canClaim: boolean;
  onClaim: () => void;
  onCancel: () => void;
}

export function SpaceDetail({
  space,
  selectedDice,
  canClaim,
  onClaim,
  onCancel,
}: SpaceDetailProps) {
  if (!space) {
    return (
      <div className="bg-card border rounded-lg p-4 text-center text-muted-foreground">
        <p>Select a space on the board to see details</p>
      </div>
    );
  }

  if (space.number === 0) {
    return (
      <div className="bg-card border rounded-lg p-4 text-center">
        <p className="font-bold text-lg">Multiplication Game</p>
        <p className="text-muted-foreground text-sm">This is the logo space</p>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold">{space.number}</span>
            {space.isPrime && (
              <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
                Prime
              </span>
            )}
          </div>
          {space.owner !== null && (
            <div className="flex items-center gap-2 mt-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: PLAYER_COLORS[space.owner] }}
              />
              <span className="text-sm text-muted-foreground">
                Owned by Player {space.owner + 1}
              </span>
            </div>
          )}
        </div>
      </div>

      {!space.isPrime && space.factorization && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Prime Factorization</p>
          <p className="font-mono text-lg">{space.factorization}</p>
          {space.exponential && (
            <p className="font-mono text-sm text-muted-foreground">
              ({space.exponential})
            </p>
          )}
        </div>
      )}

      {space.isPrime && (
        <p className="text-sm text-muted-foreground">
          Prime numbers cannot be occupied. Try to fill spaces between primes for bonus points!
        </p>
      )}

      {selectedDice.length > 0 && !space.isPrime && space.owner === null && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Selected Dice</p>
          <div className="flex gap-1 flex-wrap">
            {selectedDice.map((die) => (
              <span
                key={die.id}
                className="w-8 h-8 bg-chart-1 text-white rounded flex items-center justify-center font-bold"
              >
                {die.value}
              </span>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              onClick={onClaim}
              disabled={!canClaim}
              className="flex-1 gap-2"
            >
              <Check className="w-4 h-4" />
              Claim Space
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              className="gap-2 bg-transparent"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </div>
          {!canClaim && selectedDice.length > 0 && (
            <p className="text-xs text-destructive text-center">
              Selected dice don't match the factorization
            </p>
          )}
        </div>
      )}
    </div>
  );
}
