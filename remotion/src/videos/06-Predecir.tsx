/**
 * 06 · Predecir — HIP-4 prediction markets.
 *
 * Shows the three things that make the surface legible: markets titled in
 * plain Spanish, the deployer named on every card (Outcome / Trade.xyz /
 * Skew), and price ladders collapsed into one event you can read down.
 */
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { FilmSpec } from '../kit/FlowFilm';
import { PredictBrowse, PredictTicket } from '../screens/predict';
import { SuccessScreen } from '../screens/common';
import { Spotlight, Tap } from '../kit/Tap';

const BrowseBeat: React.FC = () => (
    <>
        <PredictBrowse />
        <Spotlight x={20} y={186} w={350} h={330} from={26} />
    </>
);

/** Filtering to one deployer — the venue chips. */
const VenueBeat: React.FC = () => (
    <>
        <PredictBrowse venueFilter="Trade.xyz" />
        <Spotlight x={183} y={149} w={74} h={26} from={16} radius={99} />
        <Tap x={220} y={162} from={26} pressAt={40} />
    </>
);

const PickBeat: React.FC = () => (
    <>
        <PredictBrowse />
        <Tap x={195} y={598} from={20} pressAt={34} />
    </>
);

const SlideBeat: React.FC = () => {
    const f = useCurrentFrame();
    const slide = interpolate(f, [18, 46], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    return (
        <>
            <PredictTicket stake="50" slide={slide} />
            <Tap x={47 + slide * 296} y={474} from={12} pressAt={20} offset={{ x: 0, y: 40 }} />
        </>
    );
};

export const predecirSpec: FilmSpec = {
    title: {
        kicker: 'Mercados de predicción',
        title: 'Predice',
        sub: 'Fútbol, tasas, precios. Sin comisión de apertura.',
    },
    scenes: [
        {
            dur: 84,
            screen: <BrowseBeat />,
            eyebrow: 'Escaleras de precio',
            caption: 'Todos los niveles de BTC, en un solo evento.',
        },
        {
            dur: 78,
            screen: <VenueBeat />,
            eyebrow: 'Quién lo listó',
            caption: 'Cada mercado dice su casa: Outcome, Trade.xyz o Skew.',
        },
        {
            dur: 72,
            screen: <PickBeat />,
            eyebrow: 'Elige',
            caption: 'Desde un partido hasta la decisión de la Fed.',
        },
        {
            dur: 78,
            screen: <SlideBeat />,
            eyebrow: 'Apuesta',
            caption: 'Ves exactamente cuánto cobras si aciertas.',
        },
        {
            dur: 60,
            screen: <SuccessScreen headline="¡Apuesta hecha!" sub="$50,00 a Barcelona" rows={[['Cobras si aciertas', '$61,50'], ['Casa', 'Trade.xyz'], ['Comisión de apertura', '$0,00']]} />,
            eyebrow: 'Listo',
            caption: 'Y puedes vender tu posición antes del cierre.',
        },
    ],
    end: {},
};
