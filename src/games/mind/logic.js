// Code: guess the hidden colour sequence using exact / misplaced feedback.

const CONFIG = {
  tutorial: { length: 3, colors: 4, attempts: 8, repeats: false },
  standard: { length: 4, colors: 5, attempts: 10, repeats: false },
  hard: { length: 4, colors: 6, attempts: 8, repeats: true },
  expert: { length: 5, colors: 7, attempts: 9, repeats: true },
};

export function generate(rng, mode = 'standard') {
  const cfg = CONFIG[mode] ?? CONFIG.standard;
  let code;
  if (cfg.repeats) code = Array.from({ length: cfg.length }, () => rng.int(0, cfg.colors - 1));
  else code = rng.shuffle([...Array(cfg.colors).keys()]).slice(0, cfg.length);
  return { ...cfg, code };
}

export function score(code, guess) {
  let exact = 0;
  const restCode = {};
  const restGuess = {};
  code.forEach((v, i) => {
    if (guess[i] === v) exact++;
    else {
      restCode[v] = (restCode[v] ?? 0) + 1;
      restGuess[guess[i]] = (restGuess[guess[i]] ?? 0) + 1;
    }
  });
  let near = 0;
  for (const k of Object.keys(restGuess)) near += Math.min(restGuess[k], restCode[k] ?? 0);
  return { exact, near };
}
