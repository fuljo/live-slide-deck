import * as pdfjsLib from 'pdfjs-dist/webpack';
import * as pdfjsViewer from 'pdfjs-dist/web/pdf_viewer';
import './style.css';
import 'pdfjs-dist/web/pdf_viewer.css';

import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, onSnapshot, Firestore } from "firebase/firestore";

// Web app Firebase configuration
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
};

if (!pdfjsLib.getDocument || !pdfjsViewer.PDFSinglePageViewer) {
    // eslint-disable-next-line no-alert
    alert("Please build the pdfjs-dist library using\n  `gulp dist-install`");
}

// Setting worker path to worker bundle.
pdfjsLib.GlobalWorkerOptions.workerSrc =
    "pdf.worker.bundle.js";

// Some PDFs need external cmaps.
const CMAP_URL = "cmaps/";
const CMAP_PACKED = true;

const ENABLE_XFA = true;

// String identifier of the current deck.
var currentDeck = null;
var currentPageNumber = 1;

/**
 * Create the single-page viewer.
 * 
 * @returns {pdfjsViewer.PDFSinglePageViewer} The viewer.
 */
function createViewer() {
    const container = document.getElementById("viewerContainer");

    const eventBus = new pdfjsViewer.EventBus();

    // (Optionally) enable hyperlinks within PDF files.
    const pdfLinkService = new pdfjsViewer.PDFLinkService({
        eventBus,
    });

    const pdfSinglePageViewer = new pdfjsViewer.PDFSinglePageViewer({
        container,
        eventBus,
        linkService: pdfLinkService,
        removePageBorders: true,
    });
    pdfLinkService.setViewer(pdfSinglePageViewer);

    eventBus.on("pagesinit", () => {
        // Fit the page into the frame.
        pdfSinglePageViewer.currentScaleValue = "page-fit";
    });

    // Add event listeners
    window.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowLeft': pdfSinglePageViewer.previousPage(); break;
            case 'ArrowRight': pdfSinglePageViewer.nextPage(); break;
        }
    }, false);

    return pdfSinglePageViewer;
}

/**
 * Load the document into the viewer.
 * @param {pdfjsViewer.PDFSinglePageViewer} viewer 
 * @param {string} url 
 * @returns pdfjsLib.PDFDocumentProxy
 */
async function loadDocument(viewer, url) {
    // Loading document.
    const loadingTask = pdfjsLib.getDocument({
        url,
        cMapUrl: CMAP_URL,
        cMapPacked: CMAP_PACKED,
        enableXfa: ENABLE_XFA,
    });
    const pdfDocument = await loadingTask.promise;
    // Document loaded, specifying document for the viewer and the linkService.
    viewer.setDocument(pdfDocument);
    viewer.setDocument(pdfDocument, null);
    return pdfDocument;
}

/**
 * Load the deck into the viewer.
 * @param {pdfjsViewer.pdfSinglePageViewer} viewer 
 * @param {Firestore} db 
 * @param {string} id of the slide deck
 */
async function updateDeck(viewer, db, deck) {
    const deckRef = doc(db, 'decks', deck);
    const deckDoc = await getDoc(deckRef);
    if (!deckDoc.exists()) {
        throw new Error(`Deck ${deck} does not exist.`);
    } else {
        await loadDocument(viewer, deckDoc.data().url);
    }
}

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
