"use client";

import { useState } from "react";
import type { BonusBreakdown } from "@/lib/game-utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface BonusBreakdownProps {
  history: Array<{
    player: string;
    space: number;
    round: number;
    breakdown: BonusBreakdown[];
  }>;
}

const directionLabels: Record<string, string> = {
  horizontal: "Row",
  vertical: "Column",
  "diagonal-down": "Diagonal",
  "diagonal-up": "Diagonal",
};

export function BonusBreakdownPanel({ history }: BonusBreakdownProps) {
  const [hidden, setHidden] = useState(false);
  const bonusHistory = history.filter((h) => h.breakdown.length > 0);

  if (bonusHistory.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">
          Bonus History
        </h3>
        <p className="text-xs text-muted-foreground">
          No bonus connections completed yet. Complete all spaces between two consecutive primes in a row, column, or diagonal to earn bonus points.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Bonus History ({bonusHistory.length})
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setHidden(!hidden)}
        >
          {hidden ? "Show" : "Hide"}
        </Button>
      </div>
      {!hidden && (
        <ScrollArea className="h-40">
          <div className="space-y-3 pr-3">
            {bonusHistory.map((entry, idx) => (
              <div
                key={`${entry.space}-${idx}`}
                className="bg-muted/50 rounded-lg p-2 text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">{entry.player}</span>
                  <span className="text-muted-foreground">
                    Round {entry.round}, Space {entry.space}
                  </span>
                </div>
                {entry.breakdown.map((bonus, bIdx) => (
                  <div
                    key={`${bonus.direction}-${bIdx}`}
                    className="mt-1 p-1.5 bg-green-100 dark:bg-green-900/30 rounded text-green-800 dark:text-green-300 text-xs font-medium"
                  >
                    +{bonus.points} bonus ({directionLabels[bonus.direction]})
                  </div>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
