// Prime numbers between 1-99
export const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];

export function isPrime(n: number): boolean {
  return PRIMES.includes(n);
}

// Get prime factorization of a number
export function getPrimeFactorization(n: number): number[] {
  if (n <= 1 || isPrime(n)) return [];
  
  const factors: number[] = [];
  let remaining = n;
  
  for (const prime of PRIMES) {
    while (remaining % prime === 0) {
      factors.push(prime);
      remaining = remaining / prime;
    }
    if (remaining === 1) break;
  }
  
  return factors;
}

// Get exponential representation
export function getExponentialRepresentation(n: number): string {
  const factors = getPrimeFactorization(n);
  if (factors.length === 0) return '';
  
  const counts: Record<number, number> = {};
  factors.forEach(f => {
    counts[f] = (counts[f] || 0) + 1;
  });
  
  // Only show exponential if at least one prime appears more than once
  const hasExponent = Object.values(counts).some(c => c > 1);
  if (!hasExponent) return '';
  
  return Object.entries(counts)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([prime, count]) => count > 1 ? `${prime}^${count}` : prime)
    .join(' · ');
}

// Format prime factorization for display
export function formatFactorization(n: number): string {
  const factors = getPrimeFactorization(n);
  if (factors.length === 0) return '';
  return factors.join(' × ');
}

// Dice configuration from patent - 12 dice total
export const DICE_CONFIG = [
  // 3 dice of 2 2 3 3 5 7
  { faces: [2, 2, 3, 3, 5, 7], count: 3 },
  // 2 dice of 2 2 2 2 3 5
  { faces: [2, 2, 2, 2, 3, 5], count: 2 },
  // 2 dice of 2 2 2 2 3 7
  { faces: [2, 2, 2, 2, 3, 7], count: 2 },
  // 2 dice of 2 2 2 3 3 5
  { faces: [2, 2, 2, 3, 3, 5], count: 2 },
  // 2 dice of 11 13 17 19 23 blank (blank = 'W' for wild/blank)
  { faces: [11, 13, 17, 19, 23, 'W'], count: 2 },
  // 1 die of 29 31 37 41 43 47
  { faces: [29, 31, 37, 41, 43, 47], count: 1 },
];

export type DieValue = number | 'W';

export interface Die {
  id: string;
  value: DieValue;
  used: boolean;
  faces: DieValue[];
}

// Roll all 12 dice
export function rollDice(): Die[] {
  const dice: Die[] = [];
  let id = 0;
  
  DICE_CONFIG.forEach((config, configIndex) => {
    for (let i = 0; i < config.count; i++) {
      const faceIndex = Math.floor(Math.random() * 6);
      dice.push({
        id: `${configIndex}-${i}-${id++}`,
        value: config.faces[faceIndex],
        used: false,
        faces: config.faces,
      });
    }
  });
  
  return dice;
}

// Check if dice can match a factorization
export function canMatchFactorization(
  factors: number[],
  availableDice: Die[],
  wildValue?: number
): Die[] | null {
  if (factors.length === 0) return null;
  
  const unusedDice = availableDice.filter(d => !d.used);
  const factorsCopy = [...factors];
  const matchedDice: Die[] = [];
  
  // Try to match each factor with a die
  for (const factor of factorsCopy) {
    // First try exact match
    const exactMatch = unusedDice.find(
      d => !matchedDice.includes(d) && d.value === factor
    );
    
    if (exactMatch) {
      matchedDice.push(exactMatch);
      continue;
    }
    
    // Try wild card
    const wildMatch = unusedDice.find(
      d => !matchedDice.includes(d) && d.value === 'W'
    );
    
    if (wildMatch) {
      matchedDice.push(wildMatch);
      continue;
    }
    
    // Can't match this factor
    return null;
  }
  
  return matchedDice;
}

export interface BoardSpace {
  number: number;
  isPrime: boolean;
  factorization: string;
  exponential: string;
  factors: number[];
  owner: number | null; // player index or null
  claimed?: boolean; // true when space is removed from board
}

