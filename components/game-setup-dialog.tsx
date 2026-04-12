"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DiceSkinPicker } from "./dice-skin-picker";

const CUSTOM_TARGET_SCORE = "custom";
const MULTIPLICATION_TARGET_SCORE_OPTIONS = [
  { value: "25", label: "25 Points" },
  { value: "31", label: "31 Points" },
  { value: "37", label: "37 Points (Standard)" },
  { value: "43", label: "43 Points" },
  { value: "50", label: "50 Points" },
] as const;

const TIMER_MODE_OPTIONS = [
  { value: "1_minute", label: "1 Minute (Default)" },
  { value: "3_minutes", label: "3 Minutes" },
  { value: "5_minutes", label: "5 Minutes" },
  { value: "unlimited", label: "Unlimited" },
] as const;

interface GameSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPlayerName?: string;
  onCreateLobby: (settings: {
    playerName: string;
    targetScore?: number;
    diceSkin?: string;
    timerMode?: string;
  }) => void;
  isLoading?: boolean;
}

interface GameSetupFormProps {
  defaultPlayerName?: string;
  onCreateLobby: (settings: {
    playerName: string;
    targetScore?: number;
    diceSkin?: string;
    timerMode?: string;
  }) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  isMultiplayer?: boolean;
}

export function GameSetupForm({
  defaultPlayerName = "",
  onCreateLobby,
  onCancel,
  isLoading = false,
  isMultiplayer = false,
}: GameSetupFormProps) {
  const [playerName, setPlayerName] = useState("");
  const [targetScore, setTargetScore] = useState("37");
  const [customTargetScore, setCustomTargetScore] = useState("");
  const [diceSkin, setDiceSkin] = useState("standard");
  const [timerMode, setTimerMode] = useState("1_minute");

  useEffect(() => {
    setPlayerName(defaultPlayerName);
  }, [defaultPlayerName]);

  const resolvedTargetScore =
    targetScore === CUSTOM_TARGET_SCORE
      ? Number.parseInt(customTargetScore, 10)
      : Number.parseInt(targetScore, 10);

  const isCustomTargetScoreValid =
    targetScore !== CUSTOM_TARGET_SCORE ||
    (Number.isInteger(resolvedTargetScore) &&
      (resolvedTargetScore ?? 0) >= 1 &&
      (resolvedTargetScore ?? 0) <= 999);

  const handleCreate = () => {
    if (!playerName.trim()) return;
    if (!isCustomTargetScoreValid) return;

    onCreateLobby({
      playerName,
      targetScore: resolvedTargetScore,
      diceSkin,
      timerMode,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight">Set Up Your Game</h2>
        <p className="text-sm text-muted-foreground">
          Configure your settings before creating a lobby.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="player-name" className="text-sm font-medium">
            Your Name
          </Label>
          <Input
            id="player-name"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && playerName.trim()) handleCreate();
            }}
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="target-score" className="text-sm font-medium">
            Target Score
          </Label>
          <Select value={targetScore} onValueChange={setTargetScore}>
            <SelectTrigger id="target-score" className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MULTIPLICATION_TARGET_SCORE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
              <SelectItem value={CUSTOM_TARGET_SCORE}>Custom Score</SelectItem>
            </SelectContent>
          </Select>

          {targetScore === CUSTOM_TARGET_SCORE && (
            <div className="mt-3 space-y-2">
              <Label htmlFor="custom-target-score" className="text-sm font-medium">
                Custom Score
              </Label>
              <Input
                id="custom-target-score"
                type="number"
                min={1}
                max={999}
                inputMode="numeric"
                placeholder="Enter a score from 1 to 999"
                value={customTargetScore}
                onChange={(e) => setCustomTargetScore(e.target.value)}
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && playerName.trim() && isCustomTargetScoreValid) {
                    handleCreate();
                  }
                }}
              />
              <p className="text-sm text-muted-foreground">
                Pick any whole-number score between 1 and 999.
              </p>
              {!isCustomTargetScoreValid && customTargetScore.trim() && (
                <p className="text-sm text-destructive">
                  Enter a valid whole number between 1 and 999.
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <DiceSkinPicker value={diceSkin} onChange={setDiceSkin} />
        </div>

        <div>
          <Label htmlFor="timer-mode" className="text-sm font-medium">
            Timer Mode
          </Label>
          <Select value={timerMode} onValueChange={setTimerMode}>
            <SelectTrigger id="timer-mode" className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMER_MODE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleCreate}
            disabled={
              !playerName.trim() ||
              isLoading ||
              !isCustomTargetScoreValid
            }
            className="flex-1"
          >
            {isLoading ? "Creating..." : "Create Lobby"}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

export function GameSetupDialog({
  open,
  onOpenChange,
  defaultPlayerName = "",
  onCreateLobby,
  isLoading = false,
}: GameSetupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Set Up Your Game</DialogTitle>
          <DialogDescription>
            Configure your settings before creating a lobby.
          </DialogDescription>
        </DialogHeader>
        <GameSetupForm
          defaultPlayerName={defaultPlayerName}
          onCreateLobby={onCreateLobby}
          onCancel={() => onOpenChange(false)}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
