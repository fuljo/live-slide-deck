import { firebaseConfig } from './common';
import { ViewerApp } from './viewer';

import '../scss/style.scss';

// Main
window.addEventListener("DOMContentLoaded", () => {
    // Get the viewer container
    const viewerContainer = document.getElementById("viewerContainer");

    // Create and initialize the viewer app
    new ViewerApp(viewerContainer, firebaseConfig);
});