"use client";

import { cn } from "@/lib/utils";
import type { Player } from "@/lib/game-utils";
import { PLAYER_COLORS } from "@/lib/game-utils";

interface ScoreboardProps {
  players: Player[];
  currentPlayer: number;
  targetScore: number;
}

export function Scoreboard({ players, currentPlayer, targetScore }: ScoreboardProps) {
  return (
    <div className="bg-card border rounded p-2">
      <div className="flex items-center justify-between gap-2 mb-1 px-2">
        <h3 className="text-xs font-semibold text-muted-foreground">Score</h3>
        <span className="text-xs text-muted-foreground">to {targetScore}</span>
      </div>
      <div className="space-y-1">
        {players.map((player, index) => (
          <div
            key={player.name}
            className={cn(
              "flex items-center justify-between px-2 py-1 rounded text-sm transition-all",
              currentPlayer === index
                ? "bg-accent ring-1 ring-chart-1"
                : "bg-muted/30"
            )}
          >
            <div className="flex items-center gap-1 min-w-0">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: PLAYER_COLORS[index] }}
              />
              <span className="font-medium truncate text-xs">{player.name}</span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="font-bold">{player.score + player.bonusPoints}</span>
              {player.bonusPoints > 0 && (
                <span className="text-xs text-muted-foreground">+{player.bonusPoints}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
