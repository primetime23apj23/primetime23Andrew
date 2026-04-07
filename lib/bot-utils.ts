import type { BoardSpace } from "./game-utils";
import type { GotBoardSpace, DiceSize } from "./give-or-take-utils";
import { getReachableSpaces, isPrime } from "./give-or-take-utils";

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

// ============================================
// GIVE OR TAKE GAME BOT
// ============================================

interface GiveOrTakeBotMove {
  diceSize: DiceSize;
  targetSpace: number;
}

/**
 * Bot picks dice size for Give or Take.
 * Returns the dice size to use.
 */
export function getBotDiceSizeForGiveOrTake(
  board: GotBoardSpace[],
  playerPositions: number[],
  isFirstMove: boolean,
  difficulty: BotDifficulty
): DiceSize {
  // Analyze which dice size gives best prime opportunities
  const sizes: DiceSize[] = [9, 19, 99];
  
  if (difficulty === "easy") {
    // Random choice
    return sizes[Math.floor(Math.random() * sizes.length)];
  }
  
  // For medium/hard, evaluate which gives more prime landing options
  let bestSize: DiceSize = 9;
  let bestPrimeCount = -1;
  
  for (const size of sizes) {
    let primeCount = 0;
    
    if (isFirstMove || playerPositions.length === 0) {
      // Count primes directly reachable
      for (let v = 1; v <= size; v++) {
        if (v <= 99 && board[v]?.owner === null && isPrime(v)) {
          primeCount++;
        }
      }
    } else {
      // Count unique primes reachable by add/subtract from any owned space
      const reachablePrimes = new Set<number>();

      for (const position of playerPositions) {
        for (let v = 1; v <= size; v++) {
          const add = position + v;
          const sub = position - v;

          if (add <= 99 && board[add]?.owner === null && isPrime(add)) {
            reachablePrimes.add(add);
          }
          if (sub >= 1 && board[sub]?.owner === null && isPrime(sub)) {
            reachablePrimes.add(sub);
          }
        }
      }

      primeCount = reachablePrimes.size;
    }
    
    if (primeCount > bestPrimeCount) {
      bestPrimeCount = primeCount;
      bestSize = size;
    }
  }
  
  if (difficulty === "medium") {
    // 70% chance to pick best, 30% random
    if (Math.random() < 0.3) {
      return sizes[Math.floor(Math.random() * sizes.length)];
    }
  }
  
  return bestSize;
}

/**
 * Bot picks which space to land on after rolling.
 */
export function getBotPlacementForGiveOrTake(
  board: GotBoardSpace[],
  dieValue: number,
  playerPositions: number[],
  isFirstMove: boolean,
  difficulty: BotDifficulty
): number | null {
  const reachable = getReachableSpaces(board, dieValue, playerPositions, isFirstMove);
  
  const allTargets: number[] = [
    ...reachable.addTargets,
    ...reachable.subtractTargets,
    ...(reachable.directTarget !== null ? [reachable.directTarget] : []),
  ];
  
  if (allTargets.length === 0) return null;
  
  // Score each option
  const scored = allTargets.map((target) => {
    let score = 0;
    
    // Prime = big bonus
    if (isPrime(target)) {
      score += 100;
    }
    
    // Prefer positions with more future prime opportunities
    const futureOpportunities = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((v) => {
      const add = target + v;
      const sub = target - v;
      return (
        (add <= 99 && board[add]?.owner === null && isPrime(add)) ||
        (sub >= 1 && board[sub]?.owner === null && isPrime(sub))
      );
    }).length;
    
    score += futureOpportunities * 5;
    
    return { target, score };
  });
  
  scored.sort((a, b) => b.score - a.score);
  
  let pick: typeof scored[0];
  
  if (difficulty === "easy") {
    // Random choice
    pick = scored[Math.floor(Math.random() * scored.length)];
  } else if (difficulty === "medium") {
    // 60% best, 40% random
    if (Math.random() < 0.4) {
      pick = scored[Math.floor(Math.random() * scored.length)];
    } else {
      pick = scored[0];
    }
  } else {
    // Hard: always best
    pick = scored[0];
  }
  
  return pick.target;
}
