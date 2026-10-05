// Preset profile pictures. Stored in users.avatar_url as "preset:<id>" so the
// existing column works for both presets and (allow-listed) image URLs.

export interface AvatarPreset {
    id: string;
    emoji: string;
    /** Background tint behind the emoji. */
    bg: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
    { id: 'sun', emoji: '☀️', bg: '#3A2E12' },
    { id: 'rocket', emoji: '🚀', bg: '#1E2A3F' },
    { id: 'bull', emoji: '🐂', bg: '#14301F' },
    { id: 'bear', emoji: '🐻', bg: '#3A1F1A' },
    { id: 'whale', emoji: '🐳', bg: '#13283A' },
    { id: 'fox', emoji: '🦊', bg: '#3A2614' },
    { id: 'owl', emoji: '🦉', bg: '#2A2436' },
    { id: 'gem', emoji: '💎', bg: '#142E36' },
    { id: 'fire', emoji: '🔥', bg: '#3A1A14' },
    { id: 'coffee', emoji: '☕', bg: '#2E2218' },
    { id: 'cactus', emoji: '🌵', bg: '#1A2E1A' },
    { id: 'llama', emoji: '🦙', bg: '#33291E' },
];

const PREFIX = 'preset:';

export function presetAvatarUrl(id: string): string {
    return `${PREFIX}${id}`;
}

export function getAvatarPreset(avatarUrl: string | null | undefined): AvatarPreset | null {
    if (!avatarUrl?.startsWith(PREFIX)) return null;
    const id = avatarUrl.slice(PREFIX.length);
    return AVATAR_PRESETS.find((p) => p.id === id) ?? null;
}

/** Server-side check: a known preset id. */
export function isPresetAvatarUrl(value: unknown): value is string {
    return typeof value === 'string' && getAvatarPreset(value) !== null;
}
