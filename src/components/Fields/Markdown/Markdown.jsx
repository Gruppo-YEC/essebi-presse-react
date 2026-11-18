import React, { useEffect, useRef, useState } from 'react';
import { renderMarkdown } from './render';
import Icon from '../../BodyElements/Icon';

/**
 * Markdown
 * Props: { entity, update, value, fieldKey, options }
 * - update: function(fieldKey, newValue) -> chiamata a ogni modifica
 * - value: valore iniziale
 * - entity: non usato
 * - options: rows (righe della textarea, default 18)
 *
 * Campo di testo per contenuti in Markdown, con gli strumenti per scriverlo
 * senza doverne ricordare la sintassi: scorciatoie da tastiera, anteprima e
 * promemoria della sintassi nel piede.
 *
 * Serve dove il valore salvato deve essere esattamente quello che verrà usato,
 * tipicamente contenuti destinati a un modello di linguaggio. Con un editor HTML
 * il testo va convertito prima dell'uso e la conversione perde informazione:
 * l'enfasi e i riferimenti a codice si appiattiscono, e chi scrive non vede più
 * corrispondenza fra quello che ha davanti e quello che viene consumato.
 *
 * Il testo vive nello stato locale e si sincronizza con la prop value, come negli
 * altri campi del framework: le operazioni della barra devono poter riposizionare
 * il cursore subito dopo la modifica, e attendere il ritorno del valore dal
 * componente padre renderebbe la posizione inaffidabile.
 */

