import './style.css'
import { Writer } from './writer.js'

const canvas = document.querySelector('#writerCanvas');

const writer = new Writer(
    canvas, 800, 600,
);
writer.mainLoop();