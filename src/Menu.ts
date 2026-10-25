const SEEN_KEY = 'retrowriter.menu.seen';
const AUTO_DISMISS_MS = 5000;

const SHORTCUTS: [string, string][] = [
    ['F1', 'Show shortcuts / help'],
    ['F2', 'Select foreground (SHIFT clears)'],
    ['F3', 'Select background (SHIFT clears)'],
    ['F4', 'Select border (SHIFT clears)'],
    ['F6', 'Enable pulsating (SHIFT disables)'],
    ['F7', 'Select scope cursor (SHIFT global)'],
    ['F9', 'Enable auto advance (SHIFT disables)'],
    ['F10', 'Playback'],
    ['F12', 'Toggle debug info'],
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

export default class Menu {
    #overlay: HTMLDivElement;

    constructor() {
        this.#overlay = document.createElement('div');
        this.#overlay.className = 'menu-overlay';
        document.body.appendChild(this.#overlay);
    }

    static get hasBeenSeen(): boolean {
        return localStorage.getItem(SEEN_KEY) !== null;
    }

    static markSeen() {
        localStorage.setItem(SEEN_KEY, '1');
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
            this.#overlay.style.display = 'none';
            this.#overlay.innerHTML = '';
            onClose();
        };

        const timer = autoDismiss ? setTimeout(dismiss, AUTO_DISMISS_MS) : -1;
        const keyHandler = () => dismiss();

        window.addEventListener('keydown', keyHandler);
        this.#overlay.addEventListener('click', dismiss, { once: true });
    }

    #render(autoDismiss: boolean) {
        const version = import.meta.env.VITE_PACKAGE_VERSION as string;

        const shortcutRows = SHORTCUTS.map(
            ([key, desc]) => `<tr><td class="menu-key">${key}</td><td class="menu-desc">${desc}</td></tr>`,
        ).join('');

        const progressBar = autoDismiss ? `<div class="menu-progress"><div class="menu-progress-bar"></div></div>` : '';

        const hint = autoDismiss ? 'Press any key or click to continue' : 'Press any key or click to close';

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
                    <div class="menu-hint">${hint}</div>
                </div>
            </div>
        `;
    }
}
