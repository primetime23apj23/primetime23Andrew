"use client";

interface Capture {
  number: number;
  key: number;
}

interface FactorizationBoxProps {
  capture: Capture | null;
}

// Return every whole-number factor pair a x b with a <= b.
function getFactorPairs(n: number): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  for (let a = 1; a * a <= n; a++) {
    if (n % a === 0) {
      pairs.push([a, n / a]);
    }
  }
  return pairs;
}

export function FactorizationBox({ capture }: FactorizationBoxProps) {
  console.log("[v0] FactorizationBox received capture:", capture);
  const pairs = capture ? getFactorPairs(capture.number) : [];

  return (
    <div className="w-32 shrink-0 border rounded-lg p-3 bg-card flex flex-col">
      <h4 className="text-xs font-medium text-muted-foreground mb-2 text-center">
        Last Capture
      </h4>

      {capture ? (
        // key on capture.key so the balloon animation replays on every capture
        <div
          key={capture.key}
          className="animate-balloon-minimize flex flex-col items-center gap-1"
        >
          <span className="text-2xl font-bold underline decoration-2 underline-offset-4 tabular-nums">
            {capture.number}
          </span>
          <ul className="mt-1 flex flex-col items-center gap-0.5 text-sm tabular-nums">
            {pairs.map(([a, b]) => (
              <li key={`${a}x${b}`} className="text-foreground">
                {a} <span className="text-muted-foreground">&times;</span> {b}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
