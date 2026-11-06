let ctx: AudioContext | undefined;

export function playOink() {
  ctx ??= new AudioContext();
  const audio = ctx;
  const t = audio.currentTime;

  [0, 0.15].forEach((offset, i) => {
    const start = t + offset;
    const osc = audio.createOscillator();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(i ? 250 : 310, start);
    osc.frequency.exponentialRampToValueAtTime(i ? 140 : 170, start + 0.12);

    filter.type = "lowpass";
    filter.frequency.value = 850;
    filter.Q.value = 9;

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.22, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.13);

    osc.connect(filter).connect(gain).connect(audio.destination);
    osc.start(start);
    osc.stop(start + 0.15);
  });
}
