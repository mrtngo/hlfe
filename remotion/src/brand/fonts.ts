/**
 * Typeface loading.
 *
 * Uses @remotion/google-fonts rather than plain @fontsource CSS imports: it
 * wires up delayRender() internally, so a render never captures frame 0 with
 * fallback metrics still in place.
 */
import { loadFont as loadHanken } from '@remotion/google-fonts/HankenGrotesk';
import { loadFont as loadCormorant } from '@remotion/google-fonts/CormorantGaramond';
import { loadFont as loadJetBrains } from '@remotion/google-fonts/JetBrainsMono';

// Only the latin subset and the weights actually used are fetched — the
// default pulls every weight in every subset, which is ~200 requests per
// render and slows startup for no visual gain.
const hanken = loadHanken('normal', {
    subsets: ['latin'],
    weights: ['500', '600', '700', '800'],
    ignoreTooManyRequestsWarning: true,
});
const cormorant = loadCormorant('normal', {
    subsets: ['latin'],
    weights: ['600'],
    ignoreTooManyRequestsWarning: true,
});
const jetbrains = loadJetBrains('normal', {
    subsets: ['latin'],
    weights: ['700'],
    ignoreTooManyRequestsWarning: true,
});

/** UI text — Hanken Grotesk, the app's primary typeface. */
export const FONT_UI = `${hanken.fontFamily}, -apple-system, system-ui, sans-serif`;
/** Wordmark / editorial headlines — Cormorant Garamond. */
export const FONT_SERIF = `${cormorant.fontFamily}, Georgia, serif`;
/** Prices, balances, every numeral — JetBrains Mono, per the app's rule. */
export const FONT_MONO = `${jetbrains.fontFamily}, ui-monospace, monospace`;

export const waitForFonts = () =>
    Promise.all([hanken.waitUntilDone(), cormorant.waitUntilDone(), jetbrains.waitUntilDone()]);
