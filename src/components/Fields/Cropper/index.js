import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Alert } from '../../ui/alert';
import { PickerBox, FileDropzone } from '../../ui/picker-box';
import { Attachment } from '../../ui/attachment';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../ui/dialog';
import Cropper from "./Cropper";
import { LanguageProvider } from '../../../core/language-provider';
import { ResourceManager } from '../../../core/resource-manager';
import Icon from '../../BodyElements/Icon';


export default function CropperField({ field, label, options, validation, value, update, entity }) {

    const [showModal, setShowModal] = useState(false)
    const [uploading, setUploading] = useState(false);
    const [image, setImage] = useState('');
    const [cropper, setCropper] = useState('');
    const [errors, setErrors] = useState('');


    async function uploadFile(base64) {
        if(base64 !== '') {
            setUploading(true)
            let filename = Date.now() + '.jpg'
            let response = await ResourceManager.uploadBase64(base64, filename, entity, field)
            setUploading(false)
            if(response.success === 1) {
                update(field, response.body)
                cropper.clear()
                setImage('')
                closeModal()
            }
            else {
                cropper.clear()
                setImage('')
                setErrors(response.message)
            }
        }
        else {
            console.log('select a file...')
        }
    }

    const onChange = (e) => {
        e.preventDefault();
        let files;
        if (e.dataTransfer) {
            files = e.dataTransfer.files;
        } else if (e.target) {
            files = e.target.files;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setImage(reader.result);
        };
        reader.readAsDataURL(files[0]);
    };


    function save() {
        if (typeof cropper !== "undefined") {
            let base64 = cropper.getCroppedCanvas({
                minWidth: 100,
                minHeight: 100,
                width: typeof options !== 'undefined' ? options.width : 1200,
                height: typeof options !== 'undefined' ? options.height : 800
            }).toDataURL()
            uploadFile(base64)
        }
    }

    function closeModal() {
        setImage('')
        setShowModal(false)
        setErrors('')
    }

    function openModal() {
        setShowModal(true)
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
                {typeof value !== 'undefined' && value && validation.type === 'image' ? (
                    /* immagine già caricata: attachment con anteprima, come il campo file */
                    <Attachment
                        name={value.filename}
                        extension={value.extension}
                        thumbnail={ResourceManager.getFileUrl(value, entity)}
                        onOpen={() => window.open(ResourceManager.getFileUrl(value, entity), '_blank', 'noopener')}
                        actions={[
                            { icon: 'arrow-up-from-bracket', title: 'Sostituisci', onClick: () => openModal() },
                            { icon: 'xmark', title: 'Rimuovi', onClick: () => removeFile(value, entity), danger: true },
                        ]}
                    />
                ) : (
                    <PickerBox
                        icon="image"
                        onAction={() => openModal()}
                        onClick={() => openModal()}
                    />
                )}
            </div>


            <Dialog open={showModal} onOpenChange={(open) => { if (!open) closeModal() }}>
                <DialogContent size="lg">
                    <DialogHeader>
                        <DialogTitle>{LanguageProvider.get('defaults.image')}</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        {errors.length > 0 && (
                            <Alert variant='danger' className='mb-4'>
                                {errors}
                            </Alert>
                        )}
                        <FileDropzone
                            onChange={onChange}
                            accept="image/*"
                            label={LanguageProvider.get('defaults.image')}
                            className={image ? 'mb-4 py-4' : ''}
                        />
                        {image ? (
                            <Cropper
                                style={{ height: 400, width: '100%' }}
                                aspectRatio={(() => {
                                    if (typeof options !== 'undefined' && options.width && options.height) {
                                        return options.width / options.height;
                                    }
                                    return 1;
                                })()}
                                src={image}
                                minCropBoxHeight={100}
                                minCropBoxWidth={100}
                                onInitialized={(instance) => {
                                    setCropper(instance);
                                }}
                                guides={true}
                            />
                        ) : null}

                    </DialogBody>
                    <DialogFooter>
                        <Button variant="primary" onClick={save}>
                            {LanguageProvider.get('defaults.save')}
                        </Button>
                        <Button variant="secondary" onClick={closeModal}>
                            {LanguageProvider.get('defaults.close')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
