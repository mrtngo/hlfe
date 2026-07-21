'use client';

// DesktopShell — the desktop app chrome for the consumer (non-terminal) app.
//
// On wide screens the mobile single-column + floating bottom-pill layout reads
// as a phone. This wraps the consumer screens in a real desktop frame: a
// persistent left sidebar (brand + primary nav + account) and a top bar
// (page title, search, deposit / login). Content flows into a wide area.
//
// It does NOT replace the pro DesktopTerminal (dense trading workstation) — it's
// the friendly consumer desktop shell that all other views live in.

import type { ReactNode } from 'react';
import { DelosWordmark, Icon, V2, type IconName } from '@/components/V2Kit';

export type ShellView =
    | 'home' | 'markets' | 'academy' | 'predictions'
    | 'news' | 'history' | 'rewards' | 'profile';

interface NavItem {
    id: ShellView;
    label: string;
    icon: IconName;
    /** Extra views that should light this item up as active. */
    group?: string[];
}

const NAV: NavItem[] = [
    { id: 'home', label: 'Inicio', icon: 'home' },
    { id: 'markets', label: 'Mercados', icon: 'chart' },
    { id: 'predictions', label: 'Predice', icon: 'target' },
    { id: 'news', label: 'Noticias', icon: 'news' },
    { id: 'academy', label: 'Academia', icon: 'info' },
    { id: 'rewards', label: 'Premios', icon: 'gift' },
    { id: 'history', label: 'Historial', icon: 'history' },
    {
        id: 'profile', label: 'Perfil', icon: 'user',
        group: ['profile', 'settings', 'portfolio', 'advanced', 'leaderboard', 'cctp', 'bolsillos', 'traderSearch', 'publicProfile'],
    },
];

interface DesktopShellProps {
    view: string;
    onNavigate: (view: ShellView) => void;
    authenticated: boolean;
    firstName?: string;
    onLogin: () => void;
    onDeposit: () => void;
    onOpenProfile: () => void;
    onOpenSearch?: () => void;
    /** Title shown in the top bar (defaults to the active nav label). */
    title?: string;
    children: ReactNode;
}

export default function DesktopShell({
    view,
    onNavigate,
    authenticated,
    firstName,
    onLogin,
    onDeposit,
    onOpenProfile,
    onOpenSearch,
    title,
    children,
}: DesktopShellProps) {
    const activeItem = NAV.find((n) => n.id === view || n.group?.includes(view));
    const pageTitle = title ?? activeItem?.label ?? 'Delos';
    const initial = (firstName || 'D').charAt(0).toUpperCase();

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: V2.bg, color: V2.t1, fontFamily: V2.ui }}>
            {/* Sidebar */}
            <aside
                style={{
                    width: 250, flexShrink: 0, position: 'sticky', top: 0, height: '100vh',
                    borderRight: `1px solid ${V2.hair}`, display: 'flex', flexDirection: 'column',
                    padding: '26px 16px 18px', background: 'rgba(255,255,255,0.012)',
                }}
            >
                <div style={{ padding: '0 8px 22px' }}>
                    <DelosWordmark />
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                    {NAV.map((item) => {
                        const active = item.id === view || item.group?.includes(view);
                        return (
                            <button
                                key={item.id}
                                onClick={() => onNavigate(item.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 13, width: '100%',
                                    padding: '11px 12px', borderRadius: 12, cursor: 'pointer',
                                    border: 'none', textAlign: 'left', fontFamily: V2.ui,
                                    fontSize: 14.5, fontWeight: active ? 800 : 600,
                                    color: active ? V2.accent : V2.t2,
                                    background: active ? V2.accentSoft : 'transparent',
                                    transition: 'background 120ms ease, color 120ms ease',
                                }}
                                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                            >
                                <Icon name={item.icon} size={19} color={active ? V2.accent : V2.t3} strokeWidth={active ? 2.4 : 1.9} />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                {/* Account footer */}
                {authenticated ? (
                    <button
                        onClick={onOpenProfile}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 11, width: '100%',
                            padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                            border: `1px solid ${V2.hair}`, background: V2.card, fontFamily: V2.ui,
                        }}
                    >
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: V2.accent, color: V2.accentInk, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                            {initial}
                        </div>
                        <div style={{ minWidth: 0, textAlign: 'left' }}>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: V2.t1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {firstName || 'Mi cuenta'}
                            </div>
                            <div style={{ fontSize: 11.5, color: V2.t3 }}>Ver perfil</div>
                        </div>
                    </button>
                ) : (
                    <button
                        onClick={onLogin}
                        style={{
                            width: '100%', padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                            border: 'none', background: V2.accent, color: V2.accentInk,
                            fontWeight: 800, fontSize: 14.5, fontFamily: V2.ui,
                        }}
                    >
                        Iniciar sesión
                    </button>
                )}
            </aside>

            {/* Main column */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <header
                    style={{
                        height: 66, flexShrink: 0, position: 'sticky', top: 0, zIndex: 20,
                        borderBottom: `1px solid ${V2.hair}`, display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', gap: 16, padding: '0 32px',
                        background: 'rgba(10,12,14,0.82)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
                    }}
                >
                    <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>{pageTitle}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                            onClick={onOpenSearch}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px', borderRadius: 11,
                                border: `1px solid ${V2.hair}`, background: V2.card, cursor: 'pointer',
                                color: V2.t3, fontSize: 13.5, fontFamily: V2.ui, minWidth: 210,
                            }}
                        >
                            <Icon name="search" size={16} color={V2.t3} />
                            Buscar mercado…
                        </button>
                        {authenticated ? (
                            <button
                                onClick={onDeposit}
                                style={{ padding: '10px 18px', borderRadius: 11, border: 'none', background: V2.accent, color: V2.accentInk, fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: V2.ui }}
                            >
                                Depositar
                            </button>
                        ) : (
                            <button
                                onClick={onLogin}
                                style={{ padding: '10px 18px', borderRadius: 11, border: 'none', background: V2.accent, color: V2.accentInk, fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: V2.ui }}
                            >
                                Crear cuenta
                            </button>
                        )}
                    </div>
                </header>

                <main style={{ flex: 1, padding: '28px 32px 56px', maxWidth: 1320, width: '100%' }}>
                    {children}
                </main>
            </div>
        </div>
    );
}
