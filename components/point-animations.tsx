"use client";

import { useEffect, useState } from "react";

interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number;
  y: number;
  points: number;
  isBonus?: boolean;
}

interface PointAnimationsProps {
  animations: FloatingEmoji[];
  onAnimationComplete: (id: string) => void;
}

export function PointAnimations({
  animations,
  onAnimationComplete,
}: PointAnimationsProps) {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Floating emoji animations for points */}
      {animations.map((animation) => (
        <FloatingPoint
          key={animation.id}
          {...animation}
          onComplete={() => onAnimationComplete(animation.id)}
        />
      ))}
    </div>
  );
}

function FloatingPoint({
  id,
  emoji,
  x,
  y,
  points,
  isBonus = false,
  onComplete,
}: FloatingEmoji & { onComplete: () => void }) {
  const [opacity, setOpacity] = useState(1);
  const [translateY, setTranslateY] = useState(0);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    // Start animation
    requestAnimationFrame(() => {
      setScale(1.2);
      setTimeout(() => setScale(1), 150);
    });
    
    // Float up and fade (hold for 3.5s then fade over 0.5s for bonus, 1.5s + 0.5s for normal)
    const holdDuration = isBonus ? 3500 : 1500;
    const fadeTimer = setTimeout(() => {
      setTranslateY(-80);
      setOpacity(0);
    }, holdDuration);
    
    // Complete after 5 seconds total for bonus, 3 seconds for normal
    const totalDuration = isBonus ? 5000 : 3000;
    const completeTimer = setTimeout(onComplete, totalDuration);
    
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete, isBonus]);

  return (
    <div
      className="absolute flex flex-col items-center transition-all duration-1000 ease-out"
      style={{
        left: x,
        top: y,
        opacity,
        transform: `translateY(${translateY}px) scale(${scale})`,
      }}
    >
      {isBonus ? (
        <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary drop-shadow-lg">
          Bonus +{points}
        </span>
      ) : (
        <>
          <span className="text-6xl">{emoji}</span>
          <span className="text-2xl font-bold text-primary drop-shadow-lg">
            +{points}
          </span>
        </>
      )}
    </div>
  );
}

// Emoji sets for different point values
const POINT_EMOJIS = ["⭐", "🌟", "✨", "💫", "🎯", "🔥", "💎", "🏆"];
const BONUS_EMOJIS = ["🎆", "🎇", "🎉", "🎊", "🌈", "💥", "⚡", "🚀"];

export function getRandomEmoji(isBonus = false): string {
  const emojis = isBonus ? BONUS_EMOJIS : POINT_EMOJIS;
  return emojis[Math.floor(Math.random() * emojis.length)];
}

export type { FloatingEmoji };
