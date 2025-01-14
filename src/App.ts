import Writer from './Writer';

export default class App {
    /** App version */
    static appVersion: string = import.meta.env.VITE_PACKAGE_VERSION;

    /** The writer instance */
    #writer: Writer;

    /** The current scope for applying color/pulse */
    #colorScope: ('cursor' | 'global') = 'cursor';

    /** The current target for applying color/pulse */
    #colorTarget: ('foreground' | 'background' | 'border') = 'background';

    /** Whether character input automatically advances cursor */
    #autoAdvance: boolean = true;


    constructor(canvas: HTMLCanvasElement) {
        this.#writer = new Writer(canvas, window.innerWidth, window.innerHeight);

        window.addEventListener('keydown', (event) => this.#onKeyDown(event));

        window.addEventListener('dragover', (event) => event.preventDefault());
        window.addEventListener('drop', (event) => this.#onDrop(event));
    }

    start() {
        this.#writer.mainLoop(performance.now());

        this.#handleHashUrl();
    }

    #onKeyDown(event: KeyboardEvent) {
        const writer = this.#writer;
        const appState = writer.appState;
        const key = event.key, ctrlKey = event.ctrlKey, shiftKey = event.shiftKey, altKey = event.altKey;

        // Omit browser default behavior for all keys
        event.preventDefault();

        let handled = true;

        if (key === 'PrintScreen' || (ctrlKey && key === 'p')) {
            this.downloadScreenshot();
            handled = true;
        } else if (key === 'F5' && shiftKey) {
            writer.reset();
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

        if (!handled && !['Control', 'Shift', 'Alt', 'AltGraph'].includes(key)) {
            console.warn(`Unhandled key '${key}' (`
                + `Shift:${shiftKey ? 'yes' : 'no'} `
                + `Ctrl:${ctrlKey ? 'yes' : 'no'} `
                + `Alt:${altKey ? 'yes' : 'no'}) `
                + `in app state '${appState}'.`
            );
        }
    }

    /**
     * @returns false if key has not been handled
     */
    #handleAppStateRecordKey(event: KeyboardEvent): boolean {
        const writer = this.#writer;
        const key = event.key, ctrlKey = event.ctrlKey, shiftKey = event.shiftKey;

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
            writer.play();
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
        } else if (ctrlKey && key === 'o') {
            this.openDemo();
        } else if (ctrlKey && key === 's') {
            this.downloadDemo();
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
     * @returns false if key has not been handled
     */
    #handleAppStatePlayKey(event: KeyboardEvent): boolean {
        const writer = this.#writer;
        const key = event.key;

        if (key === 'Pause' || key === ' ') {
            writer.appState = 'pause';
        } else {
            return false;
        }

        return true;
    }

    /**
     * @returns false if key has not been handled
     */
    #handleAppStatePauseKey(event: KeyboardEvent): boolean {
        const writer = this.#writer;
        const key = event.key;

        if (key === 'Pause' || key === ' ') {
            writer.appState = 'play';
        } else {
            return false;
        }

        return true;
    }

    /**
     * @param {DragEvent} event
     */
    #onDrop(event: DragEvent) {
        event.preventDefault();

        const files = event.dataTransfer?.files ?? [];

        if (files.length == 0) {
            console.warn('No file has been dropped');
            return;
        } else if (files.length > 1) {
            console.error('Dropping multiple files at once is unsupported');
            return;
        }

        this.#loadDemoFromFileObject(files[0]);
    }

    printHelp() {
        const help = [
            `RetroWriter ${App.appVersion} -- Help:`,
            'F2                  Select foreground   (SHIFT clears)',
            'F3                  Select background   (SHIFT clears)',
            'F4                  Select border       (SHIFT clears)',
            'F6                  Enable pulsating    (SHIFT disables)',
            'F7                  Select scope cursor (SHIFT select global)',
            'F9                  Enable auto advance (SHIFT disabled)',
            'F10                 Playback',
            'CTRL + 0-9          Select color from palette',
            'Cursor              Move around',
            '<character>         Writes character (and advances, if auto advance is enable)',
            'Delete              Clear cell under cursor',
            'Backspace           Retract cursor and clear cell under cursor',
            'PageDown            Scroll without moving cursor',
            'Pause/Space         Pause/Continue',
            'CTRL + p / Print    Download screenshot',
            'CTRL + s            Download demo',
            'CTRL + o            Open demo (also via Drag & Drop)',
            'SHIFT + F5          Reset',
            // TODO: Toggle FPS/Debug
            '#play:<url>         Hash URL: Plays demo load external URL (CORS headers need to be set)',
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

    openDemo() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json, application/json';

        /** @param {Event} event */
        const handleChange = (event: Event) => {
            if (!(event.target instanceof HTMLInputElement)) {
                throw new Error('Expected HTMLInputElement');
            }
            const target: HTMLInputElement = event.target;
            const files = target?.files ?? [];

            if (files.length == 0) {
                console.warn('No file has been opened');
            } else if (files.length > 1) {
                console.error('Opening multiple files at once is unsupported');
            } else {
                this.#loadDemoFromFileObject(files[0]);
            }

            input.removeEventListener('change', handleChange);
        };

        input.addEventListener('change', handleChange);

        input.click();
    }

    #loadDemoFromFileObject(file: File) {
        try {
            if (file.type !== 'application/json') {
                throw new Error(`Expected file of type 'application/json', got '${file.type}'`);
            }

            file.text()
                .then((content) => {
                    const data = JSON.parse(content);

                    this.#writer.importDemo(data);
                    this.#writer.play();
                });
        } catch (e) {
            console.error(`Error loading demo from file '${file.name}'`, e);
        }
    }

    /**
     * Handle hash URLs.
     * NOTE: GitHub Pages does not support rewrites so can only use a hash URL instead of a path.
     */
    #handleHashUrl(hash: string = document.location.hash) {
        const matches = hash.match(/^#(?<action>play):(?<argument>.*)/);

        if (matches !== null) {
            const action = matches.groups?.action ?? null;
            const argument = matches.groups?.argument ?? null;

            console.log(`Hash URL: Action ${action} with argument ${argument}`);

            try {
                if (action === 'play') {
                    if (argument === null) {
                        throw new Error(`Argument expected`);
                    }
                    fetch(argument)
                        .then((response) => response.json())
                        .then((data) => {
                            this.#writer.importDemo(data);
                            this.#writer.play();
                        })
                        .catch((e) => {
                            console.error(`Error loading demo from URL '${argument}'`, e);
                        });
                } else {
                    throw new Error(`Unhandled hash URL action '${action}'`);
                }
            } catch (e) {
                console.error('Error handling hash URL', e);
            }
        }
    }
}
