import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Alert, AlertHeading } from '../../ui/alert';
import { PickerBox, PickerRequiredInput, FileDropzone } from '../../ui/picker-box';
import { Attachment } from '../../ui/attachment';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../ui/dialog';
import { LanguageProvider } from '../../../core/language-provider';
import { ResourceManager } from '../../../core/resource-manager';
import Icon from '../../BodyElements/Icon';


export default function File({ field, label, options, validation, value, update, entity }) {

    const [showModal, setShowModal] = useState(false)
    const [uploading, setUploading] = useState(false);
    const [base64, setBase64] = useState('');
    const [name, setName] = useState('');
    const [errors, setErrors] = useState('');


    const onChange = async (e) => {
        e.preventDefault();
        var selected = e.target.files[0]
        setName(selected.name)
        let select_to_base64 = await blobToBase64(selected)
        setBase64(select_to_base64)
    };

    const blobToBase64 = (blob) => {
        return new Promise((resolve, _) => {
            const fileReader = new FileReader();
            fileReader.readAsDataURL(blob);
            fileReader.onloadend = function () {
                resolve(fileReader.result); // Here is the base64 string
            }
        });
    }

    async function uploadFile() {
        if (base64 !== '') {
            setErrors('')
            setUploading(true)
            let response = await ResourceManager.uploadBase64(base64, name, entity)
            setUploading(false)
            if (response.success === 1) {
                setBase64('')
                var t = response.body
                t.entity = entity
                save(t)
                closeModal()
            }
            else {
                console.warn(response)
                setErrors(response.message)
            }
        }
        else {
            console.log('select a file...')
        }
    }


    function save(data) {
        update(field, data)
    }

    function closeModal() {
        setShowModal(false)
    }

    function openModal() {
        setShowModal(true)
        setErrors('')
    }

    function removeFile(value, entity) {
        console.warn("removing file: ", value, entity)
        update(field, null)
    }


    return (
        <>
            <div>
                <Label className='text-sm'>{label}</Label>
                <br />
                <div className='relative'>
                {typeof value !== 'undefined' && value !== null ? (
                    /* file già caricato: si mostra come attachment, con anteprima
                       per le immagini e icona per estensione per il resto */
                    <Attachment
                        name={value.filename}
                        extension={value.extension}
                        thumbnail={validation.type === 'image' ? ResourceManager.getFileUrl(value, entity) : null}
                        onOpen={() => window.open(ResourceManager.getFileUrl(value, entity), '_blank', 'noopener')}
                        actions={[
                            { icon: 'arrow-up-from-bracket', title: 'Sostituisci', onClick: () => openModal() },
                            { icon: 'xmark', title: 'Rimuovi', onClick: () => removeFile(value, entity), danger: true },
                        ]}
                    />
                ) : (
                    <PickerBox
                        icon={validation.type === 'image' ? 'image' : 'file-import'}
                        data-slot='picker-box'
                        data-required={validation.required === true ? 'true' : undefined}
                        data-placeholder=''
                        onAction={() => openModal()}
                        onClick={() => openModal()}
                    />
                )}
                {validation.required === true ? (
                    <PickerRequiredInput value={typeof value !== 'undefined' && value !== null ? '1' : ''} />
                ) : null}
                </div>

            </div>

            <Dialog open={showModal} onOpenChange={(open) => { if (!open) closeModal() }}>
                <DialogContent size="sm">
                    <DialogHeader>
                        <DialogTitle>{LanguageProvider.get('defaults.select_file')}</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        {uploading === false ? (
                            <FileDropzone
                                onChange={onChange}
                                label={LanguageProvider.get('defaults.select_file')}
                                hint={name || null}
                            />
                        ) : (
                            <div className='py-10 text-center text-xl'><Icon name="spinner" spin /></div>
                        )}

                        {errors.length > 0 && (
                            <Alert variant='danger' className='mt-6'>
                                <AlertHeading>{LanguageProvider.get('defaults.error')}</AlertHeading>
                                {errors}
                                <span role='button' className='absolute right-3 top-2 cursor-pointer' onClick={() => setErrors('')}>
                                    <Icon name="xmark" />
                                </span>
                            </Alert>
                        )}
                    </DialogBody>
                    <DialogFooter>
                        {uploading === false ? (
                            <Button variant="primary" onClick={uploadFile}>
                                {LanguageProvider.get('defaults.save')}
                            </Button>
                        ) : (
                            <Button variant="primary" disabled>
                                {LanguageProvider.get('defaults.save')}
                            </Button>
                        )}
                        <Button variant="secondary" onClick={closeModal}>
                            {LanguageProvider.get('defaults.close')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
