"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface TutorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MultiplicationGameTutorial({ open, onOpenChange }: TutorialDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How to Play: Times of Primes</DialogTitle>
          <DialogDescription>Master the art of prime connections</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Objective */}
          <div>
            <h3 className="font-bold text-lg mb-2">Objective</h3>
            <p className="text-sm text-muted-foreground">
              Be the first player to claim spaces and connect primes to reach your target score (default: 37 points).
            </p>
          </div>

          {/* Game Setup */}
          <div>
            <h3 className="font-bold text-lg mb-2">Game Setup</h3>
            <ul className="text-sm space-y-2 text-muted-foreground list-disc list-inside">
              <li>Choose your target score (how many points to win)</li>
              <li>Optionally enable a bot opponent and select difficulty</li>
              <li>Configure dice skins and timer settings</li>
              <li>Click "Start Game" to begin</li>
            </ul>
          </div>

          {/* Turn Structure */}
          <div>
            <h3 className="font-bold text-lg mb-2">Each Turn</h3>
            <ol className="text-sm space-y-3 text-muted-foreground list-decimal list-inside">
              <li>
                <span className="font-semibold">Roll Dice:</span> Click the roll button to get your dice. Each player gets fresh dice each turn.
              </li>
              <li>
                <span className="font-semibold">Select Dice:</span> Click dice in the tray to select them. Your selection must match exactly with the factors of a space on the board.
              </li>
              <li>
                <span className="font-semibold">Claim a Space:</span> Click a valid space (highlighted) that matches your selected dice product. You'll claim that space for 1 point.
              </li>
              <li>
                <span className="font-semibold">Bonus Check:</span> If your space connects two primes horizontally, vertically, or diagonally, you get bonus points!
              </li>
            </ol>
          </div>

          {/* Bonuses */}
          <div>
            <h3 className="font-bold text-lg mb-2">Bonus Points</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Connect two primes with claimed spaces to earn extra points:
            </p>
            <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
              <li><span className="font-semibold">Horizontal/Vertical:</span> Same number of spaces between primes</li>
              <li><span className="font-semibold">Diagonal:</span> Spaces along a diagonal line (visualized with animated tracks)</li>
              <li>Bonus value = number of spaces between the primes</li>
            </ul>
          </div>

          {/* Wild Dice */}
          <div>
            <h3 className="font-bold text-lg mb-2">Wild Dice (Any Prime)</h3>
            <p className="text-sm text-muted-foreground">
              Wild dice can substitute for any factor. Use them strategically to match spaces you couldn't otherwise claim.
            </p>
          </div>

          {/* Winning */}
          <div>
            <h3 className="font-bold text-lg mb-2">Winning</h3>
            <p className="text-sm text-muted-foreground">
              First player to reach the target score (base points + bonuses) wins the game. Higher score accumulates faster!
            </p>
          </div>

          <Button onClick={() => onOpenChange(false)} className="w-full">
            Got it! Let's Play
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
