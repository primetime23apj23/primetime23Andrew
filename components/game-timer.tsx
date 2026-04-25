import { useEffect, useState } from "react";

interface GameTimerProps {
  initialSeconds: number;
  onTimeUp: () => void;
  isActive: boolean;
  currentPlayer: number;
  playerColors: string[];
}

export function GameTimer({
  initialSeconds,
  onTimeUp,
  isActive,
  currentPlayer,
  playerColors,
}: GameTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);

  // Reset timer when player changes
  useEffect(() => {
    setTimeLeft(initialSeconds);
  }, [currentPlayer, initialSeconds]);

  // Timer countdown effect
  useEffect(() => {
    if (!isActive || initialSeconds === 0) return; // 0 means unlimited time

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onTimeUp();
          return initialSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, initialSeconds, onTimeUp]);

  if (initialSeconds === 0) {
    return null; // Don't show timer if unlimited
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isLowTime = timeLeft <= 10;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground">Turn Timer</h3>
      <div
        className={`text-center p-3 rounded-lg font-mono text-2xl font-bold transition-colors ${
          isLowTime
            ? "bg-destructive/10 text-destructive"
            : `bg-${playerColors[currentPlayer]?.replace("#", "")}/10`
        }`}
      >
        {minutes}:{seconds.toString().padStart(2, "0")}
      </div>
    </div>
  );
}
