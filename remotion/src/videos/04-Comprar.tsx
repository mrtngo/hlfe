/**
 * 04 · Comprar — the beginner buy. Deliberately never says "leverage" or
 * "perp": this surface places a 1x buy and reads like buying a stock.
 */
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { FilmSpec } from '../kit/FlowFilm';
import { BuyScreen } from '../screens/trading';
import { HomeScreen, SuccessScreen } from '../screens/common';
import { Spotlight, Tap } from '../kit/Tap';

const PickAsset: React.FC = () => (
    <>
        <HomeScreen balance={500} />
        <Spotlight x={20} y={455} w={350} h={57} from={18} />
        <Tap x={195} y={484} from={30} pressAt={44} />
    </>
);

const AmountBeat: React.FC = () => (
    <>
        <BuyScreen amount="100" slide={0} />
        <Tap x={140} y={330} from={20} pressAt={34} />
    </>
);

/** The slide gesture: the thumb tracks the control as it fills. */
const SlideBeat: React.FC = () => {
    const f = useCurrentFrame();
    const slide = interpolate(f, [18, 46], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    return (
        <>
            <BuyScreen amount="100" slide={slide} />
            <Tap x={47 + slide * 296} y={505} from={12} pressAt={20} offset={{ x: 0, y: 40 }} />
        </>
    );
};

export const comprarSpec: FilmSpec = {
    title: { kicker: 'Paso 3', title: 'Comprar', sub: 'Como comprar una acción.' },
    scenes: [
        {
            dur: 74,
            screen: <PickAsset />,
            eyebrow: 'Elegí',
            caption: 'Tocá el activo que querés comprar.',
        },
        {
            dur: 76,
            screen: <AmountBeat />,
            eyebrow: 'El monto',
            caption: 'Poné cuánto querés. Desde $10.',
        },
        {
            dur: 72,
            screen: <SlideBeat />,
            eyebrow: 'Confirmá',
            caption: 'Deslizá. No hay pop-ups que firmar.',
        },
        {
            dur: 62,
            screen: <SuccessScreen headline="¡Compraste Bitcoin!" sub="$100,00 · 0,0013 BTC" rows={[['Precio', '$76.714'], ['Comisión', '$0,05'], ['Liquidado', 'Al instante']]} />,
            eyebrow: 'Hecho',
            caption: 'Tu primera compra, en tres toques.',
        },
    ],
    end: {},
};
