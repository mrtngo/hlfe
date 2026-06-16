'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { apiUrl } from '@/lib/api-base';
import type { MoneyMovementRecord } from '@/lib/money-movements/types';
import type {
    AdminReconciliationSnapshot,
    ReconciliationIssue,
    ReconciliationRunRecord,
} from '@/lib/reconciliation/types';

type LoadState = {
    loading: boolean;
    error: string | null;
    snapshot: AdminReconciliationSnapshot | null;
};

export default function AdminReconciliationPage() {
    const { ready, authenticated, login, getAccessToken } = usePrivy();
    const { address } = useHyperliquid();
    const [state, setState] = useState<LoadState>({ loading: false, error: null, snapshot: null });
    const [running, setRunning] = useState(false);

    const latestRun = state.snapshot?.runs?.[0] || null;
    const issues = latestRun?.issues || [];
    const criticalCount = issues.filter((issue) => issue.severity === 'critical').length;

    const request = useCallback(async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
        const token = await getAccessToken();
        if (!token) throw new Error('Missing auth token.');
        const headers = new Headers(init.headers);
        headers.set('Authorization', `Bearer ${token}`);
        if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
        const response = await fetch(apiUrl(path), { ...init, headers });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(payload?.error || 'Request failed.');
        }
        return payload as T;
    }, [getAccessToken]);

    const load = useCallback(async () => {
        if (!address) return;
        setState((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const snapshot = await request<AdminReconciliationSnapshot>(
                `/api/admin/reconciliation?walletAddress=${encodeURIComponent(address)}`,
            );
            setState({ loading: false, error: null, snapshot });
        } catch (error) {
            setState({
                loading: false,
                error: error instanceof Error ? error.message : 'Could not load reconciliation data.',
                snapshot: null,
            });
        }
    }, [address, request]);

    useEffect(() => {
        if (ready && authenticated && address) {
            load();
        }
    }, [address, authenticated, load, ready]);

    const run = async () => {
        if (!address) return;
        setRunning(true);
        setState((prev) => ({ ...prev, error: null }));
        try {
            await request<{ run: ReconciliationRunRecord }>('/api/admin/reconciliation', {
                method: 'POST',
                body: JSON.stringify({ walletAddress: address, limit: 250, staleMinutes: 45 }),
            });
            await load();
        } catch (error) {
            setState((prev) => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Could not run reconciliation.',
            }));
        } finally {
            setRunning(false);
        }
    };

    const statusTone = useMemo(() => {
        if (!latestRun) return 'idle';
        if (criticalCount > 0) return 'critical';
        if ((latestRun.summary?.warningCount || 0) > 0) return 'warning';
        return 'ok';
    }, [criticalCount, latestRun]);

    if (!ready) {
        return <AdminShell><Centered><Loader2 className="animate-spin" /> Loading admin...</Centered></AdminShell>;
    }

    if (!authenticated) {
        return (
            <AdminShell>
                <Centered>
                    <ShieldAlert size={30} />
                    <h1>Admin access</h1>
                    <p>Sign in with an authorized admin wallet.</p>
                    <button className="admin-primary" type="button" onClick={login}>Sign in</button>
                </Centered>
            </AdminShell>
        );
    }

    return (
        <AdminShell>
            <header className="admin-header">
                <div>
                    <div className="admin-kicker">Rayo operations</div>
                    <h1>Money movement reconciliation</h1>
                    <p>Compare recent Rayo movement records against basic Hyperliquid ledger evidence and operational invariants.</p>
                </div>
                <div className="admin-actions">
                    <button className="admin-secondary" type="button" onClick={load} disabled={state.loading}>
                        <RefreshCw size={15} />
                        Refresh
                    </button>
                    <button className="admin-primary" type="button" onClick={run} disabled={running || !address}>
                        {running ? <Loader2 className="animate-spin" size={15} /> : <CheckCircle2 size={15} />}
                        Run reconciliation
                    </button>
                </div>
            </header>

            {state.error && (
                <div className="admin-error">
                    <AlertTriangle size={16} />
                    {state.error}
                </div>
            )}

            <section className="admin-grid">
                <Metric title="Status" value={latestRun ? latestRun.status : 'No runs'} tone={statusTone} />
                <Metric title="Issues" value={String(latestRun?.summary?.issueCount ?? 0)} tone={statusTone} />
                <Metric title="Movements checked" value={String(latestRun?.summary?.checkedMovements ?? 0)} />
                <Metric title="Wallets checked" value={String(latestRun?.summary?.checkedWallets ?? 0)} />
                <Metric title="Stale open" value={String(latestRun?.summary?.staleOpenCount ?? 0)} tone={(latestRun?.summary?.staleOpenCount || 0) > 0 ? 'warning' : 'ok'} />
                <Metric title="Duplicate tx" value={String(latestRun?.summary?.duplicateTxHashCount ?? 0)} tone={(latestRun?.summary?.duplicateTxHashCount || 0) > 0 ? 'critical' : 'ok'} />
            </section>

            <section className="admin-columns">
                <div className="admin-panel">
                    <PanelHeader title="Latest issues" subtitle={latestRun?.started_at ? new Date(latestRun.started_at).toLocaleString() : 'No reconciliation run yet'} />
                    <IssueList issues={issues} />
                </div>
                <div className="admin-panel">
                    <PanelHeader title="Recent movements" subtitle={`${state.snapshot?.movements?.length || 0} records`} />
                    <MovementTable movements={state.snapshot?.movements || []} />
                </div>
            </section>

            <style jsx global>{`
                .admin-page {
                    min-height: 100vh;
                    background: var(--color-bg-primary);
                    color: var(--color-text-primary);
                    font-family: var(--v2-font-ui);
                    padding: var(--space-6);
                }
                .admin-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: var(--space-4);
                    margin-bottom: var(--space-6);
                }
                .admin-kicker {
                    color: var(--color-brand-primary);
                    font-size: var(--text-xs);
                    font-weight: 900;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                }
                h1 {
                    margin: var(--space-1) 0;
                    font-size: var(--text-2xl);
                    line-height: 1.1;
                }
                p {
                    margin: 0;
                    color: var(--color-text-secondary);
                    max-width: 760px;
                }
                .admin-actions {
                    display: flex;
                    gap: var(--space-2);
                }
                .admin-primary,
                .admin-secondary {
                    min-height: var(--space-10);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: var(--space-2);
                    border-radius: var(--radius-md);
                    border: 1px solid var(--color-border-default);
                    padding: 0 var(--space-4);
                    font-family: inherit;
                    font-weight: 900;
                    cursor: pointer;
                }
                .admin-primary {
                    background: var(--color-brand-primary);
                    border-color: var(--color-brand-primary);
                    color: var(--color-text-on-brand);
                }
                .admin-secondary {
                    background: var(--color-bg-tertiary);
                    color: var(--color-text-secondary);
                }
                .admin-primary:disabled,
                .admin-secondary:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }
                .admin-error {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    margin-bottom: var(--space-4);
                    padding: var(--space-3);
                    border-radius: var(--radius-md);
                    border: 1px solid color-mix(in srgb, var(--color-negative) 32%, transparent);
                    background: color-mix(in srgb, var(--color-negative) 12%, transparent);
                    color: var(--color-negative);
                    font-weight: 800;
                }
                .admin-grid {
                    display: grid;
                    grid-template-columns: repeat(6, minmax(0, 1fr));
                    gap: var(--space-3);
                    margin-bottom: var(--space-4);
                }
                .admin-columns {
                    display: grid;
                    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.25fr);
                    gap: var(--space-4);
                }
                .admin-panel,
                .admin-metric {
                    border: 1px solid var(--color-border-subtle);
                    border-radius: var(--radius-md);
                    background: var(--color-bg-secondary);
                    overflow: hidden;
                }
                .admin-metric {
                    padding: var(--space-3);
                }
                .admin-metric span {
                    color: var(--color-text-tertiary);
                    font-size: var(--text-xs);
                    font-weight: 900;
                    text-transform: uppercase;
                }
                .admin-metric strong {
                    display: block;
                    margin-top: var(--space-2);
                    font-family: var(--font-mono);
                    font-size: var(--text-xl);
                }
                .admin-metric[data-tone="ok"] strong { color: var(--color-positive); }
                .admin-metric[data-tone="warning"] strong { color: var(--color-brand-primary); }
                .admin-metric[data-tone="critical"] strong { color: var(--color-negative); }
                .panel-header {
                    padding: var(--space-3);
                    border-bottom: 1px solid var(--color-border-subtle);
                }
                .panel-header strong {
                    display: block;
                    font-size: var(--text-base);
                }
                .panel-header span {
                    color: var(--color-text-tertiary);
                    font-size: var(--text-xs);
                }
                .centered {
                    min-height: calc(100vh - var(--space-12));
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: var(--space-3);
                    text-align: center;
                }
                .admin-empty {
                    min-height: calc(var(--space-16) * 2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--color-text-tertiary);
                    font-weight: 800;
                }
                @media (max-width: 1100px) {
                    .admin-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
                    .admin-columns { grid-template-columns: 1fr; }
                    .admin-header { flex-direction: column; }
                }
            `}</style>
        </AdminShell>
    );
}

