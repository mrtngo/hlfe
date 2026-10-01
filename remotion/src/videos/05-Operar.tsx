/**
 * 05 · Operar — the leveraged surface. Long or short, leverage picked on a
 * slider, with the liquidation price always in frame.
 */
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { FilmSpec } from '../kit/FlowFilm';
import { PositionCard, TradeScreen } from '../screens/trading';
import { Screen } from '../screens/common';
import { Spotlight, Tap } from '../kit/Tap';
import { SectionHead, Label } from '../kit/ui';
import { V2 } from '../brand/tokens';

const SideBeat: React.FC = () => (
    <>
        <TradeScreen side="long" leverage={5} />
        <Tap x={106} y={330} from={22} pressAt={36} />
    </>
);

/** Leverage ramps 2x → 10x under the thumb. */
const LeverageBeat: React.FC = () => {
    const f = useCurrentFrame();
    const lev = interpolate(f, [14, 44], [2, 10], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    const x = 34 + (lev / 40) * 322;
    return (
        <>
            <TradeScreen side="long" leverage={lev} />
            <Spotlight x={20} y={636} w={350} h={40} from={30} />
            <Tap x={x} y={570} from={8} pressAt={16} offset={{ x: 0, y: 34 }} />
        </>
    );
};

/** The resulting open position, with PnL ticking up. */
const PositionBeat: React.FC = () => {
    const f = useCurrentFrame();
    const pnl = interpolate(f, [6, 54], [0, 52.4], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    return (
        <Screen nav="home">
            <div style={{ padding: '56px 20px 0' }}>
                <Label style={{ fontSize: 11, color: V2.t3, fontWeight: 600 }}>Posición abierta</Label>
                <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 18 }}>
                    Ya estás dentro
                </div>
                <SectionHead label="BTC · Subida" right="10x" />
                <PositionCard symbol="BTC" side="long" lev={10} pnl={pnl} pnlPct={(pnl / 200) * 100} />
            </div>
        </Screen>
    );
};

export const operarSpec: FilmSpec = {
    title: { kicker: 'Paso 4', title: 'Operar', sub: 'Largo o corto, con apalancamiento.' },
    scenes: [
        {
            dur: 78,
            screen: <SideBeat />,
            eyebrow: '¿Sube o baja?',
            caption: 'Ganas igual en las dos direcciones.',
        },
        {
            dur: 80,
            screen: <LeverageBeat />,
            eyebrow: 'Apalancamiento',
            caption: 'Elige de 1x a 40x. Vemos tu liquidación siempre.',
        },
        {
            dur: 74,
            screen: <PositionBeat />,
            eyebrow: 'Tu posición',
            caption: 'Sigue tu ganancia en vivo, al segundo.',
        },
    ],
    end: {},
};
