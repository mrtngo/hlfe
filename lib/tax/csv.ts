type JsonRecord = Record<string, unknown>;

function flatten(value: unknown): unknown {
    if (value == null) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
    return JSON.stringify(value);
}

function csvEscape(value: unknown): string {
    const text = String(flatten(value));
    if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
}

export function toCsv(rows: JsonRecord[], preferredColumns: string[] = []): string {
    const columns = [
        ...preferredColumns,
        ...Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).filter((key) => !preferredColumns.includes(key)).sort(),
    ];

    if (columns.length === 0) return '';

    return [
        columns.map(csvEscape).join(','),
        ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(',')),
    ].join('\n');
}
