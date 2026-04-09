"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { GotBoard } from "./got-board";
import {
  PointAnimations,
  type FloatingEmoji,
  type FireworkParticle,
} from "./point-animations";
import {
  generateGotBoard,
  type GotGameState,
  PLAYER_COLORS,
} from "@/lib/give-or-take-utils";
import { GiveOrTakeTutorial } from "./give-or-take-tutorial";
import { MultiplayerModeDialog } from "./multiplayer-mode-dialog";
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
import { Button } from "@/components/ui/button";
import { createGameLobby, cancelGameLobby, subscribeToSession, subscribeToGameState, generatePlayerId, sendHeartbeat } from "@/lib/supabase-multiplayer";
import { usePlayerProfile } from "@/hooks/use-player-profile";

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
  const [gameState, setGameState] = useState<GotGameState>(
    createInitialState(["Player 1", "Player 2"], [PLAYER_COLORS[0], PLAYER_COLORS[1]])
  );
  const [showTutorial, setShowTutorial] = useState(false);
  const [showModeSelect, setShowModeSelect] = useState(true);

  // Authentication
  const { user: authUser } = usePlayerProfile();
  const [userId, setUserId] = useState<string | null>(null);

  // Multiplayer state
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionPlayer1Id, setSessionPlayer1Id] = useState<string | null>(null);
  const [sessionPlayer2Id, setSessionPlayer2Id] = useState<string | null>(null);
  const [sessionLocalPlayerId, setSessionLocalPlayerId] = useState<string | null>(
    null
  );
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [opponentHasJoined, setOpponentHasJoined] = useState(false);
  const [playerNames, setPlayerNames] = useState<[string, string]>(["Player 1", "Player 2"]);
  const [showAuth, setShowAuth] = useState(false);
  const [showLobby, setShowLobby] = useState(false);
  const [showGameSetup, setShowGameSetup] = useState(false);
  const [lobbyLoading, setLobbyLoading] = useState(false);
  const [heartbeatInterval, setHeartbeatInterval] = useState<NodeJS.Timeout | null>(null);

  // Animation states
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [fireworks, setFireworks] = useState<FireworkParticle[]>([]);

  // Set userId from auth
  useEffect(() => {
    if (authUser?.id) {
      setUserId(authUser.id);
      setPlayerId(authUser.id);
    }
  }, [authUser]);

  // Generate local player ID
  useEffect(() => {
    const id = generatePlayerId();
    if (!playerId) {
      setPlayerId(id || null);
    }
  }, [playerId]);

  // Setup heartbeat for multiplayer
  useEffect(() => {
    if (isMultiplayer && sessionId && sessionLocalPlayerId) {
      sendHeartbeat(sessionLocalPlayerId, sessionId, true);
      const interval = setInterval(() => {
        sendHeartbeat(sessionLocalPlayerId, sessionId, true);
      }, 10000);
      setHeartbeatInterval(interval);
      return () => {
        clearInterval(interval);
        sendHeartbeat(sessionLocalPlayerId, sessionId, false);
      };
    }

  // Subscribe to game state updates
  useEffect(() => {
    if (!isMultiplayer || !sessionId) return;
    const channel = subscribeToGameState(sessionId, (states) => {
      const latestState = states[states.length - 1];
      if (latestState?.game_state) {
        try {
          const newState = JSON.parse(latestState.game_state);
          setGameState(newState);
        } catch (error) {
          console.error("Failed to parse game state:", error);
        }
      }
    });
    return () => {
      channel?.unsubscribe();
    };
  }, [isMultiplayer, sessionId]);

  // Subscribe to session updates
  useEffect(() => {
    if (!isMultiplayer || !sessionCode) return;
    const channel = subscribeToSession(sessionCode, (session) => {
      if (!session) return;
      setSessionId(session.id);
      setSessionPlayer1Id(session.player_1_id);
      setSessionPlayer2Id(session.player_2_id);
      const opponentId =
        sessionLocalPlayerId === session.player_1_id
          ? session.player_2_id
          : session.player_1_id;
      if (opponentId && !opponentHasJoined) {
        setOpponentHasJoined(true);
      }
    });
    return () => {
      channel?.unsubscribe();
    };
  }, [isMultiplayer, sessionCode, sessionLocalPlayerId, opponentHasJoined]);

  const handleModeSelect = useCallback(
    (mode: "bot" | "local" | "create") => {
      if (mode === "create" && !authUser?.id) {
        setShowAuth(true);
        return;
      }
      if (mode === "bot") {
        setShowModeSelect(false);
        return;
      }
      if (mode === "local") {
        setShowModeSelect(false);
        return;
      }
      if (mode === "create") {
        setShowLobby(true);
        setShowModeSelect(false);
      }
    },
    [authUser?.id]
  );

  const handleGameSetupSubmit = useCallback(
    async (settings: { playerName: string; targetScore?: number }) => {
      setLobbyLoading(true);
      try {
        const playerIdToUse = authUser?.id || userId;
        const session = await createGameLobby(
          "give-or-take",
          settings.playerName,
          { targetScore: settings.targetScore },
          playerIdToUse
        );
        if (session) {
          setSessionId(session.id);
          setSessionCode(session.session_code);
          setSessionPlayer1Id(session.player_1_id);
          setSessionPlayer2Id(session.player_2_id);
          setSessionLocalPlayerId(session.player_1_id);
          setPlayerId(session.player_1_id);
          setIsMultiplayer(true);
          setShowGameSetup(false);
          setShowLobby(false);
          setWaitingForOpponent(true);
          setPlayerNames([settings.playerName, "Waiting..."]);
        }
      } catch (error) {
        console.error("Error creating game lobby:", error);
      } finally {
        setLobbyLoading(false);
      }
    },
    [authUser?.id, userId]
  );

  // Show lobby
  if (showLobby) {
    return (
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8">
        <div className="rounded-lg border border-border bg-card p-6">
          <button
            onClick={() => {
              setShowLobby(false);
              setShowModeSelect(true);
            }}
            className="mb-4 text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to modes
          </button>
          <GameLobby
            gameType="give-or-take"
            onSelectLobby={() => {}}
            onCreateNew={() => {
              setShowGameSetup(true);
              setShowLobby(false);
            }}
            isOpen={showLobby}
          />
        </div>
      </div>
    );
  }

  // Show game setup form
  if (showGameSetup) {
    return (
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8">
        <div className="rounded-lg border border-border bg-card p-6">
          <button
            onClick={() => {
              setShowGameSetup(false);
              setShowLobby(true);
            }}
            className="mb-4 text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to lobby
          </button>
          <GameSetupForm
            gameType="give-or-take"
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
      </div>
    );
  }

  // Show waiting room
  if (isMultiplayer && waitingForOpponent) {
    return (
      <WaitingRoomDialog
        sessionCode={sessionCode ?? ""}
        playerName={playerNames[0]}
        gameType="give-or-take"
        onCancel={() => {
          if (sessionCode) {
            void cancelGameLobby(sessionCode);
          }
          setIsMultiplayer(false);
          setWaitingForOpponent(false);
          setSessionCode(null);
          setSessionId(null);
          setSessionPlayer1Id(null);
          setSessionPlayer2Id(null);
          setSessionLocalPlayerId(null);
          setShowModeSelect(true);
        }}
        onOpponentJoined={() => {
          setWaitingForOpponent(false);
          setOpponentHasJoined(false);
        }}
        onJoinLobby={() => {}}
        onCreateNew={() => {
          setShowModeSelect(true);
          setWaitingForOpponent(false);
        }}
        opponentHasJoined={opponentHasJoined}
        isOpen
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-6xl space-y-4">
        <GiveOrTakeTutorial open={showTutorial} onOpenChange={setShowTutorial} />
        
        <MultiplayerModeDialog
          open={showModeSelect}
          onOpenChange={setShowModeSelect}
          onModeSelect={handleModeSelect}
          gameName="Give or Take"
        />

        {/* Main game board */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="grid gap-4">
            <GotBoard board={gameState.board} />
            <PointAnimations
              animations={floatingEmojis}
              fireworks={fireworks}
              onAnimationComplete={() => {}}
            />
          </div>
        </div>

        <PointAnimations
          animations={floatingEmojis}
          fireworks={fireworks}
          onAnimationComplete={handleAnimationComplete}
        />
      </div>
    </div>
  );
}
