import Writer from './Writer';

export default class App {
    /** @type string App version */
    static appVersion = import.meta.env.VITE_PACKAGE_VERSION;

    /** @type {Writer} The writer instance */
    #writer;

    /** @type {('cursor'|'global')} The current scope for applying color/pulse */
    #colorScope = 'cursor';

    /** @type {('foreground'|'background'|'border')} The current target for applying color/pulse */
    #colorTarget = 'background';

    /** @type {boolean} Whether character input automatically advances cursor */
    #autoAdvance = true;

    /**
     * @param {HTMLCanvasElement} canvas
     */
    constructor(canvas) {
        this.#writer = new Writer(canvas, window.innerWidth, window.innerHeight);

        window.addEventListener('keydown', this.#onKeyDown.bind(this));
    }

    start() {
        this.#writer.mainLoop();
    }

    /** @param {KeyboardEvent} event */
    #onKeyDown(event) {
        const writer = this.#writer;
        const key = event.key, ctrlKey = event.ctrlKey, shiftKey = event.shiftKey, altKey = event.altKey;

        let handled = true;

        if (ctrlKey && key >= '0' && key <= '9') {
            const color = Writer.debugColors[(Number(key) + 9) % Writer.debugColors.length];
            writer.setColor(this.#colorScope, this.#colorTarget, color);
        } else if (key === 'ArrowUp') {
            writer.cursorUp();
        } else if (key === 'ArrowDown') {
            writer.cursorDown();
        } else if (key === 'ArrowLeft') {
            writer.cursorLeft();
        } else if (key === 'ArrowRight') {
            writer.cursorRight();
        } else if (key === 'F2') {
            if (!shiftKey) {
                this.#colorTarget = 'foreground';
            } else {
                writer.setColor(this.#colorScope, 'foreground', null);
            }
        } else if (key === 'F3') {
            if (!shiftKey) {
                this.#colorTarget = 'background';
            } else {
                writer.setColor(this.#colorScope, 'background', null);
            }
        } else if (key === 'F4') {
            if (!shiftKey) {
                this.#colorTarget = 'border';
            } else {
                writer.setColor(this.#colorScope, 'border', null);
            }
        } else if (key === 'F6') {
            writer.setPulse(this.#colorScope, this.#colorTarget, !shiftKey);
        } else if (key === 'F7') {
            this.#colorScope = shiftKey ? 'global' : 'cursor';
        } else if (key === 'F9') {
            this.#autoAdvance = !shiftKey;
        } else if (key === 'F10') {
            writer.play();
        } else if (key === 'Delete') {
            writer.clearCell();
        } else if (key === 'Backspace') {
            if (writer.retract()) {
                writer.clearCell();
            }
        } else if (key === 'PageDown') {
            writer.scroll();
        } else if (key.length === 1) {
            writer.character(key);
            if (this.#autoAdvance) {
                writer.advance();
            }
        } else {
            handled = false;
            console.log(`Key:'${key}' Shift:${shiftKey ? 'yes' : 'no'} Ctrl:${ctrlKey ? 'yes' : 'no'} Alt:${altKey ? 'yes' : 'no'}`);
        }

        // Omit browser default behavior in case we handled the key
        if (handled) {
            event.preventDefault();
        }
    }

    printHelp() {
        const help = [
            'Help:',
            'F2           Select foreground   (SHIFT clears)',
            'F3           Select background   (SHIFT clears)',
            'F4           Select border       (SHIFT clears)',
            'F6           Enable pulsating    (SHIFT disables)',
            'F7           Select scope cursor (SHIFT select global)',
            'F9           Enable auto advance (SHIFT disabled)',
            'F10          Playback',
            'CTRL + 0-9   Select color from palette',
            'Cursor       Move around',
            'Delete       Clear cell under cursor',
            'Backspace    Retract cursor and clear cell under cursor',
            'PageDown     Scroll without moving cursor',
            // TODO: Toggle FPS/Debug
        ];

        help.forEach((line) => console.info(line));
    }
}
