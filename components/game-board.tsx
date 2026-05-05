"use client";

import React from "react"

import { useRef, useEffect, forwardRef } from "react";
import { cn } from "@/lib/utils";
import type { BoardSpace } from "@/lib/game-utils";
import { PLAYER_COLORS } from "@/lib/game-utils";
import { ConnectionAnimation, type CompletedTrack } from "./connection-animation";

interface GameBoardProps {
  board: BoardSpace[];
  onSpaceClick: (space: BoardSpace) => void;
  highlightedSpaces?: number[];
  validMoves?: number[];
  tracks?: CompletedTrack[];
  boardRef?: React.RefObject<HTMLDivElement | null>;
}

export function GameBoard({
  board,
  onSpaceClick,
  highlightedSpaces = [],
  validMoves = [],
  tracks = [],
  boardRef,
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
        
        {/* Main board */}
        <div className="flex-1 relative">
          <div ref={gridRef} className="grid grid-cols-10 grid-rows-10 aspect-square w-full gap-px bg-gray-400 dark:bg-gray-500 p-px rounded-lg">
            {rows.map((row, rowIndex) =>
              row.map((space, colIndex) => (
                <BoardSpaceCell
                  key={space?.number ?? `${rowIndex}-${colIndex}`}
                  space={space}
                  onClick={() => space && onSpaceClick(space)}
                  isHighlighted={highlightedSpaces.includes(space?.number ?? -1)}
                  isValidMove={validMoves.includes(space?.number ?? -1)}
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
}

function BoardSpaceCell({
  space,
  onClick,
  isHighlighted,
  isValidMove,
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
    return (
      <div
        data-space={space.number}
        className="w-full h-full flex flex-col items-center justify-center p-0.5 bg-white dark:bg-zinc-900 cursor-default"
      >
        <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-gray-300 dark:border-gray-600">
          <span className="leading-none text-sm sm:text-lg md:text-xl font-bold text-blue-600 dark:text-blue-400">
            {space.number}
          </span>
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
        className="w-full h-full flex items-center justify-center relative overflow-hidden"
        style={{ backgroundColor: ownerColor ? ownerColor + "CC" : "#E5E7EB" }}
      >
        <span className="text-xs font-bold text-foreground">{space.number}</span>
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
        isValidMove && !space.owner && "ring-2 ring-green-500"
      )}
      style={!space.isPrime && ownerColor ? { backgroundColor: ownerColor + "CC" } : undefined}
    >
      {/* Number with circle - composite numbers only */}
      {!space.isPrime && (
        <div className="flex items-center justify-center shrink-0">
          <span
            className={cn(
              "leading-none",
              space.factorization && space.factorization.split(' × ').length > 3
              ? "text-[7px] sm:text-xs font-bold text-foreground"
              : "text-[10px] sm:text-sm font-bold text-foreground"
            )}
          >
            {space.number}
          </span>
        </div>
      )}

      {/* Factorization - individual numbers in rounded boxes */}
      {!space.isPrime && space.factorization && (
        <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
          {space.factorization.split(' × ').map((factor, idx) => (
            <span 
              key={idx}
              className={cn(
                "w-4 h-4 sm:w-5 sm:h-5 text-[6px] sm:text-[8px] font-bold text-foreground rounded-md flex items-center justify-center border border-yellow-500 dark:border-yellow-400 bg-transparent"
              )}
            >
              {factor}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
