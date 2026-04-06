"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RulesDialog({ open, onOpenChange }: RulesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">How to Play Prime Factor</DialogTitle>
          <DialogDescription>
            Learn the rules, scoring, and turn flow for the Prime Factorization game.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 text-sm">
            <section>
              <h3 className="font-bold text-base mb-2">Objective</h3>
              <p className="text-muted-foreground">
                Be the first player to reach 49 points by occupying spaces on the board. 
                Points are earned by claiming spaces and bonus points for filling all 
                spaces between two prime numbers.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-base mb-2">The Board</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>100 spaces numbered 0-99 arranged in a 10×10 grid</li>
                <li>
                  <span className="text-amber-600 font-medium">Prime number spaces</span> (2, 3, 5, 7, 11...) 
                  are highlighted and cannot be occupied
                </li>
                <li>Each non-prime space shows its prime factorization (e.g., 12 = 2 × 2 × 3)</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-base mb-2">The Dice</h3>
              <p className="text-muted-foreground mb-2">
                Each player rolls 12 special dice with prime numbers on their faces:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>1 die with large primes (29, 31, 37, 41, 43, 47)</li>
                <li>2 dice with medium primes (11, 13, 17, 19, 23) and a wild card</li>
                <li>7 dice weighted toward small primes (2, 3, 5, 7)</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                <span className="text-amber-600 font-medium">Wild cards (W)</span> can represent any prime number!
              </p>
            </section>

            <section>
              <h3 className="font-bold text-base mb-2">How to Play</h3>
              <ol className="list-decimal list-inside text-muted-foreground space-y-2">
                <li>
                  <span className="font-medium text-foreground">Roll:</span> Click "Roll Dice" 
                  to roll all 12 dice
                </li>
                <li>
                  <span className="font-medium text-foreground">Select:</span> Click on dice 
                  that match the prime factorization of a space you want to claim
                </li>
                <li>
                  <span className="font-medium text-foreground">Claim:</span> Click on the 
                  board space to occupy it with your chip
                </li>
                <li>
                  <span className="font-medium text-foreground">Continue:</span> Keep claiming 
                  spaces with your remaining dice, or end your turn
                </li>
              </ol>
            </section>

            <section>
              <h3 className="font-bold text-base mb-2">Scoring</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li><span className="font-medium">+1 point</span> for each space you claim</li>
                <li>
                  <span className="font-medium">Connection bonus:</span> When ALL spaces 
                  between two consecutive prime numbers are occupied (by any player) in a 
                  row, column, or diagonal, the player who completes the connection earns 
                  +1 bonus point for EACH space in that connection
                </li>
              </ul>
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="font-medium text-foreground mb-2">Scoring Example:</p>
                <p className="text-muted-foreground">
                  If you claim space 14 (between primes 13 and 17), and you already own 15 and 16:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-2">
                  <li>+1 point for claiming space 14</li>
                  <li>+3 bonus points for completing the connection (14, 15, 16)</li>
                  <li><span className="font-bold text-foreground">Total: 4 points</span> for that move!</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="font-bold text-base mb-2">Claiming Example</h3>
              <p className="text-muted-foreground">
                To claim space <span className="font-bold">12</span>, you need dice showing 
                <span className="font-mono bg-muted px-1 rounded">2 x 2 x 3</span>. 
                Select three dice (two 2s and one 3), then click on space 12!
              </p>
            </section>

            <section>
              <h3 className="font-bold text-base mb-2">Tips</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Look for spaces between prime numbers to maximize bonus points</li>
                <li>Block your opponent from completing sequences</li>
                <li>Save wild cards for difficult-to-match spaces</li>
                <li>Numbers with small factors (lots of 2s and 3s) are easier to claim</li>
              </ul>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
