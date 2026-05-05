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

    const animationDuration = 4000; // 4 seconds for train to cross
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

  const trainX = trainProgress * 120 - 20; // Start off-screen left, end off-screen right
  const trainY = 80; // Bottom of screen

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Train */}
      <div
        className="absolute transition-none"
        style={{
          left: `${trainX}%`,
          top: `${trainY}%`,
          transform: "translateY(-50%)",
        }}
      >
        {/* Engine */}
        <div className="relative w-24 h-20">
          {/* Smoke stack */}
          <div className="absolute left-6 top-2 w-2 h-6 bg-gray-400 rounded-full" />
          {/* Smoke puffs */}
          {trainNumbers.map((num) => {
            const offsetX = (Math.random() - 0.5) * 20;
            const offsetY = -num.progress * 80;
            return (
              <div
                key={num.id}
                className="absolute text-3xl font-bold text-yellow-300 drop-shadow-lg"
                style={{
                  left: `24px`,
                  top: `8px`,
                  transform: `translate(${offsetX}px, ${offsetY}px)`,
                  opacity: Math.max(0, 1 - num.progress),
                }}
              >
                {num.number}
              </div>
            );
          })}
          
          {/* Engine body */}
          <div className="w-full h-full border-4 border-red-600 rounded bg-red-500 flex items-center justify-center">
            <div className="text-white font-bold text-lg">🚂</div>
          </div>
          
          {/* Wheels */}
          <div className="absolute bottom-0 left-2 w-3 h-3 rounded-full border-2 border-black" />
          <div className="absolute bottom-0 right-2 w-3 h-3 rounded-full border-2 border-black" />
        </div>

        {/* Cargo car */}
        <div className="absolute left-24 top-0 w-20 h-20">
          <div className="w-full h-full border-4 border-blue-600 rounded bg-blue-500 flex items-center justify-center">
            <div className="text-white font-bold">📦</div>
          </div>
          {/* Wheels */}
          <div className="absolute bottom-0 left-1 w-3 h-3 rounded-full border-2 border-black" />
          <div className="absolute bottom-0 right-1 w-3 h-3 rounded-full border-2 border-black" />
        </div>
      </div>
    </div>
  );
}
