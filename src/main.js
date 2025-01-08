import './style.css'
import { Writer } from './writer.js'

const canvas = document.querySelector('#writerCanvas');

const writer = new Writer(
    canvas, window.innerWidth, window.innerHeight,
);
writer.mainLoop();

/** @type {('cursor'|'global')} The current scope for applying color/pulse */
let colorScope = 'cursor';

/** @type {('foreground'|'background'|'border')} The current target for applying color/pulse */
let colorTarget = 'background';

/** @type {boolean} Whether character input automatically advances cursor */
let autoAdvance = true;

window.addEventListener('keydown', (event) => {
    let handled = true;

    switch (true) {
        case event.ctrlKey && event.key >= '0' && event.key <= '9':
            const color = Writer.debugColors[(Number(event.key) + 9) % Writer.debugColors.length];
            writer.setColor(colorScope, colorTarget, color);
            break;
        case event.key === 'ArrowUp':
            writer.cursorUp();
            break;
        case event.key === 'ArrowDown':
            writer.cursorDown();
            break;
        case event.key === 'ArrowLeft':
            writer.cursorLeft();
            break;
        case event.key === 'ArrowRight':
            writer.cursorRight();
            break;
        case event.key === 'F2':
            if (!event.shiftKey) {
                colorTarget = 'foreground';
            } else {
                writer.setColor(colorScope, 'foreground', null);
            }
            break;
        case event.key === 'F3':
            if (!event.shiftKey) {
                colorTarget = 'background';
            } else {
                writer.setColor(colorScope, 'background', null);
            }
            break;
        case event.key === 'F4':
            if (!event.shiftKey) {
                colorTarget = 'border';
            } else {
                writer.setColor(colorScope, 'border', null);
            }
            break;
        case event.key === 'F6':
            const enable = !event.shiftKey;
            writer.setPulse(colorScope, colorTarget, enable);
            break;
        case event.key === 'F7':
            colorScope = event.shiftKey ? 'global' : 'cursor';
            break
        case event.key === 'F9':
            autoAdvance = !event.shiftKey;
            break;
        case event.key === 'F10':
            writer.play();
            break;
        case event.key === 'Delete':
            writer.clearCell();
            break;
        case event.key === 'Backspace':
            if (writer.retract()) {
                writer.clearCell();
            }
            break;
        case event.key === 'PageDown':
            writer.scroll();
            break;
        case event.key.length == 1:
            writer.character(event.key);
            if (autoAdvance) {
                writer.advance();
            }
            break;
        default:
            handled = false;
            console.log(`Key:'${event.key}' Shift:${event.shiftKey ? 'yes' : 'no'} Ctrl:${event.ctrlKey ? 'yes' : 'no'} Alt:${event.altKey ? 'yes' : 'no'}`);
            break;
    }

    // Omit browser default behavior in case we handled the key
    if (handled) {
        event.preventDefault();
    }
});

(function () {
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
    ];

    help.forEach((line) => console.info(line));
})();
