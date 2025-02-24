var pdfDoc = null;
var curPDFPage = 1;
var isPDFPageRendering = false;
var pendingPageNum = null;
var pdfScale = 1.0;

function loadPDFFile(url)
{
    $('#player_container').css('overflow','auto').css('position','relative').css('text-align','center');

    $('#doc-zoom-in').click(function() {
        incrementDocZoomLevel(0.1);
    });

    $('#doc-zoom-out').click(function() {
        incrementDocZoomLevel(-0.1);
    });

    $('#doc-zoom-100').click(function() {
        setDocZoomLevel(1.0);
    });

    $('#player_container').on('wheel', function(e) {
        if (e.originalEvent.metaKey || (!isMac && e.originalEvent.ctrlKey)) {
            incrementDocZoomLevel(e.originalEvent.deltaY * 0.05);
        }
    });

    $('#doc-page-current').change(function() {
        var newPage = parseInt($(this).val());
        if (isNaN(newPage)) newPage = 1;
        if (newPage <= 0) newPage = 1;
        if (newPage > pdfDoc.numPages) newPage = pdfDoc.numPages;
        goToPage(newPage);
    });

    // Loaded via <script> tag, create shortcut to access PDF.js exports.
    var pdfjsLib = window['pdfjs-dist/build/pdf'];

    // The workerSrc property shall be specified.
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/third_party/pdf/pdf.worker.js';

    // Asynchronous download of PDF
    var loadingTask = pdfjsLib.getDocument(url);

    loadingTask.promise.then(function(pdf) {
        console.log('PDF loaded');
        $('#player_container .spinner').remove();

        pdfDoc = pdf;

        updatePageCounter();

        if (typeof URLSearchParams !== 'undefined') {
            var url = new URL(window.location.href);
            var params = new URLSearchParams(url.search.slice(1));

            var pageNum = params.get('page');

            if (pageNum) {
                pageNum = parseInt(pageNum);

                if (pageNum > 0 && pageNum <= pdfDoc.numPages) {
                    curPDFPage = pageNum;
                }
            }
        } else {
            console.log('Your browser does not support URLSearchParams');
        }

        renderPage(curPDFPage);

    }, function (reason) {
        // PDF loading error
        console.error(reason);

        // Show download button
        filePlaybackError();
    });
}

/**
 * Get page info from document, resize canvas accordingly, and render page.
 * @param num Page number.
 */
function renderPage(num)
{
    isPDFPageRendering = true;

    // Using promise to fetch the page
    pdfDoc.getPage(num).then(function(page) {
        var viewport = page.getViewport({scale: pdfScale});
        var canvas = document.getElementById('pdf-canvas');
        var ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render PDF page into canvas context
        var renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        var renderTask = page.render(renderContext);

        // Wait for rendering to finish
        renderTask.promise.then(function() {
            isPDFPageRendering = false;
            if (pendingPageNum !== null) {
                // New page rendering is pending
                renderPage(pendingPageNum);
                pendingPageNum = null;
            }
        });
    });

    updatePageCounter();
}

/**
 * If another page rendering in progress, waits until the rendering is
 * finised. Otherwise, executes rendering immediately.
 */
function queueRenderPage(num)
{
    if (isPDFPageRendering) {
        pendingPageNum = num;
    } else {
        renderPage(num);
    }
}

/**
 * Displays previous page.
 */
function goToPrevPage()
{
    if (curPDFPage <= 1) {
        return;
    }
    goToPage(curPDFPage-1);
}

function goToNextPage()
{
    if (curPDFPage >= pdfDoc.numPages) {
        return;
    }
    goToPage(curPDFPage+1);
}

function goToPage(num)
{
    curPDFPage = num;
    queueRenderPage(curPDFPage);
}

function updatePageCounter()
{
    $('#doc-page-current').val(curPDFPage);
    $('#doc-page-total').html(pdfDoc.numPages);
}

function incrementDocZoomLevel(zoom)
{
    setDocZoomLevel(pdfScale+zoom);
}

function setDocZoomLevel(zoom)
{
    if (zoom <= 0.05) return; // Min 5%
    if (zoom >= 10.0) return; // Max 1000%

    pdfScale = zoom;
    queueRenderPage(curPDFPage);

    $('#doc-zoom-100').html(Math.round(pdfScale*100)+'%');
}