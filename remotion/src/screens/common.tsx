/**
 * Screens shared across several films — home, a generic success state, and
 * the empty/funded variants of the dashboard.
 *
 * Every screen fills the phone interior and paints an opaque background, so
 * FlowFilm can dissolve one over another.
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { PHONE, V2 } from '../brand/tokens';
import { FONT_MONO } from '../brand/fonts';
import { AssetRow, BalanceHero, BottomNav, Card, Cta, NavKey, Pill, SectionHead, SunTile } from '../kit/ui';
import { countTo, enter, riseIn } from '../kit/motion';
import { usd } from '../kit/format';
import { DelosSun } from '../brand/DelosSun';

/** Opaque full-bleed screen shell. */
export const Screen: React.FC<{ children: React.ReactNode; nav?: NavKey }> = ({ children, nav }) => (
    <div style={{ position: 'absolute', inset: 0, background: V2.bg, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: V2.bgGlow }} />
        <div style={{ position: 'relative', height: '100%' }}>{children}</div>
        {nav && <BottomNav active={nav} />}
    </div>
);

const WATCHLIST = [
    { symbol: 'BTC', name: 'Bitcoin', price: '$76.714', change: '+0,5%', up: true, color: '#F7931A' },
    { symbol: 'ETH', name: 'Ethereum', price: '$2.458', change: '+1,3%', up: true, color: '#627EEA' },
    { symbol: 'SOL', name: 'Solana', price: '$102,72', change: '+3,5%', up: true, color: '#14F195' },
];

/**
 * Home dashboard. `balance` of 0 renders the pre-deposit state with the
 * gold Depositar CTA; anything else renders the funded hero with 30d change.
 */
export const HomeScreen: React.FC<{
    balance?: number;
    /** Counts the balance up from this value, for the post-deposit beat. */
    countFrom?: number;
    countDelay?: number;
    change?: string;
}> = ({ balance = 0, countFrom, countDelay = 6, change }) => {
    const frame = useCurrentFrame();
    const shown =
        countFrom !== undefined ? countTo(frame, countDelay, countFrom, balance, 34) : balance;
    return (
        <Screen nav="home">
            <div style={{ padding: '56px 20px 0' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 20,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <SunTile size={30} />
                        <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em' }}>Inicio</span>
                    </div>
                    <div
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 99,
                            background: V2.card,
                            border: `1px solid ${V2.hair}`,
                        }}
                    />
                </div>

                <Card style={{ padding: 18, marginBottom: 14, ...riseIn(frame, 2, 14) }}>
                    <BalanceHero
                        label="Valor total"
                        value={usd(shown)}
                        sub={
                            change ? (
                                <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                                    <Pill label={change} tone="pos" />
                                    <span style={{ fontSize: 11, color: V2.t3, fontFamily: FONT_MONO }}>30d</span>
                                </div>
                            ) : (
                                <span style={{ fontSize: 11.5, color: V2.t3 }}>
                                    Depositá para empezar a operar
                                </span>
                            )
                        }
                    />
                    <div style={{ display: 'flex', gap: 9, marginTop: 16 }}>
                        <Cta label="Depositar" style={{ flex: 1, padding: '12px 0', fontSize: 14 }} />
                        <div
                            style={{
                                flex: 1,
                                borderRadius: 14,
                                border: `1px solid ${V2.hair2}`,
                                padding: '12px 0',
                                textAlign: 'center',
                                fontSize: 14,
                                fontWeight: 700,
                                color: V2.t2,
                            }}
                        >
                            Retirar
                        </div>
                    </div>
                </Card>

                <div style={{ ...riseIn(frame, 8, 14) }}>
                    <SectionHead label="Mirando" right="AGREGAR" />
                    <Card style={{ padding: '4px 14px' }}>
                        {WATCHLIST.map((w, i) => (
                            <div
                                key={w.symbol}
                                style={{
                                    borderBottom: i < WATCHLIST.length - 1 ? `1px solid ${V2.hair}` : 'none',
                                }}
                            >
                                <AssetRow {...w} />
                            </div>
                        ))}
                    </Card>
                </div>
            </div>
        </Screen>
    );
};

/**
 * Full-screen confirmation: gold sun bursts, headline, then the detail rows.
 * Used as the last beat of deposit, buy, trade, withdraw and DCA.
 */
export const SuccessScreen: React.FC<{
    headline: string;
    sub?: string;
    rows?: [string, string][];
}> = ({ headline, sub, rows = [] }) => {
    const frame = useCurrentFrame();
    const p = enter(frame, 0);
    return (
        <Screen>
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: `radial-gradient(60% 40% at 50% 38%, rgba(227,179,76,${0.22 * p}) 0%, transparent 70%)`,
                }}
            />
            <div
                style={{
                    position: 'relative',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 30px',
                    textAlign: 'center',
                }}
            >
                <div
                    style={{
                        width: 78,
                        height: 78,
                        borderRadius: 99,
                        background: V2.accent,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 22,
                        transform: `scale(${0.6 + p * 0.4})`,
                        boxShadow: `0 10px 50px -6px rgba(227,179,76,${0.8 * p})`,
                    }}
                >
                    <DelosSun size={44} color={V2.accentInk} rayScale={1 + (1 - p) * 0.6} />
                </div>
                <div
                    style={{
                        fontSize: 25,
                        fontWeight: 800,
                        letterSpacing: '-0.02em',
                        ...riseIn(frame, 5, 16),
                    }}
                >
                    {headline}
                </div>
                {sub && (
                    <div style={{ fontSize: 14, color: V2.t2, marginTop: 8, ...riseIn(frame, 8, 14) }}>
                        {sub}
                    </div>
                )}
                {rows.length > 0 && (
                    <Card style={{ width: '100%', marginTop: 26, ...riseIn(frame, 12, 18) }}>
                        {rows.map(([k, v], i) => (
                            <div
                                key={k}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '9px 0',
                                    borderBottom: i < rows.length - 1 ? `1px solid ${V2.hair}` : 'none',
                                }}
                            >
                                <span style={{ fontSize: 12.5, color: V2.t3 }}>{k}</span>
                                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: FONT_MONO }}>{v}</span>
                            </div>
                        ))}
                    </Card>
                )}
            </div>
        </Screen>
    );
};

/** Centred stack helper for simple single-message screens. */
export const Centered: React.FC<{ children: React.ReactNode; gap?: number }> = ({ children, gap = 16 }) => (
    <div
        style={{
            height: PHONE.height,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 28px',
            textAlign: 'center',
            gap,
        }}
    >
        {children}
    </div>
);