// Generate the game board
export function generateBoard(): BoardSpace[] {
  const board: BoardSpace[] = [];
  
  // Logo space (position 0)
  board.push({
    number: 0,
    isPrime: false,
    factorization: '',
    exponential: '',
    factors: [],
    owner: null,
  });
  
  // Spaces 1-99
  for (let i = 1; i <= 99; i++) {
    board.push({
      number: i,
      isPrime: isPrime(i),
      factorization: formatFactorization(i),
      exponential: getExponentialRepresentation(i),
      factors: getPrimeFactorization(i),
      owner: null,
    });
  }
  
  return board;
}

export interface BonusBreakdown {
  direction: "horizontal" | "vertical" | "diagonal-down" | "diagonal-up";
  primeStart: number;
  primeEnd: number;
  spaces: number[];
  points: number;
}

// Check for NEW bonus points when a space is claimed
// Returns bonus if the claimed space completes a connection between primes
// The bonus goes to whoever completes the connection, regardless of who owns other spaces
function countPrimesInRange(board: BoardSpace[], start: number, end: number, step: number = 1): number {
  let count = 0;
  const minNum = Math.min(start, end);
  const maxNum = Math.max(start, end);
  for (let i = minNum; i <= maxNum; i += step) {
    const space = board[i];
    if (space && space.isPrime) {
      count++;
    }
  }
  return count;
}

function countPrimesInColumn(board: BoardSpace[], indices: number[], start: number, end: number): number {
  let count = 0;
  const startIdx = indices.indexOf(start);
  const endIdx = indices.indexOf(end);
  const minIdx = Math.min(startIdx, endIdx);
  const maxIdx = Math.max(startIdx, endIdx);
  for (let i = minIdx; i <= maxIdx; i++) {
    const space = board[indices[i]];
    if (space && space.isPrime) {
      count++;
    }
  }
  return count;
}

export function checkForNewBonus(
  board: BoardSpace[],
  claimedSpaceNumber: number
): { bonusPoints: number; bonusSpaces: number[]; breakdown: BonusBreakdown[] } {
  let bonusPoints = 0;
  const bonusSpaces: number[] = [];
  const breakdown: BonusBreakdown[] = [];
  
  console.log(`[v0] ========== checkForNewBonus for space ${claimedSpaceNumber} ==========`);
  
  const claimedSpace = board[claimedSpaceNumber];
  if (!claimedSpace || claimedSpace.isPrime) {
    console.log(`[v0] Space is prime or invalid, no bonus possible`);
    return { bonusPoints: 0, bonusSpaces: [], breakdown: [] };
  }
  
  // Get row and column of claimed space
  const row = Math.floor(claimedSpaceNumber / 10);
  const col = claimedSpaceNumber % 10;
  
  // Check horizontal connection
  const horizontalBonus = checkLineConnection(board, row * 10, row * 10 + 9, 1, claimedSpaceNumber, "horizontal");
  if (horizontalBonus.completed) {
    // Count primes in the segment (including boundaries)
    const primeCount = countPrimesInRange(board, horizontalBonus.primeStart, horizontalBonus.primeEnd);
    bonusPoints += primeCount;
    bonusSpaces.push(...horizontalBonus.spaces);
    breakdown.push({
      direction: "horizontal",
      primeStart: horizontalBonus.primeStart,
      primeEnd: horizontalBonus.primeEnd,
      spaces: horizontalBonus.spaces,
      points: primeCount,
    });
  }
  
  // Check vertical connection
  const verticalIndices: number[] = [];
  for (let r = 0; r < 10; r++) {
    verticalIndices.push(r * 10 + col);
  }
  const verticalBonus = checkColumnConnection(board, verticalIndices, claimedSpaceNumber, "vertical");
  console.log(`[v0] verticalBonus result:`, verticalBonus);
  if (verticalBonus.completed) {
    const primeCount = countPrimesInColumn(board, verticalIndices, verticalBonus.primeStart, verticalBonus.primeEnd);
    console.log(`[v0] Vertical bonus completed! spaces:`, verticalBonus.spaces, `primeCount:`, primeCount);
    bonusPoints += primeCount;
    bonusSpaces.push(...verticalBonus.spaces);
    breakdown.push({
      direction: "vertical",
      primeStart: verticalBonus.primeStart,
      primeEnd: verticalBonus.primeEnd,
      spaces: verticalBonus.spaces,
      points: primeCount,
    });
  }
  
  // Check diagonal connections (top-left to bottom-right)
  const diag1Indices: number[] = [];
  let startRow1 = row - Math.min(row, col);
  let startCol1 = col - Math.min(row, col);
  while (startRow1 < 10 && startCol1 < 10) {
    diag1Indices.push(startRow1 * 10 + startCol1);
    startRow1++;
    startCol1++;
  }
  if (diag1Indices.length > 1) {
    const diag1Bonus = checkColumnConnection(board, diag1Indices, claimedSpaceNumber, "diagonal-down");
    if (diag1Bonus.completed) {
      const primeCount = countPrimesInColumn(board, diag1Indices, diag1Bonus.primeStart, diag1Bonus.primeEnd);
      bonusPoints += primeCount;
      bonusSpaces.push(...diag1Bonus.spaces);
      breakdown.push({
        direction: "diagonal-down",
        primeStart: diag1Bonus.primeStart,
        primeEnd: diag1Bonus.primeEnd,
        spaces: diag1Bonus.spaces,
        points: primeCount,
      });
    }
  }
  
  // Check diagonal connections (top-right to bottom-left)
  const diag2Indices: number[] = [];
  let startRow2 = row - Math.min(row, 9 - col);
  let startCol2 = col + Math.min(row, 9 - col);
  while (startRow2 < 10 && startCol2 >= 0) {
    diag2Indices.push(startRow2 * 10 + startCol2);
    startRow2++;
    startCol2--;
  }
  if (diag2Indices.length > 1) {
    const diag2Bonus = checkColumnConnection(board, diag2Indices, claimedSpaceNumber, "diagonal-up");
    if (diag2Bonus.completed) {
      const primeCount = countPrimesInColumn(board, diag2Indices, diag2Bonus.primeStart, diag2Bonus.primeEnd);
      bonusPoints += primeCount;
      bonusSpaces.push(...diag2Bonus.spaces);
      breakdown.push({
        direction: "diagonal-up",
        primeStart: diag2Bonus.primeStart,
        primeEnd: diag2Bonus.primeEnd,
        spaces: diag2Bonus.spaces,
        points: primeCount,
      });
    }
  }
  
  return { bonusPoints, bonusSpaces, breakdown };
}

