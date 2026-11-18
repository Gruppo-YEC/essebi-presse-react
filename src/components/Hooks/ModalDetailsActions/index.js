import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../ui/button';
import { actions } from '../../../config/hooks/actions';
import Icon from '../../BodyElements/Icon';



export default function ModalDetailsActions({ entity=null, data }) {

    const [rowActions, setRowActions] = useState([])
    const navigate = useNavigate();

    useEffect(() => {
        var temp = []
        if(actions.ModalDetailsFooter && entity && actions.ModalDetailsFooter[entity]) {
            for (var i = 0; i < actions.ModalDetailsFooter[entity].length; i++) {
                temp.push(actions.ModalDetailsFooter[entity][i]);
            }
        }
        setRowActions(temp)
    }, [entity]);



    if (entity !== null) {
        return (
            <>
                {rowActions.length ? (
                    <>
                        {rowActions.map((item, i) => {
                            return (
                                <Button variant='outline-secondary' size='sm' key={i} onClick={() => item.func(data, navigate)}>{item.label} <span className='ms-2'><Icon name={item.icon} /></span></Button>
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
