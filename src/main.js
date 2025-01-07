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
            event.preventDefault();
            const color = Writer.debugColors[(Number(event.key) + 9) % Writer.debugColors.length];
            if (colorTarget === 'foreground') {
                writer.cursor.cell.foregroundColor = color;
            } else if (colorTarget === 'background') {
                writer.cursor.cell.backgroundColor = color;
            } else if (colorTarget === 'border') {
                writer.cursor.cell.borderColor = color;
            } else {
                console.error(`Unhandled color target '${colorTarget}'`);
            }
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
                writer.cursor.cell.foregroundColor = null;
            }
            break;
        case event.key === 'F3':
            if (!event.shiftKey) {
                colorTarget = 'background';
            } else {
                writer.cursor.cell.backgroundColor = null;
            }
            break;
        case event.key === 'F4':
            if (!event.shiftKey) {
                colorTarget = 'border';
            } else {
                writer.cursor.cell.borderColor = null;
            }
            break;
        case event.key === 'F6':
            const enable = !event.shiftKey;
            if (colorTarget === 'foreground') {
                writer.cursor.cell.foregroundPulse = enable;
            } else if (colorTarget === 'background') {
                writer.cursor.cell.backgroundPulse = enable;
            } else if (colorTarget === 'border') {
                writer.cursor.cell.borderPulse = enable;
            } else {
                console.error(`Unhandled color target '${colorTarget}'`);
            }
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