function AdminShell({ children }: { children: React.ReactNode }) {
    return <div className="admin-page">{children}</div>;
}

function Centered({ children }: { children: React.ReactNode }) {
    return <div className="centered">{children}</div>;
}

function Metric({ title, value, tone = 'idle' }: { title: string; value: string; tone?: string }) {
    return (
        <div className="admin-metric" data-tone={tone}>
            <span>{title}</span>
            <strong>{value}</strong>
        </div>
    );
}

function PanelHeader({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <div className="panel-header">
            <strong>{title}</strong>
            <span>{subtitle}</span>
        </div>
    );
}

function IssueList({ issues }: { issues: ReconciliationIssue[] }) {
    if (issues.length === 0) {
        return <div className="admin-empty">No issues in the latest run.</div>;
    }

    return (
        <div className="admin-list">
            {issues.map((issue, index) => (
                <div className="issue-row" data-severity={issue.severity} key={`${issue.code}-${issue.movementId || index}`}>
                    <div>
                        <strong>{issue.code}</strong>
                        <p>{issue.message}</p>
                    </div>
                    <code>{issue.walletAddress ? `${issue.walletAddress.slice(0, 8)}...${issue.walletAddress.slice(-4)}` : issue.severity}</code>
                    <style jsx global>{`
                        .admin-list {
                            max-height: 620px;
                            overflow-y: auto;
                        }
                        .issue-row {
                            display: grid;
                            grid-template-columns: minmax(0, 1fr) auto;
                            gap: var(--space-3);
                            padding: var(--space-3);
                            border-bottom: 1px solid var(--color-border-subtle);
                        }
                        .issue-row[data-severity="critical"] { border-left: 3px solid var(--color-negative); }
                        .issue-row[data-severity="warning"] { border-left: 3px solid var(--color-brand-primary); }
                        .issue-row[data-severity="info"] { border-left: 3px solid var(--color-text-tertiary); }
                        strong {
                            font-family: var(--font-mono);
                            font-size: var(--text-sm);
                        }
                        p {
                            margin: var(--space-1) 0 0;
                            color: var(--color-text-secondary);
                            font-size: var(--text-sm);
                        }
                        code {
                            color: var(--color-text-tertiary);
                            font-family: var(--font-mono);
                            font-size: var(--text-xs);
                        }
                    `}</style>
                </div>
            ))}
        </div>
    );
}

