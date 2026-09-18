/**
 * Renders every film to out/video/<id>.mp4.
 *
 * Sequential rather than parallel: each render already saturates the CPU with
 * its own concurrency, and running ten at once just thrashes.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { FILMS } from '../src/Root';

const OUT = 'out/video';
mkdirSync(OUT, { recursive: true });

const only = process.argv.slice(2);
const films = only.length ? FILMS.filter((f) => only.includes(f.id)) : FILMS;

console.log(`Rendering ${films.length} film(s) → ${OUT}`);
for (const { id } of films) {
    const t = Date.now();
    execFileSync('npx', ['remotion', 'render', id, `${OUT}/${id}.mp4`, '--log=error'], {
        stdio: ['ignore', 'ignore', 'inherit'],
    });
    console.log(`  ✓ ${id}.mp4  (${((Date.now() - t) / 1000).toFixed(0)}s)`);
}
