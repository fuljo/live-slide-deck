import * as pdfjsLib from 'pdfjs-dist/webpack';
import * as pdfjsViewer from 'pdfjs-dist/web/pdf_viewer';
import 'pdfjs-dist/web/pdf_viewer.css';
import '../scss/style.scss';

import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, onSnapshot, Firestore, DocumentSnapshot } from "firebase/firestore";

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
    alert("Please provide the `pdfjs-dist` library");
}

// Setting worker path to worker bundle.
pdfjsLib.GlobalWorkerOptions.workerSrc =
    "pdf.worker.bundle.js";

// Some PDFs need external cmaps.
const CMAP_URL = "cmaps/";
const CMAP_PACKED = true;

const ENABLE_XFA = true;

class ViewerApp {
    /** @type {HTMLElement} */
    viewerContainer;
    /** @type {pdfjsViewer.PDFSinglePageViewer} */
    viewer;
    /** @type {pdfjsViewer.EventBus} */
    eventBus;
    /** @type {pdfjsViewer.PDFLinkService} */
    pdfLinkService;
    /** @type {import('firebase/app').FirebaseApp} */
    app;
    /** @type {Firestore} */
    db;
    /**
     * Name of the current deck.
     * @type {string}
     */
    currentDeck;
    /** @type {number} */
    currentPageNumber;

    /**
     * Create a new viewer app.
     * 
     * We suppose that the DOM has already been loaded so we can query elements.
     * @param {HTMLElement} viewerContainer 
     * @param {Object} firebaseConfig 
     */
    constructor(viewerContainer, firebaseConfig) {
        this.viewerContainer = viewerContainer;
        this.currentDeck = null;
        this.currentPageNumber = 1;

        this.eventBus = new pdfjsViewer.EventBus();

        // Enable hyperlinks within PDF files.
        // TODO: debug hyperlinks.
        this.pdfLinkService = new pdfjsViewer.PDFLinkService({
            eventBus: this.eventBus,
        });

        this.viewer = new pdfjsViewer.PDFSinglePageViewer({
            container: this.viewerContainer,
            eventBus: this.eventBus,
            linkService: this.pdfLinkService,
            removePageBorders: true,
        });
        this.pdfLinkService.setViewer(this.viewer);

        this.eventBus.on("pagesinit", () => {
            // Fit the page into the frame.
            this.viewer.currentScaleValue = "page-fit";
        });

        // Add event listeners
        window.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowLeft': this.viewer.previousPage(); break;
                case 'ArrowRight': this.viewer.nextPage(); break;
            }
        }, false);

        // Initialize the Firebase app
        this.app = initializeApp(firebaseConfig);
        this.db = getFirestore(this.app);

        // Set callback for data changes
        const unsub = onSnapshot(doc(this.db, "presenter", "config"), this.#onSnapshot.bind(this));
    }

    /**
     * Handle a change in the presenter's data.
     * @param {DocumentSnapshot<import('firebase/firestore').DocumentData>} doc the changed firestore document.
     */
    #onSnapshot(doc) {
        const data = doc.data();
        const remoteDeck = data.currentDeck;
        const remotePage = parseInt(data.currentPageNumber);

        if (this.currentDeck != remoteDeck) {
            // Load new deck
            this.#updateDeck(remoteDeck).then(() => {
                this.currentDeck = remoteDeck;
            }).catch((error) => {
                console.error("Error loading document: ", error);
            });
        }
        if (this.currentPageNumber != remotePage) {
            // Update current page
            this.currentPageNumber = remotePage;
            this.viewer.currentPageNumber = remotePage; // this only works if the viewer has finished initializing.
        }
    }

    /**
     * Update the deck shown in the viewer.
     * @param {string} deck the name of the deck to load. 
     */
    async #updateDeck(deck) {
        const deckRef = doc(this.db, 'decks', deck);
        const deckDoc = await getDoc(deckRef);
        if (!deckDoc.exists()) {
            throw new Error(`Deck ${deck} does not exist.`);
        } else {
            await this.loadDocument(deckDoc.data().url);
        }
    }

    /**
     * Load the document into the viewer.
     * @param {string} url url of the document to load.
     * @returns pdfjsLib.PDFDocumentProxy
     */
    async loadDocument(url) {
        // Loading document.
        const loadingTask = pdfjsLib.getDocument({
            url,
            cMapUrl: CMAP_URL,
            cMapPacked: CMAP_PACKED,
            enableXfa: ENABLE_XFA,
        });
        const pdfDocument = await loadingTask.promise;
        // Document loaded, specifying document for the viewer and the linkService.
        this.viewer.setDocument(pdfDocument);
        this.viewer.setDocument(pdfDocument, null);
        return pdfDocument;
    }
}

// Main
window.addEventListener("DOMContentLoaded", () => {
    // Get the viewer container
    const viewerContainer = document.getElementById("viewerContainer");

    // Createv and initialize the viewer app
    const app = new ViewerApp(viewerContainer, firebaseConfig);
});

export {
    pdfjsLib,
    pdfjsViewer,
    firebaseConfig,
    ViewerApp,
};