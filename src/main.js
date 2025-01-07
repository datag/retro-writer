import './style.css'
import { Writer } from './writer.js'

const canvas = document.querySelector('#writerCanvas');

const writer = new Writer(
    canvas, window.innerWidth, window.innerHeight,
);
writer.mainLoop();

window.addEventListener('keydown', (event) => {
    // if (event.repeat) {
    //     return;
    // }

    switch (event.key) {
        case 'ArrowUp':
            writer.cursorUp();
            break;
        case 'ArrowDown':
            writer.cursorDown();
            break;
        case 'ArrowLeft':
            writer.cursorLeft();
            break;
        case 'ArrowRight':
            writer.cursorRight();
            break;
        case ' ':
            writer.testBackground();
            break;
        case 'b':
            writer.testBorder();
            break;
    }
});