export default function Markdown({ entity, update, value = '', fieldKey, options = {} }) {

    const [testo, setTesto] = useState(value ?? '');
    const [vista, setVista] = useState('scrivi');      // scrivi | affiancati | anteprima
    const areaRef = useRef(null);

    // posizione del cursore da applicare dopo il prossimo render
    const selezioneDaRipristinare = useRef(null);

    const righe = options && options.rows ? options.rows : 18;

    // Mantiene lo stato locale allineato se il valore cambia dal padre
    useEffect(() => {
        if (typeof value === 'string' && value !== testo) {
            setTesto(value);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    // Riposiziona il cursore dopo una modifica fatta dalla barra
    useEffect(() => {
        const posizione = selezioneDaRipristinare.current;
        if (!posizione || !areaRef.current) return;

        selezioneDaRipristinare.current = null;
        areaRef.current.focus();
        areaRef.current.setSelectionRange(posizione[0], posizione[1]);
    }, [testo]);

    const emitUpdate = (next) => {
        if (typeof update === 'function') {
            try { update(fieldKey, next); } catch (_) { }
        }
    };

    const handleChange = (e) => {
        const next = e.target.value;
        setTesto(next);
        emitUpdate(next);
    };

    /** Applica un nuovo testo e programma la posizione del cursore. */
    const applica = (next, inizio, fine) => {
        selezioneDaRipristinare.current = [inizio, fine ?? inizio];
        setTesto(next);
        emitUpdate(next);
    };

    // ------------------------------------------------------------ comandi

    const avvolgi = (marcatore) => {
        const area = areaRef.current;
        if (!area) return;

        const da = area.selectionStart;
        const a  = area.selectionEnd;
        const selezione = testo.slice(da, a);

        // già avvolto: si rimuove, così il comando funziona da interruttore
        const prima = testo.slice(Math.max(0, da - marcatore.length), da);
        const dopo  = testo.slice(a, a + marcatore.length);

        if (selezione && prima === marcatore && dopo === marcatore) {
            const next = testo.slice(0, da - marcatore.length)
                       + selezione
                       + testo.slice(a + marcatore.length);
            applica(next, da - marcatore.length, a - marcatore.length);
            return;
        }

        const next = testo.slice(0, da) + marcatore + selezione + marcatore + testo.slice(a);
        const inizio = da + marcatore.length;
        applica(next, inizio, inizio + selezione.length);
    };

    const inserisciLink = () => {
        const area = areaRef.current;
        if (!area) return;

        const da = area.selectionStart;
        const a  = area.selectionEnd;
        const etichetta = testo.slice(da, a) || 'testo del collegamento';

        const next = testo.slice(0, da) + '[' + etichetta + '](https://)' + testo.slice(a);
        // il cursore si posiziona dentro l'indirizzo, che è la parte da completare
        const inizioUrl = da + etichetta.length + 3 + 8;
        applica(next, inizioUrl, inizioUrl);
    };

    // ----------------------------------------------------------- tastiera

    const handleKeyDown = (e) => {
        const meta = e.metaKey || e.ctrlKey;

        if (meta && e.key.toLowerCase() === 'b') { e.preventDefault(); avvolgi('**'); return; }
        if (meta && e.key.toLowerCase() === 'i') { e.preventDefault(); avvolgi('*');  return; }
        if (meta && e.key.toLowerCase() === 'k') { e.preventDefault(); inserisciLink(); return; }

        // Tab indenta invece di spostare il fuoco fuori dal campo
        if (e.key === 'Tab') {
            e.preventDefault();
            const da = e.target.selectionStart;
            const a  = e.target.selectionEnd;
            const next = testo.slice(0, da) + '  ' + testo.slice(a);
            applica(next, da + 2);
            return;
        }

        // Invio dentro un elenco continua l'elenco
        if (e.key === 'Enter') {
            const da = e.target.selectionStart;
            const inizioRiga = testo.lastIndexOf('\n', da - 1) + 1;
            const riga = testo.slice(inizioRiga, da);

            const elenco = riga.match(/^(\s*)([-*+]|\d+[.)])\s+/);
            if (!elenco) return;

            // voce vuota: l'elenco si chiude invece di aggiungere marcatori a vuoto
            if (riga.trim() === elenco[2]) {
                e.preventDefault();
                const next = testo.slice(0, inizioRiga) + testo.slice(da);
                applica(next, inizioRiga);
                return;
            }

            e.preventDefault();
            const marcatore = /^\d/.test(elenco[2])
                ? (parseInt(elenco[2], 10) + 1) + '. '
                : elenco[2] + ' ';
            const inserimento = '\n' + elenco[1] + marcatore;
            const next = testo.slice(0, da) + inserimento + testo.slice(e.target.selectionEnd);
            applica(next, da + inserimento.length);
        }
    };

    // ------------------------------------------------------------- render

    const mostraEditor    = vista === 'scrivi' || vista === 'affiancati';
    const mostraAnteprima = vista === 'anteprima' || vista === 'affiancati';

    return (
        <div className="ckd-markdown">

            <div className="ckd-markdown__barra">
                <div className="ckd-markdown__viste">
                    {[
                        ['scrivi',     'pen',           'Scrivi'],
                        ['affiancati', 'table-columns', 'Testo e anteprima'],
                        ['anteprima',  'eye',           'Anteprima'],
                    ].map(([chiave, icona, titolo]) => (
                        <button
                            key={chiave}
                            type="button"
                            title={titolo}
                            aria-label={titolo}
                            aria-pressed={vista === chiave}
                            className={vista === chiave ? 'attivo' : ''}
                            onClick={() => setVista(chiave)}
                        >
                            <Icon name={icona} />
                        </button>
                    ))}
                </div>
            </div>

            <div className={'ckd-markdown__corpo ckd-markdown__corpo--' + vista}>
                {mostraEditor && (
                    <textarea
                        ref={areaRef}
                        className="ckd-markdown__area"
                        rows={righe}
                        value={testo}
                        spellCheck={true}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        placeholder={'### Titolo di sezione\n\n**grassetto**, *corsivo*, `codice`\n\n- primo punto\n- secondo punto'}
                    />
                )}

                {mostraAnteprima && (
                    <div
                        className="ckd-markdown__anteprima"
                        // renderMarkdown mette in sicurezza il testo prima di produrre HTML
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(testo) }}
                    />
                )}
            </div>

            <div className="ckd-markdown__piede">
                <span className="ckd-markdown__aiuto">
                    <code>**grassetto**</code>
                    <code>*corsivo*</code>
                    <code>`codice`</code>
                    <code>### titolo</code>
                    <code>- elenco</code>
                    <code>[testo](url)</code>
                </span>
                <span>{testo.length} caratteri</span>
            </div>
        </div>
    );
};
