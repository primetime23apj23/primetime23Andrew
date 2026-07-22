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

interface FireworkParticle {
  id: string;
  x: number;
  y: number;
  color: string;
  angle: number;
  speed: number;
}

interface PointAnimationsProps {
  animations: FloatingEmoji[];
  fireworks: FireworkParticle[];
  onAnimationComplete: (id: string) => void;
}

export function PointAnimations({
  animations,
  fireworks,
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
      {/* Firework particles for bonus points */}
      {fireworks.map((particle) => (
        <FireworkDot key={particle.id} {...particle} />
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

function FireworkDot({
  x,
  y,
  color,
  angle,
  speed,
}: FireworkParticle) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(1);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const radians = (angle * Math.PI) / 180;
    const distance = speed * 100;
    
    requestAnimationFrame(() => {
      setPos({
        x: Math.cos(radians) * distance,
        y: Math.sin(radians) * distance,
      });
      setOpacity(0);
      setScale(0.3);
    });
  }, [angle, speed]);

  return (
    <div
      className="absolute w-3 h-3 rounded-full transition-all duration-700 ease-out"
      style={{
        left: x,
        top: y,
        backgroundColor: color,
        opacity,
        transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
        boxShadow: `0 0 10px ${color}, 0 0 20px ${color}`,
      }}
    />
  );
}

// Emoji sets for different point values
const POINT_EMOJIS = ["⭐", "🌟", "✨", "💫", "🎯", "🔥", "💎", "🏆"];
const BONUS_EMOJIS = ["🎆", "🎇", "🎉", "🎊", "🌈", "💥", "⚡", "🚀"];

export function getRandomEmoji(isBonus = false): string {
  const emojis = isBonus ? BONUS_EMOJIS : POINT_EMOJIS;
  return emojis[Math.floor(Math.random() * emojis.length)];
}

// Firework colors
const FIREWORK_COLORS = [
  "#E63946", "#F4A261", "#E9C46A", "#2A9D8F", "#264653",
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96E6A1", "#DDA0DD",
];

export function createFireworkBurst(
  centerX: number,
  centerY: number,
  particleCount = 20
): FireworkParticle[] {
  const particles: FireworkParticle[] = [];
  
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      id: `fw-${Date.now()}-${i}`,
      x: centerX,
      y: centerY,
      color: FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)],
      angle: (360 / particleCount) * i + Math.random() * 20 - 10,
      speed: 0.8 + Math.random() * 0.6,
    });
  }
  
  return particles;
}

export type { FloatingEmoji, FireworkParticle };
