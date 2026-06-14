/**
 * Data-protection consent (Colombia Ley 1581 / Decreto 1377).
 *
 * Single source of truth for the privacy-policy version the app currently
 * presents. Bump CURRENT_PRIVACY_POLICY_VERSION whenever the política de
 * tratamiento de datos changes materially — users whose recorded version is
 * older than this are re-prompted for authorization by the consent gate.
 */

// Keep in sync with docs/compliance/02-politica-tratamiento-datos.md (§11).
export const CURRENT_PRIVACY_POLICY_VERSION = '1.0';

// Public URLs the consent UI links to. Replace with the live, lawyer-approved
// pages before launch.
export const PRIVACY_POLICY_URL = '/legal/privacidad';
export const TERMS_URL = '/legal/terminos';

/**
 * True if a user with this recorded policy version still needs to (re-)consent.
 * `null`/`undefined` = never consented (new or pre-existing user).
 */
export function needsConsent(recordedVersion: string | null | undefined): boolean {
    return recordedVersion !== CURRENT_PRIVACY_POLICY_VERSION;
}
