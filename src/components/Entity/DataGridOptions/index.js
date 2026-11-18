import React, { useState } from 'react';
import { LanguageProvider } from '../../../core/language-provider';
import { AuthorizationManager } from '../../../core/authorization-manager';
import { Button } from '../../ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../../ui/dropdown-menu';
import ModalEntityConfig from '../../../components/Modals/ModalEntityConfig';
import ModalEntityExport from '../../../components/Modals/ModalEntityExport';
import ModalEntityImport from '../../../components/Modals/ModalEntityImport';
import Icon from '../../BodyElements/Icon';


export default function DataGridOptions({ props, data, entity, entityPreferences, entityAllPreferences, updatePreferences, params, searchObj, refreshData }) {


    const [modalEntityConfigStatus, setModalEntityConfigStatus] = useState(false)
    function handleViewUserSettings() {
        setModalEntityConfigStatus(true)
    }
    function closeModalEntityConfig(obj) {
        updatePreferences(obj)
        setModalEntityConfigStatus(false)
    }



    const [modalEntityExportStatus, setModalEntityExportStatus] = useState(false)
    function handleExportExcel() {
        setModalEntityExportStatus(true)
    }
    function closeModalEntityExport() {
        //reload data
        setModalEntityExportStatus(false)
    }



    const [modalEntityImportStatus, setModalEntityImportStatus] = useState(false)
    function handleImportExcel() {
        setModalEntityImportStatus(true)
    }
    function closeModalEntityImport() {
        //reload data
        setModalEntityImportStatus(false)
    }



    if (data && props[entity] !== null) {

        return (
            <>
                <div className='text-right'>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline-secondary">
                                {LanguageProvider.get('defaults.options')} <Icon name="chevron-down" style={{ fontSize: 10 }} />
                            </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-sm datagrid-option-settings" onClick={() => handleViewUserSettings()}>{LanguageProvider.get('defaults.settings')} <span style={{ width: 30, textAlign: 'center' }} className='ms-auto ps-3'><Icon name="gear" /></span></DropdownMenuItem>
                            <DropdownMenuItem className="text-sm datagrid-option-export" onClick={() => handleExportExcel()}>{LanguageProvider.get('defaults.export')} Excel <span style={{ width: 30, textAlign: 'center' }} className='ms-auto ps-3'><Icon name="file-arrow-down" /></span></DropdownMenuItem>
                            {props && props.reference_entity ? (
                                <>
                                    {AuthorizationManager.checkEntityActionAuth(props.reference_entity, 'edit') === true ? (
                                        <DropdownMenuItem className="text-sm datagrid-option-import" onClick={() => handleImportExcel()}>{LanguageProvider.get('defaults.import')} Excel <span style={{ width: 30, textAlign: 'center' }} className='ms-auto ps-3'><Icon name="file-arrow-up" /></span></DropdownMenuItem>
                                    ) : null}
                                </>
                            ) : (
                                <>
                                    {AuthorizationManager.checkEntityActionAuth(entity, 'edit') === true ? (
                                        <DropdownMenuItem className="text-sm datagrid-option-import" onClick={() => handleImportExcel()}>{LanguageProvider.get('defaults.import')} Excel <span style={{ width: 30, textAlign: 'center' }} className='ms-auto ps-3'><Icon name="file-arrow-up" /></span></DropdownMenuItem>
                                    ) : null}
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <ModalEntityConfig entity={entity} props={props} entityPreferences={entityPreferences} entityAllPreferences={entityAllPreferences} status={modalEntityConfigStatus} close={closeModalEntityConfig} />
                <ModalEntityExport entity={entity} props={props} entityPreferences={entityPreferences} status={modalEntityExportStatus} close={closeModalEntityExport} params={params} searchObj={searchObj} />


                {props && props.reference_entity ? (
                    <>
                        {AuthorizationManager.checkEntityActionAuth(props.reference_entity, 'edit') === true ? (
                            <ModalEntityImport entity={props.reference_entity} props={props} status={modalEntityImportStatus} close={closeModalEntityImport} refreshData={refreshData} />
                        ) : null}
                    </>
                ) : (
                    <>
                        {AuthorizationManager.checkEntityActionAuth(entity, 'edit') === true ? (
                            <ModalEntityImport entity={entity} props={props} entityPreferences={entityPreferences} status={modalEntityImportStatus} close={closeModalEntityImport} refreshData={refreshData} />
                        ) : null}
                    </>
                )}

            </>
        );
    }
};
