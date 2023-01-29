import 'bootstrap/scss/bootstrap.scss';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'pdfjs-dist/web/pdf_viewer.css';
import '../scss/style.scss';

// TODO: Import individual components from Bootstrap
import * as bootstrap from 'bootstrap';

import { pdfjsLib, pdfjsViewer, firebaseConfig, ViewerApp } from './index.js';

if (!pdfjsLib.getDocument || !pdfjsViewer.PDFSinglePageViewer) {
    // eslint-disable-next-line no-alert
    alert("Please provide the `pdfjs-dist` library");
}

// Main
window.addEventListener("DOMContentLoaded", () => {
    const viewerContainer = document.getElementById("viewerContainer");

    const app = new ViewerApp(viewerContainer, firebaseConfig);
});
