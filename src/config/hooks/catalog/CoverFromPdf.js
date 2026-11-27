import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { toast } from '../../../components/ui/toast';
import Icon from '../../../components/BodyElements/Icon';
import { ResourceManager } from '../../../core/resource-manager';
import { pdfFirstPageToJpeg } from './pdf-cover';

/** Cartella dei file di catalog_file (options.entity in tables.json) */
const ENTITY = 'catalog_file';

/** Nome del file della copertina dal titolo: "NOVA 5eT" → "nova-5et-copertina.jpg" */
function coverName(title) {
    const slug = String(title || 'catalogo')
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return (slug || 'catalogo') + '-copertina.jpg';
}

/**
 * Pulsante in cima al form di un catalogo (catalog_file, anche dentro la scheda della gamma):
 * prende il PDF già caricato nel campo File, ne disegna la prima pagina e la carica come
 * Copertina (coverImage). Il record si salva come sempre con il pulsante del form.
 * Montato da InstanceCompilerTopHook.
 */
export default function CoverFromPdf({ data, setDataKeyValue }) {
    const [busy, setBusy] = useState(false);
    const file = data ? data.file : null;
    const hash = file && typeof file === 'object' ? file.hash : file;
    const extension = file && typeof file === 'object' ? String(file.extension || '').toLowerCase() : '';
    const isPdf = !!hash && (extension === '' || extension === 'pdf');
    const hasCover = !!(data && data.coverImage);

    async function generate() {
        if (!isPdf || busy) return;
        setBusy(true);
        const id = toast.loading('Genero la copertina dalla prima pagina…');
        try {
            const res = await ResourceManager.getFile(hash, (file && file.entity) || ENTITY);
            if (!res || res.success !== 1 || !res.base64) throw new Error((res && res.message) || 'PDF non leggibile');
            const jpeg = await pdfFirstPageToJpeg(res.base64);
            const up = await ResourceManager.uploadBase64(jpeg, coverName(data.title), ENTITY);
            if (!up || up.success !== 1) throw new Error((up && up.message) || 'caricamento non riuscito');
            setDataKeyValue('coverImage', { ...up.body, entity: ENTITY });
            toast.update(id, { type: 'success', render: 'Copertina generata: salva per confermarla.' });
        } catch (err) {
            console.warn('Copertina dal PDF:', err);
            toast.update(id, { type: 'error', render: 'Copertina non generata: ' + (err && err.message ? err.message : 'errore') });
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className='mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3'>
            <div className='text-sm'>
                <div className='font-medium'>Copertina dal PDF</div>
                <div className='text-xs text-muted-foreground'>
                    {!hash
                        ? 'Carica prima il file del catalogo.'
                        : !isPdf
                            ? 'Il file non è un PDF: carica la copertina a mano.'
                            : hasCover
                                ? 'La copertina c\'è già: generandola di nuovo viene sostituita.'
                                : 'Usa la prima pagina del PDF come immagine di copertina.'}
                </div>
            </div>
            <Button type='button' variant='outline-primary' size='sm' disabled={!isPdf || busy} onClick={generate}>
                {busy ? <Icon name='spinner' spin className='me-2' /> : <Icon name='image' className='me-2' />}
                {hasCover ? 'Rigenera copertina' : 'Genera copertina dal PDF'}
            </Button>
        </div>
    );
}
