import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DropdownMenuItem } from '../../ui/dropdown-menu';
import { actions } from '../../../config/hooks/actions';
import Icon from '../../BodyElements/Icon';

const hooks = actions.DataGridRow || []


export default function DataGridAction({ entity=null, data, refreshData }) {

    const [rowActions, setRowActions] = useState([])
    const navigate = useNavigate();

    useEffect(() => {
        var temp = []
        if(entity !== null && hooks[entity]) {
            for (var i = 0; i < hooks[entity].length; i++) {
                temp.push(hooks[entity][i]);
            }
        }
        setRowActions(temp)
    }, [entity]);

    /**
     * Voce non disponibile su QUESTA riga: l'azione può dichiarare
     * `disabled` in config/hooks/actions.js, come booleano o come funzione
     * del record. Se la funzione torna una stringa, quella è il motivo e
     * compare accanto all'etichetta.
     *
     *   { label: 'Segna inviato', disabled: (item) => item.sent_at && 'già inviato', func: ... }
     *
     * Senza `disabled` la voce resta attiva come sempre.
     */
    function blocked(action) {
        const v = typeof action.disabled === 'function' ? action.disabled(data) : action.disabled;
        return v ? { off: true, reason: typeof v === 'string' ? v : null } : { off: false, reason: null };
    }

    if (entity !== null) {
        return (
            <>
                {rowActions.length ? (
                    <>
                        {rowActions.map((item, i) => {
                            const { off, reason } = blocked(item);
                            return (
                                <DropdownMenuItem className='text-sm' key={i} disabled={off} onClick={() => item.func(data, navigate, refreshData)}>{item.label}{reason ? <span className='text-xs text-muted-foreground ms-1'>({reason})</span> : null} <span style={{width:30, textAlign:'center'}} className='ms-auto ps-3'><Icon name={item.icon} /></span></DropdownMenuItem>
                            )
                        })}
                    </>
                ) : (
                    <></>
                )}
            </>
        );
    }
    else {
        return (
            <></>
        )
    }

};
