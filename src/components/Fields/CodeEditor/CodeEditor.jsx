import React, { useEffect, useRef, useState } from "react";

/**
 * CodeEditor (semplificato)
 * Props: { entity, update, value, fieldKey, options }
 * - update: function(fieldKey, newValue) -> chiamata ad ogni modifica
 * - value: valore iniziale
 * - entity: non usato
 * - options: accettato ma ignorato per la visualizzazione (niente evidenziazione linguaggio)
 *
 * Funzioni chiave:
 * - Modifica in <textarea>
 * - Supporto TAB (indent / unindent con Shift+Tab, o inserimento tab singolo)
 * - Stile dark identico alla versione precedente, ma senza token/tema per linguaggi
 */
export default function CodeEditor({ entity, update, value = "", fieldKey, options = {} }) {
    const [code, setCode] = useState(value ?? "");
    const textareaRef = useRef(null);
    const preRef = useRef(null);

    // Mantieni sincronizzato lo stato locale se cambia "value" dal padre
    useEffect(() => {
        if (typeof value === "string" && value !== code) {
            setCode(value);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const emitUpdate = (next) => {
        if (typeof update === "function") {
            try { update(fieldKey, next); } catch (_) { }
        }
    };

    const handleChange = (e) => {
        const next = e.target.value;
        setCode(next);
        emitUpdate(next);
    };

    const handleKeyDown = (e) => {
        const ta = textareaRef.current;
        if (!ta) return;

        // Supporto TAB (indentazione / disindentazione)
        if (e.key === "Tab") {
            e.preventDefault();
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            const val = ta.value;
            const hasSelection = start !== end;
            const indent = "\t"; // ampiezza visiva gestita da CSS (tab-size)

            if (hasSelection) {
                const before = val.slice(0, start);
                const selection = val.slice(start, end);
                const after = val.slice(end);

                if (e.shiftKey) {
                    // Unindent: rimuovi un TAB o due spazi ad inizio riga
                    const unindented = selection.replace(/(^|\n)(\t|  )/g, (m, p) => p);
                    const next = before + unindented + after;
                    setCode(next);
                    emitUpdate(next);
                    const newEnd = start + unindented.length;
                    requestAnimationFrame(() => {
                        ta.selectionStart = start;
                        ta.selectionEnd = newEnd;
                    });
                } else {
                    // Indenta tutte le righe selezionate
                    const indented = selection.replace(/(^|\n)/g, `$1${indent}`);
                    const next = before + indented + after;
                    setCode(next);
                    emitUpdate(next);
                    const added = indented.length - selection.length;
                    requestAnimationFrame(() => {
                        ta.selectionStart = start + indent.length;
                        ta.selectionEnd = end + added;
                    });
                }
            } else {
                // Nessuna selezione: inserisci un TAB nel punto di inserimento
                const before = val.slice(0, start);
                const after = val.slice(end);
                const next = before + indent + after;
                setCode(next);
                emitUpdate(next);
                requestAnimationFrame(() => {
                    ta.selectionStart = ta.selectionEnd = start + indent.length;
                });
            }
        }
    };

    const syncScroll = (e) => {
        const t = e.target;
        const pre = preRef.current;
        if (!pre) return;
        pre.scrollTop = t.scrollTop;
        pre.scrollLeft = t.scrollLeft;
    };

    const escapeHTML = (str = "") =>
        str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");

    return (
        <div className="ce-wrap">
            <div className="ce-editor">
                {/* layer di visualizzazione: semplice testo, nessuna evidenziazione */}
                <pre ref={preRef} className="ce-pre" aria-hidden>
                    <code dangerouslySetInnerHTML={{ __html: escapeHTML(code) + "\n" }} />
                </pre>

                {/* layer di input */}
                <textarea
                    ref={textareaRef}
                    className="ce-textarea"
                    value={code}
                    onChange={handleChange}
                    onScroll={syncScroll}
                    onKeyDown={handleKeyDown}
                    spellCheck={false}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    placeholder="Scrivi qui…"
                />
            </div>

            {/* Stili: identici alla versione precedente, senza classi token */}
            <style>{`
        .ce-wrap { width: 100%; }
        .ce-editor {
          position: relative;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          box-shadow: inset 0 1px 0 rgba(0,0,0,0.02);
          background: #0b1021; /* deep navy */
          color: #e6e6e6;
          overflow: hidden;
        }
        .ce-pre, .ce-textarea {
          margin: 0;
          box-sizing: border-box;
          padding: 14px 16px;
          line-height: 1.5;
          font-size: 14px;
          tab-size: 2;
          white-space: pre-wrap;
          word-break: normal;
          overflow: auto;
          height: 360px;
        }
        .ce-pre {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .ce-pre code { color: #e6e6e6; }

        .ce-textarea {
          position: relative;
          display: block;
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          color: transparent; /* caret visibile, testo mostrato dal layer <pre> */
          caret-color: #9dd9ff;
          resize: vertical;
        }

        /* Griglia di lettura sottile */
        .ce-editor::before {
          content: "";
          position: absolute; inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 100% 24px; /* griglia basata sulla line-height */
          pointer-events: none;
        }
      `}</style>
        </div>
    );
}