function checkLineConnection(
  board: BoardSpace[],
  start: number,
  end: number,
  step: number,
  claimedSpaceNumber: number,
  direction: string
): { completed: boolean; spaces: number[]; primeStart: number; primeEnd: number } {
  // Find the immediate segment containing the claimed space
  let immediateStart = -1;
  let immediateEnd = -1;
  const spacesInSegment: number[] = [];
  
  let currentSegmentStart = -1;
  const currentSpaces: number[] = [];
  
  console.log(`[v0] checkLineConnection ${direction}: start=${start}, end=${end}, claimed=${claimedSpaceNumber}`);
  
  for (let i = start; i <= end; i += step) {
    const space = board[i];
    if (!space) continue;
    
    if (space.isPrime) {
      // Check if the just-ended segment contains our claimed space
      if (currentSegmentStart !== -1 && currentSpaces.includes(claimedSpaceNumber)) {
        immediateStart = currentSegmentStart;
        immediateEnd = i;
        spacesInSegment.push(...currentSpaces);
        console.log(`[v0] Found immediate segment: primes ${currentSegmentStart}-${i}, spaces: [${currentSpaces.join(',')}]`);
      }
      currentSegmentStart = i;
      currentSpaces.length = 0;
    } else if (currentSegmentStart !== -1) {
      currentSpaces.push(space.number);
    }
  }
  
  // If no segment found containing our space, no bonus
  if (spacesInSegment.length === 0) {
    console.log(`[v0] ${direction}: No segment found containing claimed space`);
    return { completed: false, spaces: [], primeStart: -1, primeEnd: -1 };
  }
  
  // Check if ALL spaces in this immediate segment are now occupied (by anyone)
  const occupancyStatus = spacesInSegment.map(num => {
    const space = board[num];
    return { num, owner: space?.owner, occupied: space?.owner !== null };
  });
  console.log(`[v0] ${direction}: Checking occupancy:`, occupancyStatus);
  
  const allOccupied = occupancyStatus.every(s => s.occupied);
  console.log(`[v0] ${direction}: All occupied? ${allOccupied}`);
  
  if (!allOccupied) {
    return { completed: false, spaces: [], primeStart: -1, primeEnd: -1 };
  }
  
  // Extend the chain symmetrically from both sides
  let extendedStart = immediateStart;
  let extendedEnd = immediateEnd;
  let extendSteps = 0;
  
  // Extend one step at a time on BOTH sides simultaneously
  for (let step_count = 1; ; step_count++) {
    let leftPos = immediateStart - (step_count * step);
    let rightPos = immediateEnd + (step_count * step);
    
    const leftSpace = leftPos >= start ? board[leftPos] : null;
    const rightSpace = rightPos <= end ? board[rightPos] : null;
    
    // Both sides must be able to extend (must find a prime with clear path)
    const leftCanExtend = leftSpace && leftSpace.isPrime;
    const rightCanExtend = rightSpace && rightSpace.isPrime;
    
    if (!leftCanExtend || !rightCanExtend) {
      // One or both sides can't extend, stop here
      break;
    }
    
    // Check that there's no unclaimed composite blocking the path
    let leftBlocked = false;
    let rightBlocked = false;
    
    for (let i = immediateStart - ((step_count - 1) * step); i > leftPos; i -= step) {
      const space = board[i];
      if (space && !space.isPrime && space.owner === null) {
        leftBlocked = true;
        break;
      }
    }
    
    for (let i = immediateEnd + ((step_count - 1) * step); i < rightPos; i += step) {
      const space = board[i];
      if (space && !space.isPrime && space.owner === null) {
        rightBlocked = true;
        break;
      }
    }
    
    if (leftBlocked || rightBlocked) {
      // Path is blocked on one or both sides, stop extending
      break;
    }
    
    // Both sides extended successfully, update the boundaries
    extendedStart = leftPos;
    extendedEnd = rightPos;
    extendSteps = step_count;
  }
  
  console.log(`[v0] ${direction}: Extended chain from ${immediateStart}-${immediateEnd} to ${extendedStart}-${extendedEnd} (${extendSteps} steps)`);
  
  return { completed: true, spaces: spacesInSegment, primeStart: extendedStart, primeEnd: extendedEnd };
}

