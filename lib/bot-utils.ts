import type { BoardSpace } from "./game-utils";

export type BotDifficulty = "easy" | "medium" | "hard";

// ============================================
// MULTIPLICATION GAME BOT
// ============================================

interface DieState {
  id: string;
  value: number | "W";
}

interface MultiplicationBotMove {
  spaceNumber: number;
  diceIds: string[];
}

/**
 * Bot picks a move for the multiplication game.
 * Returns the space number to claim and which dice IDs to use.
 */
export function getBotMoveForMultiplication(
  board: BoardSpace[],
  dice: DieState[],
  difficulty: BotDifficulty
): MultiplicationBotMove | null {
  // Find all claimable spaces (not prime, not owned, can match with dice)
  const claimableSpaces: { space: BoardSpace; diceIds: string[] }[] = [];

  for (const space of board) {
    if (space.isPrime || space.owner !== null) continue;
    
    // Try to match the space's factors with available dice
    const factors = [...space.factors];
    const usedIds: string[] = [];
    let canMatch = true;
    
    for (const factor of factors) {
      const exactMatch = dice.find(
        (d) => !usedIds.includes(d.id) && d.value === factor
      );
      if (exactMatch) {
        usedIds.push(exactMatch.id);
        continue;
      }
      const wildMatch = dice.find(
        (d) => !usedIds.includes(d.id) && d.value === "W"
      );
      if (wildMatch) {
        usedIds.push(wildMatch.id);
        continue;
      }
      // No match found for this factor
      canMatch = false;
      break;
    }
    
    if (canMatch && usedIds.length === factors.length) {
      claimableSpaces.push({ space, diceIds: usedIds });
    }
  }

  if (claimableSpaces.length === 0) return null;

  // Score each option based on difficulty
  const scored = claimableSpaces.map(({ space, diceIds }) => {
    let score = 0;
    
    // Prefer primes adjacent (potential bonus connections)
    const row = Math.floor(space.number / 10);
    const col = space.number % 10;
    
    // Check if this space could complete a connection
    const neighbors = [
      space.number - 1, space.number + 1, // horizontal
      space.number - 10, space.number + 10, // vertical
      space.number - 11, space.number + 11, space.number - 9, space.number + 9, // diagonal
    ].filter((n) => n >= 0 && n < 100);
    
    const primeNeighbors = neighbors.filter((n) => board[n]?.isPrime).length;
    score += primeNeighbors * 2;
    
    // Higher numbers are slightly more valuable (larger factorizations)
    score += space.number / 100;
    
    return { space, diceIds, score };
  });

  // Sort by score
  scored.sort((a, b) => b.score - a.score);

  // Pick based on difficulty
  let pick: typeof scored[0];
  
  if (difficulty === "easy") {
    // Random from bottom half
    const bottomHalf = scored.slice(Math.floor(scored.length / 2));
    pick = bottomHalf[Math.floor(Math.random() * bottomHalf.length)] || scored[scored.length - 1];
  } else if (difficulty === "medium") {
    // Random from all options with slight bias toward better
    const idx = Math.floor(Math.random() * scored.length * 0.6);
    pick = scored[idx] || scored[0];
  } else {
    // Hard: pick the best
    pick = scored[0];
  }

  return { spaceNumber: pick.space.number, diceIds: pick.diceIds };
}

