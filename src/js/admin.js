import 'bootstrap/scss/bootstrap.scss';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'pdfjs-dist/web/pdf_viewer.css';
import '../scss/style.scss';

import { pdfjsLib, pdfjsViewer, firebaseConfig, ViewerApp } from './index.js';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';

if (!pdfjsLib.getDocument || !pdfjsViewer.PDFSinglePageViewer) {
    // eslint-disable-next-line no-alert
    alert("Please provide the `pdfjs-dist` library");
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

class AdminApp extends ViewerApp {
    /** @type {HTMLInputElement} */
    deckNameInput;
    /** @type {HTMLInputElement} */
    pageNumberInput;
    /** @type {HTMLElement} */
    pagesCountSpan;
    /** @type {HTMLButtonElement} */
    prevPageButton;
    /** @type {HTMLButtonElement} */
    nextPageButton;
    /** @type {import('firebase/firestore').DocumentReference} */
    presenterStateRef;

    constructor(viewerContainer, deckNameInput, pageNumberInput, pagesCountSpan, prevPageButton, nextPageButton, firebaseConfig) {
        super(viewerContainer, firebaseConfig);

        // Firestore references
        this.presenterStateRef = doc(this.db, "presenter", "state");

        this.deckNameInput = deckNameInput;
        this.pageNumberInput = pageNumberInput;
        this.pagesCountSpan = pagesCountSpan;
        this.prevPageButton = prevPageButton;
        this.nextPageButton = nextPageButton;

        // Event listeners
        this.deckNameInput.addEventListener("change", this._onDeckNameInputChange.bind(this));
        this.pageNumberInput.addEventListener("change", this._onPageNumberInputChange.bind(this));
        this.prevPageButton.addEventListener("click", this._onPageChangeButton.bind(this, -1));
        this.nextPageButton.addEventListener("click", this._onPageChangeButton.bind(this, +1));
        window.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowLeft': this._onPageChangeButton(-1); break;
                case 'ArrowRight': this._onPageChangeButton(+1); break;
            }
        }, false);

        this.eventBus.on("pagesinit", () => {
            // (additionally) update the page count when the document has been loaded.
            this.pagesCountSpan.textContent = this.viewer.pagesCount;
        });

        // Populate deck names
        getDocs(collection(this.db, "decks")).then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                const option = document.createElement("option");
                option.value = doc.id;
                option.textContent = doc.id;
                this.deckNameInput.appendChild(option);
            });
        });
    }

    /**
     * Name of the current deck.
     */
    get currentDeck() {
        return this._currentDeck;
    }

    /**
     * Handle a server-initiated change of the deck name.
     * @param {string} deckName.
     */
    set currentDeck(deckName) {
        this._currentDeck = deckName;
        this.deckNameInput.value = deckName;
    }

    /** Current page number */
    get currentPageNumber() {
        return this._currentPageNumber;
    }

    /** 
     * Handle a server-initiated change of the page number.
     * @param {number} pageNumber
     */
    set currentPageNumber(pageNumber) {
        this._currentPageNumber = pageNumber;
        this.pageNumberInput.value = pageNumber;
        this.viewer.currentPageNumber = pageNumber; // this only works if the viewer has finished initializing.
    }

    /**
     * Handle a change in the presenter's data.
     * @param {DocumentSnapshot<import('firebase/firestore').DocumentData>} doc the changed firestore document.
     */
    _onSnapshot(doc) {
        const data = doc.data();
        const remoteDeck = data.currentDeck;
        const remotePage = parseInt(data.currentPageNumber);

        if (this.currentDeck != remoteDeck) {
            // Load new deck
            this._updateDeck(remoteDeck).then(() => {
                this.currentDeck = remoteDeck;
                this.pagesCountSpan.textContent = this.viewer.pagesCount;
            }).catch((error) => {
                console.error("Error loading document: ", error);
            });
        }
        if (this.currentPageNumber != remotePage) {
            // Update current page
            this.currentPageNumber = remotePage;
        }
    }

    /**
     * Handle a change of the deck name.
     * @param {Event} event 
     */
    _onDeckNameInputChange(event) {
        const deckName = event.target.value;
        if (deckName != null && deckName != this.currentDeck) {
            updateDoc(this.presenterStateRef, { currentDeck: deckName }).catch((error) => {
                console.error("Error updating deck name: ", error);
            });
        }
    }

    /**
     * Handle a change of the page number.
     * @param {Event} event 
     */
    _onPageNumberInputChange(event) {
        const pageNumber = parseInt(event.target.value);
        if (Number.isInteger(pageNumber) && pageNumber != this.currentPageNumber) {
            updateDoc(this.presenterStateRef, { currentPageNumber: pageNumber }).catch((error) => {
                console.error("Error updating page number: ", error);
            });
        }
    }

    /**
     * Handle the prev/next page buttons.
     * @param {number} delta 
     * @param {Event} event 
     */
    _onPageChangeButton(delta, event) {
        const pageNumber = clamp(this.currentPageNumber + delta, 1, this.viewer.pagesCount);
        if (Number.isInteger(pageNumber) && pageNumber != this.currentPageNumber) {
            updateDoc(this.presenterStateRef, { currentPageNumber: pageNumber }).catch((error) => {
                console.error("Error updating page number: ", error);
            });
        }
    }
}

// Main
window.addEventListener("DOMContentLoaded", () => {
    const app = new AdminApp(
        document.getElementById("viewerContainer"),
        document.getElementById("deckName"),
        document.getElementById("pageNumber"),
        document.getElementById("pagesCount"),
        document.getElementById("prevPage"),
        document.getElementById("nextPage"),
        firebaseConfig
    );
});
