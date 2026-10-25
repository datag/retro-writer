import { appConfig, privacyPolicyUrl } from './AppConfig';

const SEEN_KEY = 'retrowriter.menu.seen';
const AUTO_DISMISS_MS = 5000;

/** Values of the seen flag that mark the menu as seen */
const SEEN_VALUES = ['1', 'true', 'yes', 'on'];

const SHORTCUTS: [string, string][] = [
    ['F1', 'Show shortcuts / help'],
    ['F2', 'Select foreground (SHIFT clears)'],
    ['F3', 'Select background (SHIFT clears)'],
    ['F4', 'Select border (SHIFT clears)'],
    ['F6', 'Enable pulsating (SHIFT disables)'],
    ['F7', 'Select scope cursor (SHIFT global)'],
    ['F9', 'Enable auto advance (SHIFT disables)'],
    ['F10', 'Playback'],
    ['CTRL + SHIFT + F', 'Toggle debug info'],
    ['CTRL + 0-9', 'Select color from palette'],
    ['Cursor', 'Move around'],
    ['SHIFT + Cursor', '(Re)Paint current cell and move'],
    ['<character>', 'Write character'],
    ['Delete', 'Clear cell under cursor'],
    ['Backspace', 'Retract cursor and clear cell'],
    ['PageDown', 'Scroll without moving cursor'],
    ['Pause / Space', 'Pause / Continue'],
    ['End', '(Playback) Skip to end'],
    ['CTRL + P / Print', 'Download screenshot'],
    ['CTRL + S', 'Download demo'],
    ['CTRL + O', 'Open demo (or drag & drop)'],
    ['CTRL + G', 'AI generate demo'],
    ['SHIFT + F5', 'Reset'],
    ['#play:<url>', 'Hash URL: Play demo from URL'],
    ['#play-gist:<id>', 'Hash URL: Play demo from GitHub Gist'],
];

/**
 * Escapes a value so that it can be used in HTML markup.
 */
function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** When the menu is shown */
export interface MenuVisibility {
    /** Whether the menu is shown when the app starts */
    atStart: boolean;

    /** Whether the menu is shown when an autoloaded demo has finished playing */
    afterDemo: boolean;
}

export default class Menu {
    #overlay: HTMLDivElement;

    constructor() {
        this.#overlay = document.createElement('div');
        this.#overlay.className = 'menu-overlay';
        document.body.appendChild(this.#overlay);
    }

    /**
     * @returns true if the menu has already been seen
     */
    static get hasBeenSeen(): boolean {
        const value = localStorage.getItem(SEEN_KEY)?.trim().toLowerCase() ?? '';

        return SEEN_VALUES.includes(value);
    }

    static markSeen() {
        localStorage.setItem(SEEN_KEY, '1');
    }

    /**
     * Determines when the menu is shown.
     *
     * In development the menu greets the user until it has been seen once.
     * In production the menu is always shown, but a demo that is autoloaded
     * should play first - so the menu is shown once that demo has finished.
     *
     * @param demoAutoloaded true if a demo is loaded and played automatically
     */
    static visibility(demoAutoloaded: boolean): MenuVisibility {
        if (import.meta.env.DEV) {
            return {
                atStart: !Menu.hasBeenSeen,
                afterDemo: false,
            };
        }

        return {
            atStart: !demoAutoloaded,
            afterDemo: demoAutoloaded,
        };
    }

    get isOpen(): boolean {
        return this.#overlay.style.display === 'flex';
    }

    open(onClose: () => void, autoDismiss = true) {
        this.#render(autoDismiss);
        this.#overlay.style.display = 'flex';

        let dismissed = false;

        const dismiss = () => {
            if (dismissed) return;
            dismissed = true;
            clearTimeout(timer);
            window.removeEventListener('keydown', keyHandler);
            this.#overlay.removeEventListener('click', clickHandler);
            this.#overlay.style.display = 'none';
            this.#overlay.innerHTML = '';
            onClose();
        };

        const timer = autoDismiss ? setTimeout(dismiss, AUTO_DISMISS_MS) : -1;
        const keyHandler = () => dismiss();

        // Clicks on links (contact mail, privacy policy) must not dismiss the menu
        const clickHandler = (event: MouseEvent) => {
            if (event.target instanceof HTMLElement && event.target.closest('a') !== null) {
                return;
            }

            dismiss();
        };

        window.addEventListener('keydown', keyHandler);
        this.#overlay.addEventListener('click', clickHandler);
    }

    /**
     * Renders the contact information (operator mail, privacy policy).
     * @returns empty string if neither is configured
     */
    #renderContact(): string {
        const mail = appConfig.operatorMail;
        const policyUrl = privacyPolicyUrl();

        if (mail === null && policyUrl === null) {
            return '';
        }

        const links: string[] = [];

        if (mail !== null) {
            const address = escapeHtml(mail);
            links.push(`<a class="menu-link" href="mailto:${address}">${address}</a>`);
        }

        if (policyUrl !== null) {
            links.push(
                `<a class="menu-link" href="${escapeHtml(policyUrl)}" target="_blank" rel="noopener noreferrer">Privacy Policy</a>`,
            );
        }

        return `<div class="menu-contact">${links.join('<span class="menu-separator">&middot;</span>')}</div>`;
    }

    #render(autoDismiss: boolean) {
        const version = import.meta.env.VITE_PACKAGE_VERSION as string;

        const shortcutRows = SHORTCUTS.map(
            ([key, desc]) => `<tr><td class="menu-key">${key}</td><td class="menu-desc">${desc}</td></tr>`,
        ).join('');

        const progressBar = autoDismiss ? `<div class="menu-progress"><div class="menu-progress-bar"></div></div>` : '';

        const hint = autoDismiss ? 'Press any key or click to continue' : 'Press any key or click to close';

        const contact = this.#renderContact();

        this.#overlay.innerHTML = `
            <div class="menu-dialog">
                <div class="menu-header">
                    <span class="menu-title">RetroWriter</span>
                    <span class="menu-version">v${version}</span>
                </div>
                <table class="menu-shortcuts">
                    <tbody>${shortcutRows}</tbody>
                </table>
                <div class="menu-footer">
                    ${progressBar}
                    ${contact}
                    <div class="menu-hint">${hint}</div>
                </div>
            </div>
        `;
    }
}
