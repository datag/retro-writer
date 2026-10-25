/// <reference types="vite/client" />

declare module '*.css' {
    const content: string;
    export default content;
}

interface ImportMetaEnv {
    readonly VITE_PACKAGE_VERSION: string;

    /** Contact address of the site operator, rendered as a mailto link in the menu. */
    readonly APP_OPERATOR_MAIL?: string;

    /** Base URL of the privacy policy. The menu appends `#en`. */
    readonly APP_PRIVACY_POLICY_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
