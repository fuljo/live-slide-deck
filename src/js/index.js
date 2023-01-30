import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, onSnapshot, Firestore, DocumentSnapshot } from "firebase/firestore";

import { firebaseConfig } from './common';
import { pdfjsLib, pdfjsViewer, ViewerApp } from './viewer';

import '../scss/style.scss';

// Main
window.addEventListener("DOMContentLoaded", () => {
    // Get the viewer container
    const viewerContainer = document.getElementById("viewerContainer");

    // Create and initialize the viewer app
    const app = new ViewerApp(viewerContainer, firebaseConfig);
});