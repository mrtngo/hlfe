'use client';

import { getAvatarPreset } from '@/lib/avatars';
import { Icon, V2 } from '@/components/V2Kit';

/**
 * A user's picture: a preset (emoji on a tint), an allow-listed image URL, or
 * the first letter of their name on brand gold. No name at all (guest) → a
 * person icon.
 */
export default function UserAvatar({
    avatarUrl,
    name,
    size = 40,
    ring = false,
}: {
    avatarUrl?: string | null;
    name?: string | null;
    size?: number;
    /** Gold ring, e.g. for the selected preset. */
    ring?: boolean;
}) {
    const preset = getAvatarPreset(avatarUrl);
    const base: React.CSSProperties = {
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        boxShadow: ring ? `0 0 0 2px ${V2.bg}, 0 0 0 4px ${V2.accent}` : undefined,
    };

    if (preset) {
        return (
            <div style={{ ...base, background: preset.bg, fontSize: Math.round(size * 0.52), lineHeight: 1 }} aria-hidden>
                {preset.emoji}
            </div>
        );
    }
    if (avatarUrl && /^https:\/\//.test(avatarUrl)) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" width={size} height={size} style={{ ...base, objectFit: 'cover' }} />
        );
    }
    const initial = name?.trim().charAt(0).toUpperCase();
    return (
        <div style={{ ...base, background: V2.accent, color: V2.accentInk, fontWeight: 800, fontSize: Math.round(size * 0.45) }}>
            {initial || <Icon name="user" size={Math.round(size * 0.5)} color={V2.accentInk} />}
        </div>
    );
}
