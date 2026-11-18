import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Spinner } from '../../ui/spinner';
import { DataManager } from '../../../core/data-manager';
import { LanguageProvider } from '../../../core/language-provider';
import Icon from '../../BodyElements/Icon';

/**
 * Timeline dei log di un singolo record: riceve `entity` e `id` e mostra lo
 * storico delle modifiche raggruppato per giorno.
 *
 * Le notes dei log standard del framework contengono lo snapshot JSON del
 * body inviato a ogni POST (2_ADD/1_EDIT): il "cosa è cambiato" viene
 * calcolato diffando lo snapshot con quello del log precedente. Le chiamate
 * custom che loggano con notes {"action": "...", ...dettagli} vengono
 * mostrate con l'azione come etichetta e i dettagli in chiaro.
 */

const OPERATION_CONFIG = {
    '2_ADD': { labelKey: 'logs.created', color: '#166534', bg: '#dcfce7' },
    '1_EDIT': { labelKey: 'logs.edited', color: '#1e40af', bg: '#dbeafe' },
    '0_DELETE': { labelKey: 'logs.deleted', color: '#991b1b', bg: '#fee2e2' },
    '3_LOGIN': { labelKey: 'logs.login', color: '#374151', bg: '#f3f4f6' },
};

const parseDate = (v) => new Date(String(v || '').replace(' ', 'T'));

// option → valore nudo (i campi option arrivano come {value, label})
const optVal = (v) => (v && typeof v === 'object' && v.value !== undefined ? v.value : v);

// valore di uno snapshot → stringa compatta per il diff
const printValue = (v, maxLength = 60) => {
    if (v === null || v === undefined || v === '') return '—';
    var s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return s.length > maxLength ? s.slice(0, maxLength) + '…' : s;
};

const parseNotes = (notes) => {
    if (!notes || typeof notes !== 'string') return null;
    var t = notes.trim();
    if (!t.startsWith('{')) return null;
    try { return JSON.parse(t); } catch (e) { return null; }
};

