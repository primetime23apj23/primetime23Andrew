"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Clock } from "lucide-react";
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
  currentPlayer,
  playerColors,
}: GameTimerProps) {
  const timerConfigured = initialSeconds > 0;
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isPaused, setIsPaused] = useState(!timerConfigured);
  const [timerEnabled, setTimerEnabled] = useState(timerConfigured);

  useEffect(() => {
    setTimeLeft(initialSeconds);
    if (!timerConfigured) {
      setTimerEnabled(false);
      setIsPaused(true);
      return;
    }
    setTimerEnabled(true);
    setIsPaused(false);
  }, [initialSeconds, timerConfigured]);

  // Reset timer when player changes
  useEffect(() => {
    if (timerEnabled && isActive) {
      setTimeLeft(initialSeconds);
      setIsPaused(false);
    }
  }, [currentPlayer, timerEnabled, initialSeconds, isActive]);

  // Timer countdown
  useEffect(() => {
    if (!timerEnabled || isPaused || timeLeft <= 0 || !isActive) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onTimeUp?.();
          return initialSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerEnabled, isPaused, timeLeft, onTimeUp, initialSeconds, isActive]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const resetTimer = useCallback(() => {
    setTimeLeft(initialSeconds);
  }, [initialSeconds]);

  const toggleTimer = useCallback(() => {
    setTimerEnabled((prev) => {
      if (!prev) {
        setTimeLeft(initialSeconds);
        setIsPaused(false);
      }
      return !prev;
    });
  }, [initialSeconds]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const percentage = initialSeconds > 0 ? (timeLeft / initialSeconds) * 100 : 0;
  const isLow = timeLeft <= 10;
  const isCritical = timeLeft <= 5;

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
                  isCritical
                    ? "bg-destructive animate-pulse"
                    : isLow
                      ? "bg-amber-500"
                      : "bg-primary"
                )}
                style={{
                  width: `${percentage}%`,
                  backgroundColor: !isLow ? playerColors[currentPlayer] : undefined,
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div
              className={cn(
                "text-3xl font-mono font-bold tabular-nums",
                isCritical && "text-destructive animate-pulse",
                isLow && !isCritical && "text-amber-500"
              )}
              style={{
                color: !isLow ? playerColors[currentPlayer] : undefined,
              }}
            >
              {formatTime(timeLeft)}
            </div>

            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={togglePause}
              >
                {isPaused ? (
                  <Play className="h-4 w-4" />
                ) : (
                  <Pause className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={resetTimer}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isPaused && (
            <p className="text-xs text-muted-foreground text-center">
              Timer paused
            </p>
          )}
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
