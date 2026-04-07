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
import {
  getBotDiceSizeForGiveOrTake,
  getBotPlacementForGiveOrTake,
  type BotDifficulty,
} from "@/lib/bot-utils";
import { GiveOrTakeTutorial } from "./give-or-take-tutorial";
import { MultiplayerModeSelector, type ModeOption } from "./multiplayer-mode-dialog";
import { WaitingRoomDialog } from "./waiting-room-dialog";
import { GameLobby } from "./game-lobby";
import { GameSetupForm } from "./game-setup-dialog";
import { AuthDialog } from "./auth-dialog";
import { ActiveGamesDialog } from "./active-games-dialog";
import { usePlayerProfile } from "@/hooks/use-player-profile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createGameLobby,
  joinGameLobby,
  cancelGameLobby,
  getGameSession,
  getGameSessionById,
  getGameStates,
  subscribeToSession,
  subscribeToGameState,
  updateGameState,
  generatePlayerId,
  sendHeartbeat,
  validateTurn,
  updateCurrentTurn,
  type GameSession,
  type GameState as PersistedGameState,
} from "@/lib/supabase-multiplayer";

const DEFAULT_TARGET_SCORE = 13;
const DEFAULT_COLORS: [string, string] = [PLAYER_COLORS[0], PLAYER_COLORS[1]];

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

type PositionState = [number[], number[]];

interface SavedMatchData {
  gameState: GotGameState;
  playerPositions: PositionState;
  selectedDiceSize: DiceSize | null;
  displayDie: number | null;
  syncVersion?: number;
  actionType?: string;
}

const createEmptyPositions = (): PositionState => [[], []];

const createInitialState = (
  playerNames: [string, string],
  playerColors: [string, string],
  timerSeconds: number | null = null
): GotGameState => ({
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
  diceSize: null,
  timerSeconds,
});

