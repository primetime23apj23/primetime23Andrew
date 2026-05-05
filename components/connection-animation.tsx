"use client";

import { useEffect, useState } from "react";

export interface CompletedTrack {
  id: string;
  primeStart: number;
  primeEnd: number;
  spaces: number[];
  direction: string;
  playerColor: string;
  animating: boolean;
}

interface ConnectionAnimationProps {
  tracks: CompletedTrack[];
  boardRef: React.RefObject<HTMLDivElement | null>;
}

function getCellCenter(boardEl: HTMLElement, spaceNumber: number): { x: number; y: number } | null {
  // Find the actual DOM cell using data attribute
  const cell = boardEl.querySelector(`[data-space="${spaceNumber}"]`) as HTMLElement | null;
  if (cell) {
    const boardRect = boardEl.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    return {
      x: cellRect.left - boardRect.left + cellRect.width / 2,
      y: cellRect.top - boardRect.top + cellRect.height / 2,
    };
  }

  // Fallback: calculate mathematically
  const row = Math.floor(spaceNumber / 10);
  const col = spaceNumber % 10;
  const visualRow = 9 - row;

  const boardRect = boardEl.getBoundingClientRect();
  const cellWidth = boardRect.width / 10;
  const cellHeight = boardRect.height / 10;

  return {
    x: col * cellWidth + cellWidth / 2,
    y: visualRow * cellHeight + cellHeight / 2,
  };
}

// Choo choo train SVG component
function ChooChooTrain({ x, y, angle, progress }: { x: number; y: number; angle: number; progress: number }) {
  // Firework sparks that trail behind
  const sparks = [];
  const sparkCount = 6;
  for (let i = 0; i < sparkCount; i++) {
    const sparkAngle = (i / sparkCount) * Math.PI * 2 + progress * 20;
    const sparkDist = 8 + Math.sin(progress * 30 + i * 2) * 6;
    const sx = Math.cos(sparkAngle) * sparkDist - 18;
    const sy = Math.sin(sparkAngle) * sparkDist;
    const sparkSize = 1.5 + Math.sin(progress * 25 + i) * 1;
    const colors = ["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#ff6bd6", "#ffaa5c"];
    sparks.push(
      <circle
        key={`spark-${i}`}
        cx={sx}
        cy={sy}
        r={sparkSize}
        fill={colors[i % colors.length]}
        opacity={0.6 + Math.sin(progress * 20 + i * 3) * 0.4}
      />
    );
  }

  // Smoke puffs
  const smokeCount = 3;
  const smokes = [];
  for (let i = 0; i < smokeCount; i++) {
    const age = (progress * 15 + i * 1.5) % 4;
    const smokeX = -12 - age * 4;
    const smokeY = -8 - age * 3;
    const smokeR = 3 + age * 2;
    smokes.push(
      <circle
        key={`smoke-${i}`}
        cx={smokeX}
        cy={smokeY}
        r={smokeR}
        fill="#9ca3af"
        opacity={Math.max(0, 0.5 - age * 0.12)}
      />
    );
  }

  return (
    <g transform={`translate(${x}, ${y}) rotate(${angle})`}>
      {/* Firework sparks */}
      {sparks}
      {/* Smoke puffs */}
      {smokes}
      
      {/* Train body (engine) */}
      <rect x="-14" y="-8" width="28" height="16" rx="4" fill="#e53e3e" stroke="#c53030" strokeWidth="1.5" />
      {/* Cabin */}
      <rect x="4" y="-12" width="10" height="12" rx="2" fill="#c53030" stroke="#9b2c2c" strokeWidth="1" />
      {/* Cabin window */}
      <rect x="6" y="-10" width="6" height="5" rx="1" fill="#bee3f8" opacity="0.9" />
      {/* Smokestack */}
      <rect x="-10" y="-14" width="5" height="6" rx="1" fill="#4a5568" />
      <ellipse cx="-7.5" cy="-14" rx="4" ry="2" fill="#4a5568" />
      {/* Front bumper */}
      <rect x="-16" y="-4" width="4" height="8" rx="2" fill="#ecc94b" />
      {/* Headlight */}
      <circle cx="-16" cy="0" r="2.5" fill="#fefcbf" stroke="#ecc94b" strokeWidth="0.5" />
      {/* Wheels */}
      <circle cx="-8" cy="8" r="4" fill="#2d3748" stroke="#1a202c" strokeWidth="1" />
      <circle cx="-8" cy="8" r="1.5" fill="#718096" />
      <circle cx="4" cy="8" r="4" fill="#2d3748" stroke="#1a202c" strokeWidth="1" />
      <circle cx="4" cy="8" r="1.5" fill="#718096" />
      {/* Connecting rod animation */}
      <line 
        x1="-8" y1="8" 
        x2="4" y2="8" 
        stroke="#a0aec0" strokeWidth="1.5" 
        transform={`translate(0, ${Math.sin(progress * 40) * 1.5})`}
      />
    </g>
  );
}

