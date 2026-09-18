/**
 * 07 · Cartera — the portfolio view: total value, allocation, open positions
 * and the full activity history.
 */
import React from 'react';
import { FilmSpec } from '../kit/FlowFilm';
import { HistoryScreen, PortfolioScreen } from '../screens/misc';
import { Spotlight } from '../kit/Tap';

const OverviewBeat: React.FC = () => (
    <>
        <PortfolioScreen total={1284.5} />
        <Spotlight x={20} y={100} w={350} h={148} from={22} />
    </>
);

export const carteraSpec: FilmSpec = {
    title: { kicker: 'Tu dinero', title: 'Cartera', sub: 'Todo, siempre a la vista.' },
    scenes: [
        {
            dur: 82,
            screen: <OverviewBeat />,
            eyebrow: 'Valor total',
            caption: 'Cuánto tenés y cómo se reparte.',
        },
        {
            dur: 78,
            screen: <PortfolioScreen total={1284.5} />,
            eyebrow: 'Posiciones',
            caption: 'Ganancia y pérdida en vivo, posición por posición.',
        },
        {
            dur: 82,
            screen: <HistoryScreen />,
            eyebrow: 'Historial',
            caption: 'Cada compra, apuesta y depósito, con su fecha.',
        },
    ],
    end: {},
};
