// Checks every bundled level: its stored solution must satisfy the game's rule checker.
// Usage: node scripts/validate_levels.mjs [public/levels]
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { checks, isValid } from './level_checks.mjs';

const dir = process.argv[2] ?? 'public/levels';
let bad = 0;
for (const game of Object.keys(checks)) {
  const file = join(dir, `${game}.json`);
  if (!existsSync(file)) {
    console.log(`${game.padEnd(8)} (missing)`);
    continue;
  }
  const { levels } = JSON.parse(readFileSync(file, 'utf8'));
  const failed = levels.filter((l) => !isValid(game, l.puzzle));
  bad += failed.length;
  console.log(`${game.padEnd(8)} ${String(levels.length).padStart(6)} levels, ${failed.length} failing${failed.length ? ' e.g. ' + failed.slice(0, 3).map((l) => l.id).join(', ') : ''}`);
}
process.exit(bad ? 1 : 0);
