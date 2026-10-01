/**
 * 08 · Retirar — money out. Amount, destination chain and address, gated by
 * the opt-in 2FA, then sent. The point of the film is that leaving is as
 * easy as arriving.
 */
import React from 'react';
import { FilmSpec } from '../kit/FlowFilm';
import { WithdrawScreen } from '../screens/money';
import { SuccessScreen } from '../screens/common';
import { Tap } from '../kit/Tap';

const AmountBeat: React.FC = () => (
    <>
        <WithdrawScreen amount="250,00" />
        <Tap x={195} y={242} from={22} pressAt={36} />
    </>
);

const DestinationBeat: React.FC = () => (
    <>
        <WithdrawScreen amount="250,00" />
        <Tap x={195} y={359} from={20} pressAt={34} />
    </>
);

export const retirarSpec: FilmSpec = {
    title: { kicker: 'Paso 5', title: 'Retirar', sub: 'Tu plata sale cuando quieres.' },
    scenes: [
        {
            dur: 76,
            screen: <AmountBeat />,
            eyebrow: 'El monto',
            caption: 'Una parte o todo. Sin mínimos raros.',
        },
        {
            dur: 76,
            screen: <DestinationBeat />,
            eyebrow: '¿A dónde?',
            caption: 'Elige la red y la dirección de destino.',
        },
        {
            dur: 78,
            screen: <WithdrawScreen amount="250,00" showMfa />,
            eyebrow: 'Seguridad',
            caption: 'Con 2FA activado, cada retiro pide tu código.',
        },
        {
            dur: 62,
            screen: <SuccessScreen headline="Retiro enviado" sub="$250,00 USDC" rows={[['Red', 'Base'], ['A', '0x4b1e…9ac2'], ['Comisión', '$0,02']]} />,
            eyebrow: 'En camino',
            caption: 'Sin permisos, sin esperas de días.',
        },
    ],
    end: {},
};
