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
        this.#writer.mainLoop(performance.now());
    }

    /** @param {KeyboardEvent} event */
    #onKeyDown(event) {
        const appState = this.#writer.appState;

        // Omit browser default behavior for all keys
        event.preventDefault();

        let handled = true;

        if (event.key === 'PrintScreen') {
            this.downloadScreenshot();
            handled = true;
        } else if (appState === 'record') {
            handled = this.#handleAppStateRecordKey(event);
        } else if (appState === 'play') {
            handled = this.#handleAppStatePlayKey(event);
        } else if (appState === 'pause') {
            handled = this.#handleAppStatePauseKey(event);
        } else {
            console.error(`Invalid app state '${appState}'`);
            return;
        }

        if (!handled) {
            console.warn(`Unhandled key '${event.key}' (`
                + `Shift:${event.shiftKey ? 'yes' : 'no'} `
                + `Ctrl:${event.ctrlKey ? 'yes' : 'no'} `
                + `Alt:${event.altKey ? 'yes' : 'no'}) `
                + `in app state '${appState}'.`
            );
        }
    }

    /**
     * @returns {boolean} false if key has not been handled
     */
    #handleAppStateRecordKey(event) {
        const writer = this.#writer;
        const key = event.key, ctrlKey = event.ctrlKey, shiftKey = event.shiftKey, altKey = event.altKey;

        if (ctrlKey && key >= '0' && key <= '9') {
            const color = Writer.colorPalette[(Number(key) + 9) % Writer.colorPalette.length];
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
            if (!shiftKey) {
                writer.play();
            } else {
                this.downloadDemo();
            }
        } else if (key === 'Delete') {
            writer.clearCell();
        } else if (key === 'Backspace') {
            if (writer.retract()) {
                writer.clearCell();
            }
        } else if (key === 'PageDown') {
            writer.scroll();
        } else if (key === 'Pause') {
            writer.appState = 'pause';
        } else if (key === 'F5') {
            writer.reset();
        } else if (key.length === 1) {
            writer.character(key);
            if (this.#autoAdvance) {
                writer.advance();
            }
        } else {
            return false;
        }

        return true;
    }

    /**
     * @returns {boolean} false if key has not been handled
     */
    #handleAppStatePlayKey(event) {
        const writer = this.#writer;
        const key = event.key, ctrlKey = event.ctrlKey, shiftKey = event.shiftKey, altKey = event.altKey;

        if (key === 'Pause' || key === ' ') {
            writer.appState = 'pause';
        } else {
            return false;
        }

        return true;
    }

    /**
     * @returns {boolean} false if key has not been handled
     */
    #handleAppStatePauseKey(event) {
        const writer = this.#writer;
        const key = event.key, ctrlKey = event.ctrlKey, shiftKey = event.shiftKey, altKey = event.altKey;

        if (key === 'Pause' || key === ' ') {
            writer.appState = 'play';
        } else {
            return false;
        }

        return true;
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
            'Pause/Space  (Playback mode) Pause/Continue',
            '(CTRL)+Print Download screenshot',
            'SHIFT + F10  Download demo',
            'F5           Reset',
            // TODO: Toggle FPS/Debug
        ];

        help.forEach((line) => console.info(line));
    }

    downloadScreenshot() {
        const anchor = document.createElement('a');
        anchor.download = `retrowriter-${App.appVersion}-${Date.now()}.png`;
        anchor.href = this.#writer.exportCanvas();
        anchor.click();
    }

    downloadDemo() {
        const json = JSON.stringify(this.#writer.exportDemo(), null, 2);

        const blob = new Blob([json], { type: 'application/json' });

        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `retrowriter-${App.appVersion}-${Date.now()}.json`;

        a.click();

        URL.revokeObjectURL(url);
    }
}
