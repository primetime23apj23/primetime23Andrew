"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { GotBoard } from "./got-board";
import {
  PointAnimations,
  getRandomEmoji,
  createFireworkBurst,
  type FloatingEmoji,
  type FireworkParticle,
} from "./point-animations";
import {
  generateGotBoard,
  rollOneDie,
  getReachableSpaces,
  type GotGameState,
  type DiceSize,
  PLAYER_COLORS,
  COLOR_PALETTE,
} from "@/lib/give-or-take-utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getBotDiceSizeForGiveOrTake,
  getBotPlacementForGiveOrTake,
  type BotDifficulty,
} from "@/lib/bot-utils";
import { GiveOrTakeTutorial } from "./give-or-take-tutorial";
import { MultiplayerModeDialog } from "./multiplayer-mode-dialog";
import { WaitingRoomDialog } from "./waiting-room-dialog";

const DEFAULT_TARGET_SCORE = 13;

const DICE_OPTIONS: { label: string; value: DiceSize; description: string }[] = [
  { label: "1-9", value: 9, description: "Small jumps" },
  { label: "1-19", value: 19, description: "Medium jumps" },
  { label: "1-99", value: 99, description: "Wild jumps" },
];

const TIMER_OPTIONS: { label: string; value: number | null }[] = [
  { label: "Off", value: null },
  { label: "10s", value: 10 },
  { label: "15s", value: 15 },
  { label: "30s", value: 30 },
  { label: "60s", value: 60 },
];

const BOT_DIFFICULTIES: { label: string; value: BotDifficulty; description: string }[] = [
  { label: "Easy", value: "easy", description: "Makes mistakes" },
  { label: "Medium", value: "medium", description: "Balanced play" },
  { label: "Hard", value: "hard", description: "Strategic" },
];

const createInitialState = (playerNames: [string, string], playerColors: [string, string], timerSeconds: number | null = null, diceSize: DiceSize = 9): GotGameState => ({
  board: generateGotBoard(),
  players: [
    { name: playerNames[0], color: playerColors[0], score: 0 },
    { name: playerNames[1], color: playerColors[1], score: 0 },
  ],
  currentPlayer: 0,
  phase: "chooseDice",
  message: `${playerNames[0]}, choose your die size!`,
  targetScore: DEFAULT_TARGET_SCORE,
  dieValue: null,
  diceSize: null, // Will be set by first player
  timerSeconds,
});

