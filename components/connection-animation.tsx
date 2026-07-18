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

// Choo choo train SVG component — friendly flat-illustration steam engine
// modeled on a children's storybook locomotive: red engine with a rounded cab,
// a conductor in a blue cap, a black funnel puffing white steam, big spoked
// driving wheels, and a lime-green carriage trailing behind.
function ChooChooTrain({ x, y, angle, progress }: { x: number; y: number; angle: number; progress: number }) {
  // Wheels spin as the train travels; a gentle bob mimics the chug of the engine.
  const wheelAngle = progress * 2200;
  const bob = Math.sin(progress * 45) * 0.6;

  // Fluffy white steam puffs rising from the funnel at the front (~x=15, y=-11).
  const smokeCount = 5;
  const smokes = [];
  for (let i = 0; i < smokeCount; i++) {
    const age = (progress * 14 + i * 1.1) % 5.5;
    const smokeX = 15 + age * 1.3;
    const smokeY = -13 - age * 4.2;
    const smokeR = 2.2 + age * 2;
    smokes.push(
      <circle
        key={`smoke-${i}`}
        cx={smokeX}
        cy={smokeY}
        r={smokeR}
        fill="#f8fafc"
        stroke="#cbd5e1"
        strokeWidth="0.5"
        opacity={Math.max(0, 0.9 - age * 0.14)}
      />
    );
  }

  // A single spoked wheel (big driving wheel) centered at (cx, cy).
  const drivingWheel = (cx: number, cy: number, r: number, key: string) => (
    <g key={key}>
      <circle cx={cx} cy={cy} r={r} fill="#1f2937" stroke="#0f172a" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={r * 0.55} fill="#6b7280" />
      <g transform={`rotate(${wheelAngle} ${cx} ${cy})`}>
        {[0, 45, 90, 135].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <line
              key={`${key}-spoke-${deg}`}
              x1={cx - Math.cos(rad) * r * 0.5}
              y1={cy - Math.sin(rad) * r * 0.5}
              x2={cx + Math.cos(rad) * r * 0.5}
              y2={cy + Math.sin(rad) * r * 0.5}
              stroke="#374151"
              strokeWidth="1.1"
            />
          );
        })}
      </g>
      <circle cx={cx} cy={cy} r={r * 0.16} fill="#1f2937" />
    </g>
  );

  return (
    <g transform={`translate(${x}, ${y}) rotate(${angle})`} style={{ transformOrigin: "0 0" }}>
      <g transform={`translate(0, ${bob})`}>
        {/* ---- Green carriage trailing behind (drawn first, sits at the back) ---- */}
        <g>
          {/* coupling bar */}
          <rect x="-22" y="2" width="8" height="2.5" rx="1.25" fill="#111827" />
          {/* carriage body */}
          <rect x="-38" y="-11" width="18" height="18" rx="3" fill="#9acd32" stroke="#7ba428" strokeWidth="1.5" />
          {/* carriage window */}
          <rect x="-35" y="-8" width="12" height="9" rx="1.5" fill="#eefdf3" stroke="#7ba428" strokeWidth="1" />
          <circle cx="-29" cy="-3.5" r="2.4" fill="#c7e89a" />
          {/* carriage wheels */}
          {drivingWheel(-33, 9, 3.6, "car-w1")}
          {drivingWheel(-24, 9, 3.6, "car-w2")}
        </g>

        {/* ---- Locomotive ---- */}
        {/* boiler (front cylinder) */}
        <rect x="-2" y="-7" width="20" height="14" rx="6" fill="#e23b2e" stroke="#b52d22" strokeWidth="1.5" />
        {/* smokebox front cap */}
        <circle cx="18" cy="0" r="7" fill="#c9302a" stroke="#b52d22" strokeWidth="1.5" />
        {/* front buffer beam */}
        <rect x="20" y="-6" width="3" height="12" rx="1.5" fill="#1f2937" />

        {/* cab (rear, taller) */}
        <path
          d="M -18 7 L -18 -8 Q -18 -13 -13 -13 L 0 -13 Q 3 -13 3 -8 L 3 7 Z"
          fill="#e23b2e"
          stroke="#b52d22"
          strokeWidth="1.5"
        />
        {/* cab roof */}
        <rect x="-20" y="-15" width="25" height="3.5" rx="1.75" fill="#1f2937" />

        {/* cab window with conductor */}
        <rect x="-15" y="-11" width="15" height="11" rx="1.5" fill="#bfe3ec" stroke="#7ba0a8" strokeWidth="0.75" />
        {/* conductor: face + blue cap */}
        <circle cx="-7.5" cy="-4" r="3.4" fill="#f2c9a0" />
        <path d="M -11.4 -5.6 Q -7.5 -9 -3.6 -5.6 L -3.6 -5 L -11.4 -5 Z" fill="#2f5aa8" />
        <rect x="-12" y="-5.4" width="9" height="1.6" rx="0.8" fill="#24478a" />

        {/* funnel (smokestack) at the front */}
        <path d="M 12 -7 L 18 -7 L 16.5 -15 L 13.5 -15 Z" fill="#1f2937" />
        <ellipse cx="15" cy="-15" rx="2.6" ry="1" fill="#0f172a" />
        {/* dome */}
        <path d="M 3 -7 Q 6 -12 9 -7 Z" fill="#f2b705" />

        {/* frame / footplate */}
        <rect x="-18" y="6" width="41" height="3" rx="1.5" fill="#1f2937" />

        {/* wheels: two big driving wheels + connecting rod */}
        {drivingWheel(-9, 9, 6, "loco-w1")}
        {drivingWheel(9, 9, 6, "loco-w2")}
        <line
          x1={-9 + Math.cos((wheelAngle * Math.PI) / 180) * 3}
          y1={9 + Math.sin((wheelAngle * Math.PI) / 180) * 3}
          x2={9 + Math.cos((wheelAngle * Math.PI) / 180) * 3}
          y2={9 + Math.sin((wheelAngle * Math.PI) / 180) * 3}
          stroke="#9ca3af"
          strokeWidth="1.6"
          strokeLinecap="round"
        />

        {/* steam puffs rendered last so they float in front */}
        {smokes}
      </g>
    </g>
  );
}

