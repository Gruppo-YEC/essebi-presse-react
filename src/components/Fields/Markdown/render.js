/**
 * Rendering Markdown minimale per l'anteprima del campo.
 *
 * Scritto a mano invece di aggiungere una dipendenza: copre il sottoinsieme che
 * si usa in questi campi (titoli, enfasi, codice, elenchi, collegamenti, citazioni,
 * righe orizzontali) e tiene il framework senza librerie in più.
 *
 * L'input è testo scritto da chi amministra, ma viene comunque messo in sicurezza
 * prima di qualsiasi altra elaborazione: il valore finisce in dangerouslySetInnerHTML,
 * e un tag scritto nel campo non deve diventare markup attivo.
 */

function escapeHtml(testo) {
    return String(testo)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Elementi inline, applicati dopo l'escape. */
function inline(testo) {
    let s = testo;

    // Il codice va per primo: dentro i backtick non si applica altra sintassi.
    // Il segnaposto è delimitato da \u0000, che non può comparire in un testo
    // scritto da una persona. Un segnaposto numerico come " 3 " colliderebbe
    // con i numeri della frase ("è 5 giorni o meno") corrompendo il contenuto.
    const codici = [];
    s = s.replace(/`([^`]+)`/g, (_, codice) => {
        codici.push(codice);
        return `\u0000${codici.length - 1}\u0000`;
    });

    // [testo](url) — solo http, https e mailto, per non introdurre javascript:
    s = s.replace(/\[([^\]]+)\]\(((?:https?:|mailto:)[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');

    // URL nudi, che nelle istruzioni si scrivono spesso senza parentesi
    s = s.replace(/(^|\s)(https?:\/\/[^\s<]+)/g,
        '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');

    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codici[Number(i)]}</code>`);
}

/**
 * Markdown → HTML.
 * @param {string} testo
 * @returns {string} HTML già messo in sicurezza
 */
export function renderMarkdown(testo) {
    if (!testo) return '';

    const righe = escapeHtml(testo).split('\n');
    const out = [];

    let inLista = false;
    let inListaNumerata = false;
    let inCodice = false;
    let bufferCodice = [];

    const chiudiListe = () => {
        if (inLista) { out.push('</ul>'); inLista = false; }
        if (inListaNumerata) { out.push('</ol>'); inListaNumerata = false; }
    };

    righe.forEach((riga) => {
        // blocco di codice delimitato da ```
        if (/^\s*```/.test(riga)) {
            if (inCodice) {
                out.push(`<pre><code>${bufferCodice.join('\n')}</code></pre>`);
                bufferCodice = [];
                inCodice = false;
            } else {
                chiudiListe();
                inCodice = true;
            }
            return;
        }
        if (inCodice) { bufferCodice.push(riga); return; }

        if (riga.trim() === '') { chiudiListe(); return; }

        // riga orizzontale
        if (/^\s*(---|\*\*\*|___)\s*$/.test(riga)) {
            chiudiListe();
            out.push('<hr>');
            return;
        }

        // titoli
        const titolo = riga.match(/^\s*(#{1,6})\s+(.*)$/);
        if (titolo) {
            chiudiListe();
            const livello = titolo[1].length;
            out.push(`<h${livello}>${inline(titolo[2])}</h${livello}>`);
            return;
        }

        // citazione
        const citazione = riga.match(/^\s*&gt;\s?(.*)$/);
        if (citazione) {
            chiudiListe();
            out.push(`<blockquote>${inline(citazione[1])}</blockquote>`);
            return;
        }

        // elenco numerato
        const numerata = riga.match(/^\s*\d+[.)]\s+(.*)$/);
        if (numerata) {
            if (inLista) { out.push('</ul>'); inLista = false; }
            if (!inListaNumerata) { out.push('<ol>'); inListaNumerata = true; }
            out.push(`<li>${inline(numerata[1])}</li>`);
            return;
        }

        // elenco puntato, anche annidato di un livello
        const puntata = riga.match(/^(\s*)[-*+]\s+(.*)$/);
        if (puntata) {
            if (inListaNumerata) { out.push('</ol>'); inListaNumerata = false; }
            if (!inLista) { out.push('<ul>'); inLista = true; }
            const annidato = puntata[1].length >= 2 ? ' class="md-nested"' : '';
            out.push(`<li${annidato}>${inline(puntata[2])}</li>`);
            return;
        }

        // paragrafo, o continuazione della voce di elenco precedente
        if (inLista || inListaNumerata) {
            out.push(`<li class="md-continua">${inline(riga.trim())}</li>`);
        } else {
            out.push(`<p>${inline(riga.trim())}</p>`);
        }
    });

    if (inCodice && bufferCodice.length) {
        out.push(`<pre><code>${bufferCodice.join('\n')}</code></pre>`);
    }
    chiudiListe();

    return out.join('\n');
}
