"use client";

import { useEffect, useState } from "react";

interface TrainNumber {
  id: string;
  number: number;
  progress: number;
}

interface TrainCelebrationProps {
  isActive: boolean;
  numbers: number[];
  onComplete?: () => void;
}

export function TrainCelebration({ isActive, numbers, onComplete }: TrainCelebrationProps) {
  const [trainNumbers, setTrainNumbers] = useState<TrainNumber[]>([]);
  const [trainProgress, setTrainProgress] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setTrainProgress(0);
      setTrainNumbers([]);
      return;
    }

    const animationDuration = 3000; // 3 seconds for train to cross
    const numberSpawnInterval = 200; // Spawn a number every 200ms
    let animationId: number;
    let spawnIntervalId: NodeJS.Timeout;
    let numberCounter = 0;

    const animate = () => {
      setTrainProgress((prev) => {
        const next = prev + 1 / (animationDuration / 16);
        if (next >= 1) {
          if (onComplete) {
            setTimeout(onComplete, 500);
          }
        }
        return Math.min(next, 1);
      });
      if (trainProgress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);

    // Spawn numbers from the train
    spawnIntervalId = setInterval(() => {
      if (numberCounter < numbers.length && trainProgress < 0.8) {
        const newNumber: TrainNumber = {
          id: `${numberCounter}-${Date.now()}`,
          number: numbers[numberCounter],
          progress: 0,
        };
        setTrainNumbers((prev) => [...prev, newNumber]);
        numberCounter++;
      }
    }, numberSpawnInterval);

    // Update number positions
    const numberUpdateId = setInterval(() => {
      setTrainNumbers((prev) =>
        prev
          .map((num) => ({
            ...num,
            progress: Math.min(num.progress + 0.05, 1),
          }))
          .filter((num) => num.progress < 1)
      );
    }, 50);

    return () => {
      cancelAnimationFrame(animationId);
      clearInterval(spawnIntervalId);
      clearInterval(numberUpdateId);
    };
  }, [isActive, numbers, onComplete, trainProgress]);

  if (!isActive) {
    return null;
  }

  const trainX = trainProgress * 120 - 25; // Start off-screen left, end off-screen right
  const trainY = 78;

  // Subtle chugging bob so the train feels alive
  const bob = Math.sin(trainProgress * Math.PI * 22) * 1.5;
  // Wheel rotation tied to travel distance
  const wheelRotation = trainProgress * 2600;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <div
        className="absolute"
        style={{
          left: `${trainX}%`,
          top: `${trainY}%`,
          transform: `translateY(calc(-50% + ${bob}px))`,
        }}
      >
        <div className="relative">
          {/* Number puffs rising from the smokestack */}
          {trainNumbers.map((num) => {
            const drift = Math.sin(num.progress * Math.PI * 2) * 14;
            const offsetY = -num.progress * 90;
            return (
              <div
                key={num.id}
                className="absolute text-2xl font-black text-white"
                style={{
                  left: "204px",
                  top: "8px",
                  transform: `translate(${drift}px, ${offsetY}px) scale(${1 - num.progress * 0.35})`,
                  opacity: Math.max(0, 1 - num.progress),
                  textShadow: "0 2px 6px rgba(0,0,0,0.35)",
                }}
              >
                {num.number}
              </div>
            );
          })}

          <svg
            width="280"
            height="180"
            viewBox="0 0 280 180"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            style={{ filter: "drop-shadow(0 8px 10px rgba(0,0,0,0.18))" }}
          >
            {/* ---------- Green passenger carriage (rear) ---------- */}
            <g>
              <rect x="6" y="60" width="70" height="78" rx="8" fill="#8bc34a" />
              <rect x="6" y="60" width="70" height="78" rx="8" fill="none" stroke="#689f38" strokeWidth="3" />
              {/* window */}
              <rect x="16" y="74" width="34" height="34" rx="5" fill="#f1f8e9" stroke="#689f38" strokeWidth="3" />
              <line x1="33" y1="74" x2="33" y2="108" stroke="#689f38" strokeWidth="2" />
              {/* coupler */}
              <rect x="74" y="104" width="16" height="9" rx="4" fill="#37474f" />
            </g>

            {/* ---------- Steam cloud ---------- */}
            <g fill="#ffffff" stroke="#e3edf2" strokeWidth="2">
              <circle cx="214" cy="26" r="15" />
              <circle cx="234" cy="20" r="13" />
              <circle cx="250" cy="30" r="12" />
              <circle cx="230" cy="34" r="13" />
            </g>

            {/* ---------- Locomotive body ---------- */}
            <g>
              {/* boiler / front barrel */}
              <rect x="176" y="82" width="88" height="52" rx="18" fill="#e53935" />
              <ellipse cx="260" cy="108" rx="7" ry="24" fill="#c62828" />
              {/* front buffer beam */}
              <rect x="256" y="120" width="12" height="18" rx="3" fill="#37474f" />

              {/* cab */}
              <path
                d="M108 46 h70 a6 6 0 0 1 6 6 v82 h-82 v-82 a6 6 0 0 1 6 -6 z"
                fill="#e53935"
              />
              {/* cab roof */}
              <path
                d="M100 50 q42 -22 92 0 l-4 10 q-42 -18 -84 0 z"
                fill="#1f1a17"
              />
              {/* cab window */}
              <rect x="120" y="66" width="52" height="48" rx="6" fill="#bfe4ef" stroke="#1f1a17" strokeWidth="4" />

              {/* conductor */}
              <g>
                <path d="M132 114 q14 -18 28 0 z" fill="#eceff1" />
                <circle cx="146" cy="92" r="13" fill="#f2c299" />
                {/* cap */}
                <path d="M131 86 q15 -14 30 0 z" fill="#3f6fb0" />
                <rect x="130" y="85" width="32" height="6" rx="3" fill="#2f5591" />
                {/* face */}
                <circle cx="141" cy="92" r="1.6" fill="#3a2a1a" />
                <circle cx="151" cy="92" r="1.6" fill="#3a2a1a" />
                <path d="M142 98 q4 3 8 0" stroke="#3a2a1a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              </g>

              {/* smokestack */}
              <rect x="198" y="52" width="24" height="34" rx="4" fill="#e53935" />
              <rect x="192" y="46" width="36" height="12" rx="5" fill="#1f1a17" />

              {/* dome */}
              <path d="M184 72 q10 -16 20 0 z" fill="#c62828" />

              {/* running board */}
              <rect x="100" y="132" width="164" height="10" rx="4" fill="#c62828" />
            </g>

            {/* ---------- Wheels ---------- */}
            {/* big driving wheels */}
            {[132, 196].map((cx) => (
              <g key={cx}>
                <circle cx={cx} cy="146" r="26" fill="#2b2b2b" />
                <circle cx={cx} cy="146" r="13" fill="#7a7a7a" />
                <g style={{ transformOrigin: `${cx}px 146px`, transform: `rotate(${wheelRotation}deg)` }}>
                  <rect x={cx - 1.5} y="134" width="3" height="24" rx="1.5" fill="#3f3f3f" />
                  <rect x={cx - 12} y="144.5" width="24" height="3" rx="1.5" fill="#3f3f3f" />
                </g>
                <circle cx={cx} cy="146" r="4" fill="#2b2b2b" />
              </g>
            ))}
            {/* small carriage wheels */}
            {[26, 58].map((cx) => (
              <circle key={cx} cx={cx} cy="146" r="11" fill="#2b2b2b" />
            ))}
            {[26, 58].map((cx) => (
              <circle key={`hub-${cx}`} cx={cx} cy="146" r="4.5" fill="#7a7a7a" />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
