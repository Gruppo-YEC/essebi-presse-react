/*
 * Copertina di un catalogo dalla prima pagina del suo PDF (27/11/2026), tutto nel browser con
 * pdf.js (pdfjs-dist). pdf.js si carica solo quando serve (import dinamico): non pesa sul
 * resto del gestionale.
 */

/** Larghezza dell'immagine generata in pixel: nitida anche sugli schermi ad alta densità */
const COVER_WIDTH = 1200;
/** Qualità JPEG (0-1) */
const COVER_QUALITY = 0.85;

let pdfjsPromise = null;

function loadPdfjs() {
    pdfjsPromise ??= Promise.all([
        import('pdfjs-dist'),
        import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfjs, worker]) => {
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        return pdfjs;
    });
    return pdfjsPromise;
}

/** "data:application/pdf;base64,..." o base64 nudo → byte */
function base64ToBytes(base64) {
    const raw = atob(base64.replace(/^data:[^,]*,/, ''));
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes;
}

/**
 * Prima pagina del PDF (base64) → immagine JPEG come data URL, larga COVER_WIDTH pixel,
 * su fondo bianco (le pagine trasparenti non diventano nere).
 */
export async function pdfFirstPageToJpeg(base64) {
    const pdfjs = await loadPdfjs();
    const pdf = await pdfjs.getDocument({ data: base64ToBytes(base64) }).promise;
    try {
        const page = await pdf.getPage(1);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: COVER_WIDTH / base.width });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        return canvas.toDataURL('image/jpeg', COVER_QUALITY);
    } finally {
        pdf.destroy();
    }
}
