"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameTimerProps {
  initialSeconds?: number;
  onTimeUp?: () => void;
  isActive: boolean;
  currentPlayer: number;
  playerColors: string[];
}

export function GameTimer({
  initialSeconds = 60,
  onTimeUp,
  isActive,
  currentPlayer: _currentPlayer,
  playerColors: _playerColors,
}: GameTimerProps) {
  const timerConfigured = initialSeconds > 0;
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [timerEnabled, setTimerEnabled] = useState(timerConfigured);

  useEffect(() => {
    setTimeLeft(initialSeconds);
    if (!timerConfigured) {
      setTimerEnabled(false);
      return;
    }
    setTimerEnabled(true);
  }, [initialSeconds, timerConfigured]);

  // Reset timer when player changes
  useEffect(() => {
    if (timerEnabled && isActive) {
      setTimeLeft(initialSeconds);
    }
  }, [_currentPlayer, timerEnabled, initialSeconds, isActive]);

  // Timer countdown
  useEffect(() => {
    if (!timerEnabled || timeLeft <= 0 || !isActive) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          onTimeUp?.();
          return initialSeconds;
        }
        return Math.max(0, Number((prev - 0.1).toFixed(1)));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [timerEnabled, timeLeft, onTimeUp, initialSeconds, isActive]);

  const toggleTimer = useCallback(() => {
    setTimerEnabled((prev) => {
      if (!prev) {
        setTimeLeft(initialSeconds);
      }
      return !prev;
    });
  }, [initialSeconds]);

  const formatTime = (seconds: number) => {
    if (seconds < 20) {
      return seconds.toFixed(1);
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const percentage = initialSeconds > 0 ? (timeLeft / initialSeconds) * 100 : 0;
  const isDangerTime = timeLeft < 20;

  return (
    <div className="bg-card border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Turn Timer
        </h3>
        <Button
          variant={timerEnabled ? "default" : "outline"}
          size="sm"
          onClick={toggleTimer}
          className="text-xs h-7"
        >
          {timerEnabled ? "Enabled" : "Disabled"}
        </Button>
      </div>

      {timerEnabled && (
        <>
          <div className="relative">
            {/* Progress bar background */}
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-1000 ease-linear rounded-full",
                  isDangerTime
                    ? "bg-destructive animate-pulse"
                    : "bg-orange-500"
                )}
                style={{
                  width: `${percentage}%`,
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div
              className={cn(
                "text-3xl font-mono font-bold tabular-nums",
                isDangerTime && "text-destructive animate-pulse",
                !isDangerTime && "text-orange-500"
              )}
            >
              {formatTime(timeLeft)}
            </div>
          </div>
        </>
      )}

      {!timerEnabled && (
        <p className="text-xs text-muted-foreground text-center">
          {timerConfigured
            ? "Enable timer to add time pressure to turns"
            : "Timer is disabled for unlimited mode"}
        </p>
      )}
    </div>
  );
}