export function ConnectionAnimation({ tracks, boardRef }: ConnectionAnimationProps) {
  const [animationStates, setAnimationStates] = useState<Map<string, { progress: number; done: boolean }>>(new Map());

  useEffect(() => {
    const animatingTracks = tracks.filter((t) => t.animating);
    if (animatingTracks.length === 0) return;

    // Single stable interval per `tracks` value. All state is derived inside the
    // functional updater so we do NOT depend on `animationStates` (which would
    // tear down and recreate the interval every tick and stall progress).
    let interval: ReturnType<typeof setInterval> | null = null;
    interval = setInterval(() => {
      setAnimationStates((prev) => {
        const next = new Map(prev);

        // Animate tracks sequentially: advance the first track that isn't
        // finished yet, so each connection plays one after another. Initialize
        // missing entries here so late-added tracks still animate.
        let activeTrack = null;
        for (const track of animatingTracks) {
          if (!next.has(track.id)) {
            next.set(track.id, { progress: 0, done: false });
          }
          if (!next.get(track.id)!.done) {
            activeTrack = track;
            break;
          }
        }

        if (!activeTrack) {
          // All tracks finished: stop the interval and keep the same state
          // reference so no further re-renders are triggered.
          if (interval) clearInterval(interval);
          return prev;
        }

        const state = next.get(activeTrack.id)!;
        // ~3 seconds per connection (16ms tick over a 3000ms duration)
        const newProgress = Math.min(state.progress + 16 / 3000, 1);
        const done = newProgress >= 1;
        next.set(activeTrack.id, { progress: newProgress, done });

        return next;
      });
    }, 16);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [tracks]);

  if (!boardRef.current || tracks.length === 0) return null;

  const boardEl = boardRef.current;
  const boardRect = boardEl.getBoundingClientRect();
  const cellWidth = boardRect.width / 10;
  const cellHeight = boardRect.height / 10;
  // Moderate inset to have tracks touch close to the circle edge
  const trackInset = Math.min(cellWidth, cellHeight) * 0.25;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ 
        width: "100%", 
        height: "100%", 
        overflow: "visible",
        WebkitOverflowScrolling: "touch",
        WebkitTransform: "translate3d(0, 0, 0)",
        display: "block"
      }}
    >
      {tracks.map((track) => {
        // Include prime endpoints but inset them to avoid overlap
        const allPoints = [track.primeStart, ...track.spaces, track.primeEnd];
        const rawCenters = allPoints.map((n) => getCellCenter(boardEl, n)).filter(Boolean) as { x: number; y: number }[];

        if (rawCenters.length < 2) return null;

        // Check if track goes right to left - if so, reverse it to always go left to right
        const shouldReverse = rawCenters[rawCenters.length - 1].x < rawCenters[0].x;
        const orderedRawCenters = shouldReverse ? [...rawCenters].reverse() : rawCenters;

        // Inset the prime endpoints (first and last) significantly to avoid circles
        const centers: { x: number; y: number }[] = [];
        for (let i = 0; i < orderedRawCenters.length; i++) {
          if (i === 0) {
            // First point (primeStart) - inset toward next point
            const next = orderedRawCenters[1];
            const dx = next.x - orderedRawCenters[i].x;
            const dy = next.y - orderedRawCenters[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
              centers.push({
                x: orderedRawCenters[i].x + (dx / dist) * trackInset,
                y: orderedRawCenters[i].y + (dy / dist) * trackInset,
              });
            } else {
              centers.push(orderedRawCenters[i]);
            }
          } else if (i === orderedRawCenters.length - 1) {
            // Last point (primeEnd) - inset toward previous point
            const prev = orderedRawCenters[i - 1];
            const dx = prev.x - orderedRawCenters[i].x;
            const dy = prev.y - orderedRawCenters[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
              centers.push({
                x: orderedRawCenters[i].x + (dx / dist) * trackInset,
                y: orderedRawCenters[i].y + (dy / dist) * trackInset,
              });
            } else {
              centers.push(orderedRawCenters[i]);
            }
          } else {
            // Intermediate points - use as-is
            centers.push(orderedRawCenters[i]);
          }
        }

        const state = animationStates.get(track.id);
        // While animating, use the live animation progress (0 until this track's
        // turn in the sequence). Once finalized (animating=false), always render
        // fully drawn so a track is never frozen partway / cut off.
        const progress = track.animating ? (state?.progress ?? 0) : 1;
        const showTrain = track.animating && progress > 0 && progress < 1;

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
            
            {/* Choo choo train */}
            {showTrain && <ChooChooTrain x={trainX} y={trainY} angle={trainAngle} progress={progress} />}
          </g>
        );
      })}
    </svg>
  );
}
