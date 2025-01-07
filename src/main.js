import './style.css'
import { Writer } from './writer.js'

const canvas = document.querySelector('#writerCanvas');

const writer = new Writer(
    canvas, window.innerWidth, window.innerHeight,
);
writer.mainLoop();

/** @type {('foreground'|'background'|'border')} The current target for color selection */
let colorTarget = 'background';

window.addEventListener('keydown', (event) => {
    let handled = true;

    switch (true) {
        case event.ctrlKey && event.key >= '0' && event.key <= '9':
            const color = Writer.debugColors[(Number(event.key) + 9) % Writer.debugColors.length];
            writer.setCursorColor(colorTarget, color);
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
                writer.setCursorColor('foreground', null);
            }
            break;
        case event.key === 'F3':
            if (!event.shiftKey) {
                colorTarget = 'background';
            } else {
                writer.setCursorColor('background', null);
            }
            break;
        case event.key === 'F4':
            if (!event.shiftKey) {
                colorTarget = 'border';
            } else {
                writer.setCursorColor('border', null);
            }
            break;
        case event.key === 'F6':
            const enable = !event.shiftKey;
            writer.setCursorPulse(colorTarget, enable);
            break;
        case event.key === 'Delete':
            writer.clearCell();
            break;
        case event.key === 'Backspace':
            if (writer.retract()) {
                writer.clearCell();
            }
            break;
        case event.key.length == 1:
            writer.character(event.key);
            writer.advance();
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
        'CTRL + 0-9   Select color from palette',
        'Cursor       Move around',
        'Delete       Clear cell under cursor',
        'Backspace    Retract cursor and clear cell under cursor',
    ];

    help.forEach((line) => console.info(line));
})();
