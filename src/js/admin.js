import { doc, updateDoc } from 'firebase/firestore';
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import { ref, listAll } from 'firebase/storage';

import { firebaseConfig } from './common';
import { ViewerApp } from './viewer';

import 'bootstrap/scss/bootstrap.scss';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '../scss/style.scss';

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

class AdminApp extends ViewerApp {
    /** @type {HTMLElement} */
    toolbarContainer;
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
    /** @type {HTMLElement} */
    emailField;
    /** @type {HTMLButtonElement} */
    loginButton;
    /** @type {HTMLButtonElement} */
    logoutButton;
    /** @type {import('firebase/firestore').DocumentReference} */
    presenterStateRef;
    /** @type {import('firebase/auth').Auth} */
    auth;

    constructor(viewerContainer, toolbarContainer, deckNameInput, pageNumberInput, pagesCountSpan, prevPageButton, nextPageButton, emailField, loginButton, logoutButton, firebaseConfig) {
        super(viewerContainer, firebaseConfig);

        // Firestore references
        this.presenterStateRef = doc(this.db, "presenter", "state");
        // Auth reference
        this.auth = getAuth(this.app);

        this.toolbarContainer = toolbarContainer;
        this.deckNameInput = deckNameInput;
        this.pageNumberInput = pageNumberInput;
        this.pagesCountSpan = pagesCountSpan;
        this.prevPageButton = prevPageButton;
        this.nextPageButton = nextPageButton;
        this.emailField = emailField;
        this.loginButton = loginButton;
        this.logoutButton = logoutButton;

        // Event listeners
        this.deckNameInput.addEventListener("change", this._onDeckNameInputChange.bind(this));
        this.pageNumberInput.addEventListener("change", this._onPageNumberInputChange.bind(this));
        this.prevPageButton.addEventListener("click", this._onPageChangeButton.bind(this, -1));
        this.nextPageButton.addEventListener("click", this._onPageChangeButton.bind(this, +1));
        this.loginButton.addEventListener("click", this._onLoginButton.bind(this));
        this.logoutButton.addEventListener("click", this._onLogoutButton.bind(this));
        window.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowLeft': this._onPageChangeButton(-1, e); break;
                case 'ArrowRight': this._onPageChangeButton(+1, e); break;
            }
        }, false);

        // (additionally) update the page count when the document has been loaded.
        this.eventBus.on("pagesinit", () => {
            this.pagesCountSpan.textContent = this.viewer.pagesCount;
        });

        // Populate deck names
        listAll(ref(this.storage, "decks")).then((res) => {
            res.items.forEach((itemRef) => {
                const option = document.createElement("option");
                const deckName = itemRef.name.replace(/\.pdf$/, "");
                option.value = deckName;
                option.textContent = deckName;
                this.deckNameInput.appendChild(option);
            });
        });

        // Handle authentication
        onAuthStateChanged(this.auth, this._onAuthStateChanged.bind(this));
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
        if (deckName === this.currentDeck) {
            return;
        }
        // Load new deck locally
        this._updateDeck(deckName).then(() => {
            this._currentDeck = deckName;
            this.deckNameInput.value = deckName;
            this.pagesCountSpan.textContent = this.viewer.pagesCount;
        }).catch((error) => {
            console.error("Error loading document: ", error);
        });
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
        if (Number.isInteger(pageNumber) && pageNumber > 0) {
            this._currentPageNumber = pageNumber;
            this.pageNumberInput.value = pageNumber;
            this.viewer.currentPageNumber = pageNumber; // this only works if the viewer has finished initializing.
        }
    }

    /**
     * Update one or more parameters of the remote state.
     * @param {string} deckName 
     * @param {number} pageNumber 
     */
    updateRemoteState({ deckName, pageNumber } = {}) {
        if (this.auth.currentUser != null) {
            let state = {};
            if (deckName != undefined && deckName !== this.currentDeck) {
                state.currentDeck = deckName;
            }
            if (Number.isInteger(pageNumber) && pageNumber !== this.currentPageNumber) {
                pageNumber = clamp(pageNumber, 1, this.viewer.pagesCount ?? 1);
                state.currentPageNumber = pageNumber;
            }
            if (Object.keys(state).length > 0) {
                updateDoc(this.presenterStateRef, state).catch((error) => {
                    console.error("Error updating remote state: ", error);
                });
            }
        }
    }

    _onAuthStateChanged(user) {
        if (user) {
            // User is signed in.
            this.emailField.textContent = user.email;
            this.emailField.hidden = false;
            this.loginButton.hidden = true;
            this.logoutButton.hidden = false;

            this.deckNameInput.disabled = false;
            this.pageNumberInput.disabled = false;
            this.prevPageButton.disabled = false;
            this.nextPageButton.disabled = false;
        } else {
            // User is signed out.
            this.emailField.hidden = true;
            this.loginButton.hidden = false;
            this.logoutButton.hidden = true;

            this.deckNameInput.disabled = true;
            this.pageNumberInput.disabled = true;
            this.prevPageButton.disabled = true;
            this.nextPageButton.disabled = true;
        }
    }

    /**
     * Handle a change of the deck name.
     * @param {Event} event 
     */
    _onDeckNameInputChange(event) {
        const deckName = event.target.value;
        this.updateRemoteState({ deckName: deckName, pageNumber: 1 });
    }

    /**
     * Handle a change of the page number.
     * @param {Event} event 
     */
    _onPageNumberInputChange(event) {
        let pageNumber = parseInt(event.target.value);
        this.updateRemoteState({ pageNumber: pageNumber });
    }

    /**
     * Handle the prev/next page buttons.
     * @param {number} delta 
     * @param {Event} event 
     */
    _onPageChangeButton(delta, event) {
        if (event instanceof InputEvent) {
            event.preventDefault();
        }
        let pageNumber = this.currentPageNumber + delta;
        this.updateRemoteState({ pageNumber: pageNumber });
    }

    _onLoginButton(event) {
        window.location.replace("/login.html");
    }

    _onLogoutButton(event) {
        signOut(this.auth).catch((error) => {
            console.error("Error signing out: ", error);
        });
    }

    _onResize() {
        this.viewerContainer.style.top = this.toolbarContainer.offsetHeight;
        super._onResize();
    }
}

// Main
window.addEventListener("DOMContentLoaded", () => {
    const app = new AdminApp(
        document.getElementById("viewerContainer"),
        document.getElementById("toolbarContainer"),
        document.getElementById("deckName"),
        document.getElementById("pageNumber"),
        document.getElementById("pagesCount"),
        document.getElementById("prevPage"),
        document.getElementById("nextPage"),
        document.getElementById("email"),
        document.getElementById("login"),
        document.getElementById("logout"),
        firebaseConfig
    );
});
