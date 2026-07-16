"use client";

import React from "react"

import { useRef, useEffect, forwardRef } from "react";
import { cn } from "@/lib/utils";
import type { BoardSpace } from "@/lib/game-utils";
import { PLAYER_COLORS } from "@/lib/game-utils";
import { ConnectionAnimation, type CompletedTrack } from "./connection-animation";
import { getDiceSkinImage, type DiceSkin } from "@/components/dice-skin-settings";

interface GameBoardProps {
  board: BoardSpace[];
  onSpaceClick: (space: BoardSpace) => void;
  highlightedSpaces?: number[];
  validMoves?: number[];
  tracks?: CompletedTrack[];
  boardRef?: React.RefObject<HTMLDivElement | null>;
  lastClaimedSpace?: number | null;
  opponentSelectedSpace?: number | null;
  skins?: DiceSkin[] | null;
}

export function GameBoard({
  board,
  onSpaceClick,
  highlightedSpaces = [],
  validMoves = [],
  tracks = [],
  boardRef,
  lastClaimedSpace = null,
  opponentSelectedSpace = null,
  skins = null,
}: GameBoardProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const gridRef = boardRef ?? internalRef;
  // Arrange board: row 9 (90-99) at top, row 0 (0-9) at bottom
  const rows = [];
  for (let row = 9; row >= 0; row--) {
    const rowSpaces = [];
    for (let col = 0; col < 10; col++) {
      const index = row * 10 + col;
      rowSpaces.push(board[index]);
    }
    rows.push(rowSpaces);
  }

  return (
    <div className="w-full max-w-[92vw] sm:max-w-3xl mx-auto flex flex-col gap-px sm:gap-2">
      <div className="flex gap-px sm:gap-2">
        {/* Left vertical axis - Website credit */}
        <div className="flex items-center justify-center shrink-0">
          <span 
            className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            TimesOfPrimes.com
          </span>
        </div>
        
        {/* Main board - overflow visible so the track train/smoke aren't clipped at edges */}
        <div className="flex-1 relative">
          <div ref={gridRef} className="grid grid-cols-10 grid-rows-10 aspect-square w-full gap-px bg-gray-400 dark:bg-gray-500 p-px rounded-lg overflow-hidden">
            {rows.map((row, rowIndex) =>
              row.map((space, colIndex) => (
                <BoardSpaceCell
                  key={space?.number ?? `${rowIndex}-${colIndex}`}
                  space={space}
                  onClick={() => space && onSpaceClick(space)}
                  isHighlighted={highlightedSpaces.includes(space?.number ?? -1)}
                  isValidMove={validMoves.includes(space?.number ?? -1)}
                  isLastClaimed={lastClaimedSpace === space?.number}
                  isOpponentSelected={opponentSelectedSpace === space?.number}
                  skins={skins}
                />
              ))
            )}
          </div>
          {/* Track overlay */}
          <ConnectionAnimation tracks={tracks} boardRef={gridRef} />
        </div>
      </div>
      

    </div>
  );
}

interface BoardSpaceCellProps {
  space: BoardSpace | undefined;
  onClick: () => void;
  isHighlighted: boolean;
  isValidMove: boolean;
  isLastClaimed?: boolean;
  isOpponentSelected?: boolean;
  skins?: DiceSkin[] | null;
}

