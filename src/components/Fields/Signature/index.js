import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { PickerBox } from '../../ui/picker-box';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../ui/dialog';
import { LanguageProvider } from '../../../core/language-provider';
import { ResourceManager } from '../../../core/resource-manager';
import Icon from '../../BodyElements/Icon';


export default function Signature({ field, label, options, validation, value, update, entity }) {

    const [showModal, setShowModal] = useState(false)
    const [uploading, setUploading] = useState(false);
    const [base64, setBase64] = useState('');

    const [isDrawing, setIsDrawing] = useState(false);
    const canvasRef = useRef(null);
    const contextRef = useRef(null);


    const startDrawing = ({ nativeEvent }) => {
        const { offsetX, offsetY } = nativeEvent;
        setIsDrawing(true);
        contextRef.current.beginPath();
        contextRef.current.moveTo(offsetX, offsetY);
    };

    const finishDrawing = () => {
        setIsDrawing(false);
    };

    const draw = ({ nativeEvent }) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = nativeEvent;
        contextRef.current.lineTo(offsetX, offsetY);
        contextRef.current.stroke();
    };

    const clearCanvas = () => {
        if (!contextRef.current || !canvasRef.current) return;
        contextRef.current.clearRect(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
        );
    };

    const saveSignature = () => {
        const imageDataURL = canvasRef.current.toDataURL();
        // Do something with the imageDataURL (e.g., save it, send it to the server, etc.)
        console.log(imageDataURL);
        setBase64(imageDataURL)
    };

    // Initialize the canvas context
    useEffect(() => {
        if(showModal) {
            /* il canvas è dentro un portal Radix: aspetta che sia montato */
            requestAnimationFrame(() => {
                const canvas = canvasRef.current;
                if (!canvas) return;
                canvas.width = canvas.offsetWidth;
                canvas.height = canvas.offsetHeight;
                const context = canvas.getContext("2d");
                context.scale(1, 1);
                context.lineCap = "round";
                context.lineWidth = 2;
                context.fillStyle = "lightgray";
                context.fillRect(0, 0, canvas.width, canvas.height);
                contextRef.current = context;
            })
        }
    }, [showModal]);


    useEffect(() => {
        if(base64 && base64.length > 10) {
            //upload file
            uploadFile()
        }
    }, [base64]);


    async function uploadFile() {
        setUploading(true)
        let response = await ResourceManager.uploadBase64(base64, 'signature.png', entity)
        setUploading(false)
        if(response.success === 1) {
            setBase64('')
            var t = response.body
            t.entity = entity
            save(t)
            closeModal()
        }
        else {
            console.warn(response)
        }
    }

    function save(data) {
        update(field, data)
    }



    function closeModal() {
        clearCanvas()
        setShowModal(false)
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
                <PickerBox
                    icon="signature"
                    onAction={() => openModal()}
                    onClick={() => openModal()}
                >
                    {typeof value !== 'undefined' && value ? (
                        <>
                            <img
                                src={ResourceManager.getFileUrl(value, entity)}
                                alt="image"
                                className='h-7 w-auto rounded-sm'
                            />
                            <span
                                role="button"
                                className='shrink-0 cursor-pointer text-muted-foreground hover:text-danger'
                                title="Rimuovi"
                                onClick={(e) => { e.stopPropagation(); removeFile(value, entity); }}
                            >
                                <Icon name="xmark" size="sm" />
                            </span>
                        </>
                    ) : null}
                </PickerBox>
            </div>


            <Dialog open={showModal} onOpenChange={(open) => { if (!open) closeModal() }}>
                <DialogContent size="lg">
                    <DialogHeader>
                        <DialogTitle>Firma</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <canvas
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseUp={finishDrawing}
                            onMouseMove={draw}
                            className='w-full'
                            style={{ border: "1px solid black", height: 220 }}
                        />
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="warning" onClick={clearCanvas}>
                            {LanguageProvider.get('defaults.clear')}
                        </Button>
                        <Button variant="primary" onClick={saveSignature}>
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
