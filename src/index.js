/* Copyright 2014 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

import * as pdfjsLib from 'pdfjs-dist/webpack';
import * as pdfjsViewer from 'pdfjs-dist/web/pdf_viewer';
import './style.css';
import 'pdfjs-dist/web/pdf_viewer.css';

if (!pdfjsLib.getDocument || !pdfjsViewer.PDFSinglePageViewer) {
    // eslint-disable-next-line no-alert
    alert("Please build the pdfjs-dist library using\n  `gulp dist-install`");
}

// Setting worker path to worker bundle.
pdfjsLib.GlobalWorkerOptions.workerSrc =
    "pdf.worker.bundle.js";

// Some PDFs need external cmaps.
//
const CMAP_URL = "cmaps/";
const CMAP_PACKED = true;

const DEFAULT_URL = "sample.pdf";

const ENABLE_XFA = true;
const SEARCH_FOR = ""; // try "Mozilla";

// const SANDBOX_BUNDLE_SRC = "pdfjs-dist/build/pdf.sandbox.js";

window.addEventListener("DOMContentLoaded", function () {
    const container = document.getElementById("viewerContainer");

    const eventBus = new pdfjsViewer.EventBus();

    // (Optionally) enable hyperlinks within PDF files.
    const pdfLinkService = new pdfjsViewer.PDFLinkService({
        eventBus,
    });

    // (Optionally) enable find controller.
    const pdfFindController = new pdfjsViewer.PDFFindController({
        eventBus,
        linkService: pdfLinkService,
    });

    // (Optionally) enable scripting support.
    // const pdfScriptingManager = new pdfjsViewer.PDFScriptingManager({
    //     eventBus,
    //     sandboxBundleSrc: SANDBOX_BUNDLE_SRC,
    // });

    const pdfSinglePageViewer = new pdfjsViewer.PDFSinglePageViewer({
        container,
        eventBus,
        linkService: pdfLinkService,
        findController: pdfFindController,
        // scriptingManager: pdfScriptingManager,
        removePageBorders: true,
    });
    pdfLinkService.setViewer(pdfSinglePageViewer);
    // pdfScriptingManager.setViewer(pdfSinglePageViewer);

    eventBus.on("pagesinit", function () {
        // We can use pdfSinglePageViewer now, e.g. let's change default scale.
        pdfSinglePageViewer.currentScaleValue = "page-fit";

        // We can try searching for things.
        if (SEARCH_FOR) {
            eventBus.dispatch("find", { type: "", query: SEARCH_FOR });
        }
    });

    // Loading document.
    const loadingTask = pdfjsLib.getDocument({
        url: DEFAULT_URL,
        cMapUrl: CMAP_URL,
        cMapPacked: CMAP_PACKED,
        enableXfa: ENABLE_XFA,
    });
    loadingTask.promise.then(function (pdfDocument) {
        // Document loaded, specifying document for the viewer and
        // the (optional) linkService.
        pdfSinglePageViewer.setDocument(pdfDocument);

        pdfLinkService.setDocument(pdfDocument, null);
    });

    // Add event listeners
    window.addEventListener('keydown', function (e) {
        switch (e.key) {
            case 'ArrowLeft': pdfSinglePageViewer.previousPage(); break;
            case 'ArrowRight': pdfSinglePageViewer.nextPage(); break;
        }
    }, false);
});
