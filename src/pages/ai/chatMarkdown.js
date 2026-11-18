/**
 * Markdown -> HTML per le risposte dell'assistente AI.
 *
 * Il framework ha gia' un render markdown (components/Fields/Markdown), ma non
 * conosce le tabelle, che sono il formato in cui l'assistente restituisce quasi
 * ogni elenco: una classifica o un raggruppamento in righe di testo non si
 * leggono. Quindi un render dedicato, piccolo e con le tabelle.
 *
 * Il testo arriva da un modello, cioe' da fuori: prima di qualsiasi altra cosa
 * viene messo in sicurezza con l'escape, perche' il risultato finisce in
 * dangerouslySetInnerHTML e un tag scritto nella risposta non deve diventare
 * markup attivo. Tutta la sintassi si applica DOPO l'escape, sul testo
 * innocuo — per questo i confronti sono su `&gt;` e non su `>`.
 *
 * Il sottoinsieme e' quello che il system prompt chiede all'assistente:
 * paragrafi, titoli, grassetto/corsivo, codice, elenchi, tabelle e link.
 */

function escapeHtml(text) {
    return String(text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Sintassi inline, applicata su testo gia' escapato.
 *
 * Il codice va per primo: dentro i backtick non si applica altra sintassi. Il
 * segnaposto e' delimitato da \u0000, che in una risposta non puo' comparire: uno
 * numerico come " 3 " colliderebbe con i numeri della frase, e qui di numeri ce
 * n'e' in ogni riga.
 */
function inline(text) {
    let s = text;

    const codes = [];
    s = s.replace(/`([^`]+)`/g, (_, code) => {
        codes.push(code);
        return `\u0000${codes.length - 1}\u0000`;
    });

    // Solo http, https e mailto: un [testo](javascript:...) non deve passare.
    s = s.replace(/\[([^\]]+)\]\(((?:https?:|mailto:)[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Link interni al gestionale (/entity/customer/item?id=12): il system
    // prompt chiede al modello di citare i record cosi'. Niente target: li
    // intercetta ChatMessage e li apre col router, senza ricaricare la pagina.
    // Escluso '//' (sarebbe un host esterno) e qualsiasi cosa non cominci per '/'.
    s = s.replace(/\[([^\]]+)\]\((\/(?!\/)[^\s)]*)\)/g,
        '<a href="$2" data-internal="1">$1</a>');

    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');

    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[Number(i)]}</code>`);
}

/** Celle di una riga di tabella markdown: |a|b|c| -> ['a','b','c']. */
function cells(row) {
    const trimmed = row.trim().replace(/^\|/, '').replace(/\|$/, '');
    return trimmed.split('|').map((c) => c.trim());
}

/**
 * Riga separatore di una tabella: |---|:--:|
 * E' quella che distingue una tabella da un paragrafo che comincia per "|".
 */
function isTableSeparator(row) {
    return /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(row) && row.includes('-');
}

/**
 * Allineamento dichiarato nel separatore: :--- sinistra, ---: destra, :--: centro.
 * Serve a mettere gli importi a destra, che e' come si leggono.
 */
function alignments(separator) {
    return cells(separator).map((c) => {
        const left = c.startsWith(':');
        const right = c.endsWith(':');
        if (left && right) return 'center';
        if (right) return 'right';
        return 'left';
    });
}

