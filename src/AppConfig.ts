/**
 * Build-time configuration of the app.
 *
 * Everything here is controlled by environment variables that are baked into the
 * bundle at build time. They are public by design (a mail address and a URL),
 * so no secrets must be stored in them.
 *
 *   APP_OPERATOR_MAIL      contact address of the operator (mailto link)
 *   APP_PRIVACY_POLICY_URL base URL of the privacy policy
 *
 * Both variables are optional. Parts of the UI that depend on them are hidden
 * when they are not set, which is also how the app behaves in forks or local
 * checkouts without a `.env` file.
 */

/** The app is only targeted at English speaking persons. */
export const PRIVACY_POLICY_LANG = 'en';

function readEnv(value: string | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
}

export const appConfig = {
    /** Contact address of the operator, or `null` if not configured. */
    operatorMail: readEnv(import.meta.env.APP_OPERATOR_MAIL),
    /** Base URL of the privacy policy, or `null` if not configured. */
    privacyPolicyUrl: readEnv(import.meta.env.APP_PRIVACY_POLICY_URL),
} as const;

/**
 * Builds the URL of the English section of the privacy policy.
 * Any anchor already present in the configured URL is replaced.
 */
export function privacyPolicyUrl(): string | null {
    if (!appConfig.privacyPolicyUrl) {
        return null;
    }

    return `${appConfig.privacyPolicyUrl.split('#')[0]}#${PRIVACY_POLICY_LANG}`;
}
