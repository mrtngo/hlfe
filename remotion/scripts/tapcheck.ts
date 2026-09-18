/**
 * Renders the exact frame each tap/spotlight peaks on, so indicator placement
 * can be checked against the control it is supposed to be pointing at.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { FILMS } from '../src/Root';

mkdirSync('out/tap', { recursive: true });
// Scene index → the frame within that scene worth inspecting.
const PROBE: Record<string, number[]> = {
    '02-Empezar': [48],
    '03-Depositar': [36],
    '04-Comprar': [44, 34, 40],
    '05-Operar': [36, 30],
    '06-Predecir': [30, 40, 34, 40],
    '08-Retirar': [36, 34],
    '09-Recurrente': [-1, 36, 20],
    '10-Premios': [-1, 24, 42],
};
for (const { id, spec } of FILMS) {
    const probes = PROBE[id];
    if (!probes) continue;
    const titleDur = spec.title ? (spec.titleDur ?? 62) : 0;
    let acc = titleDur;
    spec.scenes.forEach((sc, i) => {
        const off = probes[i];
        if (off !== undefined && off >= 0) {
            const f = acc + off;
            const file = `out/tap/${id}-s${i + 1}.png`;
            execFileSync('npx', ['remotion', 'still', id, file, `--frame=${f}`, '--log=error'], {
                stdio: ['ignore', 'ignore', 'inherit'],
            });
            console.log(`  ✓ ${id}-s${i + 1} @${f}`);
        }
        acc += sc.dur;
    });
}