function BoardSpaceCell({
  space,
  onClick,
  isHighlighted,
  isValidMove,
  isLastClaimed = false,
  isOpponentSelected = false,
  skins = null,
}: BoardSpaceCellProps) {
  if (!space) {
    return <div className="w-full h-full bg-white dark:bg-zinc-900" />;
  }

  // Bottom left cell (0) - Times of Primes logo
  if (space.number === 0) {
    return (
      <div data-space={space.number} className="w-full h-full bg-white dark:bg-zinc-900 flex items-center justify-center p-0.5 overflow-hidden">
        <span 
          className="text-[8px] sm:text-[11px] font-black text-center leading-none"
          style={{
            background: "linear-gradient(90deg, #ff0000, #ff8000, #ffff00, #00ff00, #00bfff, #8000ff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Times
          <br />
          Of
          <br />
          Primes
        </span>
      </div>
    );
  }

  // Prime numbers - never claimed, just display
  if (space.isPrime) {
    const primeSkin = getDiceSkinImage(space.number, skins);
    return (
      <div
        data-space={space.number}
        className="w-full h-full flex flex-col items-center justify-center p-0.5 bg-white dark:bg-zinc-900 cursor-default"
      >
        <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-red-400 dark:border-red-500 overflow-hidden">
          {primeSkin ? (
            <img
              src={primeSkin || "/placeholder.svg"}
              alt={`${space.number}`}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <span className="leading-none text-sm sm:text-lg md:text-xl font-bold text-blue-600 dark:text-blue-400">
              {space.number}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Claimed space - fill entire cell with owner color
  if (space.claimed) {
    const ownerColor = space.owner !== null ? PLAYER_COLORS[space.owner] : null;
    return (
      <div 
        data-space={space.number}
        className={cn(
          "w-full h-full flex items-center justify-center relative overflow-hidden",
          isLastClaimed && "ring-4 ring-yellow-400 ring-inset"
        )}
        style={{ backgroundColor: ownerColor ? ownerColor + "CC" : "#E5E7EB" }}
      >
        <span className="text-lg font-bold text-foreground">{space.number}</span>
      </div>
    );
  }

  const ownerColor = space.owner !== null ? PLAYER_COLORS[space.owner] : null;

  return (
    <button
      type="button"
      data-space={space.number}
      onClick={onClick}
      disabled={space.isPrime || space.owner !== null}
      className={cn(
        "w-full h-full transition-all duration-200 relative overflow-hidden",
        "flex flex-col items-center justify-center p-0.5",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
        "bg-white dark:bg-zinc-900",
        !space.isPrime && !space.owner && "hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer",
        space.isPrime && "cursor-default",
        space.owner !== null && "cursor-default",
        isHighlighted && "ring-2 ring-chart-1",
        isValidMove && !space.owner && "bg-green-50 dark:bg-green-950 shadow-[inset_0_0_12px_2px_rgba(34,197,94,0.55)] animate-pulse",
        isOpponentSelected && !space.owner && "ring-2 ring-dashed ring-purple-500"
      )}
      style={!space.isPrime && ownerColor ? { backgroundColor: ownerColor + "CC" } : undefined}
    >
      {/* Number with circle - composite numbers only */}
      {!space.isPrime && (
        <div className="flex items-center justify-center shrink-0">
          <span
            className={cn(
              "leading-none transition-colors",
              space.factorization && space.factorization.split(' × ').length > 3
              ? "text-[7px] sm:text-xs font-bold"
              : "text-[10px] sm:text-sm font-bold",
              isValidMove && !space.owner
                ? "text-green-600 dark:text-green-400 [text-shadow:0_0_6px_rgba(34,197,94,0.9)]"
                : "text-foreground"
            )}
          >
            {space.number}
          </span>
        </div>
      )}

      {/* Factorization - individual numbers in rounded boxes */}
      {!space.isPrime && space.factorization && (
        <div className="flex justify-center">
          <div className="flex flex-wrap gap-0.5 mt-0.5 justify-center max-w-[110px]">
          {(() => {
            let factors = space.factorization.split(' × ');
            // Special case: 54 should display as (3, 3, 3, 2) for better aesthetics
            if (space.number === 54) {
              factors = ['3', '3', '3', '2'];
            }
            // Special case: 60 should display as (2, 2, 3, 5) with 2 factors per row
            if (space.number === 60) {
              factors = ['2', '2', '3', '5'];
            }
            return factors.map((factor, idx) => {
            const factorSkin = getDiceSkinImage(factor, skins);
            if (factorSkin) {
              return (
                <span
                  key={idx}
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-md overflow-hidden flex items-center justify-center border border-yellow-500 dark:border-yellow-400"
                >
                  <img
                    src={factorSkin || "/placeholder.svg"}
                    alt={factor}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </span>
              );
            }
            return (
            <span 
              key={idx}
              className={cn(
                "w-4 h-4 sm:w-5 sm:h-5 text-[10px] sm:text-[12px] font-black text-foreground rounded-md flex items-center justify-center border border-yellow-500 dark:border-yellow-400",
                factor === "2"
                  ? "bg-green-100 dark:bg-green-900 shadow-[0_0_8px_2px_rgba(34,197,94,0.7)]"
                  : factor === "31"
                  ? "bg-green-100 dark:bg-green-900"
                  : factor === "3"
                  ? "bg-amber-200 dark:bg-amber-800 shadow-[0_0_8px_2px_rgba(245,158,11,0.7)]"
                  : factor === "5"
                  ? "bg-red-200 dark:bg-red-800 shadow-[0_0_8px_2px_rgba(239,68,68,0.7)]"
                  : factor === "7"
                  ? "bg-amber-100 dark:bg-amber-900 shadow-[0_0_8px_2px_rgba(245,158,11,0.6)]"
                  : factor === "11"
                  ? "bg-orange-100 dark:bg-orange-900"
                  : factor === "13"
                  ? "bg-red-100 dark:bg-red-900"
                  : factor === "17"
                  ? "bg-teal-100 dark:bg-teal-900"
                  : factor === "19"
                  ? "bg-indigo-100 dark:bg-indigo-900"
                  : factor === "23"
                  ? "bg-yellow-100 dark:bg-yellow-900"
                  : factor === "29"
                  ? "bg-violet-200 dark:bg-violet-800"
                  : factor === "37"
                  ? "bg-purple-100 dark:bg-purple-900"
                  : factor === "41"
                  ? "bg-stone-200 dark:bg-stone-800"
                  : factor === "43"
                  ? "bg-pink-100 dark:bg-pink-900"
                  : factor === "47"
                  ? "bg-red-100 dark:bg-red-900"
                  : "bg-white dark:bg-zinc-900"
              )}
            >
              {factor}
            </span>
            );
            });
            })()}
          </div>
        </div>
      )}
    </button>
  );
}
