'use client';


import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { GameBoard } from "./game-board";
import { DiceTray } from "./dice-tray";
import { Scoreboard } from "./scoreboard";
import { GameControls } from "./game-controls";
import { RulesDialog } from "./rules-dialog";
import { GameTimer } from "./game-timer";
import { NextRoundConfirmation } from "./next-round-confirmation";

import { TargetScoreSelector } from "./target-score-selector";
import {
  PointAnimations,
  getRandomEmoji,
  createFireworkBurst,
  type FloatingEmoji,
  type FireworkParticle,
} from "./point-animations";
import {
  generateBoard,
  rollDice,
  canMatchFactorization,
  checkForNewBonus,
  type BoardSpace,
  type Die,
  type GameState,
  type BonusBreakdown,
  PLAYER_COLORS,
} from "@/lib/game-utils";
import { BonusBreakdownPanel } from "./bonus-breakdown";
import { FactorizationBox } from "./factorization-box";
import { DiceSkinSettings, DEFAULT_SKINS, type DiceSkin } from "./dice-skin-settings";
import type { CompletedTrack } from "./connection-animation";
import { getBotMoveForMultiplication, type BotDifficulty } from "@/lib/bot-utils";
import { playCapturSound, playVictorySound, playOpponentMoveSound, playFireworksSound } from "@/lib/sound-effects";
import { PartyCelebration } from "./party-celebration";
import { MultiplicationGameTutorial } from "./multiplication-tutorial";
import { MultiplayerModeSelector, type ModeOption } from "./multiplayer-mode-dialog";
import { WaitingRoomDialog } from "./waiting-room-dialog";
import { GameLobby } from "./game-lobby";
import { GameSetupForm } from "./game-setup-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, HelpCircle } from "lucide-react";
import {
  createGameLobby, joinGameLobby, cancelGameLobby, getGameSession, getGameSessionById, getGameStates, subscribeToSession, subscribeToGameState, updateGameState, generatePlayerId, sendHeartbeat, validateTurn, updateCurrentTurn, saveOpponentSelection, removeOpponentSelection, getOpponentSelections, clearOpponentSelections, subscribeToOpponentSelections
} from "@/lib/supabase-multiplayer";
import { AuthDialog } from "./auth-dialog";
import { ActiveGamesDialog } from "./active-games-dialog";
import { usePlayerProfile } from "@/hooks/use-player-profile";

const createInitialState = (targetScore: number): GameState => ({
  board: generateBoard(),
  players: [
    { name: "Player 1", color: PLAYER_COLORS[0], score: 0, bonusPoints: 0 },
    { name: "Player 2", color: PLAYER_COLORS[1], score: 0, bonusPoints: 0 },
  ],
  currentPlayer: 0,
  dice: [],
  phase: "setup",
  roundNumber: 1,
  gameStarterIndex: 0, // Track who started the game (set during setup)
  roundStarterIndex: 0,
  player1HasMoved: false,
  player2HasMoved: false,
  selectedDice: [],
  message: "Set up your game and roll the dice to start!",
  targetScore,
  player1Ready: false,
  player2Ready: false,
  playerExhausted: [false, false],
  readyConfirmationActive: false,
  readyConfirmationInitiator: null,
  readyConfirmationCountdown: 0,
  lastCapturePerPlayer: [null, null],
  });

interface PrimeFactorGameProps {
  showRulesState?: [boolean, (value: boolean) => void];
  showTutorialState?: [boolean, (value: boolean) => void];
  showExitDialogState?: [boolean, (value: boolean) => void];
  onGameActiveChange?: (isActive: boolean) => void;
}

