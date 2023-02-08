import * as pdfjsLib from 'pdfjs-dist/webpack';
import * as pdfjsViewer from 'pdfjs-dist/web/pdf_viewer';
import 'pdfjs-dist/web/pdf_viewer.css';

import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { getStorage, getDownloadURL, ref } from "firebase/storage";
import { AnnotationMode, AnnotationEditorType } from 'pdfjs-dist';

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

class ViewerApp {
    /** @type {HTMLElement} */
    viewerContainer;
    /** @type {pdfjsViewer.PDFSinglePageViewer} */
    viewer;
    /** @type {pdfjsViewer.EventBus} */
    eventBus;
    /** @type {import('firebase/app').FirebaseApp} */
    app;
    /** @type {Firestore} */
    db;
    /** @type {import('firebase/storage').FirebaseStorage} */
    storage;
    /**
     * Name of the current deck.
     * @type {string}
     */
    _currentDeck;
    /** @type {number} */
    _currentPageNumber;

    /**
     * Create a new viewer app.
     * 
     * We suppose that the DOM has already been loaded so we can query elements.
     * @param {HTMLElement} viewerContainer 
     * @param {Object} firebaseConfig 
     * @param {boolean} useWakeLock
     */
    constructor(viewerContainer, firebaseConfig, useWakeLock) {
        this.viewerContainer = viewerContainer;

        this.eventBus = new pdfjsViewer.EventBus();

        this.viewer = new pdfjsViewer.PDFSinglePageViewer({
            container: this.viewerContainer,
            eventBus: this.eventBus,
            removePageBorders: true,
            annotationMode: AnnotationMode.DISABLE,
            annotationEditorMode: AnnotationEditorType.DISABLE,
        });

        this.eventBus.on("pagesinit", () => {
            // Fit the page into the frame.
            this.viewer.currentScaleValue = "page-fit";
            // Go to the current page.
            this.viewer.currentPageNumber = this.currentPageNumber ?? 1;
        });

        this.resizeObserver = new ResizeObserver(this._onResize.bind(this));
        this.resizeObserver.observe(this.viewerContainer);

        // Fulscreen on double click
        this.viewerContainer.addEventListener("dblclick", (_event) => {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                document.documentElement.requestFullscreen();
            }
        });

        // Wake lock
        if (useWakeLock) {
            this._requestWakeLock();
        }

        // Initialize the Firebase app
        this.app = initializeApp(firebaseConfig);
        this.db = getFirestore(this.app);
        this.storage = getStorage(this.app);

        // Set callback for data changes
        onSnapshot(doc(this.db, "presenter", "state"), this._onSnapshot.bind(this));
    }

    get currentDeck() {
        return this._currentDeck;
    }

    set currentDeck(deckName) {
        if (this.currentDeck === deckName) {
            return;
        }
        this._updateDeck(deckName).then(() => {
            this._currentDeck = deckName;
        }).catch((error) => {
            console.error("Error loading document: ", error);
        });
    }

    get currentPageNumber() {
        return this._currentPageNumber;
    }

    set currentPageNumber(pageNumber) {
        if (Number.isInteger(pageNumber) && pageNumber > 0) {
            this._currentPageNumber = pageNumber;
            this.viewer.currentPageNumber = pageNumber; // this only works if the viewer has finished initializing.
        } else {
            console.error(`Invalid page number: ${pageNumber}`);
        }
    }

    /**
     * Handle a change in the presenter's data.
     * @param {DocumentSnapshot<import('firebase/firestore').DocumentData>} doc the changed firestore document.
     */
    _onSnapshot(doc) {
        const data = doc.data();

        const deckName = data.currentDeck;
        this.currentDeck = deckName;
        this.currentPageNumber = parseInt(data.currentPageNumber[deckName] ?? 1);
    }

    /**
     * Update the deck shown in the viewer.
     * @param {string} deck the name of the deck to load. 
     */
    async _updateDeck(deck) {
        const deckRef = ref(this.storage, `decks/${deck}.pdf`);
        try {
            const url = await getDownloadURL(deckRef);
            await this.loadDocument(url);
        } catch (error) {
            console.error("Error getting deck: ", error);
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
        });
        const pdfDocument = await loadingTask.promise;
        // Document loaded, specifying document for the viewer.
        this.viewer.setDocument(pdfDocument);
        return pdfDocument;
    }

    /**
     * Called when the viewer container is resized.
     * @param {Array<ResizeObserverEntry>} entries 
     */
    _onResize(_entries) {
        this.viewer.currentScaleValue = "page-fit";
        this.viewer.update();
    }

    /**
     * Request a wake lock.
     */
    async _requestWakeLock() {
        if ("wakeLock" in navigator) {
            document.addEventListener("visibilitychange", this._handleVisibilityChange.bind(this));
            this._handleVisibilityChange();
        } else {
            console.warn("Wake Lock API not supported");
        }
    }

    async _handleVisibilityChange() {
        if (document.visibilityState === "visible") {
            try {
                this.wakeLock = await navigator.wakeLock.request("screen");
                this.wakeLock.addEventListener("release", () => {
                    console.log("Wake Lock was released");
                });
                console.log("Wake Lock is active");
            } catch (err) {
                console.error(`${err.name}, ${err.message}`);
            }
        } else {
            this.wakeLock.release();
        }
    }
}

export {
    pdfjsLib,
    pdfjsViewer,
    ViewerApp,
};