export default function ModalLogs({ entity, id, status, close }) {

    const [logs, setLogs] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (status === true && id) {
            load();
        }
    }, [status, id]);

    async function load() {
        setLoading(true);
        try {
            var constraints = [
                { fieldName: 'entity', type: 'value', value: entity },
                { fieldName: 'idItem', type: 'value', value: id },
            ];
            var response = await DataManager.searchItems('log', 1, 200, { field: 'id', order: 'DESC' }, '', [], constraints);
            setLogs(response.success === 1 ? (response.body || []) : []);
        } catch (e) {
            console.error('ModalLogs load error:', e);
            setLogs([]);
        }
        setLoading(false);
    }

    /**
     * Riga risolta: etichetta/colore, dettagli custom e diff dei campi.
     * `olderSnapshot` è lo snapshot del log precedente (più vecchio), usato
     * per calcolare cosa è cambiato in un 1_EDIT.
     */
    function resolveRow(log, olderSnapshot) {
        var op = optVal(log.operation);
        var parsed = parseNotes(log.notes);

        // audit custom: {"action": "...", ...dettagli}
        if (parsed && parsed.action) {
            var details = Object.entries(parsed)
                .filter(([k, v]) => k !== 'action' && v !== null && v !== undefined && v !== '')
                .map(([k, v]) => `${k}: ${printValue(v, 40)}`)
                .join(' · ');
            var cfg = OPERATION_CONFIG[op] || OPERATION_CONFIG['1_EDIT'];
            return {
                label: parsed.action,
                color: cfg.color,
                bg: cfg.bg,
                detailText: details,
                changes: [],
            };
        }

        var cfg = OPERATION_CONFIG[op];
        var label = cfg
            ? LanguageProvider.get(cfg.labelKey)
            : ((log.operation && typeof log.operation === 'object' ? log.operation.label : log.operation) || '-');

        // diff campo per campo tra lo snapshot di questo log e il precedente
        var changes = [];
        if (op === '1_EDIT' && parsed && olderSnapshot) {
            var keys = Object.keys(parsed);
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var before = olderSnapshot[key];
                var after = parsed[key];
                if (JSON.stringify(before) !== JSON.stringify(after)) {
                    changes.push({
                        field: LanguageProvider.getLabel(entity, key),
                        from: printValue(before),
                        to: printValue(after),
                    });
                }
            }
        }

        return {
            label: label,
            color: cfg ? cfg.color : '#374151',
            bg: cfg ? cfg.bg : '#f3f4f6',
            detailText: '',
            changes: changes,
        };
    }

    // Raggruppa per giorno (i log arrivano DESC: il precedente è l'indice +1)
    const grouped = {};
    (logs || []).forEach((l, index) => {
        var d = parseDate(l.date);
        var key = isNaN(d) ? '-' : d.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
        (grouped[key] = grouped[key] || []).push({ log: l, index: index });
    });

    function olderSnapshotFor(index) {
        var list = logs || [];
        for (var i = index + 1; i < list.length; i++) {
            var parsed = parseNotes(list[i].notes);
            if (parsed && !parsed.action) return parsed;
        }
        return null;
    }

    return (
        <Dialog open={status === true} onOpenChange={(open) => { if (!open) close(); }}>
            <DialogContent size='lg'>
                <DialogHeader>
                    <DialogTitle>
                        <Icon name="clock-rotate-left" className='me-2' />
                        {LanguageProvider.get('logs.title')}
                    </DialogTitle>
                </DialogHeader>
                <DialogBody>
                    {loading || logs === null ? (
                        <div className='py-8 text-center'><Spinner /></div>
                    ) : logs.length === 0 ? (
                        <p className='py-6 text-center text-muted-foreground'>
                            {LanguageProvider.get('logs.no_logs')}
                        </p>
                    ) : (
                        <div className='max-h-[450px] overflow-y-auto'>
                            {Object.entries(grouped).map(([dateLabel, entries]) => (
                                <div key={dateLabel} className='mb-4'>
                                    <div className='mb-2 border-b-2 border-border py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground'>
                                        {dateLabel}
                                    </div>
                                    <table className='w-full border-collapse'>
                                        <tbody>
                                            {entries.map(({ log, index }) => {
                                                var d = parseDate(log.date);
                                                var time = isNaN(d) ? '-' : d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
                                                var u = log.idUser && typeof log.idUser === 'object' ? log.idUser : null;
                                                var userName = u
                                                    ? (`${u.name || ''} ${u.surname || ''}`.trim() || u.username || u.email || '-')
                                                    : '-';
                                                var row = resolveRow(log, olderSnapshotFor(index));
                                                return (
                                                    <tr key={log.id}>
                                                        <td className='w-[50px] py-1.5 align-top text-xs tabular-nums text-muted-foreground'>{time}</td>
                                                        <td className='px-2 py-1.5 align-top'>
                                                            <span
                                                                className='inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-semibold'
                                                                style={{ background: row.bg, color: row.color }}
                                                            >
                                                                {row.label}
                                                            </span>
                                                            {row.detailText ? (
                                                                <div className='mt-0.5 pl-0.5 text-[11px] leading-relaxed text-muted-foreground'>{row.detailText}</div>
                                                            ) : null}
                                                            {row.changes.length > 0 ? (
                                                                <div className='mt-1 pl-0.5'>
                                                                    {row.changes.map((c, ci) => (
                                                                        <div key={ci} className='text-[11px] leading-relaxed text-muted-foreground'>
                                                                            <span className='font-semibold text-foreground/70'>{c.field}</span>
                                                                            {': '}
                                                                            <span className='line-through opacity-70'>{c.from}</span>
                                                                            {' → '}
                                                                            <span className='text-foreground/80'>{c.to}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : null}
                                                        </td>
                                                        <td className='whitespace-nowrap py-1.5 text-right align-top'>
                                                            <span className='rounded bg-muted px-2 py-0.5 text-[11px] text-foreground/80'>{userName}</span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    )}
                </DialogBody>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => close()}>
                        {LanguageProvider.get('defaults.close')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