export function PrimeFactorGame({ 
  showRulesState,
  showTutorialState,
  showExitDialogState,
  onGameActiveChange,
}: PrimeFactorGameProps = {}) {
  const [showSetup, setShowSetup] = useState(false);
  const [showModeSelect, setShowModeSelect] = useState(true);
  
  // Use external state if provided, otherwise use local state
  const [showRulesLocal, setShowRulesLocal] = useState(false);
  const [showTutorialLocal, setShowTutorialLocal] = useState(false);
  const [showExitLocal, setShowExitLocal] = useState(false);
  
  const [showRules, setShowRules] = showRulesState || [showRulesLocal, setShowRulesLocal];
  const [showTutorial, setShowTutorial] = showTutorialState || [showTutorialLocal, setShowTutorialLocal];
  const [showExitDialog, setShowExitDialog] = showExitDialogState || [showExitLocal, setShowExitLocal];
  
  // Authentication and session recovery
  const { user: authUser, isAuthenticated, loading: authLoading } = usePlayerProfile();
  const [userId, setUserId] = useState<string | null>(null);
  const [showActiveGames, setShowActiveGames] = useState(false);
  const [hasResumableGames, setHasResumableGames] = useState(false);
  
  // Multiplayer state
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [multiplayerMode, setMultiplayerMode] = useState<"create" | "join" | "lobby" | null>(null);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionPlayer1Id, setSessionPlayer1Id] = useState<string | null>(null);
  const [sessionPlayer2Id, setSessionPlayer2Id] = useState<string | null>(null);
  const [sessionLocalPlayerId, setSessionLocalPlayerId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [opponentPlayerId, setOpponentPlayerId] = useState<string | null>(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [opponentHasJoined, setOpponentHasJoined] = useState(false);
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [playerNames, setPlayerNames] = useState<[string, string]>(["Player 1", "Player 2"]);
  const [showAuth, setShowAuth] = useState(false);
  const [pendingModeAfterAuth, setPendingModeAfterAuth] = useState<ModeOption | null>(null);
  const [showLobby, setShowLobby] = useState(false);
  const [gameDiceSkin, setGameDiceSkin] = useState<string>("standard");
  const [timerMode, setTimerMode] = useState<string>("disabled");
  const selectedGameType: "multiplication" = "multiplication";
  const [showGameSetup, setShowGameSetup] = useState(false);
  const [lobbyLoading, setLobbyLoading] = useState(false);
  const [heartbeatInterval, setHeartbeatInterval] = useState<NodeJS.Timeout | null>(null);
  const [multiplayerTargetScore, setMultiplayerTargetScore] = useState(37);
  
  // Game state
  const [gameState, setGameState] = useState<GameState>(createInitialState(37));
  const [roundStarterIndex, setRoundStarterIndex] = useState(0); // Tracks who starts each round (alternates: 0 -> 1 -> 0 -> ...)
  
  // Track each player's dice separately
  const [player1Dice, setPlayer1Dice] = useState<Die[]>([]);
  const [player2Dice, setPlayer2Dice] = useState<Die[]>([]);
  const [diceRolled, setDiceRolled] = useState(false);
  
  // Bot settings
  const [botEnabled, setBotEnabled] = useState(false);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>("medium");
  
  // Board interaction states
  const [selectedSpace, setSelectedSpace] = useState<BoardSpace | null>(null);
  const [opponentSelectedSpace, setOpponentSelectedSpace] = useState<number | null>(null);
  const [diceAutoSelected, setDiceAutoSelected] = useState(false);
  
  // Opponent selection tracking for real-time visibility
  const [opponentSelectedDice, setOpponentSelectedDice] = useState<string[]>([]);
  const [opponentSelectedSquares, setOpponentSelectedSquares] = useState<string[]>([]);
  const [opponentValidMoves, setOpponentValidMoves] = useState<string[]>([]);
  
  // Bonus history tracking
  const [bonusHistory, setBonusHistory] = useState<Array<{
    player: string;
    space: number;
    round: number;
    breakdown: BonusBreakdown[];
  }>>([]);
  
  // Completed connection tracks
  const [completedTracks, setCompletedTracks] = useState<CompletedTrack[]>([]);
  
  // Animation states
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [fireworks, setFireworks] = useState<FireworkParticle[]>([]);
  const [isTrainCelebrating, setIsTrainCelebrating] = useState(false);
  const [celebrationNumbers, setCelebrationNumbers] = useState<number[]>([]);
  const [lastClaimedSpace, setLastClaimedSpace] = useState<number | null>(null);
  // Most recent captured square per player, keyed so the balloon animation replays each time
  const [lastCapturePerPlayer, setLastCapturePerPlayer] = useState<
    Array<{ number: number; key: number } | null>
  >([null, null]);
  // Local-only dice/board skins uploaded by the player on this device
  const [diceSkins, setDiceSkins] = useState<DiceSkin[]>(DEFAULT_SKINS);
  const boardRef = useRef<HTMLDivElement>(null);
  const trackBoardRef = useRef<HTMLDivElement>(null);
  const botTurnScheduledRef = useRef(false);
  const gameStateRef = useRef<GameState>(gameState);
  // Fresh refs read inside the bot timer so bot scheduling does not depend on
  // volatile values (player2Dice / botDifficulty) that change mid-turn.
  const player2DiceRef = useRef<Die[]>(player2Dice);
  const botDifficultyRef = useRef<BotDifficulty>(botDifficulty);
  const gameStateVersionRef = useRef<number>(-1);
  const previousOpponentBonusCountRef = useRef<number>(0);
  const manualSelectionRef = useRef<boolean>(false);
  const autoSkipInProgressRef = useRef<boolean>(false);
  const lastAppliedVersionRef = useRef<number>(-1);
  const skipHappenedThisRoundRef = useRef<boolean>(false);

  // Load locally-saved dice skins on mount (client-only)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("primetime-dice-skins");
      if (saved) {
        const parsed = JSON.parse(saved) as DiceSkin[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDiceSkins(parsed);
        }
      }
    } catch {
      // Ignore malformed/quota errors and fall back to defaults
    }
  }, []);

  const handleDiceSkinsChange = useCallback((next: DiceSkin[]) => {
    setDiceSkins(next);
    try {
      localStorage.setItem("primetime-dice-skins", JSON.stringify(next));
    } catch {
      // Ignore storage quota errors (large images) - skins still apply this session
    }
  }, []);

  // Local player id
  useEffect(() => {
    const id = generatePlayerId();
    setPlayerId(id || null);
  }, []);

  // Set userId from auth user
  useEffect(() => {
    if (authUser?.id) {
      setUserId(authUser.id);
      setPlayerId(authUser.id);
    }
  }, [authUser]);

  useEffect(() => {
    if (!sessionId) {
      gameStateVersionRef.current = -1;
      if (sessionLocalPlayerId !== null) {
        setSessionLocalPlayerId(null);
      }
      return;
    }

    const matchedIdentity = [userId, playerId].find(
      (candidate): candidate is string =>
        Boolean(candidate) &&
        (candidate === sessionPlayer1Id || candidate === sessionPlayer2Id)
    );

    if (matchedIdentity && matchedIdentity !== sessionLocalPlayerId) {
      setSessionLocalPlayerId(matchedIdentity);
      return;
    }

    if (!sessionLocalPlayerId) {
      if (multiplayerMode === "create" && sessionPlayer1Id) {
        setSessionLocalPlayerId(sessionPlayer1Id);
      } else if (multiplayerMode === "join" && sessionPlayer2Id) {
        setSessionLocalPlayerId(sessionPlayer2Id);
      }
    }
  }, [
    multiplayerMode,
    playerId,
    sessionId,
    sessionLocalPlayerId,
    sessionPlayer1Id,
    sessionPlayer2Id,
    userId,
  ]);

  useEffect(() => {
    if (!userId) {
      setHasResumableGames(false);
      return;
    }

    let cancelled = false;

    const checkActiveGames = async () => {
      try {
        const params = new URLSearchParams({
          userId,
          gameType: selectedGameType,
        });
        const response = await fetch(`/api/active-games?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (!cancelled) {
          setHasResumableGames(Boolean(data.success && (data.count || 0) > 0));
        }
      } catch (error) {
        console.warn("Could not determine active game count", error);
        if (!cancelled) {
          setHasResumableGames(false);
        }
      }
    };

    void checkActiveGames();

    return () => {
      cancelled = true;
    };
  }, [selectedGameType, userId]);

  useEffect(() => {
    if (!authUser?.playerName) return;

    setPlayerNames((prev) => {
      const shouldReplacePlaceholder =
        !prev[0] || prev[0] === "Player 1" || prev[0] === "Player";

      if (!shouldReplacePlaceholder || prev[0] === authUser.playerName) {
        return prev;
      }

      return [authUser.playerName, prev[1]];
    });
  }, [authUser?.playerName]);

  // Setup heartbeat for multiplayer
  useEffect(() => {
    if (isMultiplayer && sessionId && sessionLocalPlayerId) {
      // Send initial heartbeat
      sendHeartbeat(sessionLocalPlayerId, sessionId, true);

      // Setup periodic heartbeat every 10 seconds
      const interval = setInterval(() => {
        sendHeartbeat(sessionLocalPlayerId, sessionId, true);
      }, 10000);

      setHeartbeatInterval(interval);

      return () => {
        clearInterval(interval);
        // Mark player as offline when leaving
        sendHeartbeat(sessionLocalPlayerId, sessionId, false);
      };
    }
  }, [isMultiplayer, sessionId, sessionLocalPlayerId]);

  // Exit confirmation dialog
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showExitConfirmDialog, setShowExitConfirmDialog] = useState(false);
  const [pendingExitUrl, setPendingExitUrl] = useState<string | null>(null);

  // Get current player's dice and opponent's dice
  const currentPlayerDice = gameState.currentPlayer === 0 ? player1Dice : player2Dice;
  const localPlayerIndex = useMemo(() => {
    if (!isMultiplayer) return gameState.currentPlayer;
    if (!sessionLocalPlayerId) return null;
    if (sessionLocalPlayerId === sessionPlayer1Id) return 0;
    if (sessionLocalPlayerId === sessionPlayer2Id) return 1;
    return null;
  }, [gameState.currentPlayer, isMultiplayer, sessionLocalPlayerId, sessionPlayer1Id, sessionPlayer2Id]);
  const isLocalPlayersTurn =
    (!isMultiplayer && !botEnabled) || (localPlayerIndex !== null && localPlayerIndex === gameState.currentPlayer);

  // Keep gameStateRef in sync for use in callbacks
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Keep bot-related refs fresh so the bot timer reads current values without
  // re-subscribing the bot effect to these volatile dependencies.
  useEffect(() => {
    player2DiceRef.current = player2Dice;
  }, [player2Dice]);
  useEffect(() => {
    botDifficultyRef.current = botDifficulty;
  }, [botDifficulty]);

  // Calculate valid moves based on selected dice
  const validMoves = useMemo(() => {
    if (gameState.selectedDice.length === 0) return [];
    
    const selectedDieValues = currentPlayerDice
      .filter((d) => gameState.selectedDice.includes(d.id))
      .map((d) => d.value);
    
    const numericValues = selectedDieValues.filter((v): v is number => v !== "W");
    const wildCount = selectedDieValues.filter((v) => v === "W").length;
    
    if (numericValues.length === 0 && wildCount > 0) {
      return [];
    }
    
    const product = numericValues.reduce((a, b) => a * b, 1);
    
    return gameState.board
      .filter((space) => {
        if (space.isPrime || space.owner !== null || space.number === 0 || space.claimed) return false;
        
        const factors = space.factors;
        if (factors.length !== selectedDieValues.length) return false;
        
        if (wildCount === 0) {
          const factorProduct = factors.reduce((a, b) => a * b, 1);
          return factorProduct === product;
        }
        
        return false;
      })
      .map((s) => s.number);
  }, [gameState.selectedDice, currentPlayerDice, gameState.board]);

  // Highlight possible board spaces where selected dice are a valid subset of the space's factors
  const possibleMoveHighlights = useMemo(() => {
    if (gameState.selectedDice.length === 0) return [];
    
    const selectedDieValues = currentPlayerDice
      .filter((d) => gameState.selectedDice.includes(d.id))
      .map((d) => d.value);
    
    const numericSelected = selectedDieValues.filter((v): v is number => v !== "W");
    const wildCount = selectedDieValues.filter((v) => v === "W").length;
    
    if (numericSelected.length === 0 && wildCount === 0) return [];
    
    const highlights: number[] = [];
    
    for (const space of gameState.board) {
      if (space.isPrime || space.owner !== null || space.number === 0 || space.claimed) continue;
      
      // The space must have at least as many factors as selected dice
      if (space.factors.length < selectedDieValues.length) continue;
      
      // Check if ALL selected numeric dice values can be found as a multiset subset
      // of the space's factors (each factor used at most once)
      const remainingFactors = [...space.factors];
      let allMatched = true;
      let wildsNeeded = 0;
      
      for (const dieVal of numericSelected) {
        const idx = remainingFactors.indexOf(dieVal);
        if (idx !== -1) {
          remainingFactors.splice(idx, 1);
        } else {
          allMatched = false;
          break;
        }
      }
      
      if (!allMatched) continue;
      
      // Check if wilds can cover remaining needed slots (wilds match any remaining factor)
      // Wilds just need remaining factors to exist to match against
      if (wildCount > remainingFactors.length) continue;
      
      // All selected dice are a valid subset of this space's factors
      highlights.push(space.number);
    }
    
    return highlights;
  }, [gameState.selectedDice, currentPlayerDice, gameState.board]);

  // Check if current player has ANY possible move with their remaining dice
  const hasAnyValidMove = useMemo(() => {
    if (currentPlayerDice.length === 0) return false;
    
    const availableSpaces = gameState.board.filter(
      (space) => !space.isPrime && space.owner === null && space.number !== 0 && !space.claimed
    );
    
    for (const space of availableSpaces) {
      const factors = space.factors;
      if (factors.length === 0) continue;
      const match = canMatchFactorization(factors, currentPlayerDice);
      if (match !== null) return true;
    }
    
    return false;
  }, [currentPlayerDice, gameState.board]);

  // Clear fireworks after animation
  useEffect(() => {
    if (fireworks.length > 0) {
      const timer = setTimeout(() => setFireworks([]), 1000);
      return () => clearTimeout(timer);
    }
  }, [fireworks]);

  // Auto-skip if current player has no valid moves
  useEffect(() => {
    if (gameState.phase !== "playing" || !diceRolled) return;
    
    // Don't auto-skip if we just transitioned to bonus phase (when previous player exhausted)
    const otherPlayerIndex = 1 - gameState.currentPlayer;
    const playerExhausted = gameState.playerExhausted || [false, false];
    const isInBonusPhase = playerExhausted[otherPlayerIndex] === true;
    if (isInBonusPhase) return;
    
    if (!hasAnyValidMove && currentPlayerDice.length >= 0) {
      const currentPlayerIndex = gameState.currentPlayer;
      const playerExhausted = gameState.playerExhausted || [false, false];
      
      console.log("[v0] auto-skip: player has no valid moves", {
        currentPlayerIndex,
        playerExhausted,
        hasAnyValidMove,
        currentPlayerDice: currentPlayerDice.length,
      });
      
      // Mark auto-skip as in progress to prevent applySavedGameState from interrupting
      autoSkipInProgressRef.current = true;
      skipHappenedThisRoundRef.current = true;
      
      // Mark current player as exhausted
      const newExhausted = [...playerExhausted];
      newExhausted[currentPlayerIndex] = true;
      
      // Check if all players are exhausted
      const allExhausted = newExhausted.every((exhausted) => exhausted);
      
      if (allExhausted) {
        // All players exhausted - end round
        // NOTE: Do NOT increment roundNumber here - it's only incremented in handleNewRound
        console.log("[v0] auto-skip: all players exhausted, ending round");
        setGameState((prev) => ({
          ...prev,
          phase: "roundEnd",
          selectedDice: [],
          playerExhausted: [false, false],
          message: `Round ${prev.roundNumber} complete! All players are out of moves. Click "New Round" to continue.`,
        }));
        setTimeout(() => { autoSkipInProgressRef.current = false; }, 100);
      } else {
        // Find next active player (not exhausted)
        let nextPlayerIndex = (currentPlayerIndex + 1) % gameState.players.length;
        while (newExhausted[nextPlayerIndex] && nextPlayerIndex !== currentPlayerIndex) {
          nextPlayerIndex = (nextPlayerIndex + 1) % gameState.players.length;
        }
        
        // Check if next player already has rolled dice this turn
        const nextPlayerDice = nextPlayerIndex === 0 ? player1Dice : player2Dice;
        const nextPlayerAlreadyRolled = nextPlayerDice.length > 0;
        
        console.log("[v0] auto-skip: advancing to next player", {
          nextPlayerIndex,
          newExhausted,
          nextPlayerAlreadyRolled,
          nextPlayerName: gameState.players[nextPlayerIndex]?.name,
        });
        
        setGameState((prev) => ({
          ...prev,
          currentPlayer: nextPlayerIndex,
          selectedDice: [],
          // If next player already rolled, keep them in "playing" to use remaining dice
          // If they haven't rolled yet, set to "rolling" so they roll first
          phase: nextPlayerAlreadyRolled ? "playing" : "rolling",
          playerExhausted: newExhausted,
          message: nextPlayerAlreadyRolled 
            ? `${prev.players[currentPlayerIndex].name} has no valid moves — skipping. ${prev.players[nextPlayerIndex].name}, use your remaining dice for extra points!`
            : `${prev.players[currentPlayerIndex].name} has no valid moves — skipping. ${prev.players[nextPlayerIndex].name}'s turn! Roll your dice.`,
        }));
        setDiceRolled(nextPlayerAlreadyRolled); // Keep diceRolled true if they already rolled
        // Clear the flag after a brief delay to allow state to settle
        setTimeout(() => { autoSkipInProgressRef.current = false; }, 100);
      }
    }
  }, [gameState.phase, hasAnyValidMove, diceRolled, currentPlayerDice.length, gameState.board.length]);

  // Spawn floating emoji animation
  const spawnPointAnimation = useCallback((x: number, y: number, points: number, isBonus: boolean) => {
    const emoji = getRandomEmoji(isBonus);
    const newEmoji: FloatingEmoji = {
      id: `emoji-${Date.now()}-${Math.random()}`,
      emoji,
      x,
      y,
      points,
    };
    setFloatingEmojis((prev) => [...prev, newEmoji]);
  }, []);

  // Spawn firework burst
  const spawnFireworks = useCallback((x: number, y: number) => {
    const newFireworks = createFireworkBurst(x, y, 24);
    setFireworks((prev) => [...prev, ...newFireworks]);
  }, []);

  // Handle animation complete
  const handleAnimationComplete = useCallback((id: string) => {
    setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // Get viewport center position for animations
  const getAnimationPosition = useCallback((): { x: number; y: number } => {
    return {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
  }, []);

  // Handle die click
  const handleDieClick = useCallback((die: Die) => {
    if (gameState.phase !== "playing" || !isLocalPlayersTurn) return;
    if (!currentPlayerDice.some((currentDie) => currentDie.id === die.id)) return;
    
    // Reset auto-selected flag when user manually selects/deselects dice
    setDiceAutoSelected(false);
    
    // Allow auto-select of space to trigger when manually selecting dice
    // (Don't keep the manual space selection flag set)
    manualSelectionRef.current = false;
    
    const isCurrentlySelected = gameState.selectedDice.includes(die.id);
    
    // Get the die's index position for broadcasting to opponent
    const dieIndex = currentPlayerDice.findIndex((d) => d.id === die.id);
    const dieIndexStr = String(dieIndex);
    
    setGameState((prev) => {
      return {
        ...prev,
        selectedDice: isCurrentlySelected
          ? prev.selectedDice.filter((id) => id !== die.id)
          : [...prev.selectedDice, die.id],
      };
    });
    
    // Broadcast dice selection/deselection to opponent in multiplayer mode
    // Use die index instead of ID so opponent can match to their view of the same dice
    if (isMultiplayer && sessionId && sessionLocalPlayerId) {
      if (isCurrentlySelected) {
        // Deselection - remove from opponent's view
        removeOpponentSelection(sessionId, sessionLocalPlayerId, 'dice', dieIndexStr).catch(error =>
          console.error('[v0] Failed to broadcast dice deselection:', error)
        );
      } else {
        // Selection - add to opponent's view
        saveOpponentSelection(sessionId, sessionLocalPlayerId, 'dice', dieIndexStr).catch(error =>
          console.error('[v0] Failed to broadcast dice selection:', error)
        );
      }
    }
  }, [currentPlayerDice, gameState.phase, isLocalPlayersTurn, isMultiplayer, sessionId, sessionLocalPlayerId, gameState.selectedDice]);

  // Handle space click
  const handleSpaceClick = useCallback((space: BoardSpace) => {
    if (isMultiplayer && !isLocalPlayersTurn) return;
    if (space.claimed) return;
    
    // Mark that user manually selected a space
    manualSelectionRef.current = true;
    setSelectedSpace(space);
    
    // Broadcast square selection to opponent in multiplayer mode
    if (isMultiplayer && sessionId && sessionLocalPlayerId) {
      // First, clear any previous square selections (both manually selected and auto-selected)
      if (selectedSpace && selectedSpace.number !== space.number) {
        removeOpponentSelection(sessionId, sessionLocalPlayerId, 'square', String(selectedSpace.number)).catch(error =>
          console.error('[v0] Failed to clear old square selection:', error)
        );
      }
      // Also clear any auto-selected square that might still be in the database
      if (previousAutoSquareRef.current !== null) {
        removeOpponentSelection(sessionId, sessionLocalPlayerId, 'square', String(previousAutoSquareRef.current)).catch(error =>
          console.error('[v0] Failed to clear old auto-selected square:', error)
        );
      }
      // Then broadcast the new manually-selected square
      saveOpponentSelection(sessionId, sessionLocalPlayerId, 'square', String(space.number)).catch(error =>
        console.error('[v0] Failed to broadcast square selection:', error)
      );
    }
    
    // Auto-select dice that can match this space (always, even if dice were previously selected)
    if (!space.isPrime && !space.owner && space.factors.length > 0) {
      // Find a valid combination of dice that matches the space
      const match = canMatchFactorization(
        space.factors,
        currentPlayerDice.map((d) => ({ ...d, used: false }))
      );
      
      if (match) {
        // Auto-select the matched dice
        const matchedDiceIds = match.map((d) => d.id);
        setGameState((prev) => ({
          ...prev,
          selectedDice: matchedDiceIds,
        }));
        setDiceAutoSelected(true);
        
        // Broadcast the auto-selected dice to opponent in multiplayer mode
        if (isMultiplayer && sessionId && sessionLocalPlayerId) {
          // Build a set of old dice indices to remove and new dice indices to add
          const oldIndices = new Set<number>();
          const newIndices = new Set<number>();
          
          // Find indices of old selections
          gameState.selectedDice.forEach((oldDieId) => {
            const oldDieIndex = currentPlayerDice.findIndex((d) => d.id === oldDieId);
            if (oldDieIndex >= 0) {
              oldIndices.add(oldDieIndex);
            }
          });
          
          // Find indices of new selections - this handles duplicates correctly
          // by finding ALL matching indices, not just the first one
          match.forEach((matchedDie) => {
            let searchStartIndex = 0;
            let foundIndex = currentPlayerDice.findIndex(
              (d, idx) => idx >= searchStartIndex && d.id === matchedDie.id
            );
            while (foundIndex >= 0) {
              newIndices.add(foundIndex);
              searchStartIndex = foundIndex + 1;
              foundIndex = currentPlayerDice.findIndex(
                (d, idx) => idx >= searchStartIndex && d.id === matchedDie.id
              );
            }
          });
          
          // Remove old selections that aren't in new selections
          oldIndices.forEach((idx) => {
            if (!newIndices.has(idx)) {
              removeOpponentSelection(sessionId, sessionLocalPlayerId, 'dice', String(idx)).catch(error =>
                console.error('[v0] Failed to remove old dice selection:', error)
              );
            }
          });
          
          // Add new selections that weren't in old selections
          newIndices.forEach((idx) => {
            if (!oldIndices.has(idx)) {
              saveOpponentSelection(sessionId, sessionLocalPlayerId, 'dice', String(idx)).catch(error =>
                console.error('[v0] Failed to broadcast auto-selected dice:', error)
              );
            }
          });
        }
      } else {
        // No match found, clear selection
        setGameState((prev) => ({
          ...prev,
          selectedDice: [],
        }));
        setDiceAutoSelected(false);
        
        // Clear opponent's old dice selections when no match found
        if (isMultiplayer && sessionId && sessionLocalPlayerId) {
          const oldIndices = new Set<number>();
          gameState.selectedDice.forEach((oldDieId) => {
            let searchStartIndex = 0;
            let foundIndex = currentPlayerDice.findIndex(
              (d, idx) => idx >= searchStartIndex && d.id === oldDieId
            );
            while (foundIndex >= 0) {
              oldIndices.add(foundIndex);
              searchStartIndex = foundIndex + 1;
              foundIndex = currentPlayerDice.findIndex(
                (d, idx) => idx >= searchStartIndex && d.id === oldDieId
              );
            }
          });
          
          oldIndices.forEach((idx) => {
            removeOpponentSelection(sessionId, sessionLocalPlayerId, 'dice', String(idx)).catch(error =>
              console.error('[v0] Failed to remove dice selection:', error)
            );
          });
        }
      }
    } else {
      // Prime or owned space, clear selection
      setGameState((prev) => ({
        ...prev,
        selectedDice: [],
      }));
      setDiceAutoSelected(false);
      
      // Clear opponent's old dice selections for prime/owned spaces
      if (isMultiplayer && sessionId && sessionLocalPlayerId) {
        const oldIndices = new Set<number>();
        gameState.selectedDice.forEach((oldDieId) => {
          let searchStartIndex = 0;
          let foundIndex = currentPlayerDice.findIndex(
            (d, idx) => idx >= searchStartIndex && d.id === oldDieId
          );
          while (foundIndex >= 0) {
            oldIndices.add(foundIndex);
            searchStartIndex = foundIndex + 1;
            foundIndex = currentPlayerDice.findIndex(
              (d, idx) => idx >= searchStartIndex && d.id === oldDieId
            );
          }
        });
        
        oldIndices.forEach((idx) => {
          removeOpponentSelection(sessionId, sessionLocalPlayerId, 'dice', String(idx)).catch(error =>
            console.error('[v0] Failed to remove dice selection:', error)
          );
        });
      }
    }
  }, [isLocalPlayersTurn, isMultiplayer, currentPlayerDice, canMatchFactorization, gameState, isMultiplayer, sessionId, sessionLocalPlayerId]);

  // Reset manual selection flag when all dice are deselected or turn changes
  useEffect(() => {
    if (gameState.selectedDice.length === 0) {
      manualSelectionRef.current = false;
    }
  }, [gameState.selectedDice]);

  // Clear selectedSpace and manual selection flag when player turn changes
  // EXCEPT when transitioning to remaining dice bonus phase (when opponent exhausted)
  useEffect(() => {
    const otherPlayerIndex = 1 - gameState.currentPlayer;
    const playerExhausted = gameState.playerExhausted || [false, false];
    const isRemainingDicePhase = playerExhausted[otherPlayerIndex] === true;
    
    // Don't clear selection if entering remaining dice bonus phase
    if (!isRemainingDicePhase) {
      setSelectedSpace(null);
      manualSelectionRef.current = false;
    }
  }, [gameState.currentPlayer, gameState.playerExhausted]);

  // Auto-select space when dice product matches exactly one space number
  useEffect(() => {
    if (gameState.phase !== "playing" || !isLocalPlayersTurn || gameState.selectedDice.length === 0) return;
    
    // If user manually selected a space, don't override it with auto-select
    if (manualSelectionRef.current) return;
    
    const selectedDieObjects = currentPlayerDice.filter((d) =>
      gameState.selectedDice.includes(d.id)
    );
    
    // Calculate the product of all selected dice
    const diceValues = selectedDieObjects.map((d) => d.value).filter((v): v is number => v !== "W");
    const product = diceValues.reduce((a, b) => a * b, 1);
    
    // Find the space whose number equals the exact product of all selected dice
    const matchingSpace = gameState.board.find((space) => {
      if (space.isPrime || space.owner !== null || space.claimed) return false;
      return space.number === product;
    });
    
    // If there's exactly one space with that number, auto-select it
    if (matchingSpace && (!selectedSpace || selectedSpace.number !== matchingSpace.number)) {
      setSelectedSpace(matchingSpace);
    } else if (!matchingSpace && selectedSpace) {
      // No matching space for this product, clear selection
      setSelectedSpace(null);
    }
  }, [gameState.selectedDice, gameState.phase, isLocalPlayersTurn, currentPlayerDice, gameState.board, selectedSpace]);

  // Sync last capture from gameState to local state whenever gameState updates
  useEffect(() => {
    if (Array.isArray(gameState.lastCapturePerPlayer) && gameState.lastCapturePerPlayer.length > 0) {
      setLastCapturePerPlayer((prev) => 
        gameState.lastCapturePerPlayer.map((capture: any, idx: number) => {
          if (capture && typeof capture.space === 'number') {
            return {
              number: capture.space,
              key: (prev[idx]?.key ?? 0) + 1,
            };
          }
          return prev[idx];
        })
      );
    }
  }, [gameState.lastCapturePerPlayer]);

  // Track previous valid moves to detect changes
  const previousValidMovesRef = useRef<Set<number>>(new Set());

  // Broadcast valid move highlights to opponent so they can see all possible moves
  useEffect(() => {
    if (!isMultiplayer || !sessionId || !sessionLocalPlayerId || gameState.phase !== "playing") {
      return;
    }
    
    // Broadcast the same combined set of highlights the local player sees
    const currentValidSet = new Set([...validMoves, ...possibleMoveHighlights]);
    const previousValidSet = previousValidMovesRef.current;
    
    // Remove moves that are no longer valid
    for (const move of previousValidSet) {
      if (!currentValidSet.has(move)) {
        removeOpponentSelection(sessionId, sessionLocalPlayerId, 'validMove', String(move))
          .catch(error => console.error('[v0] Failed to remove old valid move:', error));
      }
    }
    
    // Add new valid moves
    for (const move of currentValidSet) {
      if (!previousValidSet.has(move)) {
        saveOpponentSelection(sessionId, sessionLocalPlayerId, 'validMove', String(move))
          .catch(error => console.error('[v0] Failed to broadcast valid move:', error));
      }
    }
    
    // Update the ref
    previousValidMovesRef.current = currentValidSet;
  }, [validMoves, possibleMoveHighlights, isMultiplayer, sessionId, sessionLocalPlayerId, gameState.phase]);

  // Track previous auto-selected square to detect changes and update opponent
  const previousAutoSquareRef = useRef<number | null>(null);

  // Broadcast auto-selected square changes to opponent (only when dice change, not manual selections)
  useEffect(() => {
    if (!isMultiplayer || !sessionId || !sessionLocalPlayerId || gameState.phase !== "playing") {
      return;
    }
    
    // Only broadcast if square was auto-selected due to dice change (not manually selected by user)
    if (!manualSelectionRef.current) {
      const currentSquareNum = selectedSpace?.number ?? null;
      
      // Only broadcast if the square actually changed
      if (currentSquareNum !== previousAutoSquareRef.current) {
        // Remove old auto-selected square if it existed
        if (previousAutoSquareRef.current !== null) {
          removeOpponentSelection(sessionId, sessionLocalPlayerId, 'square', String(previousAutoSquareRef.current))
            .catch(error => console.error('[v0] Failed to remove old square:', error));
        }
        
        // Add new auto-selected square if one exists
        if (currentSquareNum !== null) {
          saveOpponentSelection(sessionId, sessionLocalPlayerId, 'square', String(currentSquareNum))
            .catch(error => console.error('[v0] Failed to broadcast auto-selected square:', error));
        }
        
        // Update ref for next comparison
        previousAutoSquareRef.current = currentSquareNum;
      }
    }
  }, [selectedSpace, gameState.selectedDice, isMultiplayer, sessionId, sessionLocalPlayerId, gameState.phase]);

  // Check if selected dice match the space
  const canClaimSpace = useMemo(() => {
    if (!selectedSpace || selectedSpace.isPrime) {
      return false;
    }
    
    // Only allow claiming unclaimed spaces in both normal and bonus phases
    if (selectedSpace.owner !== null || selectedSpace.claimed) {
      return false;
    }
    
    const selectedDieObjects = currentPlayerDice.filter((d) =>
      gameState.selectedDice.includes(d.id)
    );
    
    if (selectedDieObjects.length === 0) return false;
    
    const match = canMatchFactorization(
      selectedSpace.factors,
      selectedDieObjects.map((d) => ({ ...d, used: false }))
    );
    
    return match !== null;
  }, [selectedSpace, gameState.selectedDice, currentPlayerDice, gameState.playerExhausted, gameState.currentPlayer]);

  // Check if a specific player (by their dice) has any valid moves
  const playerHasAnyValidMove = useCallback((diceToCheck: Die[]): boolean => {
    if (diceToCheck.length === 0) return false;
    
    const availableSpaces = gameState.board.filter(
      (space) => !space.isPrime && space.owner === null && space.number !== 0 && !space.claimed
    );
    
    for (const space of availableSpaces) {
      const factors = space.factors;
      if (factors.length === 0) continue;
      const match = canMatchFactorization(factors, diceToCheck);
      if (match !== null) return true;
    }
    
    return false;
  }, [gameState.board]);

  // Calculate who should start a specific round based on the game starter and round number
  // Round 1: Game starter
  // Round 2: Opposite player
  // Round 3: Game starter again, etc.
  const calculateRoundStarter = useCallback((roundNum: number, gameStarter: number): number => {
    const roundOffset = roundNum - 1; // 0-indexed
    return (gameStarter + roundOffset) % 2;
  }, []);

  // Check if the game should end (both players exhausted with no valid moves)
  const checkGameEnd = useCallback((): boolean => {
    const player1HasMoves = playerHasAnyValidMove(player1Dice);
    const player2HasMoves = playerHasAnyValidMove(player2Dice);
    
    console.log("[v0] checkGameEnd: player1 has moves:", player1HasMoves, "player2 has moves:", player2HasMoves);
    
    return !player1HasMoves && !player2HasMoves;
  }, [player1Dice, player2Dice, playerHasAnyValidMove]);

  // Auto-detect game end or round advance when both players have no valid moves
  useEffect(() => {
    if (gameState.phase === "gameOver") return; // Already game over
    if (gameState.phase !== "playing" && gameState.phase !== "roundEnd") return;
    
    if (checkGameEnd()) {
      console.log("[v0] Both players exhausted - checking if target score reached");
      
      // Calculate current scores
      const player1Score = gameState.players[0]?.score || 0;
      const player2Score = gameState.players[1]?.score || 0;
      const targetScore = gameState.targetScore || 0;
      
      console.log("[v0] Scores:", { player1: player1Score, player2: player2Score, target: targetScore });
      
      // Check if anyone has reached the target score
      const player1ReachedTarget = targetScore > 0 && player1Score >= targetScore;
      const player2ReachedTarget = targetScore > 0 && player2Score >= targetScore;
      
      if (player1ReachedTarget || player2ReachedTarget) {
        // Someone reached target - game over
        console.log("[v0] Target score reached - ending game");
        const winner = player1Score > player2Score ? 0 : player2Score > player1Score ? 1 : -1;
        const winnerName = winner === -1 ? "It's a tie!" : gameState.players[winner].name + " wins!";
        
        setGameState((prev) => ({
          ...prev,
          phase: "gameOver",
          message: `Game Over! ${winnerName}\n${gameState.players[0].name}: ${player1Score} | ${gameState.players[1].name}: ${player2Score}`,
        }));
      } else if (targetScore === 0) {
        // No target score set - game over when both exhausted
        console.log("[v0] No target score - ending game after round exhaustion");
        const winner = player1Score > player2Score ? 0 : player2Score > player1Score ? 1 : -1;
        const winnerName = winner === -1 ? "It's a tie!" : gameState.players[winner].name + " wins!";
        
        setGameState((prev) => ({
          ...prev,
          phase: "gameOver",
          message: `Game Over! ${winnerName}\n${gameState.players[0].name}: ${player1Score} | ${gameState.players[1].name}: ${player2Score}`,
        }));
      } else {
        // Target score exists but not reached - trigger new round setup
        // We set phase to rolling to show round banner and let handleNewRound be called via user interaction
        // OR we can auto-transition if desired
        console.log("[v0] Target not reached - setting up next round");
        
        // Reset skip flag and auto-transition to next round
        skipHappenedThisRoundRef.current = false;
        
        const nextRoundNumber = gameState.roundNumber + 1;
        const gameStarter = gameState.gameStarterIndex ?? 0;
        const nextRoundStarterIndex = calculateRoundStarter(nextRoundNumber, gameStarter);
        
        console.log("[v0] AUTO-SKIP ROUND TRANSITION - calculating next starter", {
          nextRoundNumber,
          gameStarter,
          nextRoundStarterIndex,
          nextPlayerName: gameState.players[nextRoundStarterIndex]?.name,
          localPlayerId: sessionLocalPlayerId,
          player1DiceRemaining: player1Dice.length,
          player2DiceRemaining: player2Dice.length,
        });
        
        // Don't clear dice - players keep their remaining dice for the next round
        // Just reset the rolled flag since they need to roll again for the new round
        setDiceRolled(false);
        
        setGameState((prev) => ({
          ...prev,
          roundNumber: nextRoundNumber,
          roundStarterIndex: nextRoundStarterIndex,
          player1HasMoved: false,
          player2HasMoved: false,
          phase: "rolling",
          currentPlayer: nextRoundStarterIndex,
          selectedDice: [],
          player1Ready: false,
          player2Ready: false,
          readyConfirmationActive: false,
          readyConfirmationInitiator: null,
          readyConfirmationCountdown: 0,
          playerExhausted: [false, false],
          message: `Round ${nextRoundNumber} begins — ${prev.players[nextRoundStarterIndex].name}, roll your dice!`,
        }));
      }
    }
  }, [gameState.board, player1Dice, player2Dice, checkGameEnd, gameState.phase, gameState.players, gameState.targetScore, gameState.roundNumber, gameState.gameStarterIndex, calculateRoundStarter]);

  // Track the last persisted round number to detect when a round transition happens
  const lastPersistedRoundRef = useRef<number>(gameState.roundNumber);

  // Persist game state to database for multiplayer
  const persistGameState = useCallback(async (
    actionType: string,
    overrides?: {
      gameState?: GameState;
      player1Dice?: Die[];
      player2Dice?: Die[];
      diceRolled?: boolean;
      selectedSpace?: BoardSpace | null;
      bonusHistory?: Array<{
        player: string;
        space: number;
        round: number;
        breakdown: BonusBreakdown[];
      }>;
      completedTracks?: CompletedTrack[];
      player1Ready?: boolean;
      player2Ready?: boolean;
    }
  ) => {
    if (!isMultiplayer || !sessionId || !sessionLocalPlayerId) return;

    const nextState = overrides?.gameState ?? gameState;
    const nextPlayer1Dice = overrides?.player1Dice ?? player1Dice;
    const nextPlayer2Dice = overrides?.player2Dice ?? player2Dice;
    const nextDiceRolled = overrides?.diceRolled ?? diceRolled;
    const nextBonusHistory = overrides?.bonusHistory ?? bonusHistory;
    const nextCompletedTracks = overrides?.completedTracks ?? completedTracks;
    const nextSyncVersion = gameStateVersionRef.current + 1;

    try {
      const nextSelectedSpace = overrides?.selectedSpace ?? selectedSpace;
      await updateGameState(sessionId, sessionLocalPlayerId, {
        board: nextState.board,
        players: nextState.players,
        currentPlayer: nextState.currentPlayer,
        phase: nextState.phase,
        roundNumber: nextState.roundNumber,
        gameStarterIndex: nextState.gameStarterIndex,
        roundStarterIndex: nextState.roundStarterIndex,
        selectedDice: nextState.selectedDice,
        selectedSpace: nextSelectedSpace ? nextSelectedSpace.number : null,
        message: nextState.message,
        targetScore: nextState.targetScore,
        player1Dice: nextPlayer1Dice,
        player2Dice: nextPlayer2Dice,
        diceRolled: nextDiceRolled,
        bonusHistory: nextBonusHistory,
        completedTracks: nextCompletedTracks,
        player1Ready: nextState.player1Ready,
        player2Ready: nextState.player2Ready,
        readyConfirmationActive: nextState.readyConfirmationActive,
        readyConfirmationInitiator: nextState.readyConfirmationInitiator,
        readyConfirmationCountdown: nextState.readyConfirmationCountdown,
        lastCapturePerPlayer: nextState.lastCapturePerPlayer,
        actionType,
        syncVersion: nextSyncVersion,
      }, nextState.roundNumber);
      gameStateVersionRef.current = nextSyncVersion;
    } catch (error) {
      console.error('Error persisting game state:', error);
    }
  }, [
    bonusHistory,
    completedTracks,
    diceRolled,
    gameState,
    isMultiplayer,
    player1Dice,
    player2Dice,
    selectedSpace,
    sessionId,
    sessionLocalPlayerId,
  ]);

  // Auto-persist round transitions to the server so all clients stay in sync
  useEffect(() => {
    // Only persist if we're in rolling phase (just transitioned to new round) and round number changed
    if (gameState.phase === "rolling" && gameState.roundNumber > lastPersistedRoundRef.current) {
      console.log("[v0] Round transition detected - persisting new round state", {
        roundNumber: gameState.roundNumber,
        currentPlayer: gameState.currentPlayer,
        currentPlayerName: gameState.players[gameState.currentPlayer]?.name,
      });
      
      lastPersistedRoundRef.current = gameState.roundNumber;
      
      // Schedule persist for next tick to allow state to settle
      const timer = setTimeout(() => {
        void persistGameState('round-transition', {
          gameState,
          // Preserve remaining dice - don't clear them on round transition
          player1Dice,
          player2Dice,
          diceRolled: false,
        });
      }, 0);
      
      return () => clearTimeout(timer);
    }
  }, [gameState.phase, gameState.roundNumber, gameState.currentPlayer, gameState.players, persistGameState, gameState]);

  const getSavedStateVersion = useCallback((savedState: Record<string, any>) => {
    return typeof savedState.syncVersion === "number" ? savedState.syncVersion : -1;
  }, []);

  const applySavedGameState = useCallback((savedState: Record<string, any>) => {
    const incomingVersion = getSavedStateVersion(savedState);
    
    // Skip if already applied this version
    if (incomingVersion >= 0 && incomingVersion === lastAppliedVersionRef.current) {
      console.log("[v0] applySavedGameState: skipping duplicate version", incomingVersion);
      return;
    }
    
    // Skip if auto-skip transition is in progress (prevent it from being undone)
    if (autoSkipInProgressRef.current) {
      console.log("[v0] applySavedGameState: skipping during auto-skip transition");
      return;
    }
    
    console.log("[v0] applySavedGameState called with version:", incomingVersion, "round info:", {
      roundNumber: savedState.roundNumber,
      roundStarterIndex: savedState.roundStarterIndex,
      currentPlayer: savedState.currentPlayer,
      p1Ready: savedState.player1Ready,
      p2Ready: savedState.player2Ready,
      confirmationActive: savedState.readyConfirmationActive,
    });
    
    if (incomingVersion >= 0 && incomingVersion < gameStateVersionRef.current) {
      console.log("[v0] Skipping stale version, incoming:", incomingVersion, "current:", gameStateVersionRef.current);
      return;
    }

    if (incomingVersion >= 0) {
      gameStateVersionRef.current = incomingVersion;
      lastAppliedVersionRef.current = incomingVersion;
    }

    setGameState((prev) => {
      // Only clear selectedDice when the current player actually changes
      // Never sync selectedDice from database since it's local-only state
      const playerChanged = 
        typeof savedState.currentPlayer === "number" && 
        savedState.currentPlayer !== prev.currentPlayer;
      
      const newState = {
        ...prev,
        board: Array.isArray(savedState.board) ? savedState.board : prev.board,
        players: Array.isArray(savedState.players) ? savedState.players : prev.players,
        currentPlayer:
          typeof savedState.currentPlayer === "number" ? savedState.currentPlayer : prev.currentPlayer,
        // Monotonic phase: once roundEnd, don't revert to playing (prevents stale realtime records from reverting phase)
        phase: prev.phase === "roundEnd" ? "roundEnd" : (savedState.phase || prev.phase),
        roundNumber:
          typeof savedState.roundNumber === "number" ? savedState.roundNumber : prev.roundNumber,
        gameStarterIndex:
          typeof savedState.gameStarterIndex === "number" ? savedState.gameStarterIndex : prev.gameStarterIndex,
        roundStarterIndex:
          typeof savedState.roundStarterIndex === "number" ? savedState.roundStarterIndex : prev.roundStarterIndex,
        selectedDice: playerChanged ? [] : prev.selectedDice,
        message: typeof savedState.message === "string" ? savedState.message : prev.message,
        targetScore:
          typeof savedState.targetScore === "number" ? savedState.targetScore : prev.targetScore,
        // Monotonic update: once ready is true, don't revert to false (prevents stale realtime records from reverting)
        player1Ready: typeof savedState.player1Ready === "boolean" ? (savedState.player1Ready || prev.player1Ready) : prev.player1Ready,
        player2Ready: typeof savedState.player2Ready === "boolean" ? (savedState.player2Ready || prev.player2Ready) : prev.player2Ready,
        readyConfirmationActive: typeof savedState.readyConfirmationActive === "boolean" ? savedState.readyConfirmationActive : prev.readyConfirmationActive,
        readyConfirmationInitiator: typeof savedState.readyConfirmationInitiator === "number" ? savedState.readyConfirmationInitiator : prev.readyConfirmationInitiator,
        readyConfirmationCountdown: typeof savedState.readyConfirmationCountdown === "number" ? savedState.readyConfirmationCountdown : prev.readyConfirmationCountdown,
        lastCapturePerPlayer: Array.isArray(savedState.lastCapturePerPlayer) ? savedState.lastCapturePerPlayer : prev.lastCapturePerPlayer,
      };
      console.log("[v0] applySavedGameState result - p1Ready:", newState.player1Ready, "p2Ready:", newState.player2Ready, "confirmationActive:", newState.readyConfirmationActive);
      return newState;
    });

    // Sync last capture from gameState to local state for display
    if (Array.isArray(savedState.lastCapturePerPlayer)) {
      setLastCapturePerPlayer((prev) =>
        savedState.lastCapturePerPlayer.map((capture: any, idx: number) => {
          if (capture && typeof capture.space === 'number') {
            return {
              number: capture.space,
              key: (prev[idx]?.key ?? 0) + 1,
            };
          }
          return prev[idx];
        })
      );
    }

    // Play sounds for opponent's claimed spaces in multiplayer (do this BEFORE other state updates)
    if (
      isMultiplayer &&
      sessionLocalPlayerId &&
      savedState.player_id !== sessionLocalPlayerId &&
      Array.isArray(savedState.board)
    ) {
      // Get current board state synchronously to avoid stale closure
      const currentBoard = gameStateRef.current?.board || [];
      const opponentId = sessionLocalPlayerId === 0 ? 1 : 0;
      const newlyClaimedByOpponent = savedState.board.filter((space: BoardSpace) => {
        const oldSpace = currentBoard.find((s) => s.number === space.number);
        return (
          space.claimed &&
          space.owner === opponentId &&
          oldSpace &&
          (!oldSpace.claimed || oldSpace.owner !== opponentId)
        );
      });

      // Play celebration sounds for opponent's move only if they got bonus
      if (newlyClaimedByOpponent.length > 1) {
        playCapturSound();
        playOpponentMoveSound();
        playBonusSound(newlyClaimedByOpponent.length);
      }
    }

    setPlayer1Dice(Array.isArray(savedState.player1Dice) ? savedState.player1Dice : []);
    setPlayer2Dice(Array.isArray(savedState.player2Dice) ? savedState.player2Dice : []);
    setDiceRolled(
      typeof savedState.diceRolled === "boolean"
        ? savedState.diceRolled
        : !!(
            (Array.isArray(savedState.player1Dice) && savedState.player1Dice.length > 0) ||
            (Array.isArray(savedState.player2Dice) && savedState.player2Dice.length > 0)
          )
    );
    setBonusHistory(Array.isArray(savedState.bonusHistory) ? savedState.bonusHistory : []);
    setCompletedTracks(Array.isArray(savedState.completedTracks) ? savedState.completedTracks : []);
    
    // Sync opponent's selected space (if different from local player)
    if (typeof savedState.selectedSpace === "number" && sessionLocalPlayerId && savedState.player_id !== sessionLocalPlayerId) {
      setOpponentSelectedSpace(savedState.selectedSpace);
    } else if (typeof savedState.selectedSpace !== "number") {
      setOpponentSelectedSpace(null);
    }
  }, [getSavedStateVersion, sessionLocalPlayerId, isMultiplayer, gameStateRef]);

  // Detect opponent bonus in multiplayer and play sound
  useEffect(() => {
    if (!isMultiplayer) return;
    
    // Count bonus entries for the opponent (not the local player)
    const opponentName = gameState.players[1].name;
    const opponentBonusCount = bonusHistory.filter(b => b.player === opponentName).length;
    
    // Check if opponent earned a new bonus since last check
    if (opponentBonusCount > previousOpponentBonusCountRef.current) {
      playCapturSound();
    }
    
    previousOpponentBonusCountRef.current = opponentBonusCount;
  }, [bonusHistory, isMultiplayer, gameState.players]);

  const getLatestGameStateRecord = useCallback((states: Array<Record<string, any>>) => {
    return [...states].sort((a, b) => {
      const aVersion = getSavedStateVersion(a.game_data || {});
      const bVersion = getSavedStateVersion(b.game_data || {});

      if (aVersion !== bVersion) {
        return bVersion - aVersion;
      }

      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    })[0];
  }, [getSavedStateVersion]);

  const loadLatestSavedGameState = useCallback(async (activeSessionId: string) => {
    const states = await getGameStates(activeSessionId);
    if (!states.length) {
      return false;
    }

    const latestState = getLatestGameStateRecord(states);

    if (!latestState?.game_data) {
      return false;
    }

    applySavedGameState(latestState.game_data);
    return true;
  }, [applySavedGameState, getLatestGameStateRecord]);

  // Start game with target score
  const handleStartGame = useCallback(async (targetScore: number, enableBot: boolean, difficulty: BotDifficulty) => {
    let resolvedPlayerNames: [string, string] = playerNames;

    if (isMultiplayer && sessionId) {
      const latestSession = await getGameSessionById(sessionId);
      if (latestSession) {
        resolvedPlayerNames = [
          latestSession.player_1_name || playerNames[0],
          latestSession.player_2_name || playerNames[1],
        ];
        setPlayerNames(resolvedPlayerNames);
        setOpponentName(latestSession.player_2_name || opponentName);
      }
    }

    setBotEnabled(enableBot);
    setBotDifficulty(difficulty);
    const initial = createInitialState(targetScore);
    initial.players = [
      { ...initial.players[0], name: resolvedPlayerNames[0] },
      { ...initial.players[1], name: enableBot ? "Bot" : resolvedPlayerNames[1] },
    ];
    initial.phase = "rolling";
    // Set the game starter - in multiplayer, currentPlayer (0) is typically the session creator
    // In single-player/bot, Player 1 (0) always starts
    initial.gameStarterIndex = initial.currentPlayer;
    initial.message = `${resolvedPlayerNames[0]}, roll the dice to start the game!`;

    setGameState(initial);
    setShowSetup(false);
    setSelectedSpace(null);
    setPlayer1Dice([]);
    setPlayer2Dice([]);
    setDiceRolled(false);
    setBonusHistory([]);
    setCompletedTracks([]);

    if (isMultiplayer) {
      await persistGameState('start', {
        gameState: initial,
        player1Dice: [],
        player2Dice: [],
        diceRolled: false,
        bonusHistory: [],
        completedTracks: [],
      });
    }
  }, [isMultiplayer, opponentName, persistGameState, playerNames, sessionId]);

  // Sync player names to game state when they change
  useEffect(() => {
    setGameState((prev) => ({
      ...prev,
      players: [
        { ...prev.players[0], name: playerNames[0] },
        { ...prev.players[1], name: playerNames[1] },
      ],
    }));
  }, [playerNames]);

  useEffect(() => {
    if (!isMultiplayer || !sessionId || waitingForOpponent) return;

    let cancelled = false;

    void loadLatestSavedGameState(sessionId);

    const pollInterval = setInterval(() => {
      void loadLatestSavedGameState(sessionId);
    }, 1500);

    const channel = subscribeToGameState(sessionId, (states) => {
      if (cancelled || !states.length) return;

      const latestState = getLatestGameStateRecord(states);

      if (latestState?.game_data) {
        applySavedGameState(latestState.game_data);
      }
    });

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
      channel.unsubscribe();
    };
  }, [applySavedGameState, getLatestGameStateRecord, isMultiplayer, loadLatestSavedGameState, sessionId, waitingForOpponent]);

  // Subscribe to opponent selections for real-time visibility
  useEffect(() => {
    if (!isMultiplayer || !sessionId || !opponentPlayerId || gameState.phase !== "playing") {
      setOpponentSelectedDice([]);
      setOpponentSelectedSquares([]);
      return;
    }

    let cancelled = false;

    const pollInterval = setInterval(() => {
      getOpponentSelections(sessionId, opponentPlayerId).then((selections) => {
        if (!cancelled) {
          setOpponentSelectedDice(selections.diceSelections);
          setOpponentSelectedSquares(selections.squareSelections);
          setOpponentValidMoves(selections.validMoves);
        }
      }).catch(error => console.error('[v0] Failed to fetch opponent selections:', error));
    }, 500); // Poll every 500ms for real-time feel

    const channel = subscribeToOpponentSelections(sessionId, opponentPlayerId, (selections) => {
      if (!cancelled) {
        setOpponentSelectedDice(selections.diceSelections);
        setOpponentSelectedSquares(selections.squareSelections);
        setOpponentValidMoves(selections.validMoves);
      }
    });

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
      channel.unsubscribe();
    };
  }, [isMultiplayer, sessionId, opponentPlayerId, gameState.phase]);

  // Automatically set opponent player ID based on local player ID
  useEffect(() => {
    if (!isMultiplayer || !sessionLocalPlayerId || !sessionPlayer1Id || !sessionPlayer2Id) {
      console.log('[v0] Not setting opponent ID:', { isMultiplayer, sessionLocalPlayerId, sessionPlayer1Id, sessionPlayer2Id });
      return;
    }

    const newOpponentId = sessionLocalPlayerId === sessionPlayer1Id ? sessionPlayer2Id : sessionPlayer1Id;
    console.log('[v0] Setting opponent ID:', { sessionLocalPlayerId, newOpponentId, sessionPlayer1Id, sessionPlayer2Id });
    setOpponentPlayerId(newOpponentId);
  }, [isMultiplayer, sessionLocalPlayerId, sessionPlayer1Id, sessionPlayer2Id]);

  // Set current turn when game starts in multiplayer
  useEffect(() => {
    if (
      isMultiplayer &&
      sessionId &&
      sessionPlayer1Id &&
      gameState.phase === "rolling" &&
      !diceRolled
    ) {
      // Player 1 always opens a multiplayer match.
      updateCurrentTurn(sessionId, sessionPlayer1Id);
    }
  }, [isMultiplayer, sessionId, sessionPlayer1Id, gameState.phase, diceRolled]);

  // Update database when turn changes
  useEffect(() => {
    if (!isMultiplayer || !sessionId) return;

    if (gameState.phase === "playing") {
      if (gameState.currentPlayer === 0 && sessionPlayer1Id) {
        updateCurrentTurn(sessionId, sessionPlayer1Id);
      } else if (gameState.currentPlayer === 1 && sessionPlayer2Id) {
        updateCurrentTurn(sessionId, sessionPlayer2Id);
      }
    }
  }, [gameState.currentPlayer, gameState.phase, isMultiplayer, sessionId, sessionPlayer1Id, sessionPlayer2Id]);

  // Get timer seconds based on timer mode
  const getTimerSeconds = (): number => {
    if (timerMode === "disabled") return 0;
    if (timerMode === "3_minutes") return 180;
    if (timerMode === "5_minutes") return 300;
    return 60; // 1 minute default
  };

  // Timer expired - skip turn
  const handleTimeUp = useCallback(() => {
    handleEndTurn();
  }, []);

  const sortDice = (dice: Die[]): Die[] => {
    return [...dice].sort((a, b) => {
      if (a.value === "W" && b.value !== "W") return 1;
      if (a.value !== "W" && b.value === "W") return -1;
      if (a.value === "W" && b.value === "W") return 0;
      return (a.value as number) - (b.value as number);
    });
  };

  const handleSwitchGame = useCallback((url: string) => {
    // Allow free navigation while still in pre-game setup flows.
    const isPreGameState =
      showSetup ||
      showModeSelect ||
      showLobby ||
      showGameSetup ||
      gameState.phase === "setup" ||
      gameState.phase === "rolling" ||
      gameState.phase === "gameOver";

    if (isPreGameState) {
      window.location.href = url;
    } else {
      // Game is in progress, show confirmation
      setPendingExitUrl(url);
      setShowExitConfirmDialog(true);
    }
  }, [showGameSetup, showLobby, showModeSelect, showSetup, gameState.phase]);

  // Sync authenticated user to userId state
  useEffect(() => {
    if (authUser?.id) {
      setUserId(authUser.id);
      setPlayerId(authUser.id);
    }
  }, [authUser?.id]);

  const handleModeSelect = useCallback((mode: ModeOption) => {
    // Force auth for multiplayer flows
    if ((mode === "create" || mode === "join") && !isAuthenticated) {
      setPendingModeAfterAuth(mode);
      setShowAuth(true);
      return;
    }
    if (mode === "active") {
      setShowActiveGames(true);
      return;
    }
    if (mode === "bot") {
      setBotEnabled(true);
      setIsMultiplayer(false);
      setShowSetup(true);
      setShowModeSelect(false);
      setPlayerNames(["Player 1", "Bot"]);
      onGameActiveChange?.(true);
      return;
    }

    if (mode === "local") {
      setBotEnabled(false);
      setIsMultiplayer(false);
      setShowSetup(true);
      setShowModeSelect(false);
      setPlayerNames(["Player 1", "Player 2"]);
      onGameActiveChange?.(true);
      return;
    }

    // Show lobby to find/create multiplayer game (user is authenticated at this point)
    if (mode === "create" || mode === "join") {
      setShowLobby(true);
      setMultiplayerMode("lobby");
      setShowModeSelect(false);
    }
  }, [isAuthenticated]);

  // Handle lobby selection
  const handleSelectLobby = useCallback(
    async (lobbyId: string) => {
      setLobbyLoading(true);
      try {
        const joiningPlayerName = authUser?.playerName || playerNames[0] || "Player";
        const session = await joinGameLobby(
          lobbyId,
          joiningPlayerName,
          authUser?.id || userId || playerId || undefined
        );
        if (session) {
          gameStateVersionRef.current = -1;
          setSessionCode(session.session_code);
          setSessionId(session.id);
          setSessionPlayer1Id(session.player_1_id);
          setSessionPlayer2Id(session.player_2_id);
          setSessionLocalPlayerId(session.player_2_id || null);
          setMultiplayerTargetScore(session.target_score || 37);
          setTimerMode(session.timer_mode || "disabled");
          setIsMultiplayer(true);
          setMultiplayerMode("join");
          setWaitingForOpponent(false);
          setOpponentName(session.player_1_name || "Opponent");
          setPlayerNames([
            session.player_1_name || "Player 1",
            session.player_2_name || joiningPlayerName || "Player 2",
          ]);
          setShowLobby(false);
          onGameActiveChange?.(true);
          // Move straight to setup so both players can start
          setShowSetup(true);
        }
      } catch (error) {
        console.error("Error joining lobby:", error);
      } finally {
        setLobbyLoading(false);
      }
    },
    [authUser?.id, authUser?.playerName, playerId, playerNames, userId]
  );

  // Handle create new lobby button
  const handleCreateNewLobby = useCallback(() => {
    setShowGameSetup(true);
  }, []);

  // Handle resuming a game from active games list
  const handleResumeGame = useCallback(async (resumeSessionId: string) => {
    try {
      const session = await getGameSessionById(resumeSessionId);
      if (session) {
        gameStateVersionRef.current = -1;
        const activePlayerId = userId || playerId;
        const isCurrentUserPlayerOne = activePlayerId === session.player_1_id;
        const resolvedLocalPlayerId = isCurrentUserPlayerOne
          ? session.player_1_id
          : activePlayerId === session.player_2_id
            ? session.player_2_id
            : session.player_1_id;
        const resolvedOpponentId = isCurrentUserPlayerOne
          ? session.player_2_id
          : session.player_1_id;
        const resolvedOpponentName = isCurrentUserPlayerOne
          ? session.player_2_name || "Opponent"
          : session.player_1_name || "Opponent";

        setSessionCode(session.session_code);
        setSessionId(session.id);
        setSessionPlayer1Id(session.player_1_id);
        setSessionPlayer2Id(session.player_2_id);
        setSessionLocalPlayerId(resolvedLocalPlayerId);
        setMultiplayerTargetScore(session.target_score || 37);
        setTimerMode(session.timer_mode || "disabled");
        setIsMultiplayer(true);
        setMultiplayerMode("join");
        setWaitingForOpponent(false);
        setOpponentHasJoined(!!session.player_2_id);
        setOpponentPlayerId(resolvedOpponentId);
        setOpponentName(resolvedOpponentName);
        onGameActiveChange?.(true);
        setPlayerNames([
          session.player_1_name || "Player 1",
          session.player_2_name || "Player 2",
        ]);
        setShowActiveGames(false);
        setShowSetup(false);
        setShowModeSelect(false);
        setShowLobby(false);
        setShowGameSetup(false);

        const restored = await loadLatestSavedGameState(session.id);
        if (!restored) {
          setGameState((prev) => ({
            ...prev,
            players: [
              { ...prev.players[0], name: session.player_1_name || "Player 1" },
              { ...prev.players[1], name: session.player_2_name || "Player 2" },
            ],
            phase: session.status === "active" ? "rolling" : prev.phase,
            message:
              session.status === "active"
                ? "Live match restored. Roll the dice to continue."
                : prev.message,
          }));
        }
      }
    } catch (error) {
      console.error("Error resuming game:", error);
    }
  }, [loadLatestSavedGameState, playerId, userId]);

  const handleCancelMultiplayer = useCallback(async () => {
    if (sessionCode) {
      await cancelGameLobby(sessionCode);
    }
    setIsMultiplayer(false);
    setWaitingForOpponent(false);
    setSessionId(null);
    setSessionCode(null);
    setSessionPlayer1Id(null);
    setSessionPlayer2Id(null);
    setSessionLocalPlayerId(null);
    setShowModeSelect(true);
  }, [sessionCode]);

  const handleCreateNewGameFromWaitingRoom = useCallback(async () => {
    if (sessionCode) {
      await cancelGameLobby(sessionCode);
    }
    setWaitingForOpponent(false);
    setOpponentHasJoined(false);
    setSessionId(null);
    setSessionCode(null);
    setSessionPlayer1Id(null);
    setSessionPlayer2Id(null);
    setSessionLocalPlayerId(null);
    setShowLobby(false);
    setShowGameSetup(true);
    setShowModeSelect(false);
  }, [sessionCode]);
  // Host: auto-start when opponent joins
  useEffect(() => {
    if (!waitingForOpponent || !sessionCode) return;
    let cancelled = false;
    
    // Function to check for opponent join
    const checkForOpponent = async () => {
      if (cancelled) return;
      try {
        const session = await getGameSession(sessionCode);
        if (session && session.player_2_id) {
          setSessionPlayer1Id(session.player_1_id);
          setSessionPlayer2Id(session.player_2_id);
          setMultiplayerTargetScore(session.target_score || 37);
          setOpponentHasJoined(true);
          setOpponentName(session.player_2_name || "Opponent");
        }
      } catch (err) {
        console.error('Error polling session:', err);
      }
    };
    
    // Check immediately and then every 1.5 seconds
    checkForOpponent();
    const pollInterval = setInterval(checkForOpponent, 1500);

    // Also set up real-time subscription
const channel = subscribeToSession(sessionCode, (session) => {
  if (cancelled || !session) return;
  setSessionId(session.id);
  setSessionPlayer1Id(session.player_1_id);
  setSessionPlayer2Id(session.player_2_id);
  setMultiplayerTargetScore(session.target_score || 37);
  setGameDiceSkin(session.dice_skin || "standard");
  setPlayerNames([
    session.player_1_name || "Player 1",
    session.player_2_name || "Player 2",
  ]);
      if (session.player_2_id) {
        setOpponentHasJoined(true);
        setOpponentName(session.player_2_name || "Opponent");
        setOpponentPlayerId(session.player_2_id);
      }
    });

    return () => {
      cancelled = true;
      channel.unsubscribe();
      clearInterval(pollInterval);
    };
  }, [waitingForOpponent, sessionCode]);

  // Handle game setup submission
  const handleGameSetupSubmit = useCallback(
    async (settings: {
      playerName: string;
      targetScore?: number;
      botDifficulty?: string;
      timerMode?: string;
    }) => {
      // Verify user is authenticated before creating online game
      if (!authUser?.id) {
        setShowAuth(true);
        return;
      }

      setLobbyLoading(true);
      try {
        // Use the authenticated user ID
        const playerIdToUse = authUser.id;
        
        const session = await createGameLobby(
          settings.playerName,
          {
            targetScore: settings.targetScore,
            botDifficulty: settings.botDifficulty,
            timerMode: settings.timerMode,
          },
          playerIdToUse
        );
        if (session) {
          gameStateVersionRef.current = -1;
          setSessionCode(session.session_code);
          setSessionId(session.id);
          setSessionPlayer1Id(session.player_1_id);
          setSessionPlayer2Id(session.player_2_id);
          setSessionLocalPlayerId(session.player_1_id);
          setMultiplayerTargetScore(settings.targetScore || session.target_score || 37);
          setTimerMode(session.timer_mode || "disabled");
          setIsMultiplayer(true);
          setMultiplayerMode("create");
          setWaitingForOpponent(true);
          setShowGameSetup(false);
          setShowLobby(false);
          setPlayerNames([settings.playerName || "Player 1", "Player 2"]);
          onGameActiveChange?.(true);
        }
      } catch (error) {
        console.error("Error creating lobby:", error);
      } finally {
        setLobbyLoading(false);
      }
    },
    [authUser?.id, playerId, selectedGameType, userId]
  );

  // Roll dice for both players at game start
  const handleRoll = useCallback(async () => {
    if (isMultiplayer && sessionId && sessionLocalPlayerId) {
      // Log state at roll time to diagnose sync issues
      console.log("[v0] handleRoll: current local state", {
        currentPlayer: gameState.currentPlayer,
        currentPlayerName: gameState.players[gameState.currentPlayer]?.name,
        gameStarterIndex: gameState.gameStarterIndex,
        roundStarterIndex: gameState.roundStarterIndex,
        phase: gameState.phase,
        roundNumber: gameState.roundNumber,
        sessionLocalPlayerId,
        player1Id: gameState.players[0]?.id,
        player2Id: gameState.players[1]?.id,
      });
      
      const valid = await validateTurn(sessionId, sessionLocalPlayerId);
      console.log("[v0] handleRoll: validateTurn response", valid);
      
      if (!valid.valid) {
        console.log("[v0] handleRoll: turn validation failed", {
          error: valid.error,
          currentTurnPlayerId: valid.currentTurnPlayer,
          localPlayerId: sessionLocalPlayerId,
          players: gameState.players.map(p => ({ name: p.name, id: p.id })),
        });
        setGameState((prev) => ({ ...prev, message: valid.error || "Not your turn" }));
        return;
      }
    }

    const dice1 = rollDice().map((d, i) => ({ ...d, id: `p1-${i}` }));
    const dice2 = rollDice().map((d, i) => ({ ...d, id: `p2-${i}` }));
    const nextGameState = {
      ...gameState,
      phase: "playing" as const,
      selectedDice: [],
      message: `${gameState.players[gameState.currentPlayer].name}, select dice to match a space's factorization`,
    };
    
    setPlayer1Dice(sortDice(dice1));
    setPlayer2Dice(sortDice(dice2));
    setDiceRolled(true);
    setGameState(nextGameState);

    void persistGameState('roll', {
      gameState: nextGameState,
      player1Dice: sortDice(dice1),
      player2Dice: sortDice(dice2),
      diceRolled: true,
    });
  }, [gameState, isMultiplayer, sessionId, sessionLocalPlayerId, persistGameState]);

  // Claim a space
  const handleClaim = useCallback(async () => {
    if (!selectedSpace || !canClaimSpace) return;

    // During remaining dice bonus phase, skip turn validation
    // (opponent is exhausted, so turn validation doesn't apply)
    const otherPlayerIndex = 1 - gameState.currentPlayer;
    const playerExhausted = gameState.playerExhausted || [false, false];
    const isRemainingDicePhase = playerExhausted[otherPlayerIndex] === true;

    if (isMultiplayer && sessionId && sessionLocalPlayerId && !isRemainingDicePhase) {
      const valid = await validateTurn(sessionId, sessionLocalPlayerId);
      if (!valid.valid) {
        setGameState((prev) => ({ ...prev, message: valid.error || "Not your turn" }));
        return;
      }
    }
    
    const pos = getAnimationPosition();
    
    // Only remove dice that actually match the space's factors, not all selected dice
    const selectedDieObjects = currentPlayerDice.filter((d) =>
      gameState.selectedDice.includes(d.id)
    );
    const factors = [...selectedSpace.factors];
    const diceToRemove: string[] = [];
    
    // Match each factor to a selected die (exact match first, then wilds)
    for (const factor of factors) {
      // Try exact match first
      const exactMatch = selectedDieObjects.find(
        (d) => !diceToRemove.includes(d.id) && d.value === factor
      );
      if (exactMatch) {
        diceToRemove.push(exactMatch.id);
        continue;
      }
      // Try wild match
      const wildMatch = selectedDieObjects.find(
        (d) => !diceToRemove.includes(d.id) && d.value === "W"
      );
      if (wildMatch) {
        diceToRemove.push(wildMatch.id);
      }
    }

    const currentPlayerIndex = gameState.currentPlayer;
    const nextPlayer1Dice =
      currentPlayerIndex === 0
        ? player1Dice.filter((d) => !diceToRemove.includes(d.id))
        : player1Dice;
    const nextPlayer2Dice =
      currentPlayerIndex === 1
        ? player2Dice.filter((d) => !diceToRemove.includes(d.id))
        : player2Dice;

    const newBoard = gameState.board.map((space) =>
      space.number === selectedSpace.number
        ? { ...space, owner: currentPlayerIndex, claimed: true }
        : space
    );

    // Clear opponent's selections when a space is claimed
    if (isMultiplayer && sessionId && opponentPlayerId) {
      clearOpponentSelections(sessionId, opponentPlayerId).catch(error =>
        console.error('[v0] Failed to clear opponent selections:', error)
      );
    }

    const { bonusPoints: bonusGained, breakdown } = checkForNewBonus(newBoard, selectedSpace.number);

    const nextBonusHistory =
      breakdown.length > 0
        ? [
            ...bonusHistory,
            {
              player: gameState.players[currentPlayerIndex].name,
              space: selectedSpace.number,
              round: gameState.roundNumber,
              breakdown,
            },
          ]
        : bonusHistory;

    const playerColor = PLAYER_COLORS[currentPlayerIndex];
    const newTracks: CompletedTrack[] = breakdown.map((b, i) => ({
      id: `track-${Date.now()}-${i}`,
      primeStart: b.primeStart,
      primeEnd: b.primeEnd,
      spaces: b.spaces,
      direction: b.direction,
      playerColor,
      animating: true,
    }));
    const nextCompletedTracks =
      breakdown.length > 0 ? [...completedTracks, ...newTracks] : completedTracks;

    const newPlayers = gameState.players.map((player, idx) => {
      if (idx === currentPlayerIndex) {
        return {
          ...player,
          score: player.score + 1,
          bonusPoints: player.bonusPoints + bonusGained,
        };
      }
      return player;
    });

    // Only play sounds and animations for bonus points
    if (bonusGained > 0 && pos) {
      playCapturSound();
      playFireworksSound();
      spawnFireworks(pos.x, pos.y);
      spawnPointAnimation(pos.x, pos.y - 40, bonusGained, true);
    }

    const totalScore =
      newPlayers[currentPlayerIndex].score +
      newPlayers[currentPlayerIndex].bonusPoints;

    const nextGameState =
      totalScore >= gameState.targetScore
        ? {
            ...gameState,
            board: newBoard,
            players: newPlayers,
            selectedDice: [],
            phase: "gameOver" as const,
            message: `${newPlayers[currentPlayerIndex].name} wins with ${totalScore} points!`,
          }
        : {
            ...gameState,
            board: newBoard,
            players: newPlayers,
            currentPlayer: (currentPlayerIndex + 1) % gameState.players.length,
            player1HasMoved: currentPlayerIndex === 0 ? true : gameState.player1HasMoved,
            player2HasMoved: currentPlayerIndex === 1 ? true : gameState.player2HasMoved,
            selectedDice: [],
            message: `Claimed space ${selectedSpace.number}! ${newPlayers[(currentPlayerIndex + 1) % gameState.players.length].name}'s turn.`,
          };

    if (currentPlayerIndex === 0) {
      setPlayer1Dice(nextPlayer1Dice);
    } else {
      setPlayer2Dice(nextPlayer2Dice);
    }

    if (breakdown.length > 0) {
      setBonusHistory(nextBonusHistory);
      setCompletedTracks(nextCompletedTracks);
      // Tracks animate sequentially (~3s each), so wait for all of them to finish
      // before finalizing. A fixed delay would cut off later tracks mid-draw.
      const finalizeDelay = newTracks.length * 3000 + 500;
      setTimeout(() => {
        setCompletedTracks((prev) =>
          prev.map((t) =>
            newTracks.some((nt) => nt.id === t.id)
              ? { ...t, animating: false }
              : t
          )
        );
      }, finalizeDelay);
    }

    // Track the last claimed space for highlighting
    setLastClaimedSpace(selectedSpace.number);

    // Record most recent capture for the claiming player (drives the factorization box)
    const capturedNumber = selectedSpace.number;
    setLastCapturePerPlayer((prev) => {
      const next = [...prev];
      next[currentPlayerIndex] = {
        number: capturedNumber,
        key: (prev[currentPlayerIndex]?.key ?? 0) + 1,
      };
      return next;
    });
    
    // Sync last capture through gameState for multiplayer
    if (isMultiplayer) {
      setGameState((prev) => ({
        ...prev,
        lastCapturePerPlayer: [
          prev.lastCapturePerPlayer?.[0] ?? null,
          prev.lastCapturePerPlayer?.[1] ?? null,
        ].map((capture, idx) => 
          idx === currentPlayerIndex 
            ? { space: capturedNumber, factors: selectedSpace.factors }
            : capture
        ),
      }));
    }
    
    // Reset manual selection flag after claiming
    manualSelectionRef.current = false;

    if (totalScore >= gameState.targetScore && pos) {
      playVictorySound();
      
      // Get all numbers owned by the winning player
      const ownedNumbers = gameState.board
        .filter((space) => space.owner === gameState.currentPlayer)
        .map((space) => space.number)
        .sort((a, b) => a - b);
      
      // Start train celebration with owned numbers
      setCelebrationNumbers(ownedNumbers);
      setIsTrainCelebrating(true);
    }

    setGameState(nextGameState);
    setSelectedSpace(null);
    void persistGameState('claim', {
      gameState: nextGameState,
      player1Dice: nextPlayer1Dice,
      player2Dice: nextPlayer2Dice,
      diceRolled: true,
      bonusHistory: nextBonusHistory,
      completedTracks: nextCompletedTracks,
    });
  }, [selectedSpace, canClaimSpace, isMultiplayer, sessionId, sessionLocalPlayerId, getAnimationPosition, currentPlayerDice, gameState, player1Dice, player2Dice, bonusHistory, completedTracks, persistGameState, spawnPointAnimation, spawnFireworks]);

  // Cancel selection
  const handleCancel = useCallback(() => {
    setGameState((prev) => ({ ...prev, selectedDice: [] }));
    setSelectedSpace(null);
    setDiceAutoSelected(false);
  }, []);

  // Check if a specific player has any valid moves
  const checkPlayerHasMoves = useCallback((playerIndex: number, board: BoardSpace[]) => {
    const playerDice = playerIndex === 0 ? player1Dice : player2Dice;
    // If player has no dice but still has unclaimed spaces, they still have moves
    // (they may be able to continue with different dice combinations or pass their turn)
    
    const availableSpaces = board.filter(
      (space) => !space.isPrime && space.owner === null && space.number !== 0 && !space.claimed
    );
    
    // If there are no available spaces, player has no moves
    if (availableSpaces.length === 0) return false;
    
    // If player has dice, check if any combination matches
    if (playerDice.length > 0) {
      for (const space of availableSpaces) {
        const factors = space.factors;
        if (factors.length === 0) continue;
        const match = canMatchFactorization(factors, playerDice);
        if (match !== null) return true;
      }
      return false;
    }
    
    // If player has no dice but spaces are available, they still have potential moves
    return true;
  }, [player1Dice, player2Dice]);

  // End turn
  const handleEndTurn = useCallback(async () => {
    if (isMultiplayer && sessionId && sessionLocalPlayerId) {
      const valid = await validateTurn(sessionId, sessionLocalPlayerId);
      if (!valid.valid) {
        setGameState((prev) => ({ ...prev, message: valid.error || "Not your turn" }));
        return;
      }
    }

    if (hasAnyValidMove) {
      setGameState((prev) => ({
        ...prev,
        message: "You still have valid moves! You must play if you can.",
      }));
      return;
    }

    // Keep track of which players are exhausted
    // Note: If this is called and player has no valid moves, they should already be marked exhausted
    // from the auto-skip effect, so we just pass through the current exhausted state
    const playerExhausted = gameState.playerExhausted || [false, false];
    const newExhausted = [...playerExhausted];

    const nextPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
    
    // Find next active player (skip exhausted players)
    let activeNextPlayer = nextPlayer;
    let skippedPlayers = false;
    while (newExhausted[activeNextPlayer] && activeNextPlayer !== gameState.currentPlayer) {
      activeNextPlayer = (activeNextPlayer + 1) % gameState.players.length;
      skippedPlayers = true;
    }

    // Check if all players are exhausted (round complete)
    const allExhausted = newExhausted.every((exhausted) => exhausted);
    
    console.log("[v0] handleEndTurn: checking round status", {
      newExhausted,
      allExhausted,
      activeNextPlayer,
      currentPlayer: gameState.currentPlayer,
    });
    
    let nextGameState;
    if (allExhausted) {
      // Round is complete - all players exhausted
      console.log("[v0] handleEndTurn: all players exhausted, ending round");
      nextGameState = {
        ...gameState,
        phase: "roundEnd",
        selectedDice: [],
        playerExhausted: [false, false],
        message: `Round ${gameState.roundNumber} complete! All players are out of moves. Click "Ready for Next Round" when ready.`,
      };
    } else {
      // Continue to next player
      nextGameState = {
        ...gameState,
        currentPlayer: activeNextPlayer,
        selectedDice: [],
        playerExhausted: newExhausted,
        message: skippedPlayers 
          ? `${gameState.players[activeNextPlayer].name}'s turn! Select dice to claim a space.`
          : `${gameState.players[activeNextPlayer].name}'s turn! Select dice to claim a space.`,
      };

      // Play opponent move sound when transitioning to next player
      if (nextGameState.currentPlayer !== gameState.currentPlayer) {
        playOpponentMoveSound();
      }
    }

    setGameState(nextGameState);
    void persistGameState('end-turn', {
      gameState: nextGameState,
      diceRolled,
    });
  }, [checkPlayerHasMoves, diceRolled, gameState, hasAnyValidMove, isMultiplayer, sessionId, sessionLocalPlayerId, persistGameState]);

  // Bot auto-play effect with proper lock management
  useEffect(() => {
    if (!botEnabled || isMultiplayer) return;
    if (gameState.currentPlayer !== 1) return;
    if (gameState.phase !== "playing") return;
    if (botTurnScheduledRef.current) return;

    botTurnScheduledRef.current = true;

    const timer = setTimeout(() => {
      // Read fresh state from ref — never use stale closure values
      const current = gameStateRef.current;
      if (!current || current.currentPlayer !== 1 || current.phase !== "playing") {
        botTurnScheduledRef.current = false;
        return;
      }

      // Read fresh dice / difficulty from refs (not stale closure values)
      const botDice = player2DiceRef.current;
      const botMove = getBotMoveForMultiplication(current.board, botDice, botDifficultyRef.current);

      if (!botMove) {
        // Bot has no moves — end its turn and release lock
        botTurnScheduledRef.current = false;
        setGameState(prev => {
          if (prev.currentPlayer !== 1) return prev;
          const nextPlayer = (prev.currentPlayer + 1) % prev.players.length;
          return {
            ...prev,
            currentPlayer: nextPlayer,
            selectedDice: [],
            message: `Bot has no valid moves. ${prev.players[nextPlayer].name}'s turn. Roll your dice.`,
          };
        });
        return;
      }

      // Execute bot move inline — no nested setTimeouts
      const space = current.board.find(s => s.number === botMove.spaceNumber);
      if (!space) { botTurnScheduledRef.current = false; return; }

      const factors = [...space.factors];
      const selectedDieObjects = botDice.filter(d => botMove.diceIds.includes(d.id));
      const diceToRemove: string[] = [];
      for (const factor of factors) {
        const exact = selectedDieObjects.find(d => !diceToRemove.includes(d.id) && d.value === factor);
        if (exact) { diceToRemove.push(exact.id); continue; }
        const wild = selectedDieObjects.find(d => !diceToRemove.includes(d.id) && d.value === "W");
        if (wild) diceToRemove.push(wild.id);
      }

      setPlayer2Dice(prev => prev.filter(d => !diceToRemove.includes(d.id)));

      setGameState(prev => {
        // CRITICAL: verify it's still bot's turn before applying
        if (prev.currentPlayer !== 1 || prev.phase !== "playing") {
          botTurnScheduledRef.current = false;
          return prev;
        }

        const newBoard = prev.board.map(s =>
          s.number === space.number ? { ...s, owner: 1, claimed: true } : s
        );
        const { bonusPoints: bonusGained, breakdown } = checkForNewBonus(newBoard, space.number);
        const newPlayers = prev.players.map((p, i) =>
          i === 1 ? { ...p, score: p.score + 1, bonusPoints: p.bonusPoints + bonusGained } : p
        );
        const totalScore = newPlayers[1].score + newPlayers[1].bonusPoints;

        if (totalScore >= prev.targetScore) {
          botTurnScheduledRef.current = false;
          setCelebrationNumbers(ownedNumbers);
          setIsTrainCelebrating(true);
          return { 
            ...prev, 
            board: newBoard, 
            players: newPlayers, 
            selectedDice: [], 
            phase: "gameOver",
            message: `Bot wins with ${totalScore} points!` 
          };
        }

        // Handle bonus points if applicable
        if (breakdown.length > 0) {
          setBonusHistory((prevHistory) => [
            ...prevHistory,
            {
              player: prev.players[1].name,
              space: space.number,
              round: prev.roundNumber,
              breakdown,
            },
          ]);
          
          const playerColor = PLAYER_COLORS[1];
          const newTracks: CompletedTrack[] = breakdown.map((b, i) => ({
            id: `track-${Date.now()}-${i}`,
            primeStart: b.primeStart,
            primeEnd: b.primeEnd,
            spaces: b.spaces,
            direction: b.direction,
            playerColor,
            animating: true,
          }));
          
          setCompletedTracks((tracks) => [...tracks, ...newTracks]);
          
          // Tracks animate sequentially (~3s each); wait for all before finalizing.
          const botFinalizeDelay = newTracks.length * 3000 + 500;
          setTimeout(() => {
            setCompletedTracks((tracks) =>
              tracks.map((t) =>
                newTracks.some((nt) => nt.id === t.id)
                  ? { ...t, animating: false }
                  : t
              )
            );
          }, botFinalizeDelay);
        }

        // Switch to player 0 and release lock AFTER state is applied
        botTurnScheduledRef.current = false;
        
        if (bonusGained > 0) {
          playCapturSound();
          playFireworksSound();
          const botAnimPos = getAnimationPosition();
          spawnFireworks(botAnimPos.x, botAnimPos.y);
        }
        
        playOpponentMoveSound();
        setLastClaimedSpace(space.number);

        return {
          ...prev,
          board: newBoard,
          players: newPlayers,
          currentPlayer: 0,   // ← human's turn
          selectedDice: [],
          message: `Bot claimed space ${space.number}! ${newPlayers[0].name}'s turn.`,
        };
      });

    }, 1500);

    // CRITICAL: do NOT clear botTurnScheduledRef in cleanup
    // Only clear the timer itself
    return () => clearTimeout(timer);

    // NOTE: player2Dice / diceRolled are intentionally NOT dependencies. They can
    // change during the bot's 1500ms "thinking" delay, which would tear down the
    // timer while the lock ref stays set, leaving the bot stuck (it never moves).
    // The timer reads fresh dice from player2DiceRef instead.
  }, [botEnabled, gameState.currentPlayer, gameState.phase, isMultiplayer]);

  // Start new round - show confirmation modal
  const handleReadyForNextRound = useCallback(() => {
    console.log("[v0] handleReadyForNextRound called, localPlayerIndex:", localPlayerIndex);
    const nextGameState = {
      ...gameState,
      readyConfirmationActive: true,
      readyConfirmationInitiator: localPlayerIndex,
      readyConfirmationCountdown: 15,
    };

    console.log("[v0] Setting ready confirmation active, state:", nextGameState);
    setGameState(nextGameState);
    void persistGameState('ready-confirmation-started', {
      gameState: nextGameState,
    });
  }, [gameState, localPlayerIndex, persistGameState]);

  const handleNewRound = useCallback(() => {
    // Reset skip flag when starting new round
    skipHappenedThisRoundRef.current = false;
    
    const nextRoundNumber = gameState.roundNumber + 1;
    
    // Deterministically calculate the starter for this round based on game starter and round number
    const gameStarter = gameState.gameStarterIndex ?? 0;
    const nextRoundStarterIndex = calculateRoundStarter(nextRoundNumber, gameStarter);
    
    console.log("[v0] HANDLE NEW ROUND - calculating next starter", {
      nextRoundNumber,
      gameStarter,
      nextRoundStarterIndex,
      nextPlayerName: gameState.players[nextRoundStarterIndex]?.name,
      localPlayerId: sessionLocalPlayerId,
    });
    
    const nextGameState = {
      ...gameState,
      roundNumber: nextRoundNumber,
      roundStarterIndex: nextRoundStarterIndex,
      player1HasMoved: false,
      player2HasMoved: false,
      phase: "rolling" as const, // Set to rolling so players need to roll first
      currentPlayer: nextRoundStarterIndex,
      selectedDice: [],
      player1Ready: false,
      player2Ready: false,
      readyConfirmationActive: false,
      readyConfirmationInitiator: null,
      readyConfirmationCountdown: 0,
      playerExhausted: [false, false],
      message: `Round ${nextRoundNumber} begins — ${gameState.players[nextRoundStarterIndex].name}, roll your dice!`,
    };

    // Reset dice rolling state for new round but preserve remaining dice
    // Players keep their unused dice from the previous round
    setDiceRolled(false);
    setGameState(nextGameState);
    
    void persistGameState('new-round', {
      gameState: nextGameState,
      // Preserve remaining dice - players continue with what they have left
      player1Dice,
      player2Dice,
      diceRolled: false,
    });
    
    // In multiplayer, update the database to reflect the new round starter
    if (isMultiplayer && sessionId) {
      const newRoundStarterPlayerId = gameState.players[nextRoundStarterIndex]?.id;
      if (newRoundStarterPlayerId) {
        void updateCurrentTurn(sessionId, newRoundStarterPlayerId);
      }
    }
  }, [gameState, persistGameState, isMultiplayer, sessionId]);

  // Watch for when both players are ready and trigger next round
  // Guard against idempotency: only fire if readyConfirmationActive is false (modal closed by both players)
  useEffect(() => {
    console.log("[v0] Both ready effect checking - phase:", gameState.phase, "p1Ready:", gameState.player1Ready, "p2Ready:", gameState.player2Ready, "confirmationActive:", gameState.readyConfirmationActive, "isMultiplayer:", isMultiplayer);
    if (
      gameState.phase === "roundEnd" && 
      gameState.player1Ready && 
      gameState.player2Ready && 
      !gameState.readyConfirmationActive &&
      isMultiplayer
    ) {
      console.log("[v0] All conditions met - calling handleNewRound!");
      const timer = setTimeout(() => {
        handleNewRound();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [gameState.phase, gameState.player1Ready, gameState.player2Ready, gameState.readyConfirmationActive, isMultiplayer, handleNewRound]);

  // Handle confirmation for ready next round
  const handleConfirmReady = useCallback(() => {
    console.log("[v0] handleConfirmReady called");
    // Both players are now ready - mark both as ready
    const nextGameState = {
      ...gameState,
      readyConfirmationActive: false,
      readyConfirmationInitiator: null,
      readyConfirmationCountdown: 0,
      player1Ready: true,
      player2Ready: true,
    };

    console.log("[v0] Confirmed ready - setting both players ready, state:", nextGameState);
    setGameState(nextGameState);
    void persistGameState('player-confirmed-ready', {
      gameState: nextGameState,
    });
  }, [gameState, persistGameState]);

  // Handle decline for ready next round
  const handleDeclineReady = useCallback(() => {
    const nextGameState = {
      ...gameState,
      readyConfirmationActive: false,
      readyConfirmationInitiator: null,
      readyConfirmationCountdown: 0,
    };

    setGameState(nextGameState);
    void persistGameState('player-declined-ready', {
      gameState: nextGameState,
    });
  }, [gameState, persistGameState]);

  // Countdown timer for ready confirmation
  useEffect(() => {
    if (!gameState.readyConfirmationActive || gameState.readyConfirmationCountdown === 0) {
      return;
    }

    const timer = setInterval(() => {
      setGameState((prev) => ({
        ...prev,
        readyConfirmationCountdown: Math.max(0, (prev.readyConfirmationCountdown || 15) - 1),
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.readyConfirmationActive]);

  // Auto-advance when countdown reaches 0
  useEffect(() => {
    if (gameState.readyConfirmationActive && gameState.readyConfirmationCountdown === 0 && isMultiplayer) {
      const timer = setTimeout(() => {
        const isPlayer1 = localPlayerIndex === 0;
        const nextGameState = {
          ...gameState,
          readyConfirmationActive: false,
          readyConfirmationInitiator: null,
          readyConfirmationCountdown: 0,
          player1Ready: true,
          player2Ready: true,
        };

        setGameState(nextGameState);
        void persistGameState('ready-confirmation-auto-advance', {
          gameState: nextGameState,
        });
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [gameState.readyConfirmationActive, gameState.readyConfirmationCountdown, gameState, isMultiplayer, localPlayerIndex, persistGameState]);

  // Reorder dice
  const handleReorderPlayer1Dice = useCallback((newOrder: Die[]) => {
    setPlayer1Dice(newOrder);
  }, []);

  const handleReorderPlayer2Dice = useCallback((newOrder: Die[]) => {
    setPlayer2Dice(newOrder);
  }, []);

  // New game
  const handleNewGame = useCallback(() => {
    gameStateVersionRef.current = -1;
    setSessionLocalPlayerId(null);
    setShowSetup(true);
  }, []);

  // Get selected dice objects
  const selectedDiceObjects = currentPlayerDice.filter((d) =>
    gameState.selectedDice.includes(d.id)
  );

  // Combine validMoves and possibleMoveHighlights for board display
  const allHighlightedMoves = useMemo(() => {
    const set = new Set([...validMoves, ...possibleMoveHighlights]);
    return Array.from(set);
  }, [validMoves, possibleMoveHighlights]);

  const showPreGameSetupPage = showModeSelect || showGameSetup || showLobby;

  if (showPreGameSetupPage) {
    return (
      <div className="min-h-screen game-setup-bg">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
          <div>
            <div className="rounded-[28px] border border-slate-200/70 bg-white/90 p-6 shadow-[0_24px_80px_-28px_rgba(37,99,235,0.35)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
              {showModeSelect && (
                <MultiplayerModeSelector
                  onModeSelect={handleModeSelect}
                  gameName="Multiplication Game"
                  hasActiveGames={hasResumableGames}
                  onViewActiveGames={() => setShowActiveGames(true)}
                />
              )}
              
              {showLobby && (
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      setShowLobby(false);
                      setShowModeSelect(true);
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
                  >
                    ← Back to modes
                  </button>
                  <GameLobby
                    onSelectLobby={(lobbyId) => {
                      handleSelectLobby(lobbyId);
                    }}
                    onCreateNew={() => {
                      // Check auth before allowing game creation
                      if (!authUser?.id) {
                        setShowAuth(true);
                        return;
                      }
                      setShowGameSetup(true);
                      setShowLobby(false);
                    }}
                    isOpen={showLobby}
                  />
                </div>
              )}

              {showGameSetup && (
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      setShowGameSetup(false);
                      setShowLobby(true);
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
                  >
                    ← Back to lobby
                  </button>
                  <GameSetupForm
                    defaultPlayerName={playerNames[0] || ""}
                    onCreateLobby={handleGameSetupSubmit}
                    onCancel={() => {
                      setShowGameSetup(false);
                      setShowLobby(true);
                    }}
                    isLoading={lobbyLoading}
                    isMultiplayer={true}
                  />
                </div>
              )}
            </div>
          </div>

          <AuthDialog
            open={showAuth}
            onOpenChange={setShowAuth}
            onAuthed={(name, _email, userId) => {
              if (userId) {
                setUserId(userId);
                setPlayerId(userId);
              }
              setPlayerNames([name || "Player 1", playerNames[1]]);
              
              // If there's a pending mode after auth, continue with it
              if (pendingModeAfterAuth) {
                setShowAuth(false);
                // Use a small delay to ensure state updates have propagated
                setTimeout(() => {
                  handleModeSelect(pendingModeAfterAuth);
                  setPendingModeAfterAuth(null);
                }, 0);
              }
            }}
          />

          <ActiveGamesDialog
            open={showActiveGames}
            onOpenChange={setShowActiveGames}
            userId={userId}
            gameType={selectedGameType}
            onResumeGame={handleResumeGame}
          />
        </div>
      </div>
    );
  }

  return (
  <div className="min-h-screen bg-background p-4">
  <div className="max-w-[1800px] mx-auto space-y-4">
        {/* Main Game Area - Board with scores and bonuses on sides */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left side - Player 1 Score & Bonus & Dice */}
          <div className="flex flex-col gap-4 lg:w-64 lg:shrink-0">
            {/* Controls above the scorecard - Timer and Game Controls */}
            <div className="flex flex-col items-center gap-4">
              {timerMode !== "disabled" && (
                <GameTimer
                  initialSeconds={getTimerSeconds()}
                  onTimeUp={handleTimeUp}
                  isActive={gameState.phase === "playing"}
                  currentPlayer={gameState.currentPlayer}
                  playerColors={PLAYER_COLORS}
                />
              )}

              <GameControls
                phase={gameState.phase}
                canRoll={!diceRolled && gameState.phase === "rolling" && isLocalPlayersTurn}
                canEndTurn={gameState.phase === "playing" && gameState.phase !== "gameOver" && isLocalPlayersTurn}
                hasValidMoves={hasAnyValidMove}
                onRoll={handleRoll}
                onEndTurn={handleEndTurn}
                onNewRound={handleNewRound}
                onReadyForNextRound={handleReadyForNextRound}
                onNewGame={handleNewGame}
                message={gameState.message}
                player1Ready={gameState.player1Ready}
                player2Ready={gameState.player2Ready}
                isMultiplayer={isMultiplayer}
                roundNumber={gameState.roundNumber}
              />
              
              {/* Rules and Tutorial buttons below Roll Dice */}
              <div className="flex gap-2 flex-wrap justify-center mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowRules(true)}
                  className="gap-2"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Rules</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowTutorial(true)}
                  className="gap-2"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Tutorial</span>
                </Button>
              </div>
            </div>

            <div className="flex flex-row gap-2 items-stretch">
              <div className="border rounded-lg p-4 bg-card flex-1 min-w-0">
              <h3 className="font-semibold text-sm mb-3">{gameState.players[0].name}</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Captured Squares:</span>
                  <span className="font-bold">{gameState.players[0].score}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bonus:</span>
                  <span className="font-bold text-amber-600">{gameState.players[0].bonusPoints}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Total Score:</span>
                    <span>{gameState.players[0].score + gameState.players[0].bonusPoints}</span>
                  </div>
                </div>
              </div>
              </div>
              <FactorizationBox capture={lastCapturePerPlayer[0]} />
            </div>

            {/* Player 1 Dice - Hide when P2 is round starter on first move, hide during rolling phase, always show on P1's turn */}
            {diceRolled && gameState.phase !== "rolling" &&
              (gameState.currentPlayer === 0 || !(gameState.roundStarterIndex === 1 && !gameState.player2HasMoved)) && (
              <div className={`${gameState.currentPlayer === 0 ? "ring-2 ring-primary rounded-lg" : "opacity-60"}`}>
                <DiceTray
                  dice={player1Dice}
                  selectedDice={gameState.currentPlayer === 0 ? gameState.selectedDice : []}
                  onDieClick={handleDieClick}
                  onReorder={handleReorderPlayer1Dice}
                  disabled={
                    gameState.phase !== "playing" ||
                    gameState.currentPlayer !== 0 ||
                    (isMultiplayer && localPlayerIndex !== 0)
                  }
                  playerName={gameState.players[0].name}
                  showActions={gameState.currentPlayer === 0 && selectedSpace !== null && selectedDiceObjects.length > 0}
                  canClaim={canClaimSpace}
                  onClaim={handleClaim}
                  onCancel={handleCancel}
                  skins={!isMultiplayer || localPlayerIndex === 0 ? diceSkins : null}
                  opponentSelectedDice={isMultiplayer && localPlayerIndex === 1 ? opponentSelectedDice : []}
                />
              </div>
            )}

            {/* Player 1 Bonus History */}
            <div className="overflow-auto">
              <BonusBreakdownPanel history={bonusHistory.filter(b => b.player === gameState.players[0].name)} />
            </div>
          </div>

          {/* Center - Game Board and Space Detail */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Game Board centered */}
            <div>
              <GameBoard
                board={gameState.board}
                tracks={completedTracks}
                boardRef={trackBoardRef}
                onSpaceClick={handleSpaceClick}
                highlightedSpaces={selectedSpace ? [selectedSpace.number] : []}
                validMoves={allHighlightedMoves}
                lastClaimedSpace={lastClaimedSpace}
                opponentSelectedSpaces={opponentSelectedSquares}
                opponentValidMoves={isMultiplayer ? opponentValidMoves.map(v => parseInt(v)) : []}
                skins={diceSkins}
              />
            </div>


          </div>

          {/* Right side - Player 2 Score & Bonus & Dice */}
          <div className="flex flex-col gap-4 lg:w-64 lg:shrink-0">
            <div className="flex flex-row gap-2 items-stretch">
              <FactorizationBox capture={lastCapturePerPlayer[1]} />
              <div className="border rounded-lg p-4 bg-card flex-1 min-w-0">
              <h3 className="font-semibold text-sm mb-3">{gameState.players[1].name}</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Captured Squares:</span>
                  <span className="font-bold">{gameState.players[1].score}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bonus:</span>
                  <span className="font-bold text-amber-600">{gameState.players[1].bonusPoints}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Total Score:</span>
                    <span>{gameState.players[1].score + gameState.players[1].bonusPoints}</span>
                  </div>
                </div>
              </div>
              </div>
            </div>

            {/* Player 2 Dice - Hide when P1 is round starter on first move, hide during rolling phase, always show on P2's turn */}
            {diceRolled && player2Dice.length > 0 && (botEnabled || isMultiplayer) && gameState.phase !== "rolling" &&
              (gameState.currentPlayer === 1 || !(gameState.roundStarterIndex === 0 && !gameState.player1HasMoved)) && (
              <div className={`${gameState.currentPlayer === 1 ? "ring-2 ring-primary rounded-lg" : "opacity-60"}`}>
                <DiceTray
                  dice={player2Dice}
                  selectedDice={gameState.currentPlayer === 1 ? gameState.selectedDice : []}
                  onDieClick={handleDieClick}
                  onReorder={handleReorderPlayer2Dice}
                  disabled={
                    gameState.phase !== "playing" ||
                    gameState.currentPlayer !== 1 ||
                    (isMultiplayer && localPlayerIndex !== 1)
                  }
                  playerName={gameState.players[1].name}
                  hideValues={false}
                  showActions={gameState.currentPlayer === 1 && selectedSpace !== null && selectedDiceObjects.length > 0}
                  canClaim={canClaimSpace}
                  onClaim={handleClaim}
                  onCancel={handleCancel}
                  skins={!isMultiplayer || localPlayerIndex === 1 ? diceSkins : null}
                  opponentSelectedDice={isMultiplayer && localPlayerIndex === 0 ? opponentSelectedDice : []}
                />
              </div>
            )}

            {/* Player 2 Bonus History */}
            <div className="overflow-auto">
              <BonusBreakdownPanel history={bonusHistory.filter(b => b.player === gameState.players[1].name)} />
            </div>
          </div>
        </div>

        {/* Ready for Next Round Confirmation Modal */}
        <NextRoundConfirmation
          isOpen={gameState.readyConfirmationActive || false}
          initiatorName={gameState.readyConfirmationInitiator !== null ? gameState.players[gameState.readyConfirmationInitiator].name : ""}
          currentPlayerIndex={localPlayerIndex}
          initiatorIndex={gameState.readyConfirmationInitiator || 0}
          countdown={gameState.readyConfirmationCountdown || 0}
          onConfirm={handleConfirmReady}
          onDecline={handleDeclineReady}
        />

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-red-500" />
            <span>Prime Number (cannot claim)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-50 dark:bg-green-900/20 border-2 border-green-500" />
            <span>Valid Move</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-muted border border-dashed border-muted-foreground/30" />
            <span>Claimed (removed)</span>
          </div>
          {gameState.players.map((player, idx) => (
            <div key={player.name} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: PLAYER_COLORS[idx] }}
              />
              <span>{player.name}</span>
            </div>
          ))}
        </div>
      </div>

  {/* Dialogs */}
  <RulesDialog open={showRules} onOpenChange={setShowRules} />
  <MultiplicationGameTutorial open={showTutorial} onOpenChange={setShowTutorial} />
  <AuthDialog
    open={showAuth}
    onOpenChange={setShowAuth}
    onAuthed={(name, _email, userId) => {
      if (userId) {
        setUserId(userId);
        setPlayerId(userId);
      }
      setPlayerNames([name || "Player 1", playerNames[1]]);
    }}
  />

  {/* Active Games Dialog */}
  <ActiveGamesDialog
    open={showActiveGames}
    onOpenChange={setShowActiveGames}
    userId={userId}
    gameType={selectedGameType}
    onResumeGame={handleResumeGame}
  />

  {/* Waiting Room */}
  {isMultiplayer && waitingForOpponent && (
    <WaitingRoomDialog
      sessionCode={sessionCode ?? ""}
      playerName={playerNames[0]}
      gameType={selectedGameType}
      onCancel={() => {
        handleCancelMultiplayer();
      }}
      onOpponentJoined={() => {
        setWaitingForOpponent(false);
        setOpponentHasJoined(false);
        setShowSetup(true);
        setShowModeSelect(false);
      }}
      onJoinLobby={handleSelectLobby}
      onCreateNew={handleCreateNewGameFromWaitingRoom}
      opponentHasJoined={opponentHasJoined}
      isOpen
    />
  )}
  
  <TargetScoreSelector
    open={showSetup}
    onOpenChange={setShowSetup}
    onStartGame={handleStartGame}
    onShowTutorial={() => setShowTutorial(true)}
    isMultiplayer={isMultiplayer}
    isLocalPlay={!botEnabled && !isMultiplayer}
    fixedTargetScore={multiplayerTargetScore}
    initialBotEnabled={botEnabled && !isMultiplayer}
    onPlayOnline={() => {
      setShowModeSelect(true);
      setShowSetup(false);
    }}
  />
  
  {/* Exit Confirmation Dialog */}
  <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Exit Game</DialogTitle>
        <DialogDescription>
          Are you sure you want to exit? Your game progress will be lost.
        </DialogDescription>
      </DialogHeader>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => setShowExitDialog(false)}>
          Continue Playing
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            setShowExitDialog(false);
            window.location.href = "/";
          }}
        >
          Exit to Menu
        </Button>
      </div>
    </DialogContent>
  </Dialog>
      
  {/* Switch Game Confirmation Dialog */}
  <Dialog open={showExitConfirmDialog} onOpenChange={setShowExitConfirmDialog}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Switch Game</DialogTitle>
        <DialogDescription>
          You have an active game in progress. Are you sure you want to switch games? Your progress will be lost.
        </DialogDescription>
      </DialogHeader>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => setShowExitConfirmDialog(false)}>
          Continue Playing
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            setShowExitConfirmDialog(false);
            if (pendingExitUrl) {
              window.location.href = pendingExitUrl;
            }
          }}
        >
          Switch Game
        </Button>
      </div>
    </DialogContent>
  </Dialog>
      
      {/* Point Animations Overlay */}
      <PointAnimations
        animations={floatingEmojis}
        fireworks={fireworks}
        onAnimationComplete={handleAnimationComplete}
      />
      <PartyCelebration
        isActive={isTrainCelebrating}
        numbers={celebrationNumbers}
        winnerName={gameState.players[gameState.currentPlayer]?.name || "Champion"}
        onComplete={() => setIsTrainCelebrating(false)}
      />
    </div>
  );
}
