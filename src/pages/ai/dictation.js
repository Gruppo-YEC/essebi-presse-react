import { useEffect, useRef, useState } from 'react';

/**
 * Dettatura con la Web Speech API del browser (SpeechRecognition).
 *
 * Funziona su Chrome, Edge e Safari (anche iOS); Firefox non la espone, e in
 * quel caso `supported` e' false e il bottone non compare. Il riconoscimento
 * non avviene in locale: Chrome manda l'audio ai server di Google, Safari a
 * quelli di Apple. Il testo riconosciuto viene passato a `onText` con la
 * trascrizione parziale mentre si parla e quella definitiva a fine frase.
 */
const Recognition = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;

export const dictationSupported = Boolean(Recognition);

export function useDictation({ lang = 'it-IT', onText, onEnd } = {}) {
    const [listening, setListening] = useState(false);
    const recRef = useRef(null);
    const finalRef = useRef('');
    const cbRef = useRef({ onText, onEnd });
    cbRef.current = { onText, onEnd };

    useEffect(() => () => { recRef.current?.abort?.(); }, []);

    function start() {
        if (!Recognition || recRef.current) return;
        const rec = new Recognition();
        rec.lang = lang;
        rec.continuous = true;
        rec.interimResults = true;
        finalRef.current = '';
        rec.onresult = (e) => {
            let interim = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const r = e.results[i];
                if (r.isFinal) finalRef.current += r[0].transcript;
                else interim += r[0].transcript;
            }
            cbRef.current.onText?.(finalRef.current + interim, finalRef.current);
        };
        rec.onerror = (e) => {
            /* 'no-speech' e 'aborted' sono normali; gli altri (permesso
               negato, rete) chiudono la dettatura */
            if (e.error !== 'no-speech' && e.error !== 'aborted') console.warn('Dettatura:', e.error);
        };
        rec.onend = () => {
            recRef.current = null;
            setListening(false);
            cbRef.current.onEnd?.(finalRef.current);
        };
        recRef.current = rec;
        setListening(true);
        try { rec.start(); }
        catch { recRef.current = null; setListening(false); }
    }

    function stop() {
        recRef.current?.stop();
    }

    /* Interrompe senza consegnare altro testo: usato all'invio, altrimenti
       il risultato finale arriva DOPO che l'input e' stato svuotato e lo
       ripopola. */
    function abort() {
        const rec = recRef.current;
        if (!rec) return;
        rec.onresult = null;
        rec.onend = null;
        recRef.current = null;
        setListening(false);
        try { rec.abort(); } catch { /* gia' fermo */ }
    }

    return { supported: dictationSupported, listening, start, stop, abort, toggle: () => (listening ? stop() : start()) };
}
