/// <reference types="vite/client" />

declare module '*.css' {
    const content: string;
    export default content;
}

interface ImportMetaEnv {
    readonly VITE_PACKAGE_VERSION: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
