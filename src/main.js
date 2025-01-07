import './style.css'
import { Writer } from './writer.js'

const canvas = document.querySelector('#writerCanvas');

const writer = new Writer(
    canvas, window.innerWidth, window.innerHeight,
);
writer.mainLoop();


/** @type {('foreground'|'background'|'border')} The correct target for color selection */
let colorTarget = 'background';

window.addEventListener('keydown', (event) => {
    switch (true) {
        case event.key >= '0' && event.key <= '9':
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
            event.preventDefault();
            if (!event.shiftKey) {
                colorTarget = 'foreground';
            } else {
                writer.cursor.cell.foregroundColor = null;
            }
            break;
        case event.key === 'F3':
            event.preventDefault();
            if (!event.shiftKey) {
                colorTarget = 'background';
            } else {
                writer.cursor.cell.backgroundColor = null;
            }
            break;
        case event.key === 'F4':
            event.preventDefault();
            if (!event.shiftKey) {
                colorTarget = 'border';
            } else {
                writer.cursor.cell.borderColor = null;
            }
            break;
        case event.key === 'F6':
            event.preventDefault();
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
        case event.key.length == 1:
            writer.character(event.key, true);
            break;
        default:
            console.log(`Key:'${event.key}' Shift:${event.shiftKey ? 'yes' : 'no'} Ctrl:${event.ctrlKey ? 'yes' : 'no'} Alt:${event.altKey ? 'yes' : 'no'}`);
            break;
    }
});

(function () {
    const help = [
        'Help:',
        'F2         Select foreground   (SHIFT clears)',
        'F3         Select background   (SHIFT clears)',
        'F4         Select border       (SHIFT clears)',
        'F6         Enable pulsating    (SHIFT disables)',
        '0-9        Select color from palette',
        'Cursor     Move around',
    ];

    help.forEach((line) => console.info(line));
})();
