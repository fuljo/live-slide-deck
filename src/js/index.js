import { firebaseConfig } from './common';
import { ViewerApp } from './viewer';

import '../scss/viewer.scss';

// Main
window.addEventListener("DOMContentLoaded", () => {
    // Get the viewer container
    const viewerContainer = document.getElementById("viewerContainer");

    // Create and initialize the viewer app
    const useWakeLock = true;
    new ViewerApp(viewerContainer, firebaseConfig, useWakeLock);
});