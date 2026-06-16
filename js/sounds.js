// Jalsa Sound Effects Synthesizer using Web Audio API
const Sounds = (() => {
  let audioCtx = null;

  const init = () => {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  };

  const playClick = () => {
    init();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  };

  const playSuccess = () => {
    init();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    
    // Play a two-tone happy chime
    [523.25, 659.25].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      
      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.35);
    });
  };

  const playFail = () => {
    init();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.4);
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(now + 0.45);
  };

  const playTick = (pitchFactor = 1.0) => {
    init();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    // pitchFactor increases as the bomb gets closer to exploding
    osc.frequency.setValueAtTime(300 * pitchFactor, audioCtx.currentTime);
    osc.frequency.setValueAtTime(100 * pitchFactor, audioCtx.currentTime + 0.02);
    
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.03);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.04);
  };

  const playExplosion = () => {
    init();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const duration = 1.5;
    
    // Create white noise buffer
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = buffer;
    
    // Lowpass filter to make it rumble
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(50, now + duration);
    
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    
    // Also add a low sine wave boom
    const boomOsc = audioCtx.createOscillator();
    const boomGain = audioCtx.createGain();
    boomOsc.type = 'triangle';
    boomOsc.frequency.setValueAtTime(120, now);
    boomOsc.frequency.exponentialRampToValueAtTime(30, now + 0.8);
    boomGain.gain.setValueAtTime(0.6, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    
    boomOsc.connect(boomGain);
    boomGain.connect(audioCtx.destination);
    
    noiseNode.start(now);
    noiseNode.stop(now + duration);
    boomOsc.start(now);
    boomOsc.stop(now + 0.85);
  };

  return {
    init,
    playClick,
    playSuccess,
    playFail,
    playTick,
    playExplosion
  };
})();
