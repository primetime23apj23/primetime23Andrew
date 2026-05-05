"use client";

import { useEffect, useState } from "react";

interface TrainCelebration {
  id: string;
  numbers: number[];
}

interface TrainCelebrationProps {
  celebrations: TrainCelebration[];
}

export function TrainCelebration({ celebrations }: TrainCelebrationProps) {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {celebrations.map((celebration) => (
        <TrainAnimation key={celebration.id} numbers={celebration.numbers} />
      ))}
    </div>
  );
}

function TrainAnimation({ numbers }: { numbers: number[] }) {
  const [position, setPosition] = useState(-100);
  const [smokeParticles, setSmokeParticles] = useState<Array<{
    id: string;
    x: number;
    y: number;
    number: number;
    offsetX: number;
    offsetY: number;
  }>>([]);

  useEffect(() => {
    // Animate train moving across screen
    const startTime = Date.now();
    const duration = 4000; // 4 seconds for train to cross
    
    const animateTrainPosition = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const newPosition = -100 + progress * 200; // -100 to 100 (vw)
      setPosition(newPosition);

      // Generate smoke particles periodically
      if (progress > 0 && progress < 1) {
        if (Math.random() < 0.15) { // 15% chance each frame
          const newParticle = {
            id: `smoke-${Date.now()}-${Math.random()}`,
            x: newPosition,
            y: 30,
            number: numbers[Math.floor(Math.random() * numbers.length)],
            offsetX: (Math.random() - 0.5) * 15,
            offsetY: -50 - Math.random() * 30,
          };
          setSmokeParticles((prev) => [...prev, newParticle]);
        }
      }

      if (progress < 1) {
        requestAnimationFrame(animateTrainPosition);
      }
    };

    requestAnimationFrame(animateTrainPosition);
  }, [numbers]);

  return (
    <>
      {/* Train */}
      <div
        className="fixed top-1/3 transition-none"
        style={{
          left: `${position}vw`,
          width: "120px",
          height: "80px",
        }}
      >
        {/* Smoke stack */}
        <div className="absolute top-0 left-8 w-4 h-6 bg-gradient-to-t from-gray-400 to-gray-300 rounded-t opacity-60" />
        
        {/* Engine */}
        <div className="absolute bottom-0 left-0 w-16 h-12 bg-gradient-to-b from-red-600 to-red-800 rounded-lg border-4 border-red-900 flex items-center justify-center">
          <span className="text-2xl">🚂</span>
        </div>

        {/* Cargo car */}
        <div className="absolute bottom-0 left-14 w-20 h-10 bg-gradient-to-b from-blue-500 to-blue-700 rounded-lg border-2 border-blue-900 flex items-center justify-center">
          <span className="text-lg font-bold text-white">★</span>
        </div>

        {/* Wheels */}
        <div className="absolute bottom-0 left-2 w-2 h-2 bg-black rounded-full" />
        <div className="absolute bottom-0 left-8 w-2 h-2 bg-black rounded-full" />
        <div className="absolute bottom-0 left-16 w-2 h-2 bg-black rounded-full" />
        <div className="absolute bottom-0 left-20 w-2 h-2 bg-black rounded-full" />
      </div>

      {/* Smoke particles with numbers */}
      {smokeParticles.map((particle) => (
        <SmokeParticle key={particle.id} {...particle} />
      ))}
    </>
  );
}

function SmokeParticle({
  id,
  x,
  y,
  number,
  offsetX,
  offsetY,
}: {
  id: string;
  x: number;
  y: number;
  number: number;
  offsetX: number;
  offsetY: number;
}) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0.8);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 1200; // Particle lifetime

    const animateParticle = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (progress < 1) {
        // Easing: ease-out
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        setPosition({
          x: offsetX * easeProgress,
          y: offsetY * easeProgress,
        });
        setOpacity(0.8 * (1 - progress));
        setScale(1 + progress * 0.5);
        
        requestAnimationFrame(animateParticle);
      }
    };

    requestAnimationFrame(animateParticle);
  }, [offsetX, offsetY]);

  return (
    <div
      className="fixed pointer-events-none font-bold text-lg drop-shadow-lg"
      style={{
        left: `${x}vw`,
        top: `${y}vh`,
        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
        opacity,
        transition: "none",
      }}
    >
      <div className="text-2xl font-black text-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
        {number}
      </div>
    </div>
  );
}

export function createTrainCelebration(numbers: number[]): TrainCelebration {
  return {
    id: `train-${Date.now()}`,
    numbers,
  };
}

export type { TrainCelebration };
