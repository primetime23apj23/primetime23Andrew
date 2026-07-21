"use client";

import { useEffect, useState } from "react";

interface Confetti {
  id: string;
  left: number;
  delay: number;
  duration: number;
  type: "circle" | "square" | "star";
  color: string;
}

interface Balloon {
  id: string;
  left: number;
  delay: number;
  color: string;
}

interface PartyNumber {
  id: string;
  number: number;
  left: number;
  delay: number;
}

interface PartyCelebrationProps {
  isActive: boolean;
  numbers: number[];
  winnerName: string;
  onComplete?: () => void;
}

const CONFETTI_COLORS = [
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#FFE66D", // Yellow
  "#95E1D3", // Mint
  "#F38181", // Pink
  "#AA96DA", // Purple
  "#FCBAD3", // Light Pink
  "#A8E6CF", // Light Green
];

export function PartyCelebration({ isActive, numbers, winnerName, onComplete }: PartyCelebrationProps) {
  const [confetti, setConfetti] = useState<Confetti[]>([]);
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [partyNumbers, setPartyNumbers] = useState<PartyNumber[]>([]);

  useEffect(() => {
    if (!isActive) {
      setConfetti([]);
      setBalloons([]);
      setPartyNumbers([]);
      return;
    }

    // Generate confetti
    const confettiPieces: Confetti[] = [];
    for (let i = 0; i < 60; i++) {
      confettiPieces.push({
        id: `confetti-${i}`,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 1,
        type: ["circle", "square", "star"][Math.floor(Math.random() * 3)] as "circle" | "square" | "star",
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      });
    }
    setConfetti(confettiPieces);

    // Generate balloons
    const balloonPieces: Balloon[] = [];
    for (let i = 0; i < 8; i++) {
      balloonPieces.push({
        id: `balloon-${i}`,
        left: (i + 1) * (100 / 9),
        delay: Math.random() * 0.3,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      });
    }
    setBalloons(balloonPieces);

    // Generate party numbers
    const partyNum: PartyNumber[] = [];
    numbers.slice(0, 12).forEach((num, idx) => {
      partyNum.push({
        id: `num-${idx}`,
        number: num,
        left: Math.random() * 100,
        delay: Math.random() * 0.6 + 0.2,
      });
    });
    setPartyNumbers(partyNum);

    // Complete after animation
    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, 3500);

    return () => clearTimeout(timer);
  }, [isActive, numbers, onComplete]);

  if (!isActive) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Confetti */}
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-pulse"
          style={{
            left: `${piece.left}%`,
            top: "-20px",
            animation: `fall ${piece.duration}s linear ${piece.delay}s forwards`,
          }}
        >
          {piece.type === "circle" && (
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: piece.color }}
            />
          )}
          {piece.type === "square" && (
            <div
              className="w-3 h-3"
              style={{ backgroundColor: piece.color, transform: "rotate(45deg)" }}
            />
          )}
          {piece.type === "star" && (
            <div className="text-2xl" style={{ color: piece.color }}>
              ✨
            </div>
          )}
        </div>
      ))}

      {/* Balloons */}
      {balloons.map((balloon) => (
        <div
          key={balloon.id}
          className="absolute"
          style={{
            left: `${balloon.left}%`,
            bottom: "-30px",
            animation: `float 3s ease-in-out ${balloon.delay}s forwards`,
          }}
        >
          {/* Balloon */}
          <div
            className="w-8 h-10 rounded-full mx-auto mb-2 drop-shadow-lg hover:scale-110 transition-transform"
            style={{
              backgroundColor: balloon.color,
              boxShadow: `inset -2px -2px 5px rgba(0,0,0,0.2)`,
            }}
          />
          {/* String */}
          <div
            className="w-0.5 h-12"
            style={{
              backgroundColor: balloon.color,
              opacity: 0.5,
              margin: "0 auto",
            }}
          />
        </div>
      ))}

      {/* Party Numbers */}
      {partyNumbers.map((partyNum) => (
        <div
          key={partyNum.id}
          className="absolute text-5xl font-black drop-shadow-xl"
          style={{
            left: `${partyNum.left}%`,
            top: "50%",
            animation: `bounce-out ${2}s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${partyNum.delay}s forwards`,
            color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          }}
        >
          {partyNum.number}
        </div>
      ))}

      {/* Center celebration text */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{
          animation: `scale-pop 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s forwards`,
          opacity: 0,
        }}
      >
        <div className="mb-4 leading-none" style={{ fontSize: "18rem" }}>🎉</div>
        <h2 className="text-4xl font-black text-center drop-shadow-lg" style={{ color: "#FF6B6B" }}>
          Amazing!
        </h2>
        <p className="text-2xl font-bold text-center mt-2 drop-shadow-lg" style={{ color: "#4ECDC4" }}>
          {winnerName}
        </p>
      </div>

      <style>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes float {
          to {
            transform: translateY(-100vh);
            opacity: 0;
          }
        }

        @keyframes bounce-out {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
          }
        }

        @keyframes scale-pop {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
