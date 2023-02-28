import { doc, updateDoc } from 'firebase/firestore';
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import { ref, listAll, uploadBytes, deleteObject } from 'firebase/storage';
import { Modal } from 'bootstrap';

import { firebaseConfig } from './common';
import { ViewerApp } from './viewer';

import '../scss/admin.scss';

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Admin app.
 */
class AdminApp extends ViewerApp {
    /** @type {HTMLElement} */
    toolbarContainer;
    /** @type {HTMLInputElement} */
    deckNameInput;
    /** @type {HTMLInputElement} */
    deckFileInput;
    /** @type {HTMLButtonElement} */
    uploadButton;
    /** @type {HTMLButtonElement} */
    submitUploadButton;
    /** @type {HTMLButtonElement} */
    deleteButton;
    /** @type {HTMLButtonElement} */
    confirmDeleteButton;
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
    /** @type {boolean} */
    useWakeLock;

    constructor(viewerContainer, toolbarContainer, firebaseConfig, useWakeLock) {
        super(viewerContainer, firebaseConfig, useWakeLock);

        // Firestore references
        this.presenterStateRef = doc(this.db, "presenter", "state");
        // Auth reference
        this.auth = getAuth(this.app);

        this.toolbarContainer = toolbarContainer;
        this.deckNameInput = document.getElementById("deckName");
        this.uploadButton = document.getElementById("upload");
        this.uploadDialog = new Modal(document.getElementById("uploadModal"));
        this.deckFileInput = document.getElementById("deckFile");
        this.submitUploadButton = document.getElementById("submitUpload");
        this.deleteButton = document.getElementById("delete");
        this.deleteDialog = new Modal(document.getElementById("deleteModal"));
        this.confirmDeleteButton = document.getElementById("confirmDelete");
        this.pageNumberInput = document.getElementById("pageNumber");
        this.pagesCountSpan = document.getElementById("pagesCount");
        this.prevPageButton = document.getElementById("prevPage");
        this.nextPageButton = document.getElementById("nextPage");
        this.emailField = document.getElementById("email");
        this.loginButton = document.getElementById("login");
        this.logoutButton = document.getElementById("logout");

        // Event listeners
        this.deckNameInput.addEventListener("change", this._onDeckNameInputChange.bind(this));
        this.uploadDialog._element.addEventListener("hidden.bs.modal", this._onUploadDialogClose.bind(this));
        this.deckFileInput.addEventListener("change", this._onDeckFileInputChange.bind(this));
        this.submitUploadButton.addEventListener("click", this._onUploadDeck.bind(this));
        this.deleteDialog._element.addEventListener("hidden.bs.modal", this._onDeleteDialogClose.bind(this));
        this.confirmDeleteButton.addEventListener("click", this._onDeleteDeck.bind(this));
        this.pageNumberInput.addEventListener("change", this._onPageNumberInputChange.bind(this));
        this.prevPageButton.addEventListener("click", this._onPageChangeButton.bind(this, -1));
        this.nextPageButton.addEventListener("click", this._onPageChangeButton.bind(this, +1));
        this.loginButton.addEventListener("click", this._onLoginButton.bind(this));
        this.logoutButton.addEventListener("click", this._onLogoutButton.bind(this));
        window.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowLeft': this._onPageChangeButton(-1, e); break;
                case 'ArrowRight': this._onPageChangeButton(+1, e); break;
                case 'PageUp': this._onPageChangeButton(-1, e); break;
                case 'PageDown': this._onPageChangeButton(+1, e); break;
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
        if (this.currentDeck && this.auth.currentUser != null) {
            let state = {};
            if (deckName != undefined && deckName !== this.currentDeck) {
                state.currentDeck = deckName;
            }
            if (Number.isInteger(pageNumber) && pageNumber !== this.currentPageNumber) {
                pageNumber = clamp(pageNumber, 1, this.viewer.pagesCount ?? 1);
                state[`currentPageNumber.${this._currentDeck}`] = pageNumber;
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
            this.uploadButton.disabled = false;
            this.deleteButton.disabled = false;
            this.pageNumberInput.disabled = false;
            this.prevPageButton.disabled = false;
            this.nextPageButton.disabled = false;
        } else {
            // User is signed out.
            this.emailField.hidden = true;
            this.loginButton.hidden = false;
            this.logoutButton.hidden = true;

            this.deckNameInput.disabled = true;
            this.uploadButton.disabled = true;
            this.deleteButton.disabled = true;
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
        this.updateRemoteState({ deckName: deckName });
    }

    /**
     * Handle deck upload input change.
     * @param {*} event 
     */
    _onDeckFileInputChange(_event) {
        document.getElementById("uploadError").hidden = true;
        document.getElementById("uploadSuccess").hidden = true;
    }

    /**
     * Reset the state of the upload dialog.
     * @param {Event} event
     */
    _onUploadDialogClose(_event) {
        this.deckFileInput.value = "";
        document.getElementById("uploadError").hidden = true;
        document.getElementById("uploadSuccess").hidden = true;
    }

    /**
     * Handle uploading a slide deck.
     * @param {Event} event
     */
    _onUploadDeck(event) {
        event.preventDefault();
        let errorAlert = document.getElementById("uploadError");
        const successAlert = document.getElementById("uploadSuccess");
        errorAlert.hidden = true;
        successAlert.hidden = true;

        const file = this.deckFileInput.files[0];
        if (!file) {
            console.error("No file selected.");
            errorAlert.textContent = "No file selected.";
            errorAlert.hidden = false;
        }
        if (file.type !== "application/pdf") {
            console.error("File must be a PDF.");
            errorAlert.textContent = "File must be a PDF.";
            errorAlert.hidden = false;
        }

        const deckName = file.name.replace(/\.pdf$/, "");
        const deckRef = ref(this.storage, `decks/${deckName}.pdf`);
        uploadBytes(deckRef, file).then((_snapshot) => {
            if (this.deckNameInput.querySelector(`option[value="${deckName}"]`) == null) {
                const option = document.createElement("option");
                option.value = deckName;
                option.textContent = deckName;
                this.deckNameInput.appendChild(option);
                successAlert.textContent = `Uploaded ${deckName}.`;
                this.deckFileInput.value = "";
            } else {
                successAlert.textContent = `Updated ${deckName}.`;
            }
            successAlert.hidden = false;
        }).catch((error) => {
            console.error("Error uploading file: ", error);
            let errorAlert = document.getElementById("uploadError");
            errorAlert.textContent = `Error uploading file: ${error}`;
            errorAlert.hidden = false;
        });
    }

    /**
     * Reset the state of the delete dialog.
     * @param {Event} event
     */
    _onDeleteDialogClose(_event) {
        document.getElementById("deleteError").hidden = true;
        document.getElementById("deleteSuccess").hidden = true;
    }

    /**
     * Handle deleting a slide deck.
     * @param {Event} event 
     */
    _onDeleteDeck(event) {
        event.preventDefault();
        const deckName = this.deckNameInput.value;
        if (deckName) {
            const deckRef = ref(this.storage, `decks/${deckName}.pdf`);
            deleteObject(deckRef).then(() => {
                this.deckNameInput.querySelector(`option[value="${deckName}"]`).remove();
                this.deckNameInput.value = "";
                this.pagesCountSpan.textContent = "";
                this.pageNumberInput.value = "";
                const deleteSuccessAlert = document.getElementById("deleteSuccess");
                deleteSuccessAlert.textContent = `Deleted ${deckName}.`;
                deleteSuccessAlert.hidden = false;
            }).catch((error) => {
                console.error("Error deleting file: ", error);
                const deleteErrorAlert = document.getElementById("deleteError");
                deleteErrorAlert.textContent = `Error deleting file: ${error}`;
                deleteErrorAlert.hidden = false;
            });
        }
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

    _onLoginButton(_event) {
        window.location.replace("/login");
    }

    _onLogoutButton(_event) {
        signOut(this.auth).catch((error) => {
            console.error("Error signing out: ", error);
        });
    }

    _onResize() {
        this.viewerContainer.style.top = `${this.toolbarContainer.offsetHeight}px`;
        super._onResize();
    }
}

// Main
window.addEventListener("DOMContentLoaded", () => {
    const useWakeLock = false;
    new AdminApp(
        document.getElementById("viewerContainer"),
        document.getElementById("toolbarContainer"),
        firebaseConfig,
        useWakeLock,
    );
});
