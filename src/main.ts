import './style.css'
import App from './App'

const canvas = document.createElement('canvas');
canvas.className = 'writer';
document.getElementById('app')?.appendChild(canvas);


const app = new App(canvas);

app.printHelp();
app.start();


declare global {
    var app: App;
}

globalThis.app = app;
