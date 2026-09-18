/**
 * Composition registry — ten vertical (1080×1920) Spanish brand films.
 *
 * Every film is declared as a FilmSpec and rendered through the one FlowFilm
 * harness, so durations are derived rather than hand-maintained: edit a
 * scene's length and the Composition follows.
 */
import React from 'react';
import { Composition } from 'remotion';
import { COMP, FilmSpec, filmDuration, makeFilm } from './kit/FlowFilm';

import { marcaSpec } from './videos/01-Marca';
import { empezarSpec } from './videos/02-Empezar';
import { depositarSpec } from './videos/03-Depositar';
import { comprarSpec } from './videos/04-Comprar';
import { operarSpec } from './videos/05-Operar';
import { predecirSpec } from './videos/06-Predecir';
import { carteraSpec } from './videos/07-Cartera';
import { retirarSpec } from './videos/08-Retirar';
import { recurrenteSpec } from './videos/09-Recurrente';
import { premiosSpec } from './videos/10-Premios';

/** id → spec. The id is also the output filename. */
export const FILMS: { id: string; spec: FilmSpec }[] = [
    { id: '01-Marca', spec: marcaSpec },
    { id: '02-Empezar', spec: empezarSpec },
    { id: '03-Depositar', spec: depositarSpec },
    { id: '04-Comprar', spec: comprarSpec },
    { id: '05-Operar', spec: operarSpec },
    { id: '06-Predecir', spec: predecirSpec },
    { id: '07-Cartera', spec: carteraSpec },
    { id: '08-Retirar', spec: retirarSpec },
    { id: '09-Recurrente', spec: recurrenteSpec },
    { id: '10-Premios', spec: premiosSpec },
];

export const RemotionRoot: React.FC = () => (
    <>
        {FILMS.map(({ id, spec }) => (
            <Composition
                key={id}
                id={id}
                component={makeFilm(spec)}
                durationInFrames={filmDuration(spec)}
                {...COMP}
            />
        ))}
    </>
);
