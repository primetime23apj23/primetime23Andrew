import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Gamepad2, Users, Bot, History, ChevronRight } from "lucide-react";
import { useState } from "react";

export type ModeOption = "bot" | "local" | "create" | "join" | "active";
export type GameType = "multiplication" | "give-or-take" | null;

interface MultiplayerModeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onModeSelect: (mode: ModeOption, gameType: GameType) => void;
  gameName: string;
  hasActiveGames?: boolean;
  onViewActiveGames?: () => void;
}

interface MultiplayerModeSelectorProps {
  onModeSelect: (mode: ModeOption, gameType: GameType) => void;
  gameName: string;
  hasActiveGames?: boolean;
  onViewActiveGames?: () => void;
}

export function MultiplayerModeSelector({
  onModeSelect,
  gameName,
  hasActiveGames = false,
  onViewActiveGames,
}: MultiplayerModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<ModeOption | null>(null);
  const [showGameTypeSelection, setShowGameTypeSelection] = useState(false);

  const handleModeClick = (mode: ModeOption) => {
    setSelectedMode(mode);
    setShowGameTypeSelection(true);
  };

  const handleGameTypeSelect = (gameType: GameType) => {
    if (selectedMode && gameType) {
      onModeSelect(selectedMode, gameType);
      setShowGameTypeSelection(false);
      setSelectedMode(null);
    }
  };

  const handleBackToModes = () => {
    setShowGameTypeSelection(false);
    setSelectedMode(null);
  };

  if (showGameTypeSelection) {
    return (
      <>
        <div className="space-y-3">
          <button
            onClick={handleBackToModes}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4"
          >
            ← Back
          </button>
          <h2 className="text-2xl font-semibold tracking-tight">Which game?</h2>
          <p className="text-sm text-muted-foreground">
            Choose which game you'd like to play.
          </p>
        </div>

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => handleGameTypeSelect("multiplication")}
            className="flex items-center gap-3 p-4 rounded-lg border-2 border-border hover:border-primary/60 hover:bg-primary/5 transition"
          >
            <div className="flex-1 text-left">
              <div className="font-semibold">Multiplication Game</div>
              <div className="text-sm text-muted-foreground">Multiply numbers together to reach the target.</div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          <button
            type="button"
            onClick={() => handleGameTypeSelect("give-or-take")}
            className="flex items-center gap-3 p-4 rounded-lg border-2 border-border hover:border-primary/60 hover:bg-primary/5 transition"
          >
            <div className="flex-1 text-left">
              <div className="font-semibold">Give or Take Game</div>
              <div className="text-sm text-muted-foreground">Add or subtract numbers to reach the target.</div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight">How do you want to play?</h2>
        <p className="text-sm text-muted-foreground">
          Choose your mode for Prime Factorization Games. You&apos;ll select a game type after picking a mode.
        </p>
      </div>

      <div className="grid gap-3">
        <button
          type="button"
          onClick={() => handleModeClick("create")}
          className="flex items-center gap-3 p-4 rounded-lg border-2 border-border hover:border-primary/60 hover:bg-primary/5 transition"
        >
          <div className="p-2 rounded-full bg-muted text-foreground">
            <Users className="h-5 w-5" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold">Find Multiplayer Match</div>
            <div className="text-sm text-muted-foreground">Browse open lobbies or create a new game.</div>
          </div>
        </button>

        {hasActiveGames && (
          <button
            type="button"
            onClick={() => onViewActiveGames?.()}
            className="flex items-center gap-3 p-4 rounded-lg border-2 border-border hover:border-primary/60 hover:bg-primary/5 transition bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
          >
            <div className="p-2 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <History className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold">Resume Game</div>
              <div className="text-sm text-muted-foreground">Continue one of your active games from any device.</div>
            </div>
          </button>
        )}

        <button
          type="button"
          onClick={() => handleModeClick("bot")}
          className="flex items-center gap-3 p-4 rounded-lg border-2 border-border hover:border-primary/60 hover:bg-primary/5 transition"
        >
          <div className="p-2 rounded-full bg-primary/10 text-primary">
            <Bot className="h-5 w-5" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold">Play vs Bot</div>
            <div className="text-sm text-muted-foreground">Opens setup to pick target score and bot difficulty.</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleModeClick("local")}
          className="flex items-center gap-3 p-4 rounded-lg border-2 border-border hover:border-primary/60 hover:bg-primary/5 transition"
        >
          <div className="p-2 rounded-full bg-secondary/20 text-secondary-foreground">
            <Gamepad2 className="h-5 w-5" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold">Local Pass & Play</div>
            <div className="text-sm text-muted-foreground">Two players on one device without bots.</div>
          </div>
        </button>
      </div>

      <p className="text-xs text-muted-foreground text-center pt-2">
        You can switch modes anytime from setup.
      </p>
    </>
  );
}

export function MultiplayerModeDialog({ 
  open, 
  onOpenChange, 
  onModeSelect, 
  gameName,
  hasActiveGames = false,
  onViewActiveGames
}: MultiplayerModeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>How do you want to play?</DialogTitle>
          <DialogDescription>
            Choose your mode for Prime Factorization Games. You&apos;ll select a game type after picking a mode.
          </DialogDescription>
        </DialogHeader>
        <MultiplayerModeSelector
          onModeSelect={(mode, gameType) => {
            onModeSelect(mode, gameType);
            onOpenChange(false);
          }}
          gameName={gameName}
          hasActiveGames={hasActiveGames}
          onViewActiveGames={() => {
            onViewActiveGames?.();
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
