"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { GameBoard } from "./game-board";
import { GiveOrTakeGame } from "./give-or-take-game";
import { DiceTray } from "./dice-tray";
import { Scoreboard } from "./scoreboard";
import { GameControls } from "./game-controls";
import { RulesDialog } from "./rules-dialog";
import { SpaceDetail } from "./space-detail";
import { GameTimer } from "./game-timer";
import { DiceSkinSettings, DEFAULT_SKINS, type DiceSkin } from "./dice-skin-settings";
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
import type { CompletedTrack } from "./connection-animation";
import { getBotMoveForMultiplication, type BotDifficulty } from "@/lib/bot-utils";
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
import { ArrowLeft, Sparkles } from "lucide-react";
import { createGameLobby, joinGameLobby, cancelGameLobby, getGameSession, getGameSessionById, getGameStates, subscribeToSession, subscribeToGameState, updateGameState, generatePlayerId, sendHeartbeat, validateTurn, updateCurrentTurn } from "@/lib/supabase-multiplayer";
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
  selectedDice: [],
  message: "Set up your game and roll the dice to start!",
  targetScore,
});

export function PrimeFactorGame() {
  const [gameState, setGameState] = useState<GameState>(createInitialState(37));
  const [selectedSpace, setSelectedSpace] = useState<BoardSpace | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showModeSelect, setShowModeSelect] = useState(true);
  const [diceSkins, setDiceSkins] = useState<DiceSkin[]>(DEFAULT_SKINS);
  
  // Authentication and session recovery
  const { user: authUser, isAuthenticated } = usePlayerProfile();
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
  const [showLobby, setShowLobby] = useState(false);
  const [selectedGameType, setSelectedGameType] = useState<"multiplication" | "give-or-take">("multiplication");
  const [showGameSetup, setShowGameSetup] = useState(false);
  const [lobbyLoading, setLobbyLoading] = useState(false);
  const [heartbeatInterval, setHeartbeatInterval] = useState<NodeJS.Timeout | null>(null);
  const [multiplayerTargetScore, setMultiplayerTargetScore] = useState(37);
  
  // Track each player's dice separately
  const [player1Dice, setPlayer1Dice] = useState<Die[]>([]);
  const [player2Dice, setPlayer2Dice] = useState<Die[]>([]);
  const [diceRolled, setDiceRolled] = useState(false);
  
  // Animation states
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [fireworks, setFireworks] = useState<FireworkParticle[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);
  
  // Bonus history tracking
  const [bonusHistory, setBonusHistory] = useState<Array<{
    player: string;
    space: number;
    round: number;
    breakdown: BonusBreakdown[];
  }>>([]);
  
  // Completed connection tracks
  const [completedTracks, setCompletedTracks] = useState<CompletedTrack[]>([]);
  const trackBoardRef = useRef<HTMLDivElement>(null);
  
  // Bot settings
  const [botEnabled, setBotEnabled] = useState(false);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>("medium");
  const gameStateVersionRef = useRef<number>(-1);

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
        const response = await fetch(`/api/active-games?userId=${userId}`);
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
  }, [userId]);

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
    !isMultiplayer || (localPlayerIndex !== null && localPlayerIndex === gameState.currentPlayer);

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
    
    if (!hasAnyValidMove && currentPlayerDice.length >= 0) {
      const opponentIndex = (gameState.currentPlayer + 1) % 2;
      const opponentDiceArr = opponentIndex === 0 ? player1Dice : player2Dice;
      
      const availableSpaces = gameState.board.filter(
        (space) => !space.isPrime && space.owner === null && space.number !== 0 && !space.claimed
      );
      
      let opponentHasMoves = false;
      for (const space of availableSpaces) {
        const factors = space.factors;
        if (factors.length === 0) continue;
        const match = canMatchFactorization(factors, opponentDiceArr);
        if (match !== null) {
          opponentHasMoves = true;
          break;
        }
      }
      
      if (!opponentHasMoves) {
        setGameState((prev) => ({
          ...prev,
          phase: "roundEnd",
          selectedDice: [],
          roundNumber: prev.roundNumber + 1,
          message: `Round ${prev.roundNumber} complete! Both players are out of moves. Click "New Round" to continue.`,
        }));
      } else {
        setGameState((prev) => ({
          ...prev,
          currentPlayer: opponentIndex,
          selectedDice: [],
          message: `${prev.players[prev.currentPlayer].name} has no valid moves. ${prev.players[opponentIndex].name}'s turn!`,
        }));
      }
    }
  }, [gameState.currentPlayer, gameState.phase, hasAnyValidMove, diceRolled, currentPlayerDice.length, player1Dice, player2Dice, gameState.board, gameState.players]);

  // Spawn floating emoji animation
  const spawnPointAnimation = useCallback((x: number, y: number, points: number, isBonus: boolean) => {
    const newEmoji: FloatingEmoji = {
      id: `emoji-${Date.now()}-${Math.random()}`,
      emoji: getRandomEmoji(isBonus),
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
    
    setGameState((prev) => {
      const isSelected = prev.selectedDice.includes(die.id);
      return {
        ...prev,
        selectedDice: isSelected
          ? prev.selectedDice.filter((id) => id !== die.id)
          : [...prev.selectedDice, die.id],
      };
    });
  }, [currentPlayerDice, gameState.phase, isLocalPlayersTurn]);

  // Handle space click
  const handleSpaceClick = useCallback((space: BoardSpace) => {
    if (isMultiplayer && !isLocalPlayersTurn) return;
    if (space.claimed) return;
    setSelectedSpace(space);
  }, [isLocalPlayersTurn, isMultiplayer]);

  // Check if selected dice match the space
  const canClaimSpace = useMemo(() => {
    if (!selectedSpace || selectedSpace.isPrime || selectedSpace.owner !== null || selectedSpace.claimed) {
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
  }, [selectedSpace, gameState.selectedDice, currentPlayerDice]);

  // Persist game state to database for multiplayer
  const persistGameState = useCallback(async (
    actionType: string,
    overrides?: {
      gameState?: GameState;
      player1Dice?: Die[];
      player2Dice?: Die[];
      diceRolled?: boolean;
      bonusHistory?: Array<{
        player: string;
        space: number;
        round: number;
        breakdown: BonusBreakdown[];
      }>;
      completedTracks?: CompletedTrack[];
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
      await updateGameState(sessionId, sessionLocalPlayerId, {
        board: nextState.board,
        players: nextState.players,
        currentPlayer: nextState.currentPlayer,
        phase: nextState.phase,
        roundNumber: nextState.roundNumber,
        selectedDice: nextState.selectedDice,
        message: nextState.message,
        targetScore: nextState.targetScore,
        player1Dice: nextPlayer1Dice,
        player2Dice: nextPlayer2Dice,
        diceRolled: nextDiceRolled,
        bonusHistory: nextBonusHistory,
        completedTracks: nextCompletedTracks,
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
    sessionId,
    sessionLocalPlayerId,
  ]);

  const getSavedStateVersion = useCallback((savedState: Record<string, any>) => {
    return typeof savedState.syncVersion === "number" ? savedState.syncVersion : -1;
  }, []);

  const applySavedGameState = useCallback((savedState: Record<string, any>) => {
    const incomingVersion = getSavedStateVersion(savedState);
    if (incomingVersion >= 0 && incomingVersion < gameStateVersionRef.current) {
      return;
    }

    if (incomingVersion >= 0) {
      gameStateVersionRef.current = incomingVersion;
    }

    setGameState((prev) => {
      // Only clear selectedDice when the current player actually changes
      // Never sync selectedDice from database since it's local-only state
      const playerChanged = 
        typeof savedState.currentPlayer === "number" && 
        savedState.currentPlayer !== prev.currentPlayer;
      
      return {
        ...prev,
        board: Array.isArray(savedState.board) ? savedState.board : prev.board,
        players: Array.isArray(savedState.players) ? savedState.players : prev.players,
        currentPlayer:
          typeof savedState.currentPlayer === "number" ? savedState.currentPlayer : prev.currentPlayer,
        phase: savedState.phase || prev.phase,
        roundNumber:
          typeof savedState.roundNumber === "number" ? savedState.roundNumber : prev.roundNumber,
        selectedDice: playerChanged ? [] : prev.selectedDice,
        message: typeof savedState.message === "string" ? savedState.message : prev.message,
        targetScore:
          typeof savedState.targetScore === "number" ? savedState.targetScore : prev.targetScore,
      };
    });

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
  }, [getSavedStateVersion]);

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

  // Sort dice by value
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

  const handleModeSelect = useCallback((mode: ModeOption) => {
    // Force auth for multiplayer flows
    if ((mode === "create" || mode === "join") && !playerNames[0]) {
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
      return;
    }

    if (mode === "local") {
      setBotEnabled(false);
      setIsMultiplayer(false);
      setShowSetup(true);
      setShowModeSelect(false);
      setPlayerNames(["Player 1", "Player 2"]);
      return;
    }

    // Show lobby to find/create multiplayer game
    if (mode === "create" || mode === "join") {
      setSelectedGameType("multiplication");
      setShowLobby(true);
      setMultiplayerMode("lobby");
      setShowModeSelect(false);
    }
  }, []);

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
          setIsMultiplayer(true);
          setMultiplayerMode("join");
          setWaitingForOpponent(false);
          setOpponentName(session.player_1_name || "Opponent");
          setPlayerNames([
            session.player_1_name || "Player 1",
            session.player_2_name || joiningPlayerName || "Player 2",
          ]);
          setShowLobby(false);
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
        setSelectedGameType(session.game_type);
        setIsMultiplayer(true);
        setMultiplayerMode("join");
        setWaitingForOpponent(false);
        setOpponentHasJoined(!!session.player_2_id);
        setOpponentPlayerId(resolvedOpponentId);
        setOpponentName(resolvedOpponentName);
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
    }) => {
      setLobbyLoading(true);
      try {
        // Use the authenticated user ID if available, otherwise let createGameLobby generate one
        const playerIdToUse = authUser?.id || userId;
        
        const session = await createGameLobby(
          selectedGameType,
          settings.playerName,
          {
            targetScore: settings.targetScore,
            botDifficulty: settings.botDifficulty,
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
          setIsMultiplayer(true);
          setMultiplayerMode("create");
          setWaitingForOpponent(true);
          setShowGameSetup(false);
          setShowLobby(false);
          setPlayerNames([settings.playerName || "Player 1", "Player 2"]);
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
      const valid = await validateTurn(sessionId, sessionLocalPlayerId);
      if (!valid.valid) {
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
      message: `${gameState.players[gameState.currentPlayer].name}, select dice to match a space's factorization!`,
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

    if (isMultiplayer && sessionId && sessionLocalPlayerId) {
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

    spawnPointAnimation(pos.x, pos.y, 1, false);

    if (bonusGained > 0) {
      setTimeout(() => {
        spawnFireworks(pos.x, pos.y);
        spawnPointAnimation(pos.x - 30, pos.y - 30, bonusGained, true);
      }, 300);
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
      setTimeout(() => {
        setCompletedTracks((prev) =>
          prev.map((t) =>
            newTracks.some((nt) => nt.id === t.id)
              ? { ...t, animating: false }
              : t
          )
        );
      }, 3500);
    }

    if (totalScore >= gameState.targetScore && pos) {
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          const offsetX = (Math.random() - 0.5) * 200;
          const offsetY = (Math.random() - 0.5) * 200;
          spawnFireworks(pos.x + offsetX, pos.y + offsetY);
        }, i * 200);
      }
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
  }, []);

  // Check if a specific player has any valid moves
  const checkPlayerHasMoves = useCallback((playerIndex: number, board: BoardSpace[]) => {
    const playerDice = playerIndex === 0 ? player1Dice : player2Dice;
    if (playerDice.length === 0) return false;
    
    const availableSpaces = board.filter(
      (space) => !space.isPrime && space.owner === null && space.number !== 0 && !space.claimed
    );
    
    for (const space of availableSpaces) {
      const factors = space.factors;
      if (factors.length === 0) continue;
      const match = canMatchFactorization(factors, playerDice);
      if (match !== null) return true;
    }
    return false;
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

    const nextPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
    const currentPlayerHasMoves = checkPlayerHasMoves(gameState.currentPlayer, gameState.board);
    const nextPlayerHasMoves = checkPlayerHasMoves(nextPlayer, gameState.board);

    const nextGameState =
      !currentPlayerHasMoves && !nextPlayerHasMoves
        ? {
            ...gameState,
            phase: "roundEnd" as const,
            selectedDice: [],
            roundNumber: gameState.roundNumber + 1,
            message: `Round ${gameState.roundNumber} complete! Both players are out of moves. Click "New Round" to continue.`,
          }
        : !nextPlayerHasMoves
          ? {
              ...gameState,
              phase: "roundEnd" as const,
              selectedDice: [],
              roundNumber: gameState.roundNumber + 1,
              message: `Round ${gameState.roundNumber} complete! Both players are out of moves. Click "New Round" to continue.`,
            }
          : {
              ...gameState,
              currentPlayer: nextPlayer,
              selectedDice: [],
              message: `${gameState.players[nextPlayer].name}'s turn! Select dice to claim a space.`,
            };

    setGameState(nextGameState);
    void persistGameState('end-turn', {
      gameState: nextGameState,
      diceRolled,
    });
  }, [checkPlayerHasMoves, diceRolled, gameState, hasAnyValidMove, isMultiplayer, sessionId, sessionLocalPlayerId, persistGameState]);

  // Timer expired
  const handleTimeUp = useCallback(() => {
    handleEndTurn();
  }, [handleEndTurn]);

  // Bot auto-play effect
  useEffect(() => {
    if (!botEnabled || gameState.currentPlayer !== 1 || gameState.phase !== "playing") return;
    
    const botMove = getBotMoveForMultiplication(gameState.board, player2Dice, botDifficulty);
    
    if (!botMove) {
      // Bot has no moves, trigger end turn
      const timer = setTimeout(() => {
        handleEndTurn();
      }, 1000);
      return () => clearTimeout(timer);
    }
    
    // Bot "thinks" for a moment, then makes move
    const timer = setTimeout(() => {
      // Select the dice
      setGameState((prev) => ({
        ...prev,
        selectedDice: botMove.diceIds,
      }));
      
      // Then claim the space after a short delay
      setTimeout(() => {
        const space = gameState.board.find((s) => s.number === botMove.spaceNumber);
        if (space) {
          setSelectedSpace(space);
          // Trigger claim after setting selection
          setTimeout(() => {
            const pos = getAnimationPosition();
            
            const factors = [...space.factors];
            const diceToRemove: string[] = [];
            const selectedDieObjects = player2Dice.filter((d) => botMove.diceIds.includes(d.id));
            
            for (const factor of factors) {
              const exactMatch = selectedDieObjects.find(
                (d) => !diceToRemove.includes(d.id) && d.value === factor
              );
              if (exactMatch) {
                diceToRemove.push(exactMatch.id);
                continue;
              }
              const wildMatch = selectedDieObjects.find(
                (d) => !diceToRemove.includes(d.id) && d.value === "W"
              );
              if (wildMatch) {
                diceToRemove.push(wildMatch.id);
              }
            }
            
            setPlayer2Dice((prev) => prev.filter((d) => !diceToRemove.includes(d.id)));
            
            setGameState((prev) => {
              const newBoard = prev.board.map((s) =>
                s.number === space.number
                  ? { ...s, owner: prev.currentPlayer, claimed: true }
                  : s
              );
              
              const { bonusPoints: bonusGained, breakdown } = checkForNewBonus(newBoard, space.number);
              
              if (breakdown.length > 0) {
                setBonusHistory((prevHistory) => [
                  ...prevHistory,
                  {
                    player: prev.players[prev.currentPlayer].name,
                    space: space.number,
                    round: prev.roundNumber,
                    breakdown,
                  },
                ]);
                
                const playerColor = PLAYER_COLORS[prev.currentPlayer];
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
                
                setTimeout(() => {
                  setCompletedTracks((tracks) =>
                    tracks.map((t) =>
                      newTracks.some((nt) => nt.id === t.id)
                        ? { ...t, animating: false }
                        : t
                    )
                  );
                }, 3500);
              }
              
              const newPlayers = prev.players.map((player, idx) => {
                if (idx === prev.currentPlayer) {
                  return {
                    ...player,
                    score: player.score + 1,
                    bonusPoints: player.bonusPoints + bonusGained,
                  };
                }
                return player;
              });
              
              spawnPointAnimation(pos.x, pos.y, 1, false);
              
              if (bonusGained > 0) {
                setTimeout(() => {
                  spawnFireworks(pos.x, pos.y);
                  spawnPointAnimation(pos.x - 30, pos.y - 30, bonusGained, true);
                }, 300);
              }
              
              const totalScore =
                newPlayers[prev.currentPlayer].score +
                newPlayers[prev.currentPlayer].bonusPoints;
              
              if (totalScore >= prev.targetScore) {
                for (let i = 0; i < 5; i++) {
                  setTimeout(() => {
                    const offsetX = (Math.random() - 0.5) * 200;
                    const offsetY = (Math.random() - 0.5) * 200;
                    spawnFireworks(pos.x + offsetX, pos.y + offsetY);
                  }, i * 200);
                }
                
                return {
                  ...prev,
                  board: newBoard,
                  players: newPlayers,
                  selectedDice: [],
                  phase: "gameOver",
                  message: `${newPlayers[prev.currentPlayer].name} wins with ${totalScore} points!`,
                };
              }
              
              const nextPlayer = (prev.currentPlayer + 1) % prev.players.length;
              
              return {
                ...prev,
                board: newBoard,
                players: newPlayers,
                currentPlayer: nextPlayer,
                selectedDice: [],
                message: `Bot claimed space ${space.number}! ${newPlayers[nextPlayer].name}'s turn.`,
              };
            });
            
            setSelectedSpace(null);
          }, 400);
        }
      }, 600);
    }, 1200);
    
    return () => clearTimeout(timer);
  }, [botEnabled, gameState.currentPlayer, gameState.phase, gameState.board, player2Dice, botDifficulty, getAnimationPosition, spawnPointAnimation, spawnFireworks, handleEndTurn]);

  // Start new round - alternate who goes first
  const handleNewRound = useCallback(() => {
    const dice1 = rollDice().map((d, i) => ({ ...d, id: `p1-r${gameState.roundNumber}-${i}` }));
    const dice2 = rollDice().map((d, i) => ({ ...d, id: `p2-r${gameState.roundNumber}-${i}` }));
    const nextPlayer1Dice = sortDice(dice1);
    const nextPlayer2Dice = sortDice(dice2);
    
    setPlayer1Dice(nextPlayer1Dice);
    setPlayer2Dice(nextPlayer2Dice);

    const startingPlayer = (gameState.roundNumber - 1) % 2;
    const nextGameState = {
      ...gameState,
      phase: "playing" as const,
      currentPlayer: startingPlayer,
      selectedDice: [],
      message: `Round ${gameState.roundNumber} started! ${gameState.players[startingPlayer].name} goes first.`,
    };

    setGameState(nextGameState);
    void persistGameState('new-round', {
      gameState: nextGameState,
      player1Dice: nextPlayer1Dice,
      player2Dice: nextPlayer2Dice,
      diceRolled: true,
    });
  }, [gameState, persistGameState]);

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
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_35%),linear-gradient(180deg,#f8fbff_0%,#eef5ff_48%,#ffffff_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.2),_transparent_30%),linear-gradient(180deg,#0f172a_0%,#111827_45%,#030712_100%)]">
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
                    gameType={selectedGameType}
                    onSelectLobby={(lobbyId) => {
                      handleSelectLobby(lobbyId);
                    }}
                    onCreateNew={() => {
                      setShowGameSetup(true);
                      setShowLobby(false);
                    }}
                    isOpen={showLobby}
                    onChangeGameType={(gameType) => {
                      setSelectedGameType(gameType);
                    }}
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
                    gameType={selectedGameType}
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
          }}
        />

        <ActiveGamesDialog
          open={showActiveGames}
          onOpenChange={setShowActiveGames}
          userId={userId}
          onResumeGame={handleResumeGame}
        />
        </div>
      </div>
    );
  }

  // Render Give or Take game if that's the selected type
  if (selectedGameType === "give-or-take") {
    return <GiveOrTakeGame />;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => handleSwitchGame("/give-or-take")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Try Give or Take Game
          </button>
          <div className="text-right shrink-0">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Patented by
            </p>
            <p className="text-sm sm:text-base font-semibold">
              Andrew P. Jaffe
            </p>
          </div>
        </header>

        {/* Toolbar - with controls on right side */}
        <div className="flex items-center justify-between gap-2">
          <div></div>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExitConfirm(true)}
              className="text-xs"
            >
              Exit Game
            </Button>
            <DiceSkinSettings skins={diceSkins} onSkinsChange={setDiceSkins} />
          </div>
        </div>

        {/* Main Game Area */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-4">
          {/* Board + Both Dice Trays */}
          <div className="space-y-4">
            {/* Both Players' Dice Side by Side (above board) */}
            {diceRolled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Player 1 Dice */}
                <div className={gameState.currentPlayer === 0 ? "ring-2 ring-primary rounded-lg" : "opacity-60"}>
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
                    skins={diceSkins}
                    playerName={gameState.players[0].name}
                  />
                </div>
                
                {/* Player 2 Dice - hidden until after first move */}
                <div className={gameState.currentPlayer === 1 ? "ring-2 ring-primary rounded-lg" : "opacity-60"}>
                  {player2Dice.length > 0 && (
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
                      skins={diceSkins}
                      playerName={gameState.players[1].name}
                      hideValues={gameState.currentPlayer === 0 && gameState.roundNumber === 1 && player1Dice.length === 12}
                    />
                  )}
                </div>
              </div>
            )}

            <div>
              <GameBoard
                board={gameState.board}
                tracks={completedTracks}
                boardRef={trackBoardRef}
                onSpaceClick={handleSpaceClick}
                highlightedSpaces={selectedSpace ? [selectedSpace.number] : []}
                validMoves={allHighlightedMoves}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Scoreboard
              players={gameState.players}
              currentPlayer={gameState.currentPlayer}
              targetScore={gameState.targetScore}
            />
            
            <GameTimer
              initialSeconds={60}
              onTimeUp={handleTimeUp}
              isActive={gameState.phase === "playing"}
              currentPlayer={gameState.currentPlayer}
              playerColors={PLAYER_COLORS}
            />
            
            <GameControls
              phase={gameState.phase}
              canRoll={!diceRolled && gameState.phase === "rolling" && isLocalPlayersTurn}
              canEndTurn={gameState.phase === "playing" && isLocalPlayersTurn}
              hasValidMoves={hasAnyValidMove}
              onRoll={handleRoll}
              onEndTurn={handleEndTurn}
              onNewRound={handleNewRound}
  onNewGame={handleNewGame}
  onShowRules={() => setShowRules(true)}
  onShowTutorial={() => setShowTutorial(true)}
  message={gameState.message}
            />
            
            <SpaceDetail
              space={selectedSpace}
              selectedDice={selectedDiceObjects}
              canClaim={canClaimSpace}
              onClaim={handleClaim}
              onCancel={handleCancel}
            />
            
            <BonusBreakdownPanel history={bonusHistory} />
          </div>
        </div>

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
      onCreateNew={() => {
        setShowLobby(true);
        setShowModeSelect(false);
      }}
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
    onPlayOnline={() => {
      setShowModeSelect(true);
      setShowSetup(false);
    }}
  />
  
  {/* Exit Confirmation Dialog */}
  <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Exit Game</DialogTitle>
        <DialogDescription>
          Are you sure you want to exit? Your game progress will be lost.
        </DialogDescription>
      </DialogHeader>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => setShowExitConfirm(false)}>
          Continue Playing
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            setShowExitConfirm(false);
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
    </div>
  );
}
