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
function isPathValid(
  board: BoardSpace[],
  startNum: number,
  endNum: number,
  indices: number[] | null = null
): boolean {
  // A valid path is simply a line between two spaces.
  // No intermediate validation needed - checkForNewBonus handles the claimed space checks.
  return true;
}

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
  
  
  const claimedSpace = board[claimedSpaceNumber];
  if (!claimedSpace || claimedSpace.isPrime) {
    return { bonusPoints: 0, bonusSpaces: [], breakdown: [] };
  }
  
  // Get row and column of claimed space
  const row = Math.floor(claimedSpaceNumber / 10);
  const col = claimedSpaceNumber % 10;
  
  // Check horizontal connection
  const horizontalBonus = checkLineConnection(board, row * 10, row * 10 + 9, 1, claimedSpaceNumber, "horizontal");
  if (horizontalBonus.completed && isPathValid(board, horizontalBonus.primeStart, horizontalBonus.primeEnd)) {
    // Award bonus points based on the number of composite spaces between primes
    const compositesCount = horizontalBonus.spaces.length - 1; // -1 for the claimed space itself
    const bonusPointsEarned = Math.max(1, Math.ceil(compositesCount / 2));
    bonusPoints += bonusPointsEarned;
    bonusSpaces.push(...horizontalBonus.spaces);
    breakdown.push({
      direction: "horizontal",
      primeStart: horizontalBonus.primeStart,
      primeEnd: horizontalBonus.primeEnd,
      spaces: horizontalBonus.spaces,
      points: bonusPointsEarned,
    });
  }
  
  // Check vertical connection
  const verticalIndices: number[] = [];
  for (let r = 0; r < 10; r++) {
    verticalIndices.push(r * 10 + col);
  }
  const verticalBonus = checkColumnConnection(board, verticalIndices, claimedSpaceNumber, "vertical");
  if (verticalBonus.completed && isPathValid(board, verticalBonus.primeStart, verticalBonus.primeEnd, verticalIndices)) {
    // Award bonus points based on the number of composite spaces between primes
    const compositesCount = verticalBonus.spaces.length - 1; // -1 for the claimed space itself
    const bonusPointsEarned = Math.max(1, Math.ceil(compositesCount / 2));
    bonusPoints += bonusPointsEarned;
    bonusSpaces.push(...verticalBonus.spaces);
    breakdown.push({
      direction: "vertical",
      primeStart: verticalBonus.primeStart,
      primeEnd: verticalBonus.primeEnd,
      spaces: verticalBonus.spaces,
      points: bonusPointsEarned,
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
    if (diag1Bonus.completed && isPathValid(board, diag1Bonus.primeStart, diag1Bonus.primeEnd, diag1Indices)) {
      // Award bonus points based on the number of composite spaces between primes
      const compositesCount = diag1Bonus.spaces.length - 1; // -1 for the claimed space itself
      const bonusPointsEarned = Math.max(1, Math.ceil(compositesCount / 2));
      bonusPoints += bonusPointsEarned;
      bonusSpaces.push(...diag1Bonus.spaces);
      breakdown.push({
        direction: "diagonal-down",
        primeStart: diag1Bonus.primeStart,
        primeEnd: diag1Bonus.primeEnd,
        spaces: diag1Bonus.spaces,
        points: bonusPointsEarned,
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
    if (diag2Bonus.completed && isPathValid(board, diag2Bonus.primeStart, diag2Bonus.primeEnd, diag2Indices)) {
      // Award bonus points based on the number of composite spaces between primes
      const compositesCount = diag2Bonus.spaces.length - 1; // -1 for the claimed space itself
      const bonusPointsEarned = Math.max(1, Math.ceil(compositesCount / 2));
      bonusPoints += bonusPointsEarned;
      bonusSpaces.push(...diag2Bonus.spaces);
      breakdown.push({
        direction: "diagonal-up",
        primeStart: diag2Bonus.primeStart,
        primeEnd: diag2Bonus.primeEnd,
        spaces: diag2Bonus.spaces,
        points: bonusPointsEarned,
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
  
  
  for (let i = start; i <= end; i += step) {
    const space = board[i];
    if (!space) continue;
    
    if (space.isPrime) {
      // Check if the just-ended segment contains our claimed space
      if (currentSegmentStart !== -1 && currentSpaces.includes(claimedSpaceNumber)) {
        immediateStart = currentSegmentStart;
        immediateEnd = i;
        spacesInSegment.push(...currentSpaces);
      }
      currentSegmentStart = i;
      currentSpaces.length = 0;
    } else if (currentSegmentStart !== -1) {
      currentSpaces.push(space.number);
    }
  }
  
  // If no segment found containing our space, no bonus
  if (spacesInSegment.length === 0) {
    return { completed: false, spaces: [], primeStart: -1, primeEnd: -1 };
  }
  
  // Check if ALL spaces in this immediate segment are now occupied (by anyone)
  const occupancyStatus = spacesInSegment.map(num => {
    const space = board[num];
    return { num, owner: space?.owner, occupied: space?.owner !== null };
  });
  
  const allOccupied = occupancyStatus.every(s => s.occupied);
  
  if (!allOccupied) {
    return { completed: false, spaces: [], primeStart: -1, primeEnd: -1 };
  }
  
  // Only connect to the immediately adjacent primes, don't extend further
  const primeStart = board[immediateStart].number;
  const primeEnd = board[immediateEnd].number;
  
  return { completed: true, spaces: spacesInSegment, primeStart, primeEnd };
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
  
  for (let idx = 0; idx < indices.length; idx++) {
    const i = indices[idx];
    const space = board[i];
    if (!space) continue;
    
    if (space.isPrime) {
      if (currentSegmentStart !== -1 && currentSpaces.includes(claimedSpaceNumber)) {
        immediateStartIdx = indices.indexOf(currentSegmentStart);
        immediateEndIdx = idx;
        spacesInSegment.push(...currentSpaces);
      } else if (currentSegmentStart !== -1) {
      }
      currentSegmentStart = i;
      currentSpaces.length = 0;
    } else if (currentSegmentStart !== -1) {
      currentSpaces.push(space.number);
    } else {
    }
  }
  
  if (spacesInSegment.length === 0) {
    return { completed: false, spaces: [], primeStart: -1, primeEnd: -1 };
  }
  
  // Check if ALL spaces in this immediate segment are now occupied (by anyone)
  const occupancyStatus = spacesInSegment.map(num => {
    const space = board[num];
    return { num, owner: space?.owner, occupied: space?.owner !== null };
  });
  
  const allOccupied = occupancyStatus.every(s => s.occupied);
  
  if (!allOccupied) {
    return { completed: false, spaces: [], primeStart: -1, primeEnd: -1 };
  }
  
  // Only connect to the immediately adjacent primes, don't extend further
  const primeStart = board[indices[immediateStartIdx]].number;
  const primeEnd = board[indices[immediateEndIdx]].number;
  
  return { completed: true, spaces: spacesInSegment, primeStart, primeEnd };
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
  playerExhausted?: boolean[]; // Track which players have no valid moves
  readyConfirmationActive?: boolean;
  readyConfirmationInitiator?: number | null;
  readyConfirmationCountdown?: number;
}

export const PLAYER_COLORS = ['#F5D5D5', '#D5EBE8', '#F9F0D9', '#E1EDF5'];
