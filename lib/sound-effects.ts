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
 * Play a capture sound effect - train chugga chugga chugga chugga pattern
 */
export function playCapturSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Train chugging pattern: chugga chugga chugga chugga
    const chugPattern = [0, 0.08, 0.16, 0.24]; // 4 chugs
    const chugDuration = 0.06;
    const chugFrequency = 200; // Low train-like frequency
    
    for (const chugTime of chugPattern) {
      const start = now + chugTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(chugFrequency, start);
      
      // Sharp attack, quick decay for chug effect
      gain.gain.setValueAtTime(0.4, start);
      gain.gain.linearRampToValueAtTime(0.1, start + chugDuration * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.01, start + chugDuration);
      
      osc.start(start);
      osc.stop(start + chugDuration);
    }
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
 * Play victory sound - train whistle "choo choo" pattern
 */
export function playVictorySound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Train whistle pattern: two high pitched "choo" sounds
    // First choo - high and bright
    const chooFrequencies = [900, 1100]; // Two choos
    const chooDuration = 0.4;
    const chooDelay = 0.5;
    
    for (let i = 0; i < chooFrequencies.length; i++) {
      const chooStart = now + i * chooDelay;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = "sine";
      
      // Sliding frequency for train whistle effect
      osc.frequency.setValueAtTime(chooFrequencies[i], chooStart);
      osc.frequency.linearRampToValueAtTime(chooFrequencies[i] * 0.9, chooStart + chooDuration * 0.7);
      osc.frequency.linearRampToValueAtTime(chooFrequencies[i], chooStart + chooDuration);
      
      // Whistle-like envelope
      gain.gain.setValueAtTime(0, chooStart);
      gain.gain.linearRampToValueAtTime(0.5, chooStart + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, chooStart + chooDuration);
      
      osc.start(chooStart);
      osc.stop(chooStart + chooDuration);
    }
  } catch (error) {
    console.log("[v0] Victory train whistle skipped:", error);
  }
}
