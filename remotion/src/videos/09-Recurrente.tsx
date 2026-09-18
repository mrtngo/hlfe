/**
 * 09 · Recurrente — DCA. For the hodler who wants to stop timing the market:
 * pick an asset, an amount and a cadence, and it runs itself.
 */
import React from 'react';
import { FilmSpec } from '../kit/FlowFilm';
import { DcaScreen, HistoryScreen } from '../screens/misc';
import { Spotlight, Tap } from '../kit/Tap';

const CadenceBeat: React.FC = () => (
    <>
        <DcaScreen />
        <Tap x={195} y={379} from={22} pressAt={36} />
    </>
);

const ProjectionBeat: React.FC = () => (
    <>
        <DcaScreen />
        <Spotlight x={20} y={438} w={350} h={46} from={16} />
    </>
);

export const recurrenteSpec: FilmSpec = {
    title: {
        kicker: 'Compra automática',
        title: 'Recurrente',
        sub: 'Un poco cada semana, sin pensarlo.',
    },
    scenes: [
        {
            dur: 76,
            screen: <DcaScreen />,
            eyebrow: 'Elegí',
            caption: 'Qué comprar y cuánto poner cada vez.',
        },
        {
            dur: 74,
            screen: <CadenceBeat />,
            eyebrow: 'Cada cuánto',
            caption: 'Diario, semanal o mensual. Vos decidís.',
        },
        {
            dur: 70,
            screen: <ProjectionBeat />,
            eyebrow: 'A un año',
            caption: 'Te mostramos cuánto vas a haber puesto.',
        },
        {
            dur: 64,
            screen: <DcaScreen confirmed />,
            eyebrow: 'Activa',
            caption: 'Ya corre sola. La pausás cuando quieras.',
        },
        {
            dur: 70,
            screen: <HistoryScreen />,
            eyebrow: 'Cada semana',
            caption: 'Y queda registrada en tu historial.',
        },
    ],
    end: {},
};
