// Sound effect generation using Web Audio API

interface AudioContext {
  audioContext: window.AudioContext;
}

let audioContextInstance: window.AudioContext | null = null;

function getAudioContext(): window.AudioContext {
  if (!audioContextInstance && typeof window !== "undefined") {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    audioContextInstance = new AudioContextClass();
  }
  return audioContextInstance!;
}

/**
 * Play a capture sound effect - train horn
 */
export function playCapturSound(): void {
  try {
    const audio = new Audio("/sounds/train-horn.mp3");
    audio.volume = 0.3;
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Silently fail if audio can't play
    });
  } catch (error) {
    console.log("[v0] Train sound effect skipped:", error);
  }
}

/**
 * Play bonus sound effect - ascending tone burst
 * Type 1: Single short burst (2-3 spaces)
 * Type 2: Medium burst (4-6 spaces)
 * Type 3: Long burst (7+ spaces)
 */
export function playBonusSound(bonusSpaces: number = 1): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Determine burst pattern based on bonus size
    let bursts = 1;
    let burstDuration = 0.1;
    let burstDelay = 0.05;
    
    if (bonusSpaces >= 7) {
      // Large bonus - 3 bursts with crackle effect
      bursts = 3;
      burstDuration = 0.12;
      burstDelay = 0.08;
    } else if (bonusSpaces >= 4) {
      // Medium bonus - 2 bursts
      bursts = 2;
      burstDuration = 0.11;
      burstDelay = 0.06;
    }
    
    for (let i = 0; i < bursts; i++) {
      const burstStart = now + i * (burstDuration + burstDelay);
      
      // Main tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = "sine";
      const startFreq = 600 + i * 200;
      const endFreq = 900 + i * 200;
      
      osc.frequency.setValueAtTime(startFreq, burstStart);
      osc.frequency.linearRampToValueAtTime(endFreq, burstStart + burstDuration);
      
      gain.gain.setValueAtTime(0.4, burstStart);
      gain.gain.exponentialRampToValueAtTime(0.01, burstStart + burstDuration);
      
      osc.start(burstStart);
      osc.stop(burstStart + burstDuration);
      
      // Add crackle effect for larger bonuses
      if (bursts > 1) {
        const crackle = ctx.createOscillator();
        const crackleGain = ctx.createGain();
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let j = 0; j < data.length; j++) {
          data[j] = Math.random() * 2 - 1;
        }
        
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.connect(crackleGain);
        crackleGain.connect(ctx.destination);
        
        crackleGain.gain.setValueAtTime(0.15, burstStart);
        crackleGain.gain.exponentialRampToValueAtTime(0.01, burstStart + 0.05);
        
        noiseSource.start(burstStart);
        noiseSource.stop(burstStart + 0.05);
      }
    }
  } catch (error) {
    console.log("[v0] Bonus sound effect skipped:", error);
  }
}

/**
 * Play opponent/bot move sound - whistle or notification
 */
export function playOpponentMoveSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Create a pleasant whistle sound to indicate opponent's move
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = "sine";
    // Descending pitch pattern - opposite of ascending bonus sound
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.linearRampToValueAtTime(600, now + 0.15);
    osc.frequency.linearRampToValueAtTime(500, now + 0.25);
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    
    osc.start(now);
    osc.stop(now + 0.25);
  } catch (error) {
    console.log("[v0] Opponent move sound skipped:", error);
  }
}

/**
 * Play victory sound - train horn celebration
 */
export function playVictorySound(): void {
  try {
    const audio = new Audio("/sounds/train-horn.mp3");
    audio.volume = 0.4;
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Silently fail if audio can't play
    });
  } catch (error) {
    console.log("[v0] Victory train horn skipped:", error);
  }
}