export function GiveOrTakeGame() {
  const selectedGameType: "give-or-take" = "give-or-take";

  const [gameState, setGameState] = useState<GotGameState>(
    createInitialState(["Player 1", "Player 2"], DEFAULT_COLORS)
  );
  const [showSetup, setShowSetup] = useState(false);
  const [showModeSelect, setShowModeSelect] = useState(true);
  const [showLobby, setShowLobby] = useState(false);
  const [showGameSetup, setShowGameSetup] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [displayDie, setDisplayDie] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const [setupTimer, setSetupTimer] = useState<number | null>(null);
  const [setupPlayerNames, setSetupPlayerNames] = useState<[string, string]>([
    "Player 1",
    "Player 2",
  ]);
  const [setupPlayerColors, setSetupPlayerColors] =
    useState<[string, string]>(DEFAULT_COLORS);
  const [selectedDiceSize, setSelectedDiceSize] = useState<DiceSize | null>(null);
  const [botEnabled, setBotEnabled] = useState(false);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>("medium");

  const { user: authUser } = usePlayerProfile();
  const [userId, setUserId] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showActiveGames, setShowActiveGames] = useState(false);
  const [hasResumableGames, setHasResumableGames] = useState(false);

  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [multiplayerMode, setMultiplayerMode] = useState<
    "create" | "join" | "lobby" | null
  >(null);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionPlayer1Id, setSessionPlayer1Id] = useState<string | null>(null);
  const [sessionPlayer2Id, setSessionPlayer2Id] = useState<string | null>(null);
  const [sessionLocalPlayerId, setSessionLocalPlayerId] = useState<string | null>(
    null
  );
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [opponentPlayerId, setOpponentPlayerId] = useState<string | null>(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [opponentHasJoined, setOpponentHasJoined] = useState(false);
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [lobbyLoading, setLobbyLoading] = useState(false);

  const [playerPositions, setPlayerPositions] = useState<PositionState>(
    createEmptyPositions()
  );

  const [showExitConfirmDialog, setShowExitConfirmDialog] = useState(false);
  const [pendingExitUrl, setPendingExitUrl] = useState<string | null>(null);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const syncVersionRef = useRef<number>(-1);

  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [fireworks, setFireworks] = useState<FireworkParticle[]>([]);

  const spawnPointAnimation = useCallback(
    (x: number, y: number, points: number, isBonus: boolean) => {
      setFloatingEmojis((prev) => [
        ...prev,
        {
          id: `emoji-${Date.now()}-${Math.random()}`,
          emoji: getRandomEmoji(isBonus),
          x,
          y,
          points,
        },
      ]);
    },
    []
  );

  const spawnFireworks = useCallback((x: number, y: number) => {
    setFireworks((prev) => [...prev, ...createFireworkBurst(x, y, 24)]);
  }, []);

  const handleAnimationComplete = useCallback((id: string) => {
    setFloatingEmojis((prev) => prev.filter((animation) => animation.id !== id));
  }, []);

  useEffect(() => {
    const id = generatePlayerId();
    setPlayerId(id || null);
  }, []);

  useEffect(() => {
    if (authUser?.id) {
      setUserId(authUser.id);
      setPlayerId(authUser.id);
    }
  }, [authUser]);

  useEffect(() => {
    if (!authUser?.playerName) return;

    setSetupPlayerNames((prev) => {
      const shouldReplacePlaceholder =
        !prev[0] || prev[0] === "Player 1" || prev[0] === "Player";

      if (!shouldReplacePlaceholder || prev[0] === authUser.playerName) {
        return prev;
      }

      return [authUser.playerName, prev[1]];
    });
  }, [authUser?.playerName]);

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
    if (!sessionId) {
      syncVersionRef.current = -1;
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
    if (!isMultiplayer || !sessionId || !sessionLocalPlayerId) return;

    void sendHeartbeat(sessionLocalPlayerId, sessionId, true);

    const interval = setInterval(() => {
      void sendHeartbeat(sessionLocalPlayerId, sessionId, true);
    }, 10000);

    heartbeatRef.current = interval;

    return () => {
      clearInterval(interval);
      heartbeatRef.current = null;
      void sendHeartbeat(sessionLocalPlayerId, sessionId, false);
    };
  }, [isMultiplayer, sessionId, sessionLocalPlayerId]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimeLeft(null);
  }, []);

  const startTimer = useCallback(() => {
    if (!gameState.timerSeconds || isMultiplayer) return;

    setTimeLeft(gameState.timerSeconds);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }

        return prev - 1;
      });
    }, 1000);
  }, [gameState.timerSeconds, isMultiplayer]);

  useEffect(() => {
    if (
      !isMultiplayer &&
      (gameState.phase === "chooseDice" || gameState.phase === "rolling") &&
      gameState.timerSeconds &&
      !isAnimating
    ) {
      startTimer();
    } else if (gameState.phase === "gameOver") {
      stopTimer();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    gameState.phase,
    gameState.currentPlayer,
    gameState.timerSeconds,
    isAnimating,
    isMultiplayer,
    startTimer,
    stopTimer,
  ]);

  const localPlayerIndex = useMemo(() => {
    if (!isMultiplayer) return gameState.currentPlayer;
    if (!sessionLocalPlayerId) return null;
    if (sessionLocalPlayerId === sessionPlayer1Id) return 0;
    if (sessionLocalPlayerId === sessionPlayer2Id) return 1;
    return null;
  }, [
    gameState.currentPlayer,
    isMultiplayer,
    sessionLocalPlayerId,
    sessionPlayer1Id,
    sessionPlayer2Id,
  ]);

  const isLocalPlayersTurn =
    !isMultiplayer || (localPlayerIndex !== null && localPlayerIndex === gameState.currentPlayer);

  const isFirstMove = useMemo(
    () => playerPositions[gameState.currentPlayer].length === 0,
    [gameState.currentPlayer, playerPositions]
  );

  const reachable = useMemo(() => {
    if (gameState.phase !== "placing" || gameState.dieValue === null) {
      return { addTargets: [], subtractTargets: [], directTarget: null };
    }

    return getReachableSpaces(
      gameState.board,
      gameState.dieValue,
      playerPositions[gameState.currentPlayer],
      isFirstMove
    );
  }, [
    gameState.board,
    gameState.currentPlayer,
    gameState.dieValue,
    gameState.phase,
    isFirstMove,
    playerPositions,
  ]);

  const allReachable = useMemo(() => {
    const spaces: number[] = [];
    if (reachable.directTarget !== null) {
      spaces.push(reachable.directTarget);
    }
    spaces.push(...reachable.addTargets, ...reachable.subtractTargets);
    return spaces;
  }, [reachable]);

  const hasAnyMoves = allReachable.length > 0;
  const currentPlayer = gameState.players[gameState.currentPlayer];

  const assertMultiplayerTurn = useCallback(async () => {
    if (!isMultiplayer || !sessionId || !sessionLocalPlayerId) {
      return true;
    }

    const result = await validateTurn(sessionId, sessionLocalPlayerId);
    if (!result.valid) {
      setGameState((prev) => ({
        ...prev,
        message: result.error || "Not your turn",
      }));
      return false;
    }

    return true;
  }, [isMultiplayer, sessionId, sessionLocalPlayerId]);

  const getSavedStateVersion = useCallback((savedState: Record<string, unknown>) => {
    return typeof savedState.syncVersion === "number" ? savedState.syncVersion : -1;
  }, []);

  const persistSnapshot = useCallback(
    async (
      liveSessionId: string,
      livePlayerId: string,
      nextState: GotGameState,
      nextPositions: PositionState,
      nextSelectedDiceSize: DiceSize | null,
      nextDisplayDie: number | null,
      actionType: string
    ) => {
      const nextVersion = syncVersionRef.current + 1;

      const success = await updateGameState(
        liveSessionId,
        livePlayerId,
        {
          gameState: nextState,
          playerPositions: nextPositions,
          selectedDiceSize: nextSelectedDiceSize,
          displayDie: nextDisplayDie,
          actionType,
          syncVersion: nextVersion,
        } satisfies SavedMatchData,
        nextState.currentPlayer
      );

      if (success) {
        syncVersionRef.current = nextVersion;
      }
    },
    []
  );

  const persistMultiplayerState = useCallback(
    async (
      nextState: GotGameState,
      nextPositions: PositionState = playerPositions,
      nextSelectedDiceSize: DiceSize | null = selectedDiceSize,
      nextDisplayDie: number | null = displayDie,
      actionType = "update"
    ) => {
      if (!isMultiplayer || !sessionId || !sessionLocalPlayerId) return;

      await persistSnapshot(
        sessionId,
        sessionLocalPlayerId,
        nextState,
        nextPositions,
        nextSelectedDiceSize,
        nextDisplayDie,
        actionType
      );
    },
    [
      displayDie,
      isMultiplayer,
      playerPositions,
      selectedDiceSize,
      sessionId,
      sessionLocalPlayerId,
      persistSnapshot,
    ]
  );

  const applySavedGameData = useCallback(
    (savedState: Record<string, unknown>) => {
      const incomingVersion = getSavedStateVersion(savedState);
      if (incomingVersion >= 0 && incomingVersion < syncVersionRef.current) {
        return;
      }

      if (incomingVersion >= 0) {
        syncVersionRef.current = incomingVersion;
      }

      const nextGameState = savedState.gameState;
      if (nextGameState && typeof nextGameState === "object") {
        setGameState(nextGameState as GotGameState);
      }

      const nextPositions = savedState.playerPositions;
      if (
        Array.isArray(nextPositions) &&
        nextPositions.length === 2 &&
        Array.isArray(nextPositions[0]) &&
        Array.isArray(nextPositions[1])
      ) {
        setPlayerPositions([nextPositions[0] as number[], nextPositions[1] as number[]]);
      } else {
        setPlayerPositions(createEmptyPositions());
      }

      const nextSelectedDiceSize = savedState.selectedDiceSize;
      if (
        nextSelectedDiceSize === 9 ||
        nextSelectedDiceSize === 19 ||
        nextSelectedDiceSize === 99
      ) {
        setSelectedDiceSize(nextSelectedDiceSize);
      } else {
        setSelectedDiceSize(null);
      }

      const nextDisplayDie = savedState.displayDie;
      if (typeof nextDisplayDie === "number") {
        setDisplayDie(nextDisplayDie);
      } else if (
        nextGameState &&
        typeof nextGameState === "object" &&
        "dieValue" in nextGameState &&
        typeof nextGameState.dieValue === "number"
      ) {
        setDisplayDie(nextGameState.dieValue);
      } else {
        setDisplayDie(null);
      }

      setIsAnimating(false);
    },
    [getSavedStateVersion]
  );

  const getLatestGameStateRecord = useCallback(
    (states: PersistedGameState[]) =>
      [...states].sort((a, b) => {
        const aVersion = getSavedStateVersion(a.game_data || {});
        const bVersion = getSavedStateVersion(b.game_data || {});

        if (aVersion !== bVersion) {
          return bVersion - aVersion;
        }

        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      })[0],
    [getSavedStateVersion]
  );

  const loadLatestSavedGameState = useCallback(
    async (activeSessionId: string) => {
      const states = await getGameStates(activeSessionId);
      if (!states.length) {
        return false;
      }

      const latestState = getLatestGameStateRecord(states);
      if (!latestState?.game_data) {
        return false;
      }

      applySavedGameData(latestState.game_data);
      return true;
    },
    [applySavedGameData, getLatestGameStateRecord]
  );

  const resetSessionState = useCallback(() => {
    syncVersionRef.current = -1;
    setIsMultiplayer(false);
    setMultiplayerMode(null);
    setSessionCode(null);
    setSessionId(null);
    setSessionPlayer1Id(null);
    setSessionPlayer2Id(null);
    setSessionLocalPlayerId(null);
    setOpponentPlayerId(null);
    setOpponentName(null);
    setOpponentHasJoined(false);
    setWaitingForOpponent(false);
  }, []);

  const enterMultiplayerMatch = useCallback(
    async (session: GameSession, localPlayerId: string | null) => {
      const names: [string, string] = [
        session.player_1_name || setupPlayerNames[0] || "Player 1",
        session.player_2_name || opponentName || "Player 2",
      ];

      setSetupPlayerNames(names);
      setSetupPlayerColors(DEFAULT_COLORS);
      setShowModeSelect(false);
      setShowLobby(false);
      setShowGameSetup(false);
      setShowSetup(false);
      setWaitingForOpponent(false);
      setOpponentHasJoined(Boolean(session.player_2_id));
      setOpponentName(
        localPlayerId === session.player_1_id
          ? session.player_2_name || "Player 2"
          : session.player_1_name || "Player 1"
      );
      setIsAnimating(false);
      setDisplayDie(null);
      setSelectedDiceSize(null);
      stopTimer();

      const restored = await loadLatestSavedGameState(session.id);
      if (restored) {
        return;
      }

      const initialState = createInitialState(names, DEFAULT_COLORS, null);
      const initialPositions = createEmptyPositions();

      setGameState(initialState);
      setPlayerPositions(initialPositions);

      if (localPlayerId) {
        await persistSnapshot(
          session.id,
          localPlayerId,
          initialState,
          initialPositions,
          null,
          null,
          "start"
        );
      }

      await updateCurrentTurn(session.id, session.player_1_id);
    },
    [
      loadLatestSavedGameState,
      opponentName,
      persistSnapshot,
      setupPlayerNames,
      stopTimer,
    ]
  );

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
        applySavedGameData(latestState.game_data);
      }
    });

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
      channel.unsubscribe();
    };
  }, [
    applySavedGameData,
    getLatestGameStateRecord,
    isMultiplayer,
    loadLatestSavedGameState,
    sessionId,
    waitingForOpponent,
  ]);

  useEffect(() => {
    if (!waitingForOpponent || !sessionCode) return;

    let cancelled = false;

    const syncSession = (session: GameSession) => {
      setSessionId(session.id);
      setSessionPlayer1Id(session.player_1_id);
      setSessionPlayer2Id(session.player_2_id);

      if (session.player_2_id) {
        setOpponentHasJoined(true);
        setOpponentPlayerId(session.player_2_id);
        setOpponentName(session.player_2_name || "Opponent");
      }
    };

    const checkForOpponent = async () => {
      if (cancelled) return;

      try {
        const session = await getGameSession(sessionCode);
        if (session) {
          syncSession(session);
        }
      } catch (error) {
        console.error("Error polling session:", error);
      }
    };

    void checkForOpponent();
    const pollInterval = setInterval(checkForOpponent, 1500);

    const channel = subscribeToSession(sessionCode, (session) => {
      if (cancelled || !session) return;
      syncSession(session);
    });

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
      channel.unsubscribe();
    };
  }, [sessionCode, waitingForOpponent]);

  useEffect(() => {
    if (timeLeft !== 0 || gameState.phase === "gameOver") return;

    stopTimer();
    const nextPlayer = (gameState.currentPlayer + 1) % 2;
    const nextState: GotGameState = {
      ...gameState,
      currentPlayer: nextPlayer,
      phase: "chooseDice",
      dieValue: null,
      message: `${gameState.players[gameState.currentPlayer].name} ran out of time! ${gameState.players[nextPlayer].name}, choose your die!`,
    };

    setGameState(nextState);
    setDisplayDie(null);

    if (isMultiplayer) {
      const turnOwner = nextPlayer === 0 ? sessionPlayer1Id : sessionPlayer2Id;
      void persistMultiplayerState(nextState, playerPositions, selectedDiceSize, null, "timer-expired");
      if (sessionId && turnOwner) {
        void updateCurrentTurn(sessionId, turnOwner);
      }
    }
  }, [
    gameState,
    isMultiplayer,
    persistMultiplayerState,
    playerPositions,
    selectedDiceSize,
    sessionId,
    sessionPlayer1Id,
    sessionPlayer2Id,
    stopTimer,
    timeLeft,
  ]);

  const handleStartLocalOrBotGame = useCallback(() => {
    const initialState = createInitialState(
      [setupPlayerNames[0], botEnabled ? "Bot" : setupPlayerNames[1]],
      setupPlayerColors,
      setupTimer
    );

    setGameState(initialState);
    setPlayerPositions(createEmptyPositions());
    setDisplayDie(null);
    setIsAnimating(false);
    setFloatingEmojis([]);
    setFireworks([]);
    setSelectedDiceSize(null);
    setShowSetup(false);
    stopTimer();
  }, [botEnabled, setupPlayerColors, setupPlayerNames, setupTimer, stopTimer]);

  const handleSwitchGame = useCallback(
    (url: string) => {
      const isPreGameState =
        showSetup ||
        showModeSelect ||
        showLobby ||
        showGameSetup ||
        waitingForOpponent ||
        gameState.phase === "gameOver";

      if (isPreGameState) {
        window.location.href = url;
      } else {
        setPendingExitUrl(url);
        setShowExitConfirmDialog(true);
      }
    },
    [gameState.phase, showGameSetup, showLobby, showModeSelect, showSetup, waitingForOpponent]
  );

  const handleModeSelect = useCallback(
    (mode: ModeOption) => {
      if ((mode === "create" || mode === "join") && !authUser?.id) {
        setShowAuth(true);
        return;
      }

      if (mode === "active") {
        setShowActiveGames(true);
        return;
      }

      if (mode === "bot") {
        resetSessionState();
        setBotEnabled(true);
        setShowModeSelect(false);
        setShowSetup(true);
        return;
      }

      if (mode === "local") {
        resetSessionState();
        setBotEnabled(false);
        setShowModeSelect(false);
        setShowSetup(true);
        return;
      }

      setIsMultiplayer(true);
      setMultiplayerMode("lobby");
      setShowModeSelect(false);
      setShowLobby(true);
    },
    [authUser?.id, resetSessionState]
  );

  const handleGameSetupSubmit = useCallback(
    async (settings: { playerName: string }) => {
      setLobbyLoading(true);

      try {
        const playerIdToUse = authUser?.id || userId;
        const session = await createGameLobby(
          selectedGameType,
          settings.playerName,
          {},
          playerIdToUse || undefined
        );

        if (!session) return;

        syncVersionRef.current = -1;
        setSessionCode(session.session_code);
        setSessionId(session.id);
        setSessionPlayer1Id(session.player_1_id);
        setSessionPlayer2Id(session.player_2_id);
        setSessionLocalPlayerId(session.player_1_id);
        setOpponentPlayerId(session.player_2_id);
        setSetupPlayerNames([settings.playerName || "Player 1", "Player 2"]);
        setWaitingForOpponent(true);
        setOpponentHasJoined(false);
        setShowGameSetup(false);
        setShowLobby(false);
        setShowModeSelect(false);
        setIsMultiplayer(true);
        setMultiplayerMode("create");
      } catch (error) {
        console.error("Error creating lobby:", error);
      } finally {
        setLobbyLoading(false);
      }
    },
    [authUser?.id, selectedGameType, userId]
  );

  const handleSelectLobby = useCallback(
    async (lobbyId: string) => {
      setLobbyLoading(true);

      try {
        const joiningPlayerName = authUser?.playerName || setupPlayerNames[0] || "Player";
        const session = await joinGameLobby(
          lobbyId,
          joiningPlayerName,
          authUser?.id || userId || playerId || undefined
        );

        if (!session) return;

        syncVersionRef.current = -1;
        setSessionCode(session.session_code);
        setSessionId(session.id);
        setSessionPlayer1Id(session.player_1_id);
        setSessionPlayer2Id(session.player_2_id);
        setSessionLocalPlayerId(session.player_2_id || null);
        setOpponentPlayerId(session.player_1_id);
        setOpponentName(session.player_1_name || "Opponent");
        setShowLobby(false);
        setShowGameSetup(false);
        setShowModeSelect(false);
        setIsMultiplayer(true);
        setMultiplayerMode("join");
        setWaitingForOpponent(false);

        await enterMultiplayerMatch(session, session.player_2_id);
      } catch (error) {
        console.error("Error joining lobby:", error);
      } finally {
        setLobbyLoading(false);
      }
    },
    [
      authUser?.id,
      authUser?.playerName,
      enterMultiplayerMatch,
      playerId,
      setupPlayerNames,
      userId,
    ]
  );

  const handleResumeGame = useCallback(
    async (resumeSessionId: string) => {
      try {
        const session = await getGameSessionById(resumeSessionId);
        if (!session) return;

        if (session.game_type !== selectedGameType) {
          window.location.href = "/";
          return;
        }

        const activePlayerId = userId || playerId;
        const isPlayerOne = activePlayerId === session.player_1_id;
        const resolvedLocalPlayerId = isPlayerOne
          ? session.player_1_id
          : activePlayerId === session.player_2_id
            ? session.player_2_id
            : session.player_1_id;

        setSessionCode(session.session_code);
        setSessionId(session.id);
        setSessionPlayer1Id(session.player_1_id);
        setSessionPlayer2Id(session.player_2_id);
        setSessionLocalPlayerId(resolvedLocalPlayerId);
        setOpponentPlayerId(
          resolvedLocalPlayerId === session.player_1_id
            ? session.player_2_id
            : session.player_1_id
        );
        setIsMultiplayer(true);
        setMultiplayerMode("join");
        setShowActiveGames(false);
        setShowModeSelect(false);
        setShowLobby(false);
        setShowGameSetup(false);

        if (session.status === "waiting" && !session.player_2_id) {
          setSetupPlayerNames([
            session.player_1_name || "Player 1",
            session.player_2_name || "Player 2",
          ]);
          setWaitingForOpponent(true);
          setOpponentHasJoined(false);
          return;
        }

        setWaitingForOpponent(false);
        await enterMultiplayerMatch(session, resolvedLocalPlayerId);
      } catch (error) {
        console.error("Error resuming game:", error);
      }
    },
    [enterMultiplayerMatch, playerId, selectedGameType, userId]
  );

  const handleCancelMultiplayer = useCallback(async () => {
    if (sessionCode && waitingForOpponent) {
      await cancelGameLobby(sessionCode);
    }

    resetSessionState();
    setShowModeSelect(true);
    setShowLobby(false);
    setShowGameSetup(false);
  }, [resetSessionState, sessionCode, waitingForOpponent]);

  const handleCreateNewGameFromWaitingRoom = useCallback(async () => {
    if (sessionCode && waitingForOpponent) {
      await cancelGameLobby(sessionCode);
    }

    resetSessionState();
    setIsMultiplayer(true);
    setMultiplayerMode("lobby");
    setShowModeSelect(false);
    setShowLobby(false);
    setShowGameSetup(true);
  }, [resetSessionState, sessionCode, waitingForOpponent]);

  const handleStartAfterOpponentJoined = useCallback(async () => {
    const session =
      (sessionId ? await getGameSessionById(sessionId) : null) ||
      (sessionCode ? await getGameSession(sessionCode) : null);

    if (!session || !session.player_2_id) return;

    const localPlayerId = sessionLocalPlayerId || session.player_1_id;
    setSessionId(session.id);
    setSessionPlayer1Id(session.player_1_id);
    setSessionPlayer2Id(session.player_2_id);
    setSessionLocalPlayerId(localPlayerId);
    setOpponentPlayerId(
      localPlayerId === session.player_1_id ? session.player_2_id : session.player_1_id
    );

    await enterMultiplayerMatch(session, localPlayerId);
  }, [enterMultiplayerMatch, sessionCode, sessionId, sessionLocalPlayerId]);

  const handleChooseDice = useCallback(
    async (size: DiceSize) => {
      if (!isLocalPlayersTurn) return;
      if (!(await assertMultiplayerTurn())) return;

      const nextState: GotGameState = {
        ...gameState,
        diceSize: size,
        phase: "rolling",
        message: `${gameState.players[gameState.currentPlayer].name} chose 1-${size} die. Roll!`,
      };

      setSelectedDiceSize(size);
      setGameState(nextState);
      await persistMultiplayerState(nextState, playerPositions, size, displayDie, "choose-die");
    },
    [
      assertMultiplayerTurn,
      displayDie,
      gameState,
      isLocalPlayersTurn,
      persistMultiplayerState,
      playerPositions,
    ]
  );

  const handleSwitchDiceSize = useCallback(
    async (size: DiceSize) => {
      if (gameState.phase !== "rolling" || isAnimating || !isLocalPlayersTurn) return;
      if (!(await assertMultiplayerTurn())) return;

      const nextState: GotGameState = {
        ...gameState,
        diceSize: size,
        message: `${gameState.players[gameState.currentPlayer].name} switched to 1-${size}. Roll!`,
      };

      setSelectedDiceSize(size);
      setGameState(nextState);
      await persistMultiplayerState(nextState, playerPositions, size, displayDie, "switch-die");
    },
    [
      assertMultiplayerTurn,
      displayDie,
      gameState,
      isAnimating,
      isLocalPlayersTurn,
      persistMultiplayerState,
      playerPositions,
    ]
  );

  const handleRoll = useCallback(async () => {
    if (gameState.phase !== "rolling" || isAnimating || !isLocalPlayersTurn) return;
    if (!(await assertMultiplayerTurn())) return;

    setIsAnimating(true);

    let count = 0;
    const totalFlips = 12;
    const diceSize = selectedDiceSize || gameState.diceSize || 9;

    const interval = setInterval(() => {
      setDisplayDie(rollOneDie(diceSize));
      count += 1;

      if (count >= totalFlips) {
        clearInterval(interval);

        const finalValue = rollOneDie(diceSize);
        const nextState: GotGameState = {
          ...gameState,
          phase: "placing",
          dieValue: finalValue,
          diceSize,
          message: `Rolled ${finalValue}! Choose a space to place your chip.`,
        };

        setDisplayDie(finalValue);
        setGameState(nextState);
        setIsAnimating(false);
        void persistMultiplayerState(
          nextState,
          playerPositions,
          diceSize,
          finalValue,
          "roll"
        );
      }
    }, 80);
  }, [
    assertMultiplayerTurn,
    gameState,
    isAnimating,
    isLocalPlayersTurn,
    persistMultiplayerState,
    playerPositions,
    selectedDiceSize,
  ]);

  useEffect(() => {
    if (gameState.phase !== "placing" || hasAnyMoves || isAnimating) return;

    const timeout = setTimeout(() => {
      const nextState: GotGameState = {
        ...gameState,
        phase: "rolling",
        dieValue: null,
        message: `Rolled ${gameState.dieValue} - no available spaces! Rolling again...`,
      };

      setGameState(nextState);
      setDisplayDie(null);
      void persistMultiplayerState(nextState, playerPositions, selectedDiceSize, null, "reroll");
    }, 1200);

    return () => clearTimeout(timeout);
  }, [
    gameState,
    hasAnyMoves,
    isAnimating,
    persistMultiplayerState,
    playerPositions,
    selectedDiceSize,
  ]);

  const handlePlaceChip = useCallback(
    async (spaceNumber: number) => {
      if (!isLocalPlayersTurn || gameState.phase !== "placing") return;
      if (!allReachable.includes(spaceNumber)) return;
      if (!(await assertMultiplayerTurn())) return;

      const space = gameState.board[spaceNumber];
      if (!space || space.owner !== null) return;

      const nextPositions: PositionState = [
        [...playerPositions[0]],
        [...playerPositions[1]],
      ];

      if (!nextPositions[gameState.currentPlayer].includes(spaceNumber)) {
        nextPositions[gameState.currentPlayer].push(spaceNumber);
      }

      const nextBoard = gameState.board.map((boardSpace) =>
        boardSpace.number === spaceNumber
          ? { ...boardSpace, owner: gameState.currentPlayer, claimed: true }
          : boardSpace
      );

      const earnedPoint = space.isPrime ? 1 : 0;
      const nextPlayers = gameState.players.map((player, index) =>
        index === gameState.currentPlayer
          ? { ...player, score: player.score + earnedPoint }
          : player
      );

      const pointPosition = { x: window.innerWidth / 2, y: window.innerHeight / 3 };
      if (earnedPoint > 0) {
        spawnPointAnimation(pointPosition.x, pointPosition.y, 1, false);
        spawnFireworks(pointPosition.x, pointPosition.y);
      }

      if (nextPlayers[gameState.currentPlayer].score >= gameState.targetScore) {
        for (let i = 0; i < 5; i += 1) {
          setTimeout(() => {
            spawnFireworks(
              pointPosition.x + (Math.random() - 0.5) * 300,
              pointPosition.y + (Math.random() - 0.5) * 200
            );
          }, i * 200);
        }

        const nextState: GotGameState = {
          ...gameState,
          board: nextBoard,
          players: nextPlayers,
          phase: "gameOver",
          dieValue: null,
          message: `${nextPlayers[gameState.currentPlayer].name} wins with ${nextPlayers[gameState.currentPlayer].score} prime numbers!`,
        };

        setPlayerPositions(nextPositions);
        setGameState(nextState);
        setDisplayDie(null);
        await persistMultiplayerState(nextState, nextPositions, selectedDiceSize, null, "place");
        return;
      }

      const nextPlayer = (gameState.currentPlayer + 1) % 2;
      const nextPhase = selectedDiceSize ? "rolling" : "chooseDice";
      const nextMessage = selectedDiceSize
        ? earnedPoint > 0
          ? `Placed on ${spaceNumber} - PRIME! +1 point! ${nextPlayers[nextPlayer].name}, roll 1-${selectedDiceSize}!`
          : `Placed on ${spaceNumber}. ${nextPlayers[nextPlayer].name}, roll 1-${selectedDiceSize}!`
        : earnedPoint > 0
          ? `Placed on ${spaceNumber} - PRIME! +1 point! ${nextPlayers[nextPlayer].name}, choose your die!`
          : `Placed on ${spaceNumber}. ${nextPlayers[nextPlayer].name}, choose your die!`;

      const nextState: GotGameState = {
        ...gameState,
        board: nextBoard,
        players: nextPlayers,
        currentPlayer: nextPlayer,
        phase: nextPhase,
        dieValue: null,
        message: nextMessage,
      };

      setPlayerPositions(nextPositions);
      setGameState(nextState);
      setDisplayDie(null);
      await persistMultiplayerState(nextState, nextPositions, selectedDiceSize, null, "place");

      if (isMultiplayer && sessionId) {
        const turnOwner = nextPlayer === 0 ? sessionPlayer1Id : sessionPlayer2Id;
        if (turnOwner) {
          await updateCurrentTurn(sessionId, turnOwner);
        }
      }
    },
    [
      allReachable,
      assertMultiplayerTurn,
      gameState,
      isLocalPlayersTurn,
      isMultiplayer,
      persistMultiplayerState,
      playerPositions,
      selectedDiceSize,
      sessionId,
      sessionPlayer1Id,
      sessionPlayer2Id,
      spawnFireworks,
      spawnPointAnimation,
    ]
  );

  const handleNewGame = useCallback(() => {
    if (isMultiplayer) {
      resetSessionState();
      setShowModeSelect(true);
      setShowLobby(false);
      setShowGameSetup(false);
      setShowSetup(false);
      return;
    }

    setShowSetup(true);
  }, [isMultiplayer, resetSessionState]);

  useEffect(() => {
    if (!botEnabled || isMultiplayer || gameState.currentPlayer !== 1 || gameState.phase === "gameOver") {
      return;
    }

    const botIsFirstMove = playerPositions[1].length === 0;

    if (gameState.phase === "chooseDice") {
      const timer = setTimeout(() => {
        const size = getBotDiceSizeForGiveOrTake(
          gameState.board,
          playerPositions[1],
          botIsFirstMove,
          botDifficulty
        );
        void handleChooseDice(size);
      }, 800);

      return () => clearTimeout(timer);
    }

    if (gameState.phase === "rolling" && !isAnimating) {
      const timer = setTimeout(() => {
        void handleRoll();
      }, 600);

      return () => clearTimeout(timer);
    }

    if (gameState.phase === "placing" && hasAnyMoves && !isAnimating) {
      const timer = setTimeout(() => {
        const target = getBotPlacementForGiveOrTake(
          gameState.board,
          gameState.dieValue ?? 0,
          playerPositions[1],
          botIsFirstMove,
          botDifficulty
        );

        if (target !== null) {
          void handlePlaceChip(target);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [
    botDifficulty,
    botEnabled,
    gameState.board,
    gameState.currentPlayer,
    gameState.dieValue,
    gameState.phase,
    handleChooseDice,
    handlePlaceChip,
    handleRoll,
    hasAnyMoves,
    isAnimating,
    isMultiplayer,
    playerPositions,
  ]);

  const showPreGameSetupPage = showModeSelect || showLobby || showGameSetup;

  if (showPreGameSetupPage) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_35%),linear-gradient(180deg,#f8fbff_0%,#eef5ff_48%,#ffffff_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.2),_transparent_30%),linear-gradient(180deg,#0f172a_0%,#111827_45%,#030712_100%)]">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-[28px] border border-slate-200/70 bg-white/90 p-6 shadow-[0_24px_80px_-28px_rgba(37,99,235,0.35)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
            {showModeSelect && (
              <MultiplayerModeSelector
                onModeSelect={handleModeSelect}
                gameName="Give or Take Game"
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
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Back to modes
                </button>
                <GameLobby
                  gameType={selectedGameType}
                  onSelectLobby={handleSelectLobby}
                  onCreateNew={() => {
                    setShowGameSetup(true);
                    setShowLobby(false);
                  }}
                  isOpen={showLobby}
                  onChangeGameType={(gameType) => {
                    if (gameType === "multiplication") {
                      window.location.href = "/";
                    }
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
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Back to lobby
                </button>
                <GameSetupForm
                  gameType={selectedGameType}
                  defaultPlayerName={setupPlayerNames[0] || ""}
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

          <AuthDialog
            open={showAuth}
            onOpenChange={setShowAuth}
            onAuthed={(name, _email, nextUserId) => {
              if (nextUserId) {
                setUserId(nextUserId);
                setPlayerId(nextUserId);
              }
              setSetupPlayerNames([name || "Player 1", setupPlayerNames[1]]);
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
      <div className="mx-auto max-w-4xl space-y-4">
        <header className="flex items-center justify-between gap-4">
          <div className="shrink-0 text-left">
            <h1 className="text-xl font-bold sm:text-2xl">Give or Take</h1>
            <p className="text-xs text-muted-foreground">
              First to {gameState.targetScore} prime numbers wins
              {gameState.timerSeconds && ` | ${gameState.timerSeconds}s timer`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleSwitchGame("/")}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try Multiplication Game
          </button>
        </header>

        {gameState.timerSeconds && timeLeft !== null && gameState.phase !== "gameOver" && (
          <div
            className={`rounded-lg p-2 text-center font-mono text-lg font-bold ${
              timeLeft <= 5
                ? "animate-pulse bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                : "bg-muted"
            }`}
          >
            Time: {timeLeft}s
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {gameState.players.map((player, index) => (
            <div
              key={player.name}
              className={`rounded-lg border-2 p-3 text-center transition-all ${
                index === gameState.currentPlayer && gameState.phase !== "gameOver"
                  ? "shadow-lg"
                  : "border-border"
              }`}
              style={
                index === gameState.currentPlayer && gameState.phase !== "gameOver"
                  ? { borderColor: player.color }
                  : undefined
              }
            >
              <div className="mb-1 flex items-center justify-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: player.color }}
                />
                <span className="text-sm font-semibold">{player.name}</span>
              </div>
              <div className="text-3xl font-black" style={{ color: player.color }}>
                {player.score}
              </div>
              <div className="text-xs text-muted-foreground">
                / {gameState.targetScore} prime numbers
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-muted p-3 text-center">
          <p className="text-sm font-semibold">{gameState.message}</p>
        </div>

        <GotBoard
          board={gameState.board}
          onSpaceClick={(spaceNumber) => {
            void handlePlaceChip(spaceNumber);
          }}
          addTargets={gameState.phase === "placing" ? reachable.addTargets : []}
          subtractTargets={gameState.phase === "placing" ? reachable.subtractTargets : []}
          directTarget={gameState.phase === "placing" ? reachable.directTarget : null}
          currentPlayerColor={currentPlayer.color}
          playerPositions={playerPositions}
        />

        <div className="flex flex-col items-center gap-4">
          <div
            className={`flex h-24 w-24 items-center justify-center rounded-2xl border-4 shadow-lg transition-all sm:h-32 sm:w-32 ${
              isAnimating
                ? "animate-bounce border-yellow-400 bg-yellow-50 dark:bg-yellow-950"
                : displayDie
                  ? "border-primary bg-card"
                  : "border-border bg-muted"
            }`}
            style={!isAnimating && displayDie ? { borderColor: currentPlayer.color } : undefined}
          >
            <span
              className={`font-black transition-all ${
                displayDie ? "text-5xl sm:text-6xl" : "text-3xl text-muted-foreground sm:text-4xl"
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
                {DICE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      void handleChooseDice(option.value);
                    }}
                    disabled={!isLocalPlayersTurn}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 px-5 py-3 font-bold shadow-sm transition-all ${
                      selectedDiceSize === option.value
                        ? "scale-105 border-primary bg-primary/10"
                        : "border-border hover:border-primary hover:bg-primary/10"
                    } ${!isLocalPlayersTurn ? "cursor-not-allowed opacity-60" : ""}`}
                    style={{
                      borderColor:
                        selectedDiceSize === option.value
                          ? currentPlayer.color
                          : `${currentPlayer.color}66`,
                    }}
                  >
                    <span className="text-xl font-black" style={{ color: currentPlayer.color }}>
                      {option.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {gameState.phase === "rolling" && (
            <div className="flex flex-col items-center gap-3">
              <Button
                size="lg"
                onClick={() => {
                  void handleRoll();
                }}
                disabled={isAnimating || !isLocalPlayersTurn}
                className="px-8 py-6 text-lg font-bold"
                style={{ backgroundColor: currentPlayer.color }}
              >
                {isAnimating
                  ? "Rolling..."
                  : `${currentPlayer.name} - Roll 1-${selectedDiceSize || gameState.diceSize || 9}!`}
              </Button>
              <div className="flex gap-2">
                {DICE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      void handleSwitchDiceSize(option.value);
                    }}
                    disabled={isAnimating || !isLocalPlayersTurn}
                    className={`rounded-lg border-2 px-3 py-1 text-xs font-semibold transition-all ${
                      (selectedDiceSize || gameState.diceSize) === option.value
                        ? "border-primary bg-primary/10 shadow-md"
                        : "border-border hover:border-primary/50 hover:bg-muted"
                    } ${isAnimating || !isLocalPlayersTurn ? "opacity-50" : ""}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {gameState.phase === "placing" && hasAnyMoves && (
            <p className="text-center text-sm text-muted-foreground">
              {isFirstMove
                ? `Click space ${gameState.dieValue} on the board to place your chip.`
                : `You rolled ${gameState.dieValue}. Pick a space to claim.`}
            </p>
          )}

          {gameState.phase === "gameOver" && (
            <Button size="lg" onClick={handleNewGame} className="px-8 py-6 text-lg font-bold">
              New Game
            </Button>
          )}
        </div>

        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-center dark:border-yellow-800 dark:bg-yellow-950/30">
          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
            Tip: An even number + an odd number always makes an odd number, and every
            prime except 2 is odd. Use that to reach primes faster.
          </p>
        </div>

        <PointAnimations
          animations={floatingEmojis}
          fireworks={fireworks}
          onAnimationComplete={handleAnimationComplete}
        />
      </div>

      <GiveOrTakeTutorial open={showTutorial} onOpenChange={setShowTutorial} />

      <AuthDialog
        open={showAuth}
        onOpenChange={setShowAuth}
        onAuthed={(name, _email, nextUserId) => {
          if (nextUserId) {
            setUserId(nextUserId);
            setPlayerId(nextUserId);
          }
          setSetupPlayerNames([name || "Player 1", setupPlayerNames[1]]);
        }}
      />

      <ActiveGamesDialog
        open={showActiveGames}
        onOpenChange={setShowActiveGames}
        userId={userId}
        gameType={selectedGameType}
        onResumeGame={handleResumeGame}
      />

      {isMultiplayer && waitingForOpponent && (
        <WaitingRoomDialog
          sessionCode={sessionCode ?? ""}
          playerName={setupPlayerNames[0]}
          gameType={selectedGameType}
          onCancel={() => {
            void handleCancelMultiplayer();
          }}
          onOpponentJoined={() => {
            void handleStartAfterOpponentJoined();
          }}
          onJoinLobby={handleSelectLobby}
          onCreateNew={() => {
            void handleCreateNewGameFromWaitingRoom();
          }}
          opponentHasJoined={opponentHasJoined}
          isOpen
        />
      )}

      <Dialog
        open={showSetup}
        onOpenChange={(open) => {
          setShowSetup(open);
          if (!open && !isMultiplayer) {
            setShowModeSelect(true);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Give or Take</DialogTitle>
            <DialogDescription>
              A unique version of the multiplication game.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-3 rounded-lg border-2 border-primary/20 bg-muted/50 p-3">
              <button
                type="button"
                onClick={() => setBotEnabled((prev) => !prev)}
                className={`flex w-full items-center justify-between rounded-lg border-2 p-3 transition-all ${
                  botEnabled
                    ? "border-primary bg-primary/10 shadow-md"
                    : "border-border hover:border-primary/50 hover:bg-muted"
                }`}
              >
                <span className="text-sm font-bold">Play vs Bot</span>
                <span
                  className={`rounded px-2 py-1 text-xs ${
                    botEnabled ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  {botEnabled ? "ON" : "OFF"}
                </span>
              </button>

              {botEnabled && (
                <div className="flex gap-2">
                  {BOT_DIFFICULTIES.map((difficulty) => (
                    <button
                      key={difficulty.value}
                      type="button"
                      onClick={() => setBotDifficulty(difficulty.value)}
                      className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg border-2 p-2 transition-all ${
                        botDifficulty === difficulty.value
                          ? "border-primary bg-primary/10 shadow-md"
                          : "border-border hover:border-primary/50 hover:bg-muted"
                      }`}
                    >
                      <span className="text-sm font-bold">{difficulty.label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {difficulty.description}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="px-1 text-sm font-bold">Players</h3>
              {[0, 1].map((index) => (
                <div
                  key={`player-${index}`}
                  className="space-y-2 rounded-lg border-2 border-border bg-background p-3"
                >
                  <label className="text-xs font-semibold">{`Player ${index + 1} Name`}</label>
                  <input
                    type="text"
                    value={setupPlayerNames[index]}
                    onChange={(event) => {
                      const nextNames: [string, string] = [...setupPlayerNames];
                      nextNames[index] = event.target.value || `Player ${index + 1}`;
                      setSetupPlayerNames(nextNames);
                    }}
                    disabled={index === 1 && botEnabled}
                    className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-foreground disabled:opacity-60"
                    placeholder={`Player ${index + 1}`}
                  />

                  <label className="mb-2 block text-xs font-semibold">Color</label>
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border shadow-sm">
                      <input
                        type="color"
                        value={setupPlayerColors[index]}
                        onChange={(event) => {
                          const nextColors: [string, string] = [...setupPlayerColors];
                          nextColors[index] = event.target.value;
                          setSetupPlayerColors(nextColors);
                        }}
                        className="h-16 w-16 scale-150 cursor-pointer"
                        style={{ border: "none", padding: "0", margin: "0" }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_PALETTE.map((color) => (
                        <button
                          key={`${index}-${color.value}`}
                          type="button"
                          onClick={() => {
                            const nextColors: [string, string] = [...setupPlayerColors];
                            nextColors[index] = color.value;
                            setSetupPlayerColors(nextColors);
                          }}
                          className="h-7 w-7 rounded-full border-2"
                          style={{
                            backgroundColor: color.value,
                            borderColor:
                              setupPlayerColors[index] === color.value
                                ? "#111827"
                                : "transparent",
                          }}
                          aria-label={`${color.name} for player ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <label className="px-1 text-sm font-semibold">Turn Timer</label>
              <div className="flex flex-wrap gap-2">
                {TIMER_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setSetupTimer(option.value)}
                    className={`rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-all ${
                      setupTimer === option.value
                        ? "border-primary bg-primary/10 shadow-md"
                        : "border-border hover:border-primary/50 hover:bg-muted"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4 text-sm">
              <div className="mb-3 text-base font-semibold">How to Play</div>
              <ul className="list-inside list-disc space-y-2 text-muted-foreground">
                <li>Each turn, choose your die size: 1-9, 1-19, or 1-99.</li>
                <li>Your first move must land directly on the rolled number.</li>
                <li>After that, you can place on the die value or add/subtract it from any of your existing spaces.</li>
                <li>Landing on a prime number scores 1 point.</li>
                <li>First to {DEFAULT_TARGET_SCORE} prime numbers wins.</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={() => setShowTutorial(true)} variant="outline">
              How to Play
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowSetup(false);
                setShowModeSelect(true);
              }}
            >
              Back
            </Button>
            <Button onClick={handleStartLocalOrBotGame} size="lg" className="font-bold">
              Start Game
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showExitConfirmDialog} onOpenChange={setShowExitConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exit Game</DialogTitle>
            <DialogDescription>
              You have an active game in progress. Are you sure you want to exit?
              Your progress will be lost.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
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
  );
}
