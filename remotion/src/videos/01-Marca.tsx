/**
 * 01 · Marca — the brand opener. Establishes the mark, the promise and a
 * three-beat montage of what the app is, with no step-by-step instruction.
 */
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { FilmSpec } from '../kit/FlowFilm';
import { HomeScreen } from '../screens/common';
import { TradeScreen } from '../screens/trading';
import { PredictBrowse } from '../screens/predict';

/** The chart draws itself in, so the montage beat has movement of its own. */
const TradeBeat: React.FC = () => {
    const f = useCurrentFrame();
    const reveal = interpolate(f, [0, 40], [0.1, 1], { extrapolateRight: 'clamp' });
    return <TradeScreen side="long" leverage={5} chartReveal={reveal} />;
};

export const marcaSpec: FilmSpec = {
    title: {
        kicker: 'Mercados globales',
        title: 'Opera de todo.\nUn toque.',
        sub: 'Cripto, acciones, oro e índices — desde tu teléfono.',
    },
    titleDur: 78,
    scenes: [
        {
            dur: 74,
            screen: <HomeScreen balance={1284.5} change="+12,4%" />,
            eyebrow: 'Tu dinero',
            caption: 'Todo tu portafolio en una pantalla.',
        },
        {
            dur: 78,
            screen: <TradeBeat />,
            eyebrow: 'Opera',
            caption: 'Largo o corto, con el apalancamiento que elijas.',
        },
        {
            dur: 74,
            screen: <PredictBrowse />,
            eyebrow: 'Predice',
            caption: 'Y apuesta a lo que va a pasar en el mundo.',
        },
    ],
    end: { line: 'Trading, en serio.' },
    endDur: 66,
};
