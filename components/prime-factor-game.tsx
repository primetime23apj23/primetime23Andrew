"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { GameBoard } from "./game-board";
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
import { MultiplayerModeDialog } from "./multiplayer-mode-dialog";
import { WaitingRoomDialog } from "./waiting-room-dialog";
import { GameLobby } from "./game-lobby";
import { GameSetupDialog } from "./game-setup-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createGameLobby, joinGameLobby, cancelGameLobby, getGameSession, subscribeToSession, subscribeToGameState, updateGameState, generatePlayerId, sendHeartbeat, validateTurn, updateCurrentTurn } from "@/lib/supabase-multiplayer";
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
  const { user: authUser, loading: authLoading, isAuthenticated } = usePlayerProfile();
  const [userId, setUserId] = useState<string | null>(null);
  const [showActiveGames, setShowActiveGames] = useState(false);
  
  // Multiplayer state
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [multiplayerMode, setMultiplayerMode] = useState<"create" | "join" | "lobby" | null>(null);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [playerNames, setPlayerNames] = useState<[string, string]>(["Player 1", "Player 2"]);
  const [showAuth, setShowAuth] = useState(false);
  const [showLobby, setShowLobby] = useState(false);
  const [selectedGameType, setSelectedGameType] = useState<"multiplication" | "give-or-take">("multiplication");
  const [showGameSetup, setShowGameSetup] = useState(false);
  const [lobbyLoading, setLobbyLoading] = useState(false);
  const [heartbeatInterval, setHeartbeatInterval] = useState<NodeJS.Timeout | null>(null);
  
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

  // Local player id
  useEffect(() => {
    const id = generatePlayerId();
    setPlayerId(id || null);
  }, []);

  // Set userId from auth user
  useEffect(() => {
    if (authUser?.id) {
      setUserId(authUser.id);
    }
  }, [authUser]);

  // Setup heartbeat for multiplayer
  useEffect(() => {
    if (isMultiplayer && sessionId && userId) {
      // Send initial heartbeat
      sendHeartbeat(userId, sessionId, true);

      // Setup periodic heartbeat every 10 seconds
      const interval = setInterval(() => {
        sendHeartbeat(userId, sessionId, true);
      }, 10000);

      setHeartbeatInterval(interval);

      return () => {
        clearInterval(interval);
        // Mark player as offline when leaving
        sendHeartbeat(userId, sessionId, false);
      };
    }
  }, [isMultiplayer, sessionId, userId]);

  // Exit confirmation dialog
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showExitConfirmDialog, setShowExitConfirmDialog] = useState(false);
  const [pendingExitUrl, setPendingExitUrl] = useState<string | null>(null);

  // Get current player's dice and opponent's dice
  const currentPlayerDice = gameState.currentPlayer === 0 ? player1Dice : player2Dice;

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
    if (gameState.phase !== "playing") return;
    
    setGameState((prev) => {
      const isSelected = prev.selectedDice.includes(die.id);
      return {
        ...prev,
        selectedDice: isSelected
          ? prev.selectedDice.filter((id) => id !== die.id)
          : [...prev.selectedDice, die.id],
      };
    });
  }, [gameState.phase]);

  // Handle space click
  const handleSpaceClick = useCallback((space: BoardSpace) => {
    if (space.claimed) return;
    setSelectedSpace(space);
  }, []);

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

  // Start game with target score
  const handleStartGame = useCallback((targetScore: number, enableBot: boolean, difficulty: BotDifficulty) => {
    setBotEnabled(enableBot);
    setBotDifficulty(difficulty);
    const initial = createInitialState(targetScore);
    initial.players = [
      { ...initial.players[0], name: playerNames[0] },
      { ...initial.players[1], name: enableBot ? "Bot" : playerNames[1] },
    ];
    setGameState(initial);
    setShowSetup(false);
    setSelectedSpace(null);
    setPlayer1Dice([]);
    setPlayer2Dice([]);
    setDiceRolled(false);
    setBonusHistory([]);
    setCompletedTracks([]);
    
    setGameState((prev) => ({
      ...prev,
      players: enableBot 
        ? [prev.players[0], { ...prev.players[1], name: "Bot" }]
        : prev.players,
      phase: "rolling",
      message: "Player 1, roll the dice to start the game!",
    }));
    if (isMultiplayer) persistGameState('start');
  }, [playerNames, isMultiplayer, persistGameState]);

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
    // If game is setup or finished, allow direct navigation
    if (showSetup || gameState.phase === "gameOver") {
      window.location.href = url;
    } else {
      // Game is in progress, show confirmation
      setPendingExitUrl(url);
      setShowExitConfirmDialog(true);
    }
  }, [showSetup, gameState.phase]);

  const handleModeSelect = useCallback((mode: "bot" | "local" | "create" | "join") => {
    // Force auth for multiplayer flows
    if ((mode === "create" || mode === "join") && !playerNames[0]) {
      setShowAuth(true);
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
    async (lobbyId: string, playerName?: string) => {
      setLobbyLoading(true);
      try {
        const session = await joinGameLobby(lobbyId, playerName || "Player", userId || playerId || undefined);
        if (session) {
          setSessionCode(session.session_code);
          setSessionId(session.id);
          setIsMultiplayer(true);
          setMultiplayerMode("join");
          setWaitingForOpponent(false);
          setOpponentName(session.player_1_name || "Opponent");
          setPlayerNames([
            session.player_1_name || "Player 1",
            playerName || session.player_2_name || "Player 2",
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
    []
  );

  // Handle create new lobby button
  const handleCreateNewLobby = useCallback(() => {
    setShowGameSetup(true);
  }, []);

  // Handle resuming a game from active games list
  const handleResumeGame = useCallback(async (resumeSessionId: string) => {
    try {
      const session = await getGameSession(resumeSessionId);
      if (session) {
        setSessionCode(session.session_code);
        setSessionId(session.id);
        setIsMultiplayer(true);
        setMultiplayerMode("join");
        setOpponentName(session.player_2_name || "Opponent");
        setPlayerNames([
          session.player_1_name || "Player 1",
          session.player_2_name || "Player 2",
        ]);
        setShowActiveGames(false);
        setShowSetup(false);
        setShowModeSelect(false);
        // Resume game, don't show setup
      }
    } catch (error) {
      console.error("Error resuming game:", error);
    }
  }, []);

  const handleCancelMultiplayer = useCallback(async () => {
    if (sessionCode) {
      await cancelGameLobby(sessionCode);
    }
    setIsMultiplayer(false);
    setWaitingForOpponent(false);
    setShowModeSelect(true);
  }, [sessionCode]);
  // Host: auto-start when opponent joins
  useEffect(() => {
    if (!waitingForOpponent || !sessionCode) return;
    let cancelled = false;
    const channel = subscribeToSession(sessionCode, (session) => {
      if (cancelled || !session) return;
      setSessionId(session.id);
      setPlayerNames([
        session.player_1_name || "Player 1",
        session.player_2_name || "Player 2",
      ]);
      if (session.player_2_id) {
        setWaitingForOpponent(false);
        setOpponentName(session.player_2_name || "Opponent");
        setShowSetup(true);
        setShowModeSelect(false);
      }
    });

    return () => {
      cancelled = true;
      channel.unsubscribe();
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
        const session = await createGameLobby(
          selectedGameType,
          settings.playerName,
          {
            targetScore: settings.targetScore,
            botDifficulty: settings.botDifficulty,
          },
          userId || playerId || undefined
        );
        if (session) {
          setSessionCode(session.session_code);
          setSessionId(session.id);
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
    [selectedGameType]
  );

  // Roll dice for both players at game start
  const handleRoll = useCallback(async () => {
    if (isMultiplayer && sessionId && playerId) {
      const valid = await validateTurn(sessionId, playerId);
      if (!valid.valid) {
        setGameState((prev) => ({ ...prev, message: valid.error || "Not your turn" }));
        return;
      }
    }

    const dice1 = rollDice().map((d, i) => ({ ...d, id: `p1-${i}` }));
    const dice2 = rollDice().map((d, i) => ({ ...d, id: `p2-${i}` }));
    
    setPlayer1Dice(sortDice(dice1));
    setPlayer2Dice(sortDice(dice2));
    setDiceRolled(true);
    
    setGameState((prev) => ({
      ...prev,
      phase: "playing",
      selectedDice: [],
      message: `${prev.players[prev.currentPlayer].name}, select dice to match a space's factorization!`,
    }));

    persistGameState('roll');
  }, [isMultiplayer, sessionId, playerId, persistGameState]);

  // Claim a space
  const handleClaim = useCallback(async () => {
    if (!selectedSpace || !canClaimSpace) return;

    if (isMultiplayer && sessionId && playerId) {
      const valid = await validateTurn(sessionId, playerId);
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
    
    if (gameState.currentPlayer === 0) {
      setPlayer1Dice((prev) => prev.filter((d) => !diceToRemove.includes(d.id)));
    } else {
      setPlayer2Dice((prev) => prev.filter((d) => !diceToRemove.includes(d.id)));
    }
    
    setGameState((prev) => {
      const newBoard = prev.board.map((space) =>
        space.number === selectedSpace.number
          ? { ...space, owner: prev.currentPlayer, claimed: true }
          : space
      );
      
      const { bonusPoints: bonusGained, breakdown } = checkForNewBonus(newBoard, selectedSpace.number);
      
      if (breakdown.length > 0) {
        setBonusHistory((prevHistory) => [
          ...prevHistory,
          {
            player: prev.players[prev.currentPlayer].name,
            space: selectedSpace.number,
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
        
        setCompletedTracks((prev) => [...prev, ...newTracks]);
        
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
        if (pos) {
          for (let i = 0; i < 5; i++) {
            setTimeout(() => {
              const offsetX = (Math.random() - 0.5) * 200;
              const offsetY = (Math.random() - 0.5) * 200;
              spawnFireworks(pos.x + offsetX, pos.y + offsetY);
            }, i * 200);
          }
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
      
      const updatedState = {
        ...prev,
        board: newBoard,
        players: newPlayers,
        currentPlayer: (prev.currentPlayer + 1) % prev.players.length,
        selectedDice: [],
        message: `Claimed space ${selectedSpace.number}! ${newPlayers[(prev.currentPlayer + 1) % prev.players.length].name}'s turn.`,
      };
      return updatedState;
    });
    
    setSelectedSpace(null);
    persistGameState('claim');
  }, [selectedSpace, canClaimSpace, gameState.selectedDice, gameState.currentPlayer, getAnimationPosition, spawnPointAnimation, spawnFireworks, isMultiplayer, sessionId, playerId, validateTurn, persistGameState]);

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
    if (isMultiplayer && sessionId && playerId) {
      const valid = await validateTurn(sessionId, playerId);
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
    
    setGameState((prev) => {
      const nextPlayer = (prev.currentPlayer + 1) % prev.players.length;
      
      const currentPlayerHasMoves = checkPlayerHasMoves(prev.currentPlayer, prev.board);
      const nextPlayerHasMoves = checkPlayerHasMoves(nextPlayer, prev.board);
      
      if (!currentPlayerHasMoves && !nextPlayerHasMoves) {
        return {
          ...prev,
          phase: "roundEnd",
          selectedDice: [],
          roundNumber: prev.roundNumber + 1,
          message: `Round ${prev.roundNumber} complete! Both players are out of moves. Click "New Round" to continue.`,
        };
      }
      
      if (!nextPlayerHasMoves) {
        return {
          ...prev,
          phase: "roundEnd",
          selectedDice: [],
          roundNumber: prev.roundNumber + 1,
          message: `Round ${prev.roundNumber} complete! Both players are out of moves. Click "New Round" to continue.`,
        };
      }
      
      const newState = {
        ...prev,
        currentPlayer: nextPlayer,
        selectedDice: [],
        message: `${prev.players[nextPlayer].name}'s turn! Select dice to claim a space.`,
      };
      return newState;
    });
    persistGameState('end-turn');
  }, [hasAnyValidMove, checkPlayerHasMoves, isMultiplayer, sessionId, playerId, validateTurn, persistGameState]);

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
    
    setPlayer1Dice(sortDice(dice1));
    setPlayer2Dice(sortDice(dice2));
    
    setGameState((prev) => {
      // Alternate who goes first: round 1 = player 0, round 2 = player 1, etc.
      const startingPlayer = (prev.roundNumber - 1) % 2;
      return {
        ...prev,
        phase: "playing",
        currentPlayer: startingPlayer,
        selectedDice: [],
        message: `Round ${prev.roundNumber} started! ${prev.players[startingPlayer].name} goes first.`,
      };
    });
    persistGameState('new-round');
  }, [gameState.roundNumber]);

  // Reorder dice
  const handleReorderPlayer1Dice = useCallback((newOrder: Die[]) => {
    setPlayer1Dice(newOrder);
  }, []);

  const handleReorderPlayer2Dice = useCallback((newOrder: Die[]) => {
    setPlayer2Dice(newOrder);
  }, []);

  // New game
  const handleNewGame = useCallback(() => {
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
            
            {/* Both Players' Dice Side by Side (below board) */}
            {diceRolled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Player 1 Dice */}
                <div className={gameState.currentPlayer === 0 ? "ring-2 ring-primary rounded-lg" : "opacity-60"}>
                  <DiceTray
                    dice={player1Dice}
                    selectedDice={gameState.currentPlayer === 0 ? gameState.selectedDice : []}
                    onDieClick={handleDieClick}
                    onReorder={handleReorderPlayer1Dice}
                    disabled={gameState.phase !== "playing" || gameState.currentPlayer !== 0}
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
                      disabled={gameState.phase !== "playing" || gameState.currentPlayer !== 1}
                      skins={diceSkins}
                      playerName={gameState.players[1].name}
                      hideValues={gameState.currentPlayer === 0 && gameState.roundNumber === 1 && player1Dice.length === 12}
                    />
                  )}
                </div>
              </div>
            )}
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
              canRoll={!diceRolled && gameState.phase === "rolling"}
              canEndTurn={gameState.phase === "playing"}
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
      if (userId) setPlayerId(userId);
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
  
  {/* Multiplayer Mode Selector */}
  <MultiplayerModeDialog
    open={showModeSelect}
    onOpenChange={setShowModeSelect}
    onModeSelect={handleModeSelect}
    gameName="Multiplication Game"
    hasActiveGames={isAuthenticated}
    onViewActiveGames={() => setShowActiveGames(true)}
  />

  {/* Game Lobby Dialog */}
  {showLobby && (
    <Dialog open={showLobby} onOpenChange={setShowLobby}>
      <DialogContent className="max-h-[70vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Find a Multiplayer Game</DialogTitle>
          <DialogDescription>
            Browse open lobbies or create your own game
          </DialogDescription>
        </DialogHeader>
        <GameLobby
          gameType={selectedGameType}
          onSelectLobby={handleSelectLobby}
          onCreateNew={handleCreateNewLobby}
          isOpen={showLobby}
          onChangeGameType={(type) => setSelectedGameType(type)}
        />
      </DialogContent>
    </Dialog>
  )}

  {/* Game Setup Dialog */}
  <GameSetupDialog
    open={showGameSetup}
    onOpenChange={setShowGameSetup}
    gameType={selectedGameType}
    onCreateLobby={handleGameSetupSubmit}
    isLoading={lobbyLoading}
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
        setShowSetup(true);
        setShowModeSelect(false);
      }}
      onJoinLobby={(lobbyId, name) => handleSelectLobby(lobbyId, name)}
      onCreateNew={() => {
        setShowLobby(true);
        setShowModeSelect(false);
      }}
      isOpen
    />
  )}
  
  <TargetScoreSelector
    open={showSetup}
    onOpenChange={setShowSetup}
    onStartGame={handleStartGame}
    onShowTutorial={() => setShowTutorial(true)}
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