function MovementTable({ movements }: { movements: MoneyMovementRecord[] }) {
    if (movements.length === 0) {
        return <div className="admin-empty">No recent money movements.</div>;
    }

    return (
        <div className="movement-table">
            <div className="movement-row movement-head">
                <span>Created</span>
                <span>Wallet</span>
                <span>Kind</span>
                <span>Status</span>
                <span>Amount</span>
            </div>
            {movements.map((movement) => (
                <div className="movement-row" key={movement.id}>
                    <span>{new Date(movement.created_at).toLocaleString()}</span>
                    <span>{movement.wallet_address.slice(0, 8)}...{movement.wallet_address.slice(-4)}</span>
                    <span>{movement.kind}</span>
                    <span>{movement.status}</span>
                    <span>{movement.amount || '--'} {movement.asset}</span>
                </div>
            ))}
            <style jsx global>{`
                .movement-table {
                    overflow: auto;
                    max-height: 620px;
                    font-family: var(--font-mono);
                    font-size: var(--text-xs);
                }
                .movement-row {
                    display: grid;
                    grid-template-columns: 1.35fr 1fr 0.8fr 0.85fr 0.85fr;
                    gap: var(--space-3);
                    min-width: 760px;
                    padding: var(--space-3);
                    border-bottom: 1px solid var(--color-border-subtle);
                    color: var(--color-text-secondary);
                }
                .movement-head {
                    position: sticky;
                    top: 0;
                    background: var(--color-bg-tertiary);
                    color: var(--color-text-tertiary);
                    font-weight: 900;
                    text-transform: uppercase;
                }
            `}</style>
        </div>
    );
}
