import React, { useEffect, useState } from 'react';
import Icon from '../Icon';


export default function ConnectionStatus() {

    const [isOnline, setOnline] = useState(() => {
        return navigator.onLine
    })

    useEffect(() => {
        window.addEventListener('online', ()=> setOnline(true))
        window.addEventListener('offline', ()=> setOnline(false))

        return ()=>{
            window.removeEventListener('online', ()=> setOnline(true))
            window.removeEventListener('offline', ()=> setOnline(false))
        }
    })


    return (
        <>
            {!isOnline && (
                <div className='w-full p-4 text-right text-sm text-muted-foreground'>
                    Network status: <b>Offline</b> <Icon className='ms-1' name="globe" color={'red'} size={'lg'} fade />
                    <br/>
                    / <span role='button' className='cursor-pointer text-sm text-primary underline' onClick={() => window.location.reload(true)}>Refresh</span>
                </div>
            )}
            {isOnline && (
                <></>
            )}
        </>
    );
};
