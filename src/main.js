import './style.css'
import App from './App'

const canvas = document.querySelector('#writerCanvas');

const app = new App(canvas);

app.printHelp();
app.start();