export function GiveOrTakeGame() {
  const [gameState, setGameState] = useState<GotGameState>(createInitialState(["Player 1", "Player 2"], [PLAYER_COLORS[0], PLAYER_COLORS[1]]));
  const [showSetup, setShowSetup] = useState(false);
  const [showModeSelect, setShowModeSelect] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [displayDie, setDisplayDie] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Setup options
  const [setupTimer, setSetupTimer] = useState<number | null>(null);
  const [setupPlayerNames, setSetupPlayerNames] = useState<[string, string]>(["Player 1", "Player 2"]);
  const [setupPlayerColors, setSetupPlayerColors] = useState<[string, string]>([PLAYER_COLORS[0], PLAYER_COLORS[1]]);
  const [selectedDiceSize, setSelectedDiceSize] = useState<DiceSize | null>(null); // Persistent dice selection
  const [botEnabled, setBotEnabled] = useState(false);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>("medium");

  // Auto-update Player 2 name when bot is enabled/disabled
  useEffect(() => {
    if (botEnabled && setupPlayerNames[1] === "Player 2") {
      const BOT_NAMES = ["Bot", "AI Rival", "Robot", "Bot Master"];
      const randomBot = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
      const newNames: [string, string] = [...setupPlayerNames];
      newNames[1] = randomBot;
      setSetupPlayerNames(newNames);
    }
  }, [botEnabled]);

  // Track all positions per player (not just last) [player0 positions, player1 positions]
  const [playerPositions, setPlayerPositions] = useState<[number[], number[]]>([[], []]);

  // Multiplayer state
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [multiplayerMode, setMultiplayerMode] = useState<"create" | "join" | null>(null);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [opponentName, setOpponentName] = useState<string | null>(null);

  // Exit confirmation dialog
  const [showExitConfirmDialog, setShowExitConfirmDialog] = useState(false);
  const [pendingExitUrl, setPendingExitUrl] = useState<string | null>(null);

  // Turn timer
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Animations
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [fireworks, setFireworks] = useState<FireworkParticle[]>([]);

  const spawnPointAnimation = useCallback((x: number, y: number, points: number, isBonus: boolean) => {
    setFloatingEmojis((prev) => [
      ...prev,
      { id: `emoji-${Date.now()}-${Math.random()}`, emoji: getRandomEmoji(isBonus), x, y, points },
    ]);
  }, []);

  const spawnFireworks = useCallback((x: number, y: number) => {
    setFireworks((prev) => [...prev, ...createFireworkBurst(x, y, 24)]);
  }, []);

  const handleAnimationComplete = useCallback((id: string) => {
    setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // Timer logic: count down per turn, auto-skip on expire
  const startTimer = useCallback(() => {
    if (!gameState.timerSeconds) return;
    setTimeLeft(gameState.timerSeconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [gameState.timerSeconds]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(null);
  }, []);

  // Start timer when it's rolling phase
  useEffect(() => {
    if ((gameState.phase === "chooseDice" || gameState.phase === "rolling") && gameState.timerSeconds && !isAnimating) {
      startTimer();
    } else if (gameState.phase === "gameOver") {
      stopTimer();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState.phase, gameState.currentPlayer, gameState.timerSeconds, isAnimating, startTimer, stopTimer]);

  // Auto-skip turn when timer expires
  useEffect(() => {
    if (timeLeft === 0 && gameState.phase !== "gameOver") {
      stopTimer();
      const nextPlayer = (gameState.currentPlayer + 1) % 2;
      setGameState((prev) => ({
        ...prev,
        currentPlayer: nextPlayer,
        phase: "chooseDice",
        dieValue: null,
        message: `${prev.players[prev.currentPlayer].name} ran out of time! ${prev.players[nextPlayer].name}, choose your die!`,
      }));
      setDisplayDie(null);
    }
  }, [timeLeft, gameState.phase, gameState.currentPlayer, stopTimer]);

  // Check if this is the player's first move (no owned spaces yet)
  const isFirstMove = useMemo(() => {
    return playerPositions[gameState.currentPlayer].length === 0;
  }, [playerPositions, gameState.currentPlayer]);

  // Calculate reachable spaces after rolling
  const reachable = useMemo(() => {
    if (gameState.phase !== "placing" || gameState.dieValue === null) {
      return { addTargets: [], subtractTargets: [], directTarget: null };
    }
    return getReachableSpaces(gameState.board, gameState.dieValue, playerPositions[gameState.currentPlayer], isFirstMove);
  }, [gameState.phase, gameState.dieValue, gameState.board, gameState.currentPlayer, isFirstMove, playerPositions]);

  const allReachable = useMemo(() => {
    const spaces: number[] = [];
    if (reachable.directTarget !== null) spaces.push(reachable.directTarget);
    spaces.push(...reachable.addTargets);
    spaces.push(...reachable.subtractTargets);
    return spaces;
  }, [reachable]);

  const hasAnyMoves = allReachable.length > 0;

  // Player picks dice size before rolling - sets as default for whole game
  const handleChooseDice = useCallback((size: DiceSize) => {
    setSelectedDiceSize(size); // Set as persistent default
    setGameState((prev) => ({
      ...prev,
      diceSize: size,
      phase: "rolling",
      message: `${prev.players[prev.currentPlayer].name} chose 1-${size} die. Roll!`,
    }));
  }, []);

  // Roll the die with animation
  const handleRoll = useCallback(() => {
    if (gameState.phase !== "rolling" || isAnimating) return;
    setIsAnimating(true);

    let count = 0;
    const totalFlips = 12;
    const interval = setInterval(() => {
      setDisplayDie(rollOneDie(gameState.diceSize));
      count++;
      if (count >= totalFlips) {
        clearInterval(interval);
        const finalValue = rollOneDie(gameState.diceSize);
        setDisplayDie(finalValue);
        setIsAnimating(false);

        // Move to placing phase to show options
        setGameState((prev) => ({
          ...prev,
          phase: "placing",
          dieValue: finalValue,
          message: `Rolled ${finalValue}! Choose a space to place your chip.`,
        }));
      }
    }, 80);
  }, [gameState.phase, isAnimating]);

  // Auto re-roll when no moves are available
  useEffect(() => {
    if (gameState.phase === "placing" && !hasAnyMoves && !isAnimating) {
      const timeout = setTimeout(() => {
        setGameState((prev) => ({
          ...prev,
          message: `Rolled ${prev.dieValue} - no available spaces! Rolling again...`,
          phase: "rolling",
          dieValue: null,
        }));
        setDisplayDie(null);
      }, 1200);
      return () => clearTimeout(timeout);
    }
  }, [gameState.phase, hasAnyMoves, isAnimating]);

  // Place chip on a space
  const handlePlaceChip = useCallback(
    (spaceNumber: number) => {
      if (gameState.phase !== "placing") return;
      if (!allReachable.includes(spaceNumber)) return;

      const space = gameState.board[spaceNumber];
      if (!space || space.owner !== null) return;

      // Track position for the current player
      setPlayerPositions((prev) => {
        const updated: [number[], number[]] = [prev[0].slice(), prev[1].slice()];
        if (!updated[gameState.currentPlayer].includes(spaceNumber)) {
          updated[gameState.currentPlayer].push(spaceNumber);
        }
        return updated;
      });

      setGameState((prev) => {
        const newBoard = prev.board.map((s) =>
          s.number === spaceNumber
            ? { ...s, owner: prev.currentPlayer, claimed: true }
            : s
        );

        const earnedPoint = space.isPrime ? 1 : 0;
        const newPlayers = prev.players.map((p, idx) =>
          idx === prev.currentPlayer
            ? { ...p, score: p.score + earnedPoint }
            : p
        );

        const pos = { x: window.innerWidth / 2, y: window.innerHeight / 3 };
        if (earnedPoint > 0) {
          spawnPointAnimation(pos.x, pos.y, 1, false);
          spawnFireworks(pos.x, pos.y);
        }

        // Check win
        if (newPlayers[prev.currentPlayer].score >= prev.targetScore) {
          for (let i = 0; i < 5; i++) {
            setTimeout(() => {
              spawnFireworks(
                pos.x + (Math.random() - 0.5) * 300,
                pos.y + (Math.random() - 0.5) * 200
              );
            }, i * 200);
          }
          return {
            ...prev,
            board: newBoard,
            players: newPlayers,
            phase: "gameOver" as const,
            dieValue: null,
            message: `${newPlayers[prev.currentPlayer].name} wins with ${newPlayers[prev.currentPlayer].score} prime numbers!`,
          };
        }

        const nextPlayer = (prev.currentPlayer + 1) % 2;
        // If dice is already selected, go straight to rolling phase
        const nextPhase = selectedDiceSize ? "rolling" : "chooseDice";
        const nextMessage = selectedDiceSize 
          ? space.isPrime
            ? `Placed on ${spaceNumber} - PRIME! +1 point! ${newPlayers[nextPlayer].name}, roll 1-${selectedDiceSize}!`
            : `Placed on ${spaceNumber}. ${newPlayers[nextPlayer].name}, roll 1-${selectedDiceSize}!`
          : space.isPrime
            ? `Placed on ${spaceNumber} - PRIME! +1 point! ${newPlayers[nextPlayer].name}, choose your die!`
            : `Placed on ${spaceNumber}. ${newPlayers[nextPlayer].name}, choose your die!`;
        
        return {
          ...prev,
          board: newBoard,
          players: newPlayers,
          currentPlayer: nextPlayer,
          phase: nextPhase as const,
          diceSize: selectedDiceSize || prev.diceSize,
          dieValue: null,
          message: nextMessage,
        };
      });

      setDisplayDie(null);
    },
    [gameState.phase, gameState.board, allReachable, spawnPointAnimation, spawnFireworks, gameState.currentPlayer]
  );

  // Start / New game
  const handleStartGame = useCallback(() => {
    const state = createInitialState(setupPlayerNames, setupPlayerColors, setupTimer, selectedDiceSize || 9);
    if (botEnabled) {
      state.players = [state.players[0], { ...state.players[1], name: "Bot" }];
    }
    setGameState(state);
    setShowSetup(false);
    setDisplayDie(null);
    setPlayerPositions([[], []]);
    setFloatingEmojis([]);
    setFireworks([]);
    stopTimer();
  }, [setupTimer, setupPlayerNames, setupPlayerColors, selectedDiceSize, botEnabled, stopTimer]);

  const handleNewGame = useCallback(() => setShowSetup(true), []);

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

  const handleModeSelect = useCallback((mode: "bot" | "local" | "create") => {
    if (mode === "bot") {
      setBotEnabled(true);
      setIsMultiplayer(false);
      setShowSetup(true);
      setShowModeSelect(false);
      return;
    }

    if (mode === "local") {
      setBotEnabled(false);
      setIsMultiplayer(false);
      setShowSetup(true);
      setShowModeSelect(false);
      return;
    }

    setIsMultiplayer(true);
    setMultiplayerMode("create");
    setShowModeSelect(false);
    setWaitingForOpponent(true);
    setSessionCode("ABC123");
  }, []);

  // Bot auto-play effect
  useEffect(() => {
    if (!botEnabled || gameState.currentPlayer !== 1 || gameState.phase === "gameOver") return;

    const isBotFirstMove = !gameState.board.some((s) => s.owner === 1);

    // Bot chooses dice
    if (gameState.phase === "chooseDice") {
      const timer = setTimeout(() => {
        const size = getBotDiceSizeForGiveOrTake(
          gameState.board,
          playerPositions[1],
          isBotFirstMove,
          botDifficulty
        );
        handleChooseDice(size);
      }, 800);
      return () => clearTimeout(timer);
    }

    // Bot rolls
    if (gameState.phase === "rolling" && !isAnimating) {
      const timer = setTimeout(() => {
        handleRoll();
      }, 600);
      return () => clearTimeout(timer);
    }

    // Bot places chip
    if (gameState.phase === "placing" && hasAnyMoves && !isAnimating) {
      const timer = setTimeout(() => {
        const target = getBotPlacementForGiveOrTake(
          gameState.board,
          gameState.dieValue!,
          playerPositions[1],
          isBotFirstMove,
          botDifficulty
        );
        if (target !== null) {
          handlePlaceChip(target);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [botEnabled, gameState.currentPlayer, gameState.phase, gameState.board, gameState.dieValue, playerPositions, botDifficulty, isAnimating, hasAnyMoves, handleChooseDice, handleRoll, handlePlaceChip]);

  const currentPlayer = gameState.players[gameState.currentPlayer];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <div className="text-left shrink-0">
            <h1 className="text-xl sm:text-2xl font-bold">Give or Take</h1>
            <p className="text-xs text-muted-foreground">
              First to {gameState.targetScore} prime numbers wins
              {gameState.timerSeconds && ` | ${gameState.timerSeconds}s timer`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleSwitchGame("/")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Multiplication Game
          </button>
        </header>

        {/* Timer */}
        {gameState.timerSeconds && timeLeft !== null && gameState.phase !== "gameOver" && (
          <div className={`text-center rounded-lg p-2 font-mono font-bold text-lg ${
            timeLeft <= 5 ? "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 animate-pulse" : "bg-muted"
          }`}>
            Time: {timeLeft}s
          </div>
        )}

        {/* Scoreboard */}
        <div className="grid grid-cols-2 gap-3">
          {gameState.players.map((player, idx) => (
            <div
              key={player.name}
              className={`rounded-lg border-2 p-3 text-center transition-all ${
                idx === gameState.currentPlayer && gameState.phase !== "gameOver"
                  ? "shadow-lg"
                  : "border-border"
              }`}
              style={
                idx === gameState.currentPlayer && gameState.phase !== "gameOver"
                  ? { borderColor: player.color }
                  : undefined
              }
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: player.color }} />
                <span className="font-semibold text-sm">{player.name}</span>
              </div>
              <div className="text-3xl font-black" style={{ color: player.color }}>
                {player.score}
              </div>
              <div className="text-xs text-muted-foreground">/ {gameState.targetScore} prime numbers</div>
            </div>
          ))}
        </div>

        {/* Message */}
        <div className="bg-muted rounded-lg p-3 text-center">
          <p className="font-semibold text-sm">{gameState.message}</p>
        </div>

        {/* Board */}
        <GotBoard
          board={gameState.board}
          onSpaceClick={handlePlaceChip}
          addTargets={gameState.phase === "placing" ? reachable.addTargets : []}
          subtractTargets={gameState.phase === "placing" ? reachable.subtractTargets : []}
          directTarget={gameState.phase === "placing" ? reachable.directTarget : null}
          currentPlayerColor={currentPlayer.color}
          playerPositions={playerPositions}
        />

        {/* Die and controls (below the board) */}
        <div className="flex flex-col items-center gap-4">
          <div
            className={`w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 flex items-center justify-center transition-all shadow-lg ${
              isAnimating
                ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-950 animate-bounce"
                : displayDie
                  ? "border-primary bg-card"
                  : "border-border bg-muted"
            }`}
            style={
              !isAnimating && displayDie ? { borderColor: currentPlayer.color } : undefined
            }
          >
            <span
              className={`font-black transition-all ${
                displayDie
                  ? "text-5xl sm:text-6xl"
                  : "text-3xl sm:text-4xl text-muted-foreground"
              }`}
            >
              {displayDie ?? "?"}
            </span>
          </div>

          {gameState.phase === "chooseDice" && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-semibold text-muted-foreground">
                {currentPlayer.name}, pick your die:
              </p>
              <div className="flex gap-3">
                {DICE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleChooseDice(opt.value)}
                    className={`flex flex-col items-center gap-1 px-5 py-3 rounded-xl border-2 transition-all font-bold shadow-sm ${
                      selectedDiceSize === opt.value
                        ? "border-primary bg-primary/10 scale-105"
                        : "border-border hover:border-primary hover:bg-primary/10"
                    }`}
                    style={{ borderColor: selectedDiceSize === opt.value ? currentPlayer.color : currentPlayer.color + "66" }}
                  >
                    <span className="text-xl font-black" style={{ color: currentPlayer.color }}>
                      {opt.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{opt.description}</span>
                  </button>
                ))}
              </div>
              {selectedDiceSize && (
                <p className="text-xs text-muted-foreground text-center">
                  Selected: 1-{selectedDiceSize} die{selectedDiceSize === selectedDiceSize ? " (from previous game)" : ""}
                </p>
              )}
            </div>
          )}

          {gameState.phase === "rolling" && (
            <div className="flex flex-col items-center gap-3">
              <Button
                size="lg"
                onClick={handleRoll}
                disabled={isAnimating}
                className="text-lg px-8 py-6 font-bold"
                style={{ backgroundColor: currentPlayer.color }}
              >
                {isAnimating ? "Rolling..." : `${currentPlayer.name} - Roll 1-${gameState.diceSize}!`}
              </Button>
              {/* Option to change dice during game */}
              <div className="flex gap-2">
                {DICE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedDiceSize(opt.value)}
                    disabled={isAnimating}
                    className={`px-3 py-1 rounded-lg border-2 text-xs font-semibold transition-all ${
                      selectedDiceSize === opt.value
                        ? "border-primary bg-primary/10 shadow-md"
                        : "border-border hover:border-primary/50 hover:bg-muted"
                    } ${isAnimating ? "opacity-50" : ""}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {gameState.phase === "placing" && hasAnyMoves && (
            <p className="text-sm text-muted-foreground text-center">
              {isFirstMove
                ? `Click space ${gameState.dieValue} on the board to place your chip.`
                : `You rolled ${gameState.dieValue}. Pick a space to claim.`}
            </p>
          )}

          {gameState.phase === "gameOver" && (
            <Button size="lg" onClick={handleNewGame} className="text-lg px-8 py-6 font-bold">
              New Game
            </Button>
          )}
        </div>

        {/* Strategy tip */}
        <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-300 dark:border-yellow-800 rounded-lg p-3 text-center">
          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
            Tip: An even number + an odd number (or an odd + an even) always equals an odd number — and every prime except 2 is odd! Use this to reach primes faster.
          </p>
        </div>

        {/* Animations */}
        <PointAnimations
          animations={floatingEmojis}
          fireworks={fireworks}
          onAnimationComplete={handleAnimationComplete}
        />
        {/* Setup Dialog */}
        <GiveOrTakeTutorial open={showTutorial} onOpenChange={setShowTutorial} />
        
        {/* Multiplayer / Bot Mode Selector */}
        <MultiplayerModeDialog
          open={showModeSelect}
          onOpenChange={setShowModeSelect}
          onModeSelect={handleModeSelect}
          gameName="Give or Take"
        />

        {/* Waiting Room */}
        {isMultiplayer && waitingForOpponent && (
          <WaitingRoomDialog
            sessionCode={sessionCode}
            playerName={setupPlayerNames[0]}
            onCancel={() => {
              setIsMultiplayer(false);
              setWaitingForOpponent(false);
              setShowModeSelect(true);
            }}
            onOpponentJoined={() => {
              setWaitingForOpponent(false);
              setShowSetup(true);
              setShowModeSelect(false);
            }}
            isOpen
          />
        )}
        
        <Dialog open={showSetup} onOpenChange={setShowSetup}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Give or Take</DialogTitle>
              <DialogDescription>A unique version of the multiplication game.</DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              {/* Bot Toggle - Top Priority */}
              <div className="space-y-3 p-3 rounded-lg bg-muted/50 border-2 border-primary/20">
                <button
                  type="button"
                  onClick={() => setBotEnabled(!botEnabled)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                    botEnabled
                      ? "border-primary bg-primary/10 shadow-md"
                      : "border-border hover:border-primary/50 hover:bg-muted"
                  }`}
                >
                  <span className="text-sm font-bold">Play vs Bot</span>
                  <span className={`text-xs px-2 py-1 rounded ${botEnabled ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {botEnabled ? "ON" : "OFF"}
                  </span>
                </button>

                {botEnabled && (
                  <div className="flex gap-2">
                    {BOT_DIFFICULTIES.map((diff) => (
                      <button
                        key={diff.value}
                        type="button"
                        onClick={() => setBotDifficulty(diff.value)}
                        className={`flex-1 flex flex-col items-center gap-0.5 p-2 rounded-lg border-2 transition-all ${
                          botDifficulty === diff.value
                            ? "border-primary bg-primary/10 shadow-md"
                            : "border-border hover:border-primary/50 hover:bg-muted"
                        }`}
                      >
                        <span className="text-sm font-bold">{diff.label}</span>
                        <span className="text-[10px] text-muted-foreground">{diff.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Player Names & Colors */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold px-1">Players</h3>
                {[0, 1].map((idx) => {
                  const colorPickerRef = idx === 0 ? null : null; // Store refs if needed
                  
                  return (
                    <div key={`player-${idx}`} className="space-y-2 p-3 rounded-lg bg-background border-2 border-border">
                      <label className="text-xs font-semibold">{`Player ${idx + 1} Name`}</label>
                      <input
                        type="text"
                        value={setupPlayerNames[idx]}
                        onChange={(e) => {
                          const newNames: [string, string] = [...setupPlayerNames];
                          newNames[idx] = e.target.value || `Player ${idx + 1}`;
                          setSetupPlayerNames(newNames);
                        }}
                        className="w-full px-3 py-2 rounded-lg border-2 border-border bg-background text-foreground"
                        placeholder={`Player ${idx + 1}`}
                      />
                      <label className="text-xs font-semibold block mb-2">Color</label>
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full border-2 border-border shadow-sm flex-shrink-0 overflow-hidden flex items-center justify-center">
                          <input
                            type="color"
                            value={setupPlayerColors[idx]}
                            onChange={(e) => {
                              const newColors: [string, string] = [...setupPlayerColors];
                              newColors[idx] = e.target.value;
                              setSetupPlayerColors(newColors);
                            }}
                            className="w-16 h-16 cursor-pointer scale-150"
                            style={{ 
                              border: "none",
                              padding: "0",
                              margin: "0"
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const inputs = document.querySelectorAll('input[type="color"]');
                            const targetInput = Array.from(inputs).find(
                              (inp) => (inp as HTMLInputElement).value === setupPlayerColors[idx]
                            ) as HTMLInputElement | undefined;
                            targetInput?.click();
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-all"
                        >
                          or choose custom color
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Timer Selection */}
              <div className="space-y-2">
                <label className="text-sm font-semibold px-1">Turn Timer</label>
                <div className="flex gap-2 flex-wrap">
                  {TIMER_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setSetupTimer(opt.value)}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                        setupTimer === opt.value
                          ? "border-primary bg-primary/10 shadow-md"
                          : "border-border hover:border-primary/50 hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* How to play */}
              <div className="bg-muted rounded-lg p-4 text-sm space-y-3">
                <div className="font-semibold text-base">How to Play:</div>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Each turn, choose your die size: 1-9, 1-19, or 1-99 (becomes default for the game)</li>
                  <li>You can change the dice at any time during the game</li>
                  <li>
                    <strong className="text-foreground">First roll:</strong> place your chip directly on that number
                  </li>
                  <li>
                    <strong className="text-foreground">After that:</strong> place on the die value, or add (+) or subtract (-) the die value from ANY of your existing spaces
                  </li>
                  <li>Pick which space to claim from the available options</li>
                  <li>
                    <strong className="text-foreground">Land on a prime number</strong> = score 1 point
                  </li>
                  <li>Non-prime = no points (chip still placed)</li>
                  <li>If no spaces are available, you roll again</li>
                  <li>
                    <strong className="text-foreground">
                      First to {DEFAULT_TARGET_SCORE} prime numbers wins!
                    </strong>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={() => setShowTutorial(true)} variant="outline">
                How to Play
              </Button>
              <Button
                onClick={() => {
                  setShowModeSelect(true);
                  setShowSetup(false);
                }}
                variant="outline"
              >
                Multiplayer / Bot
              </Button>
              <Button onClick={handleStartGame} size="lg" className="font-bold">
                Start Game
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Exit Confirmation Dialog */}
        <Dialog open={showExitConfirmDialog} onOpenChange={setShowExitConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Exit Game</DialogTitle>
              <DialogDescription>
                You have an active game in progress. Are you sure you want to exit? Your progress will be lost.
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
                Exit Game
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
