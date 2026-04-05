import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gamepad2, Users, Bot } from "lucide-react";

type ModeOption = "bot" | "local" | "create" | "join";

interface MultiplayerModeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onModeSelect: (mode: ModeOption) => void;
  gameName: string;
}

export function MultiplayerModeDialog({ open, onOpenChange, onModeSelect, gameName }: MultiplayerModeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>How do you want to play?</DialogTitle>
          <DialogDescription>
            Choose your mode for {gameName}. You'll configure details after picking a mode.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => {
              onModeSelect("bot");
              onOpenChange(false);
            }}
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
            onClick={() => {
              onModeSelect("local");
              onOpenChange(false);
            }}
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

          <button
            type="button"
            onClick={() => {
              onModeSelect("create");
              onOpenChange(false);
            }}
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
        </div>

        <p className="text-xs text-muted-foreground text-center pt-2">
          You can switch modes anytime from the setup dialog.
        </p>
      </DialogContent>
    </Dialog>
  );
}