export function ConnectionAnimation({ tracks, boardRef }: ConnectionAnimationProps) {
  const [animationStates, setAnimationStates] = useState<Map<string, { progress: number; done: boolean }>>(new Map());

  useEffect(() => {
    const animatingTracks = tracks.filter((t) => t.animating);
    if (animatingTracks.length === 0) return;

    for (const track of animatingTracks) {
      if (animationStates.has(track.id) && animationStates.get(track.id)?.done) continue;

      if (!animationStates.has(track.id)) {
        setAnimationStates((prev) => {
          const next = new Map(prev);
          next.set(track.id, { progress: 0, done: false });
          return next;
        });
      }
    }

    const interval = setInterval(() => {
      setAnimationStates((prev) => {
        const next = new Map(prev);
        let allDone = true;

        for (const track of animatingTracks) {
          const state = next.get(track.id);
          if (!state || state.done) continue;

          const newProgress = Math.min(state.progress + 0.018, 1);
          const done = newProgress >= 1;
          next.set(track.id, { progress: newProgress, done });
          if (!done) allDone = false;
        }

        if (allDone) {
          clearInterval(interval);
        }

        return next;
      });
    }, 16);

    return () => clearInterval(interval);
  }, [tracks, animationStates]);

  if (!boardRef.current || tracks.length === 0) return null;

  const boardEl = boardRef.current;
  const boardRect = boardEl.getBoundingClientRect();
  const cellWidth = boardRect.width / 10;
  const cellHeight = boardRect.height / 10;
  // Reduce track size to not overlap prime numbers - use about 70% of cell size
  const trackInset = Math.min(cellWidth, cellHeight) * 0.15;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: "100%", height: "100%", overflow: "visible" }}
    >
      {tracks.map((track) => {
        const allPoints = [track.primeStart, ...track.spaces, track.primeEnd];
        const rawCenters = allPoints.map((n) => getCellCenter(boardEl, n)).filter(Boolean) as { x: number; y: number }[];

        if (rawCenters.length < 2) return null;

        // Inset the track to not overlap prime numbers - move centers closer to line path
        const centers: { x: number; y: number }[] = [];
        for (let i = 0; i < rawCenters.length; i++) {
          if (i === 0 || i === rawCenters.length - 1) {
            // For start and end points (primes), inset toward the next/prev point
            const neighbor = i === 0 ? rawCenters[1] : rawCenters[rawCenters.length - 2];
            const dx = neighbor.x - rawCenters[i].x;
            const dy = neighbor.y - rawCenters[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
              centers.push({
                x: rawCenters[i].x + (dx / dist) * trackInset,
                y: rawCenters[i].y + (dy / dist) * trackInset,
              });
            } else {
              centers.push(rawCenters[i]);
            }
          } else {
            // For intermediate points, move toward the line direction
            const prev = rawCenters[i - 1];
            const next = rawCenters[i + 1];
            const dx1 = rawCenters[i].x - prev.x;
            const dy1 = rawCenters[i].y - prev.y;
            const dx2 = next.x - rawCenters[i].x;
            const dy2 = next.y - rawCenters[i].y;
            const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
            const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
            
            let moveX = 0, moveY = 0;
            if (dist1 > 0) {
              moveX -= (dx1 / dist1) * trackInset;
              moveY -= (dy1 / dist1) * trackInset;
            }
            if (dist2 > 0) {
              moveX += (dx2 / dist2) * trackInset;
              moveY += (dy2 / dist2) * trackInset;
            }
            
            const moveLen = Math.sqrt(moveX * moveX + moveY * moveY);
            if (moveLen > 0) {
              const clampedInset = Math.min(trackInset, moveLen);
              centers.push({
                x: rawCenters[i].x + (moveX / moveLen) * clampedInset,
                y: rawCenters[i].y + (moveY / moveLen) * clampedInset,
              });
            } else {
              centers.push(rawCenters[i]);
            }
          }
        }

        const state = animationStates.get(track.id);
        const progress = state?.progress ?? (track.animating ? 0 : 1);
        const showTrain = track.animating && progress < 1;

        const pathPoints = centers.map((c) => `${c.x},${c.y}`).join(" ");

        // Calculate total path length
        let totalLength = 0;
        for (let i = 1; i < centers.length; i++) {
          const dx = centers[i].x - centers[i - 1].x;
          const dy = centers[i].y - centers[i - 1].y;
          totalLength += Math.sqrt(dx * dx + dy * dy);
        }

        // Calculate train position
        let trainX = centers[0].x;
        let trainY = centers[0].y;
        let trainAngle = 0;

        if (showTrain && progress > 0) {
          const targetDist = progress * totalLength;
          let accumulated = 0;

          for (let i = 1; i < centers.length; i++) {
            const dx = centers[i].x - centers[i - 1].x;
            const dy = centers[i].y - centers[i - 1].y;
            const segLen = Math.sqrt(dx * dx + dy * dy);

            if (accumulated + segLen >= targetDist) {
              const t = (targetDist - accumulated) / segLen;
              trainX = centers[i - 1].x + dx * t;
              trainY = centers[i - 1].y + dy * t;
              trainAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
              break;
            }
            accumulated += segLen;
          }
        }

        const drawnLength = progress * totalLength;

        return (
          <g key={track.id}>
            {/* Railroad ties (brown) */}
            {centers.slice(0, -1).map((c, i) => {
              const next = centers[i + 1];
              const dx = next.x - c.x;
              const dy = next.y - c.y;
              const len = Math.sqrt(dx * dx + dy * dy);
              const tieCount = Math.max(2, Math.floor(len / 12));
              const perpX = -dy / len;
              const perpY = dx / len;
              
              return Array.from({ length: tieCount }, (_, ti) => {
                const t = (ti + 0.5) / tieCount;
                const tx = c.x + dx * t;
                const ty = c.y + dy * t;
                const tieHalf = 8;
                
                // Only show ties where track has been drawn
                let segStart = 0;
                for (let si = 0; si < i; si++) {
                  const sdx = centers[si + 1].x - centers[si].x;
                  const sdy = centers[si + 1].y - centers[si].y;
                  segStart += Math.sqrt(sdx * sdx + sdy * sdy);
                }
                const tiePos = segStart + len * t;
                if (tiePos > drawnLength) return null;
                
                return (
                  <line
                    key={`tie-${i}-${ti}`}
                    x1={tx - perpX * tieHalf}
                    y1={ty - perpY * tieHalf}
                    x2={tx + perpX * tieHalf}
                    y2={ty + perpY * tieHalf}
                    stroke="#8B6914"
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.7"
                  />
                );
              });
            })}
            
            {/* Rails (steel gray, two parallel lines) */}
            {centers.length >= 2 && (() => {
              const railOffset = 4;
              const rail1Points: string[] = [];
              const rail2Points: string[] = [];
              
              for (let i = 0; i < centers.length; i++) {
                let perpX = 0;
                let perpY = 0;
                
                if (i < centers.length - 1) {
                  const dx = centers[i + 1].x - centers[i].x;
                  const dy = centers[i + 1].y - centers[i].y;
                  const len = Math.sqrt(dx * dx + dy * dy);
                  perpX = -dy / len;
                  perpY = dx / len;
                } else {
                  const dx = centers[i].x - centers[i - 1].x;
                  const dy = centers[i].y - centers[i - 1].y;
                  const len = Math.sqrt(dx * dx + dy * dy);
                  perpX = -dy / len;
                  perpY = dx / len;
                }
                
                rail1Points.push(`${centers[i].x + perpX * railOffset},${centers[i].y + perpY * railOffset}`);
                rail2Points.push(`${centers[i].x - perpX * railOffset},${centers[i].y - perpY * railOffset}`);
              }
              
              return (
                <>
                  <polyline
                    points={rail1Points.join(" ")}
                    fill="none"
                    stroke="#71717a"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={totalLength}
                    strokeDashoffset={totalLength - drawnLength}
                  />
                  <polyline
                    points={rail2Points.join(" ")}
                    fill="none"
                    stroke="#71717a"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={totalLength}
                    strokeDashoffset={totalLength - drawnLength}
                  />
                </>
              );
            })()}
            
            {/* Player color glow underneath */}
            <polyline
              points={pathPoints}
              fill="none"
              stroke={track.playerColor}
              strokeWidth="18"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={totalLength}
              strokeDashoffset={totalLength - drawnLength}
              opacity="0.15"
            />
            
            {/* Station markers at primes - use raw centers to position at actual prime cells */}
            {progress >= 1 && (
              <>
                <circle cx={rawCenters[0].x} cy={rawCenters[0].y} r="6" fill={track.playerColor} opacity="0.8" stroke="white" strokeWidth="1.5" />
                <circle cx={rawCenters[rawCenters.length - 1].x} cy={rawCenters[rawCenters.length - 1].y} r="6" fill={track.playerColor} opacity="0.8" stroke="white" strokeWidth="1.5" />
              </>
            )}
            
            {/* Choo choo train */}
            {showTrain && <ChooChooTrain x={trainX} y={trainY} angle={trainAngle} progress={progress} />}
          </g>
        );
      })}
    </svg>
  );
}
