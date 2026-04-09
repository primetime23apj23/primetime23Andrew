"use client";

import React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import type { BotDifficulty } from "@/lib/bot-utils";

interface TargetScoreSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartGame: (targetScore: number, botEnabled: boolean, botDifficulty: BotDifficulty) => void;
  onShowTutorial?: () => void;
  onPlayOnline?: () => void;
  isMultiplayer?: boolean;
  isLocalPlay?: boolean;
  fixedTargetScore?: number;
  initialBotEnabled?: boolean;
}

const BOT_DIFFICULTIES: { label: string; value: BotDifficulty; description: string }[] = [
  { label: "Easy", value: "easy", description: "Makes mistakes" },
  { label: "Medium", value: "medium", description: "Balanced play" },
  { label: "Hard", value: "hard", description: "Strategic" },
];

const DIFFICULTY_PRESETS = [
  { label: "Easy", score: 23, description: "Quick game, great for beginners" },
  { label: "Medium", score: 37, description: "Balanced challenge" },
  { label: "Hard", score: 53, description: "Long strategic battle" },
];

export function TargetScoreSelector({
  open,
  onOpenChange,
  onStartGame,
  onShowTutorial,
  onPlayOnline,
  isMultiplayer = false,
  isLocalPlay = false,
  fixedTargetScore = 37,
  initialBotEnabled = false,
}: TargetScoreSelectorProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | "custom">(1);
  const [customScore, setCustomScore] = useState("");
  const [botEnabled, setBotEnabled] = useState(false);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>("medium");

  useEffect(() => {
    if (!open) return;

    if (isMultiplayer || isLocalPlay) {
      setBotEnabled(false);
      return;
    }

    setBotEnabled(initialBotEnabled);
  }, [initialBotEnabled, isLocalPlay, isMultiplayer, open]);

  const activeScore =
    isMultiplayer
      ? fixedTargetScore
      : selectedDifficulty === "custom"
      ? Number.parseInt(customScore, 10) || 0
      : DIFFICULTY_PRESETS[selectedDifficulty].score;

  const handleStartGame = () => {
    if (activeScore >= 1) {
      onStartGame(activeScore, isMultiplayer ? false : botEnabled, botDifficulty);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Game Setup</DialogTitle>
          <DialogDescription>
            {isMultiplayer
              ? "This multiplayer match is already configured. Review the rules if needed, then start."
              : "Choose your difficulty level or set a custom target score"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {isMultiplayer ? (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
              This lobby already has its multiplayer settings locked in. If anyone needs a refresher, open
              <span className="font-semibold text-foreground"> How to Play</span> before starting.
            </div>
          ) : (
            <>
              {/* Difficulty Buttons */}
              <div className="grid grid-cols-3 gap-3">
                {DIFFICULTY_PRESETS.map((preset, idx) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setSelectedDifficulty(idx);
                      setCustomScore("");
                    }}
                    className={`flex flex-col items-center gap-1 p-4 rounded-lg border-2 transition-all ${
                      selectedDifficulty === idx
                        ? "border-primary bg-primary/10 shadow-md"
                        : "border-border hover:border-primary/50 hover:bg-muted"
                    }`}
                  >
                    <span className="text-lg font-bold">{preset.label}</span>
                    <span className="text-2xl font-black text-primary">{preset.score}</span>
                    <span className="text-xs text-muted-foreground text-center">{preset.description}</span>
                  </button>
                ))}
              </div>

              {/* Custom Score */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setSelectedDifficulty("custom")}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                    selectedDifficulty === "custom"
                      ? "border-primary bg-primary/10 shadow-md"
                      : "border-border hover:border-primary/50 hover:bg-muted"
                  }`}
                >
                  <span className="text-sm font-bold">Custom</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    placeholder="Enter target score"
                    value={customScore}
                    onFocus={() => setSelectedDifficulty("custom")}
                    onChange={(e) => {
                      setSelectedDifficulty("custom");
                      setCustomScore(e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-background border rounded px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </button>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                {activeScore >= 1
                  ? `First player to reach ${activeScore} points wins`
                  : "Enter a valid target score"}
              </p>

              {/* Bot Toggle */}
              {!isLocalPlay && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setBotEnabled((prev) => !prev)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                      botEnabled
                        ? "border-primary bg-primary/10 shadow-md"
                        : "border-border hover:border-primary/50 hover:bg-muted"
                    }`}
                  >
                    <span className="text-sm font-bold">Play vs Bot</span>
                    <span className={`text-xs px-2 py-1 rounded ${botEnabled ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {botEnabled ? "ON" : "OFF"}
                    </span>
                  </button>

                  {botEnabled && (
                    <div className="flex gap-2">
                      {BOT_DIFFICULTIES.map((diff) => (
                        <button
                          key={diff.value}
                          type="button"
                          onClick={() => setBotDifficulty(diff.value)}
                          className={`flex-1 flex flex-col items-center gap-0.5 p-2 rounded-lg border-2 transition-all ${
                            botDifficulty === diff.value
                              ? "border-primary bg-primary/10 shadow-md"
                              : "border-border hover:border-primary/50 hover:bg-muted"
                          }`}
                        >
                          <span className="text-sm font-bold">{diff.label}</span>
                          <span className="text-[10px] text-muted-foreground">{diff.description}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Scoring info */}
              <div className="bg-muted rounded-lg p-3 text-sm space-y-2">
                <div className="font-semibold">Scoring Rules:</div>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>+1 point for each space claimed</li>
                  <li>+1 bonus for each space in a completed connection between prime numbers</li>
                  <li>Connections can be horizontal, vertical, or diagonal</li>
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {!isMultiplayer && onPlayOnline && (
            <Button variant="outline" onClick={onPlayOnline}>
              Play Online
            </Button>
          )}
          {onShowTutorial && (
            <Button variant="outline" onClick={onShowTutorial}>
              How to Play
            </Button>
          )}
          <Button onClick={handleStartGame} disabled={activeScore < 1}>
            Start Game
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
