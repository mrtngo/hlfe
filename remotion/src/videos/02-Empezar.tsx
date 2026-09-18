/**
 * 02 · Empezar — onboarding. The point of this film is that self-custody
 * doesn't have to feel like crypto: email in, wallet created silently, no
 * seed phrase, no signing popups.
 */
import React from 'react';
import { FilmSpec } from '../kit/FlowFilm';
import { OnboardIntro, OnboardWallet } from '../screens/misc';
import { HomeScreen, SuccessScreen } from '../screens/common';
import { Tap } from '../kit/Tap';

const IntroWithTap: React.FC = () => (
    <>
        <OnboardIntro />
        <Tap x={195} y={538} from={34} pressAt={48} />
    </>
);

export const empezarSpec: FilmSpec = {
    title: { kicker: 'Paso 1', title: 'Empezar', sub: 'Una cuenta en menos de un minuto.' },
    scenes: [
        {
            dur: 76,
            screen: <IntroWithTap />,
            eyebrow: 'Entrá',
            caption: 'Con tu email. Sin formularios eternos.',
        },
        {
            dur: 92,
            screen: <OnboardWallet />,
            eyebrow: 'Tu billetera',
            caption: 'Se crea sola. Las llaves son solo tuyas.',
        },
        {
            dur: 60,
            screen: <SuccessScreen headline="¡Listo!" sub="Tu cuenta ya está activa" rows={[['Billetera', '0x889c…0f06'], ['Red', 'Arbitrum'], ['Custodia', 'Solo vos']]} />,
            eyebrow: 'Hecho',
            caption: 'Sin frase semilla que puedas perder.',
        },
        {
            dur: 62,
            screen: <HomeScreen balance={0} />,
            eyebrow: 'Adentro',
            caption: 'Ya podés depositar y empezar.',
        },
    ],
    end: {},
};
