/**
 * 10 · Premios — the points program and referrals. Framed as future rewards
 * rather than a promised payout.
 */
import React from 'react';
import { FilmSpec } from '../kit/FlowFilm';
import { RewardsScreen } from '../screens/misc';
import { Spotlight, Tap } from '../kit/Tap';

const EarnBeat: React.FC = () => (
    <>
        <RewardsScreen points={12480} />
        <Spotlight x={20} y={318} w={350} h={222} from={20} />
    </>
);

const ReferBeat: React.FC = () => (
    <>
        <RewardsScreen points={12480} />
        <Spotlight x={20} y={554} w={350} h={80} from={14} />
        <Tap x={332} y={608} from={28} pressAt={42} />
    </>
);

export const premiosSpec: FilmSpec = {
    title: { kicker: 'Programa de puntos', title: 'Premios', sub: 'Operá, predecí, invitá. Sumá.' },
    scenes: [
        {
            dur: 78,
            screen: <RewardsScreen points={12480} />,
            eyebrow: 'Tus puntos',
            caption: 'Cada operación te suma, automáticamente.',
        },
        {
            dur: 80,
            screen: <EarnBeat />,
            eyebrow: 'Cómo sumás',
            caption: 'Operar, predecir e invitar amigos.',
        },
        {
            dur: 76,
            screen: <ReferBeat />,
            eyebrow: 'Invitá',
            caption: '500 puntos por cada amigo que entre.',
        },
    ],
    end: { line: 'Trading, en serio.' },
};
