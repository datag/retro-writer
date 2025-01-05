export class Writer {
    constructor(canvas, width, height) {
        /** @type {HTMLCanvasElement} */
        this.canvas = canvas;

        this.canvas.width = width;
        this.canvas.height = height;

        /** @type {CanvasRenderingContext2D} */
        this.ctx = canvas.getContext('2d');

        this.init();
    }

    init() {
        /** @type {number} */
        this.lastRun = performance.now();

        /** @type {*} */
        this.debug = null;
    }

    mainLoop(timestamp) {
        const delta = (timestamp - this.lastRun) / 1000;
        const fps = 1 / delta;

        this.#handleInput();
        this.#update(timestamp);
        this.#render(fps);

        this.lastRun = timestamp;
        requestAnimationFrame(this.mainLoop.bind(this));
    }

    #handleInput() {
    }

    #update(timestamp) {
    }

    #render(fps) {
        const c = this.ctx;

        c.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.#renderInfo(fps);
        this.#renderDebug();
    }

    #renderInfo(fps) {
        const c = this.ctx;
        let infoParts = [Math.floor(fps) + ' fps'];

        c.fillStyle = 'Gray';
        c.font = '0.75rem monospace';
        c.fillText(infoParts.join(' · '), 2, 12);
    }

    #renderDebug() {
        const c = this.ctx;

        if (!this.debug) {
            return;
        }

        c.fillStyle = 'Red';
        c.fillText(JSON.stringify(this.debug), 2, 30);
    }
}
