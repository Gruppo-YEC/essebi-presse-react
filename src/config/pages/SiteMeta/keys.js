/*
 * Chiavi della tabella site_meta (27/11/2026): cosa contengono, un esempio e i controlli prima
 * del salvataggio. Il valore è testo semplice. Tenere allineato a metaKey in tables.json di
 * essebi-presse-ckd e a custom/public_classes/SiteMeta.php, che le legge.
 * La barra annunci ha la sua tabella (site_announcement), non sta qui.
 *
 * check(text) riceve il valore così come è scritto e ritorna { errors, warnings }:
 *   errors   → il salvataggio è bloccato;
 *   warnings → si salva, ma qualcosa non funzionerà come ci si aspetta.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Destinatari di admin_email (separati da virgola, punto e virgola o spazi) → [{ email, ok }] */
export function recipients(text) {
    return String(text || '')
        .split(/[,;\s]+/)
        .filter((e) => e !== '')
        .map((email) => ({ email, ok: EMAIL.test(email) }));
}

export const META_KEYS = [
    {
        key: 'admin_email',
        label: 'Email amministratore',
        icon: 'envelope',
        help: 'Chi riceve le notifiche dei form del sito (contatti, richieste articolo). Non è mai pubblica.',
        placeholder: 'info@essebipresse.it, commerciale@essebipresse.it',
        example: 'info@essebipresse.it',
        format: 'Uno o più indirizzi separati da virgola; ognuno riceve ogni notifica.',
        multiline: true,
        check(text) {
            const errors = [];
            const warnings = [];
            const list = recipients(text);
            list.filter((r) => !r.ok).forEach((r) => errors.push(`"${r.email}" non è un indirizzo email valido.`));
            if (!list.length) warnings.push('Nessun indirizzo: le notifiche vanno al destinatario di riserva del server (settings.json).');
            const dup = list.map((r) => r.email.toLowerCase()).filter((e, i, a) => a.indexOf(e) !== i);
            if (dup.length) warnings.push(`Indirizzi ripetuti: ${[...new Set(dup)].join(', ')}.`);
            return { errors, warnings };
        },
    },
    {
        key: 'site_version',
        label: 'Versione del sito',
        icon: 'code-branch',
        help: 'Versione del sito pubblicato, letta dal sito con /public/site_meta.',
        placeholder: '1.0.0',
        example: '1.0.0',
        format: 'MAJOR.MINOR.PATCH, es. 1.2.0.',
        multiline: false,
        check(text) {
            const errors = [];
            const warnings = [];
            const v = String(text || '').trim();
            if (!v) errors.push('La versione è vuota.');
            else if (!/^\d+\.\d+\.\d+$/.test(v)) warnings.push('Non è nel formato 1.2.3.');
            return { errors, warnings };
        },
    },
];
