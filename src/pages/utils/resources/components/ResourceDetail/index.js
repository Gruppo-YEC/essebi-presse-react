import React, { useState, useEffect } from 'react';
import { Button } from '../../../../../components/ui/button';
import { Badge } from '../../../../../components/ui/badge';
import { Spinner } from '../../../../../components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../../../../components/ui/dialog';
import { DataManager } from '../../../../../core/data-manager';
import { ResourceManager } from '../../../../../core/resource-manager';
import './style.css';
import Icon from '../../../../../components/BodyElements/Icon';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
const VIEWABLE_EXTENSIONS = ['pdf', ...IMAGE_EXTENSIONS];

function isImage(ext) {
    return IMAGE_EXTENSIONS.includes((ext || '').toLowerCase());
}

function isViewable(ext) {
    return VIEWABLE_EXTENSIONS.includes((ext || '').toLowerCase());
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('it-IT', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}

function getExtensionColor(ext) {
    const colors = {
        'pdf': '#dc3545', 'doc': '#2b579a', 'docx': '#2b579a',
        'xls': '#217346', 'xlsx': '#217346', 'csv': '#217346',
        'png': '#0d6efd', 'jpg': '#0d6efd', 'jpeg': '#0d6efd', 'gif': '#0d6efd',
        'webp': '#0d6efd', 'svg': '#0d6efd', 'zip': '#f0ad4e', 'rar': '#f0ad4e',
        'mp4': '#6f42c1', 'mp3': '#fd7e14',
    };
    return colors[(ext || '').toLowerCase()] || '#6c757d';
}

async function downloadFile(rD) {
    var response = await ResourceManager.getFile(rD.hash, rD.entity);
    if (response.success === 1 && response.base64) {
        var raw = response.base64;
        var byteString, mime;
        if (raw.indexOf(',') !== -1) {
            var parts = raw.split(',');
            var mimeMatch = parts[0].match(/:(.*?);/);
            mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
            byteString = atob(parts[1]);
        } else {
            mime = 'application/octet-stream';
            byteString = atob(raw);
        }
        var ab = new ArrayBuffer(byteString.length);
        var ia = new Uint8Array(ab);
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        var blob = new Blob([ab], { type: mime });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = rD.filename || (rD.hash + '.' + rD.extension);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

export default function ResourceDetail({ resource, onClose, getFileUrl }) {
    const [user, setUser] = useState(null);
    const [loadingUser, setLoadingUser] = useState(false);
    const [downloadingFile, setDownloadingFile] = useState(false);

    useEffect(() => {
        if (resource?.idUser) {
            loadUser(resource.idUser);
        }
    }, [resource]);

    const loadUser = async (userId) => {
        setLoadingUser(true);
        try {
            const response = await DataManager.getItem('user', userId);
            if (response.success === 1 && response.body) {
                const userData = Array.isArray(response.body) ? response.body[0] : response.body;
                if (userData) setUser(userData);
            }
        } catch (error) {
            console.error('Error loading user:', error);
        } finally {
            setLoadingUser(false);
        }
    };

    if (!resource) return null;

    const fileUrl = getFileUrl(resource);
    const ext = (resource.extension || '').toLowerCase();

    const renderPreview = () => {
        if (isImage(ext)) {
            return (
                <div className="resource-detail-preview">
                    <img src={fileUrl} alt={resource.filename} className="resource-detail-image" />
                </div>
            );
        }
        if (ext === 'pdf') {
            return (
                <div className="resource-detail-preview resource-detail-pdf">
                    <iframe src={fileUrl+'#toolbar=0'} title={resource.filename} className="resource-detail-iframe" />
                </div>
            );
        }
        return (
            <div className="resource-detail-preview resource-detail-no-preview">
                <Icon name="file" size="4x" className="mb-2 text-muted-foreground" />
                <p className="mb-0 text-muted-foreground">Anteprima non disponibile</p>
                <small className="text-muted-foreground">Apri il file per visualizzarlo</small>
            </div>
        );
    };

    const getUserDisplay = () => {
        if (loadingUser) return <Spinner size="sm" />;
        if (!user) return <span className="text-muted-foreground">ID: {resource.idUser}</span>;
        return user.username || `User #${resource.idUser}`;
    };

    return (
        <Dialog open={true} onOpenChange={(open) => { if (!open) onClose() }}>
            <DialogContent size="lg" className="resource-detail-modal">
                <DialogHeader>
                    <DialogTitle className="resource-detail-title">
                        <Icon name="file" className="me-2" style={{ color: getExtensionColor(ext) }} />
                        {resource.filename}
                    </DialogTitle>
                </DialogHeader>
                <DialogBody>
                    {renderPreview()}

                    <div className="resource-detail-info mt-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <div className="resource-detail-field">
                                    <label><Icon name="tag" className="me-1" /> Nome file</label>
                                    <span>{resource.filename}</span>
                                </div>
                            </div>
                            <div>
                                <div className="resource-detail-field">
                                    <label><Icon name="puzzle-piece" className="me-1" /> Estensione</label>
                                    <span>
                                        <Badge variant="light" style={{ fontSize: '0.85rem' }}>
                                            .{resource.extension}
                                        </Badge>
                                    </span>
                                </div>
                            </div>
                            <div>
                                <div className="resource-detail-field">
                                    <label><Icon name="database" className="me-1" /> Entit&agrave;</label>
                                    <span>{resource.entity || <span className="text-muted-foreground">-</span>}</span>
                                </div>
                            </div>
                            <div>
                                <div className="resource-detail-field">
                                    <label><Icon name="user" className="me-1" /> Caricato da</label>
                                    <span>{getUserDisplay()}</span>
                                </div>
                            </div>
                            <div>
                                <div className="resource-detail-field">
                                    <label><Icon name="calendar" className="me-1" /> Data caricamento</label>
                                    <span>{formatDate(resource.date)}</span>
                                </div>
                            </div>
                            <div>
                                <div className="resource-detail-field">
                                    <label><Icon name="clock" className="me-1" /> Ultimo aggiornamento</label>
                                    <span>{formatDate(resource.lastUpdate)}</span>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <div className="resource-detail-field">
                                    <label><Icon name="fingerprint" className="me-1" /> Hash</label>
                                    <span className="resource-detail-hash">{resource.hash}</span>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <div className="resource-detail-field">
                                    <label><Icon name="link" className="me-1" /> URL</label>
                                    <span className="resource-detail-url">
                                        <a href={fileUrl} target="_blank" rel="noopener noreferrer">{fileUrl}</a>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogBody>
                <DialogFooter>
                    <Button
                        variant="success"
                        disabled={downloadingFile}
                        onClick={async () => {
                            setDownloadingFile(true);
                            try {
                                await downloadFile(resource);
                            } finally {
                                setDownloadingFile(false);
                            }
                        }}
                    >
                        <Icon name="download" className="me-1" />
                        {downloadingFile ? 'Download...' : 'Scarica file'}
                    </Button>
                    {isViewable(ext) && (
                        <Button variant="primary" asChild>
                            <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Icon name="up-right-from-square" className="me-1" />
                                Apri file
                            </a>
                        </Button>
                    )}
                    <Button variant="secondary" onClick={onClose}>
                        Chiudi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
