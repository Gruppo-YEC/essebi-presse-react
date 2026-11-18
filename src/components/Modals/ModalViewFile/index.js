import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Alert } from '../../ui/alert';
import { Spinner } from '../../ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../ui/dialog';
import { LanguageProvider } from '../../../core/language-provider';
import { ResourceManager } from '../../../core/resource-manager';
import { settings } from '../../../config/settings';
import Icon from '../../BodyElements/Icon';


export default function ModalViewFile({ data, closeModalViewFile }) {

    const [isLoading, setIsLoading] = useState(true);
    const [statusModalViewFile, setStatusModalViewFile] = useState(false);
    const [fileLink, setFileLink] = useState(null);


    useEffect(() => {
        if (data !== null) {
            setStatusModalViewFile(true)
            console.warn(data)
            var link = ResourceManager.getFileUrl(data, data.entity)
            setFileLink(link)
            setIsLoading(false)
        }
        else {
            setStatusModalViewFile(false)
        }
    }, [data]);


    async function downloadFile(rD) {
        var response = await ResourceManager.getFile(rD.hash, rD.entity)
        if (response.success === 1 && response.base64) {
            var raw = response.base64
            var byteString, mime
            if (raw.indexOf(',') !== -1) {
                var parts = raw.split(',')
                var mimeMatch = parts[0].match(/:(.*?);/)
                mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
                byteString = atob(parts[1])
            } else {
                mime = 'application/octet-stream'
                byteString = atob(raw)
            }
            var ab = new ArrayBuffer(byteString.length)
            var ia = new Uint8Array(ab)
            for (var i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i)
            }
            var blob = new Blob([ab], { type: mime })
            var url = URL.createObjectURL(blob)
            var a = document.createElement('a')
            a.href = url
            a.download = rD.filename || (rD.hash + '.' + rD.extension)
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        }
    }


    function close() {
        closeModalViewFile()
        setIsLoading(true)
    }



    if (data !== null) {
        return (
            <>
                <Dialog open={statusModalViewFile} onOpenChange={(open) => { if (!open) close() }}>
                    <DialogContent size="fullscreen" onPointerDownOutside={(e) => e.preventDefault()}>
                        <DialogHeader>
                            <DialogTitle>
                                {LanguageProvider.get('defaults.preview')} {(data.filename) ? (<>{data.filename}</>) : (<></>)}
                            </DialogTitle>
                        </DialogHeader>
                        <DialogBody>
                            {(!isLoading && fileLink !== null) ? (
                                <>
                                    {(() => {
                                        switch (data.extension.toUpperCase()) {
                                            case 'JPG':
                                            case 'JPEG':
                                            case 'PNG': return (
                                                <img
                                                    src={fileLink}
                                                    alt="image"
                                                    width={'100%'}
                                                    height={'auto'}
                                                />
                                            );
                                            case 'PDF': return (
                                                <iframe src={fileLink+'#toolbar=0'}
                                                    title="preview"
                                                    height="100%"
                                                    width="100%"
                                                    style={{ display: 'block', position: 'relative', minHeight: '75vh' }}
                                                />
                                            );
                                            case 'DOCX':
                                            case 'DOC': {
                                                var link = 'https://view.officeapps.live.com/op/view.aspx?src=' + fileLink
                                                return (
                                                    <>
                                                        <iframe src={link}
                                                            title="preview"
                                                            height="100%"
                                                            width="100%"
                                                            style={{ display: 'block', position: 'relative', minHeight: '75vh' }}
                                                        />
                                                    </>
                                                )
                                            };
                                            default: return (
                                                <div style={{ display: 'flex', minHeight: '100%', justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
                                                    <Alert variant='primary'>
                                                        Preview non disponibile. Scarica il file.
                                                    </Alert>
                                                </div>
                                            );
                                        }
                                    })()}
                                </>
                            ) : (
                                <Spinner variant="primary" />
                            )}
                        </DialogBody>
                        <DialogFooter>
                            <Button onClick={() => downloadFile(data)} variant="outline-primary">
                                <Icon name="download" className='me-2' /> {LanguageProvider.get('defaults.download')}
                            </Button>
                            <Button variant="secondary" onClick={close}>
                                {LanguageProvider.get('defaults.close')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        );
    }
};
