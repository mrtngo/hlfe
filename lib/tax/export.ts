import 'server-only';

import { exportAccountData } from '@/lib/supabase/account-server';
import { API_URL, IS_TESTNET } from '@/lib/hyperliquid/client';
import { toCsv } from '@/lib/tax/csv';

type JsonRecord = Record<string, unknown>;

interface ExportFile {
    name: string;
    content: string;
}

interface ExportWarning {
    source: string;
    message: string;
}

const textEncoder = new TextEncoder();

async function postHyperliquidInfo(body: JsonRecord): Promise<unknown> {
    const response = await fetch(`${API_URL}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}${text ? `: ${text.slice(0, 180)}` : ''}`);
    }

    return response.json();
}

async function safeSource(
    source: string,
    warnings: ExportWarning[],
    body: JsonRecord,
): Promise<unknown> {
    try {
        return await postHyperliquidInfo(body);
    } catch (error) {
        warnings.push({
            source,
            message: error instanceof Error ? error.message : 'Unknown fetch error',
        });
        return [];
    }
}

function asArray(value: unknown): JsonRecord[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is JsonRecord => typeof item === 'object' && item !== null);
}

function asRecordArray(value: unknown): JsonRecord[] {
    if (Array.isArray(value)) return asArray(value);
    if (typeof value === 'object' && value !== null) return [value as JsonRecord];
    return [];
}

function flatten(value: unknown): unknown {
    if (value == null) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
    return JSON.stringify(value);
}

function jsonFile(value: unknown): string {
    return `${JSON.stringify(value, null, 2)}\n`;
}

function normalizeRows(value: unknown): JsonRecord[] {
    return asRecordArray(value).map((row) => {
        const normalized: JsonRecord = {};
        Object.entries(row).forEach(([key, item]) => {
            normalized[key] = flatten(item);
        });
        return normalized;
    });
}

function u16(value: number): Uint8Array {
    const out = new Uint8Array(2);
    new DataView(out.buffer).setUint16(0, value, true);
    return out;
}

function u32(value: number): Uint8Array {
    const out = new Uint8Array(4);
    new DataView(out.buffer).setUint32(0, value >>> 0, true);
    return out;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    parts.forEach((part) => {
        out.set(part, offset);
        offset += part.length;
    });
    return out;
}

const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
        let c = i;
        for (let k = 0; k < 8; k += 1) {
            c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c >>> 0;
    }
    return table;
})();

