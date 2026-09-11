// ============================================
// Kaarigar — Which artisan owns the local data
//
// Every product row is keyed by artisan id, and the create flow writes rows
// before Firebase auth exists. If the writer and the reader disagree about
// that id by even one character, saving appears to work and the catalog stays
// empty, which is exactly the bug this file exists to prevent.
// ============================================

/**
 * Used before sign-in, so work done during onboarding is not lost.
 *
 * When Firebase auth lands, rows saved under this id need migrating to the
 * real artisan id rather than being abandoned.
 */
export const LOCAL_ARTISAN_ID = 'local';

/** The id to read and write local product rows with. */
export function currentArtisanId(profileId?: string | null): string {
  return profileId && profileId.length > 0 ? profileId : LOCAL_ARTISAN_ID;
}
