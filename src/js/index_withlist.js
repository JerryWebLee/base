
// import { mainCanvasRenderer } from './painPoint'

import { MainCanvasRenderer } from './bodyShowDemo_V3.js'


window.onload =async function () {
    let main = new MainCanvasRenderer(document.getElementById('mainCanvas'));
    await main.run();
    document.getElementById('loading').className = 'loading-wrapper hide';

}