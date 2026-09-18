/**
 * 03 · Depositar — money in. Shows the multi-chain deposit: pick any network,
 * send USDC, the app bridges it (CCTP) and the balance lands.
 */
import React from 'react';
import { FilmSpec } from '../kit/FlowFilm';
import { DepositAddress, DepositPickChain } from '../screens/money';
import { HomeScreen, SuccessScreen } from '../screens/common';
import { Tap } from '../kit/Tap';

const PickWithTap: React.FC = () => (
    <>
        <DepositPickChain selected="arb" />
        <Tap x={200} y={205} from={22} pressAt={36} />
    </>
);

export const depositarSpec: FilmSpec = {
    title: { kicker: 'Paso 2', title: 'Depositar', sub: 'USDC desde cualquier red.' },
    scenes: [
        {
            dur: 84,
            screen: <PickWithTap />,
            eyebrow: 'Elegí la red',
            caption: 'Arbitrum, Base o Solana. La que ya usás.',
        },
        {
            dur: 86,
            screen: <DepositAddress />,
            eyebrow: 'Mandá USDC',
            caption: 'Copiá la dirección o escaneá el QR.',
        },
        {
            dur: 62,
            screen: <SuccessScreen headline="Depósito acreditado" sub="$500,00 USDC" rows={[['Red', 'Arbitrum'], ['Comisión de red', '$0,02'], ['Tiempo', '18 segundos']]} />,
            eyebrow: 'Llegó',
            caption: 'Segundos, no días. Y sin intermediarios.',
        },
        {
            dur: 76,
            screen: <HomeScreen balance={500} countFrom={0} countDelay={8} />,
            eyebrow: 'Listo',
            caption: 'Tu saldo ya está disponible para operar.',
        },
    ],
    end: {},
};
