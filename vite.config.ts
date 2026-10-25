import { defineConfig, type Plugin } from 'vite';

// Optional build-time variables. They are exposed to the client as
// `import.meta.env.APP_*` and control which parts of the app menu are
// rendered. Missing variables simply hide the corresponding section.
//
// The `APP_` prefix makes them available from `.env` files as well as from the
// process environment (e.g. GitHub Actions `vars` passed via `env:`).
const APP_ENV_VARS = {
    APP_OPERATOR_MAIL: 'menu contact link',
    APP_PRIVACY_POLICY_URL: 'menu privacy policy link',
} as const;

// Prints which variables are present during a build. Since the menu only
// renders what is configured, this makes a missing section visible in the
// build log (also in CI) instead of silently disappearing.
function reportAppConfig(): Plugin {
    return {
        name: 'report-app-config',
        apply: 'build',
        configResolved(config) {
            for (const [key, description] of Object.entries(APP_ENV_VARS)) {
                const value = config.env[key];
                console.log(
                    value
                        ? `[app-config] ${key} is set - ${description} will be rendered.`
                        : `[app-config] ${key} is not set - ${description} will be hidden.`,
                );
            }
        },
    };
}

export default defineConfig({
    plugins: [reportAppConfig()],
    envPrefix: ['VITE_', 'APP_'],
});
