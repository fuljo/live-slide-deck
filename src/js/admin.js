import 'bootstrap/scss/bootstrap.scss';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'pdfjs-dist/web/pdf_viewer.css';
import '../scss/style.scss';

// TODO: Import individual components from Bootstrap
import * as bootstrap from 'bootstrap';

import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, onSnapshot, Firestore } from "firebase/firestore";
import { pdfjsLib, pdfjsViewer, firebaseConfig, createViewer, updateDeck } from './index.js';

if (!pdfjsLib.getDocument || !pdfjsViewer.PDFSinglePageViewer) {
    // eslint-disable-next-line no-alert
    alert("Please build the pdfjs-dist library using\n  `gulp dist-install`");
}

// String identifier of the current deck.
var currentDeck = null;
var currentPageNumber = 1;

// Main
window.addEventListener("DOMContentLoaded", () => {
    // Create the single-page viewer.
    const viewer = createViewer();

    viewer.eventBus.on("pagesinit", () => {
        // Set the initial page number once the document is initializing.
        viewer.currentPageNumber = currentPageNumber;
    });

    // Initialize the Firebase app
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // Set callback for data changes
    const unsub = onSnapshot(doc(db, "presenter", "config"), (doc) => {
        const data = doc.data();
        const remoteDeck = data.currentDeck;
        const remotePage = parseInt(data.currentPageNumber);

        if (currentDeck != remoteDeck) {
            // Load new deck
            updateDeck(viewer, db, remoteDeck).then(() => {
                currentDeck = remoteDeck;
            }).catch((error) => {
                console.error("Error loading document: ", error);
            });
        }
        if (currentPageNumber != remotePage) {
            // Update current page
            currentPageNumber = remotePage;
            viewer.currentPageNumber = remotePage; // this only works if the pages have already loaded
        }
    });
});