function checkColumnConnection(
  board: BoardSpace[],
  indices: number[],
  claimedSpaceNumber: number,
  direction: string
): { completed: boolean; spaces: number[]; primeStart: number; primeEnd: number } {
  let immediateStartIdx = -1;
  let immediateEndIdx = -1;
  const spacesInSegment: number[] = [];
  
  let currentSegmentStart = -1;
  const currentSpaces: number[] = [];
  
  const primesList = indices.filter(i => board[i]?.isPrime).join(',');
  console.log(`[v0] checkColumnConnection ${direction}: indices=[${indices.join(',')}], primes=[${primesList}], claimed=${claimedSpaceNumber}`);
  
  for (let idx = 0; idx < indices.length; idx++) {
    const i = indices[idx];
    const space = board[i];
    if (!space) continue;
    
    if (space.isPrime) {
      if (currentSegmentStart !== -1 && currentSpaces.includes(claimedSpaceNumber)) {
        immediateStartIdx = indices.indexOf(currentSegmentStart);
        immediateEndIdx = idx;
        spacesInSegment.push(...currentSpaces);
        console.log(`[v0] ${direction}: Found immediate segment primes ${currentSegmentStart}-${i}, spaces: [${currentSpaces.join(',')}]`);
      } else if (currentSegmentStart !== -1) {
        console.log(`[v0] ${direction}: Segment ${currentSegmentStart}-${i} does NOT contain claimed space ${claimedSpaceNumber} (spaces: [${currentSpaces.join(',')}])`);
      }
      currentSegmentStart = i;
      currentSpaces.length = 0;
    } else if (currentSegmentStart !== -1) {
      currentSpaces.push(space.number);
    } else {
      console.log(`[v0] ${direction}: Skipping space ${space.number} (before first prime on this line)`);
    }
  }
  
  if (spacesInSegment.length === 0) {
    console.log(`[v0] ${direction}: No segment found containing claimed space`);
    return { completed: false, spaces: [], primeStart: -1, primeEnd: -1 };
  }
  
  // Check if ALL spaces in this immediate segment are now occupied (by anyone)
  const occupancyStatus = spacesInSegment.map(num => {
    const space = board[num];
    return { num, owner: space?.owner, occupied: space?.owner !== null };
  });
  console.log(`[v0] ${direction}: Checking occupancy:`, occupancyStatus);
  
  const allOccupied = occupancyStatus.every(s => s.occupied);
  console.log(`[v0] ${direction}: All occupied? ${allOccupied}`);
  
  if (!allOccupied) {
    return { completed: false, spaces: [], primeStart: -1, primeEnd: -1 };
  }
  
  // Extend the chain symmetrically from both sides
  let extendedStartIdx = immediateStartIdx;
  let extendedEndIdx = immediateEndIdx;
  let extendSteps = 0;
  
  // Extend one step at a time on BOTH sides simultaneously
  for (let step_count = 1; ; step_count++) {
    let upIdx = immediateStartIdx - step_count;
    let downIdx = immediateEndIdx + step_count;
    
    const upSpace = upIdx >= 0 ? board[indices[upIdx]] : null;
    const downSpace = downIdx < indices.length ? board[indices[downIdx]] : null;
    
    // Both sides must be able to extend (must find a prime with clear path)
    const upCanExtend = upSpace && upSpace.isPrime;
    const downCanExtend = downSpace && downSpace.isPrime;
    
    if (!upCanExtend || !downCanExtend) {
      // One or both sides can't extend, stop here
      break;
    }
    
    // Check that there's no unclaimed composite blocking the path
    let upBlocked = false;
    let downBlocked = false;
    
    for (let idx = immediateStartIdx - (step_count - 1); idx > upIdx; idx--) {
      const space = board[indices[idx]];
      if (space && !space.isPrime && space.owner === null) {
        upBlocked = true;
        break;
      }
    }
    
    for (let idx = immediateEndIdx + (step_count - 1); idx < downIdx; idx++) {
      const space = board[indices[idx]];
      if (space && !space.isPrime && space.owner === null) {
        downBlocked = true;
        break;
      }
    }
    
    if (upBlocked || downBlocked) {
      // Path is blocked on one or both sides, stop extending
      break;
    }
    
    // Both sides extended successfully, update the boundaries
    extendedStartIdx = upIdx;
    extendedEndIdx = downIdx;
    extendSteps = step_count;
  }
  
  console.log(`[v0] ${direction}: Extended chain from indices ${immediateStartIdx}-${immediateEndIdx} to ${extendedStartIdx}-${extendedEndIdx} (${extendSteps} steps)`);
  console.log(`[v0] ${direction}: Extended chain from primes ${indices[immediateStartIdx]}-${indices[immediateEndIdx]} to ${indices[extendedStartIdx]}-${indices[extendedEndIdx]}`);
  
  return { completed: true, spaces: spacesInSegment, primeStart: indices[extendedStartIdx], primeEnd: indices[extendedEndIdx] };
}

// Legacy function for calculating total bonus (used for display)
export function calculateBonusPoints(
  board: BoardSpace[],
  playerIndex: number
): { bonusPoints: number; bonusRanges: number[][] } {
  // This is now just used for display purposes
  // Actual bonus awarding happens in checkForNewBonus when spaces are claimed
  return { bonusPoints: 0, bonusRanges: [] };
}

export interface Player {
  name: string;
  color: string;
  score: number;
  bonusPoints: number;
}

export interface GameState {
  board: BoardSpace[];
  players: Player[];
  currentPlayer: number;
  dice: Die[];
  phase: 'setup' | 'rolling' | 'playing' | 'roundEnd' | 'gameOver';
  roundNumber: number;
  selectedDice: string[];
  message: string;
  targetScore: number;
  player1Ready?: boolean;
  player2Ready?: boolean;
}

export const PLAYER_COLORS = ['#F5D5D5', '#D5EBE8', '#F9F0D9', '#E1EDF5'];
