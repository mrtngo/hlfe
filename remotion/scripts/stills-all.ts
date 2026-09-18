/**
 * Renders one still per scene of every film, so the whole set can be
 * eyeballed without sitting through ten video renders.
 *
 * Frames are sampled 70% into each scene: past the entrance springs and after
 * taps have landed, which is where a scene actually looks like itself.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { FILMS } from '../src/Root';

const OUT = 'out/stills';
mkdirSync(OUT, { recursive: true });

const jobs: { id: string; frame: number; tag: string }[] = [];
for (const { id, spec } of FILMS) {
    const titleDur = spec.title ? (spec.titleDur ?? 62) : 0;
    if (titleDur) jobs.push({ id, frame: Math.round(titleDur * 0.7), tag: 'title' });
    let acc = titleDur;
    spec.scenes.forEach((s, i) => {
        jobs.push({ id, frame: Math.round(acc + s.dur * 0.7), tag: `s${i + 1}` });
        acc += s.dur;
    });
    jobs.push({ id, frame: acc + 30, tag: 'end' });
}

console.log(`Rendering ${jobs.length} stills…`);
for (const { id, frame, tag } of jobs) {
    const file = `${OUT}/${id}-${tag}.png`;
    execFileSync('npx', ['remotion', 'still', id, file, `--frame=${frame}`, '--log=error'], {
        stdio: ['ignore', 'ignore', 'inherit'],
    });
    console.log(`  ✓ ${id}-${tag} @${frame}`);
}
