"use client";

import { Button } from "@/components/ui/button";
import { Trophy, RotateCcw, Crown, Medal } from "lucide-react";

interface GameOverPlayer {
  name: string;
  score: number;
  bonusPoints: number;
  color?: string;
}

interface GameOverOverlayProps {
  isActive: boolean;
  players: GameOverPlayer[];
  onPlayAgain: () => void;
}

export function GameOverOverlay({ isActive, players, onPlayAgain }: GameOverOverlayProps) {
  if (!isActive) return null;

  const withTotals = players.map((p, index) => ({
    ...p,
    index,
    total: p.score + p.bonusPoints,
  }));

  const topScore = Math.max(...withTotals.map((p) => p.total));
  const winners = withTotals.filter((p) => p.total === topScore);
  const isTie = winners.length > 1;
  const winner = winners[0];

  // Rank players for the scoreboard (highest total first).
  const ranked = [...withTotals].sort((a, b) => b.total - a.total);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
      {/* Dim + blur backdrop */}
      <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
        {/* Golden header band */}
        <div className="relative flex flex-col items-center gap-3 bg-amber-400 px-6 py-8 text-center">
          {/* Shine sweep */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -inset-y-8 -left-1/3 w-1/3 rotate-12 bg-white/30 blur-md animate-shine" />
          </div>

          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 shadow-inner ring-4 ring-amber-300">
            <Trophy className="h-11 w-11 text-amber-500" strokeWidth={2.25} />
          </div>

          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-900/80">
            {isTie ? "It's a Tie!" : "Congratulations"}
          </p>
          <h2 className="text-balance text-3xl font-black leading-tight text-amber-950">
            {isTie ? "Shared Victory" : winner.name}
          </h2>
          {!isTie && (
            <p className="text-sm font-medium text-amber-900/80">
              wins with {winner.total} {winner.total === 1 ? "point" : "points"}!
            </p>
          )}
        </div>

        {/* Scoreboard */}
        <div className="space-y-2 px-6 py-6">
          {ranked.map((player, rank) => {
            const isWinner = player.total === topScore;
            return (
              <div
                key={player.index}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                  isWinner
                    ? "border-amber-300 bg-amber-50"
                    : "border-border bg-muted/40"
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                  {rank === 0 ? (
                    <Crown className="h-6 w-6 text-amber-500" />
                  ) : (
                    <Medal className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-foreground">{player.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {player.score} claimed
                    {player.bonusPoints > 0 ? ` + ${player.bonusPoints} bonus` : ""}
                  </p>
                </div>
                <div
                  className={`text-2xl font-black tabular-nums ${
                    isWinner ? "text-amber-600" : "text-foreground"
                  }`}
                >
                  {player.total}
                </div>
              </div>
            );
          })}

          <Button onClick={onPlayAgain} size="lg" className="mt-4 w-full gap-2 text-base font-bold">
            <RotateCcw className="h-5 w-5" />
            Play Again
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes shine {
          0% { transform: translateX(0) rotate(12deg); }
          60%, 100% { transform: translateX(600%) rotate(12deg); }
        }
        .animate-shine {
          animation: shine 2.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