function crc32(bytes: Uint8Array): number {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i += 1) {
        crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date): { date: number; time: number } {
    const year = Math.max(1980, date.getUTCFullYear());
    return {
        time: (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | Math.floor(date.getUTCSeconds() / 2),
        date: ((year - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate(),
    };
}

function zip(files: ExportFile[]): Uint8Array {
    const now = new Date();
    const dt = dosDateTime(now);
    const locals: Uint8Array[] = [];
    const centrals: Uint8Array[] = [];
    let offset = 0;

    for (const file of files) {
        const name = textEncoder.encode(file.name);
        const data = textEncoder.encode(file.content);
        const crc = crc32(data);
        const localHeader = concatBytes([
            u32(0x04034b50),
            u16(20),
            u16(0x0800),
            u16(0),
            u16(dt.time),
            u16(dt.date),
            u32(crc),
            u32(data.length),
            u32(data.length),
            u16(name.length),
            u16(0),
            name,
        ]);
        locals.push(localHeader, data);

        const centralHeader = concatBytes([
            u32(0x02014b50),
            u16(20),
            u16(20),
            u16(0x0800),
            u16(0),
            u16(dt.time),
            u16(dt.date),
            u32(crc),
            u32(data.length),
            u32(data.length),
            u16(name.length),
            u16(0),
            u16(0),
            u16(0),
            u16(0),
            u32(0),
            u32(offset),
            name,
        ]);
        centrals.push(centralHeader);
        offset += localHeader.length + data.length;
    }

    const central = concatBytes(centrals);
    const end = concatBytes([
        u32(0x06054b50),
        u16(0),
        u16(0),
        u16(files.length),
        u16(files.length),
        u32(central.length),
        u32(offset),
        u16(0),
    ]);

    return concatBytes([...locals, central, end]);
}

function tableFile(name: string, value: unknown, preferredColumns: string[] = []): ExportFile {
    return {
        name,
        content: `${toCsv(normalizeRows(value), preferredColumns)}\n`,
    };
}

function extractAssetPositions(clearinghouseState: unknown): JsonRecord[] {
    const state = typeof clearinghouseState === 'object' && clearinghouseState !== null
        ? clearinghouseState as JsonRecord
        : {};
    return asArray(state.assetPositions).map((item) => {
        const position = typeof item.position === 'object' && item.position !== null ? item.position as JsonRecord : {};
        return {
            type: item.type ?? '',
            ...position,
        };
    });
}

function extractSpotBalances(spotState: unknown): JsonRecord[] {
    const state = typeof spotState === 'object' && spotState !== null ? spotState as JsonRecord : {};
    return asArray(state.balances);
}

export async function buildTaxExportZip(walletAddress: string): Promise<{ bytes: Uint8Array; filename: string }> {
    const normalizedWallet = walletAddress.toLowerCase();
    const exportedAt = new Date().toISOString();
    const date = exportedAt.slice(0, 10);
    const warnings: ExportWarning[] = [];

    const appData = await exportAccountData(normalizedWallet);

    const [
        clearinghouseState,
        xyzClearinghouseState,
        spotClearinghouseState,
        openOrders,
        xyzOpenOrders,
        fills,
        funding,
        ledgerUpdates,
    ] = await Promise.all([
        safeSource('hyperliquid_clearinghouse_state', warnings, { type: 'clearinghouseState', user: normalizedWallet }),
        safeSource('hyperliquid_xyz_clearinghouse_state', warnings, { type: 'clearinghouseState', user: normalizedWallet, dex: 'xyz' }),
        safeSource('hyperliquid_spot_clearinghouse_state', warnings, { type: 'spotClearinghouseState', user: normalizedWallet }),
        safeSource('hyperliquid_open_orders', warnings, { type: 'openOrders', user: normalizedWallet }),
        safeSource('hyperliquid_xyz_open_orders', warnings, { type: 'openOrders', user: normalizedWallet, dex: 'xyz' }),
        safeSource('hyperliquid_user_fills', warnings, { type: 'userFills', user: normalizedWallet }),
        safeSource('hyperliquid_user_funding', warnings, { type: 'userFunding', user: normalizedWallet, startTime: 0 }),
        safeSource('hyperliquid_ledger_updates', warnings, { type: 'userNonFundingLedgerUpdates', user: normalizedWallet, startTime: 0 }),
    ]);

    const manifest = {
        exported_at: exportedAt,
        wallet_address: normalizedWallet,
        network: IS_TESTNET ? 'hyperliquid-testnet' : 'hyperliquid-mainnet',
        purpose: 'Tax/accounting history export',
        note: 'This export is generated by Rayo for user records and wallet/exchange history. It is not tax advice.',
        warnings,
        files: [
            'README.txt',
            'manifest.json',
            'app_profile.csv',
            'app_trades.csv',
            'app_money_movements.csv',
            'app_dca_schedules.csv',
            'app_price_alerts.csv',
            'app_consents.csv',
            'hyperliquid_fills.csv',
            'hyperliquid_funding.csv',
            'hyperliquid_ledger_updates.csv',
            'hyperliquid_open_orders.csv',
            'hyperliquid_positions_snapshot.csv',
            'hyperliquid_spot_balances_snapshot.csv',
            'raw_app_data.json',
            'raw_hyperliquid.json',
        ],
    };

    const rawHyperliquid = {
        clearinghouseState,
        xyzClearinghouseState,
        spotClearinghouseState,
        openOrders,
        xyzOpenOrders,
        fills,
        funding,
        ledgerUpdates,
    };

    const combinedOpenOrders = [...asArray(openOrders), ...asArray(xyzOpenOrders).map((order) => ({ ...order, dex: 'xyz' }))];
    const combinedPositions = [
        ...extractAssetPositions(clearinghouseState).map((position) => ({ ...position, dex: 'core' })),
        ...extractAssetPositions(xyzClearinghouseState).map((position) => ({ ...position, dex: 'xyz' })),
    ];

    const files: ExportFile[] = [
        {
            name: 'README.txt',
            content: [
                'Rayo tax/accounting export',
                `Generated at: ${exportedAt}`,
                `Wallet: ${normalizedWallet}`,
                '',
                'Included:',
                '- App-side profile, trades, money movements, DCA schedules, alerts, and consent records.',
                '- Hyperliquid fills, funding, non-funding ledger updates, open orders, and current balance/position snapshots.',
                '',
                'Use the CSV files for spreadsheets/accounting tools. Keep the raw JSON files for audit detail.',
                'This file is informational only and is not tax, legal, or accounting advice.',
                warnings.length > 0 ? `Warnings: ${warnings.length} source(s) could not be fully fetched. See manifest.json.` : 'Warnings: none.',
                '',
            ].join('\n'),
        },
        { name: 'manifest.json', content: jsonFile(manifest) },
        tableFile('app_profile.csv', appData.profile ? [appData.profile] : [], ['id', 'wallet_address', 'username', 'display_name', 'created_at']),
        tableFile('app_trades.csv', appData.trades, ['opened_at', 'closed_at', 'symbol', 'side', 'size', 'entry_price', 'exit_price', 'pnl', 'fee', 'tid', 'status']),
        tableFile('app_money_movements.csv', appData.money_movements, ['created_at', 'updated_at', 'kind', 'status', 'asset', 'amount', 'from_account', 'to_account', 'tx_hash', 'idempotency_key']),
        tableFile('app_dca_schedules.csv', appData.dca_schedules),
        tableFile('app_price_alerts.csv', appData.price_alerts),
        tableFile('app_consents.csv', appData.consents, ['accepted_at', 'policy_version', 'locale', 'wallet_address']),
        tableFile('hyperliquid_fills.csv', fills, ['time', 'coin', 'side', 'dir', 'px', 'sz', 'closedPnl', 'fee', 'feeToken', 'tid', 'oid']),
        tableFile('hyperliquid_funding.csv', funding, ['time', 'coin', 'usdc', 'fundingRate']),
        tableFile('hyperliquid_ledger_updates.csv', ledgerUpdates, ['time', 'hash', 'delta', 'type']),
        tableFile('hyperliquid_open_orders.csv', combinedOpenOrders, ['timestamp', 'coin', 'side', 'sz', 'limitPx', 'oid', 'dex']),
        tableFile('hyperliquid_positions_snapshot.csv', combinedPositions, ['coin', 'szi', 'entryPx', 'positionValue', 'unrealizedPnl', 'returnOnEquity', 'leverage', 'liquidationPx', 'marginUsed', 'dex']),
        tableFile('hyperliquid_spot_balances_snapshot.csv', extractSpotBalances(spotClearinghouseState), ['coin', 'token', 'total', 'hold', 'entryNtl']),
        { name: 'raw_app_data.json', content: jsonFile(appData) },
        { name: 'raw_hyperliquid.json', content: jsonFile(rawHyperliquid) },
    ];

    return {
        bytes: zip(files),
        filename: `rayo-tax-export-${normalizedWallet.slice(2, 8)}-${date}.zip`,
    };
}