function tableHtml(lines) {
    const align = alignments(lines[1]);
    const style = (i) => (align[i] && align[i] !== 'left' ? ` style="text-align:${align[i]}"` : '');

    /* Ogni riga ha tante celle quante l'intestazione: una riga corta viene
       riempita, una lunga tagliata, cosi' le colonne non si sfalsano. */
    const headCells = cells(lines[0]);
    const n = headCells.length;
    const head = headCells
        .map((c, i) => `<th${style(i)}>${inline(c)}</th>`).join('');
    const body = lines.slice(2)
        .filter((l) => l.trim() !== '')
        .map((l) => {
            const cs = cells(l).slice(0, n);
            while (cs.length < n) cs.push('');
            return '<tr>' + cs.map((c, i) => `<td${style(i)}>${inline(c)}</td>`).join('') + '</tr>';
        })
        .join('');

    /* Il wrapper serve allo scroll orizzontale: una tabella con sei colonne
       dentro una bolla di chat non ci sta, e senza contenitore allargherebbe
       tutta la pagina. */
    return `<div class="chat-table-wrap"><table>`
        + `<thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/**
 * Markdown -> HTML.
 * @param {string} text
 * @returns {string} HTML gia' messo in sicurezza
 */
export function renderChatMarkdown(text) {
    if (!text) return '';

    const lines = escapeHtml(text).split('\n');
    const out = [];

    let list = null;      // 'ul' | 'ol' | null
    let paragraph = [];

    const closeList = () => {
        if (list) { out.push(`</${list}>`); list = null; }
    };
    const closeParagraph = () => {
        if (paragraph.length) {
            out.push(`<p>${inline(paragraph.join(' '))}</p>`);
            paragraph = [];
        }
    };
    const closeAll = () => { closeParagraph(); closeList(); };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Tabella: riga di intestazione + separatore, poi le righe che seguono.
        if (line.trim().startsWith('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
            closeAll();
            const block = [line, lines[i + 1]];
            let j = i + 2;
            while (j < lines.length && lines[j].trim().startsWith('|')) block.push(lines[j++]);
            out.push(tableHtml(block));
            i = j - 1;
            continue;
        }

        if (line.trim() === '') {
            /* Riga vuota dentro un elenco: i modelli spesso separano le voci
               con una riga vuota. Se la prossima riga non vuota e' ancora una
               voce dello stesso tipo, l'elenco resta aperto: altrimenti ogni
               voce numerata diventerebbe un elenco a se', tutti "1.". */
            if (list) {
                let k = i + 1;
                while (k < lines.length && lines[k].trim() === '') k++;
                const next = k < lines.length ? lines[k] : '';
                const sameKind = list === 'ol' ? /^\s*\d+[.)]\s+/.test(next) : /^\s*[-*+]\s+/.test(next);
                if (sameKind) { closeParagraph(); continue; }
            }
            closeAll();
            continue;
        }

        const heading = line.match(/^\s*(#{1,6})\s+(.*)$/);
        if (heading) {
            closeAll();
            /* I titoli scendono di due livelli: dentro una conversazione un h1
               competerebbe col titolo della pagina. */
            const level = Math.min(heading[1].length + 2, 6);
            out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
            continue;
        }

        if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
            closeAll();
            out.push('<hr>');
            continue;
        }

        const quote = line.match(/^\s*&gt;\s?(.*)$/);
        if (quote) {
            closeAll();
            out.push(`<blockquote>${inline(quote[1])}</blockquote>`);
            continue;
        }

        const ordered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
        if (ordered) {
            closeParagraph();
            if (list === 'ul') closeList();
            if (!list) { out.push('<ol>'); list = 'ol'; }
            /* value: il numero scritto dal modello vince sul conteggio del
               browser, cosi' un elenco che riprende dopo una tabella o un
               paragrafo continua da dove era. */
            out.push(`<li value="${ordered[1]}">${inline(ordered[2])}</li>`);
            continue;
        }

        const bullet = line.match(/^(\s*)[-*+]\s+(.*)$/);
        if (bullet) {
            closeParagraph();
            if (list === 'ol') closeList();
            if (!list) { out.push('<ul>'); list = 'ul'; }
            const nested = bullet[1].length >= 2 ? ' class="chat-md-nested"' : '';
            out.push(`<li${nested}>${inline(bullet[2])}</li>`);
            continue;
        }

        /* Riga di testo: si accumula invece di chiudere subito un paragrafo,
           cosi' una frase spezzata su due righe resta una frase e non diventa
           due paragrafi con lo spazio in mezzo. */
        if (list) {
            out.push(`<li class="chat-md-cont">${inline(line.trim())}</li>`);
        } else {
            paragraph.push(line.trim());
        }
    }

    closeAll();
    return out.join('\n');
}
