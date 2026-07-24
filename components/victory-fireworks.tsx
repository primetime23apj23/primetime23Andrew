"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

export interface VictoryFireworksHandle {
  /** Fire a single burst at the given viewport coordinates. */
  burst: (x: number, y: number) => void;
}

interface VictoryFireworksProps {
  /** When true, auto-plays the full victory show on mount. */
  autoPlay?: boolean;
  /** Fired when the auto-play show finishes and all particles have faded. */
  onComplete?: () => void;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  hue: number;
  size: number;
  flicker: boolean;
}

interface Rocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetY: number;
  hue: number;
  trail: Array<{ x: number; y: number }>;
}

const GRAVITY = 0.09;
const SPARK_DRAG = 0.98;

export const VictoryFireworks = forwardRef<
  VictoryFireworksHandle,
  VictoryFireworksProps
>(function VictoryFireworks({ autoPlay = false, onComplete }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rocketsRef = useRef<Rocket[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const rafRef = useRef<number | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const showActiveRef = useRef(false);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const explode = (x: number, y: number, hue: number) => {
    const count = 60 + Math.floor(Math.random() * 41); // 60-100
    const isRing = Math.random() < 0.15;
    const ringSpeed = 3 + Math.random() * 3;

    for (let i = 0; i < count; i++) {
      const angle = isRing
        ? (Math.PI * 2 * i) / count
        : Math.random() * Math.PI * 2;
      const speed = isRing ? ringSpeed : 1 + Math.random() * 6;
      const maxLife = 60 + Math.random() * 60; // ~1-2s at 60fps
      sparksRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: maxLife,
        maxLife,
        hue: hue + (Math.random() * 30 - 15),
        size: 1.5 + Math.random() * 2,
        flicker: Math.random() < 0.35,
      });
    }
  };

  const launchRocket = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width;
    const h = canvas.height;
    rocketsRef.current.push({
      x: w * (0.1 + Math.random() * 0.8),
      y: h,
      vx: (Math.random() - 0.5) * 1.6,
      vy: -(9 + Math.random() * 3), // ~9-12 upward
      targetY: h * (0.15 + Math.random() * 0.35), // 15-50% from top
      hue: Math.random() * 360,
      trail: [],
    });
  };

  const ensureLoop = () => {
    if (rafRef.current !== null) return;

    const tick = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) {
        rafRef.current = null;
        return;
      }

      // Motion-blur fade: erase a little of the previous frame instead of
      // clearing, so trails linger without darkening the page underneath.
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.globalCompositeOperation = "lighter";

      // Rockets
      const rockets = rocketsRef.current;
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.trail.push({ x: r.x, y: r.y });
        if (r.trail.length > 8) r.trail.shift();

        r.x += r.vx;
        r.y += r.vy;
        r.vy += GRAVITY;

        // Draw trail
        for (let t = 0; t < r.trail.length; t++) {
          const p = r.trail[t];
          const a = ((t + 1) / r.trail.length) * 0.6;
          ctx.fillStyle = `hsla(${r.hue}, 100%, 70%, ${a})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        // Draw rocket head
        ctx.fillStyle = `hsla(${r.hue}, 100%, 85%, 1)`;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Explode at apex or target height
        if (r.y <= r.targetY || r.vy >= 0) {
          explode(r.x, r.y, r.hue);
          rockets.splice(i, 1);
        }
      }

      // Sparks
      const sparks = sparksRef.current;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= SPARK_DRAG;
        s.vy = s.vy * SPARK_DRAG + GRAVITY;
        s.life -= 1;

        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }

        const progress = s.life / s.maxLife;
        const alpha = s.flicker
          ? progress * (0.4 + Math.random() * 0.6)
          : progress;
        ctx.fillStyle = `hsla(${s.hue}, 100%, ${55 + progress * 25}%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * (0.5 + progress * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }

      const stillGoing =
        rockets.length > 0 ||
        sparks.length > 0 ||
        timeoutsRef.current.length > 0;

      if (stillGoing) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        // Clear any leftover glow and stop.
        ctx.globalCompositeOperation = "source-over";
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        rafRef.current = null;
        if (showActiveRef.current && !completedRef.current) {
          completedRef.current = true;
          showActiveRef.current = false;
          onCompleteRef.current?.();
        }
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  };

  useImperativeHandle(ref, () => ({
    burst: (x: number, y: number) => {
      explode(x, y, Math.random() * 360);
      ensureLoop();
    },
  }));

  // Canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Auto-play victory show
  useEffect(() => {
    if (!autoPlay) return;

    showActiveRef.current = true;
    completedRef.current = false;

    const rocketCount = 10 + Math.floor(Math.random() * 5); // 10-14
    let delay = 200;
    for (let i = 0; i < rocketCount; i++) {
      const id = window.setTimeout(() => {
        launchRocket();
        // Occasional overlapping double-launch
        if (Math.random() < 0.3) launchRocket();
        timeoutsRef.current = timeoutsRef.current.filter((t) => t !== id);
        ensureLoop();
      }, delay);
      timeoutsRef.current.push(id);
      delay += 300 + Math.random() * 100; // staggered every 300-400ms
    }
    ensureLoop();

    return () => {
      timeoutsRef.current.forEach((id) => clearTimeout(id));
      timeoutsRef.current = [];
    };
  }, [autoPlay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      timeoutsRef.current.forEach((id) => clearTimeout(id));
      timeoutsRef.current = [];
      rocketsRef.current = [];
      sparksRef.current = [];
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[70]"
      aria-hidden="true"
    />
  );
});
