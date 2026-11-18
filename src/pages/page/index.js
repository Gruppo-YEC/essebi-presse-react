import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { reloadOnStaleChunk } from '../../core/lazy-import';

/** Pagine custom disponibili in src/config/pages/<Nome>/index.js, risolte a build-time */
const pages = import.meta.glob('../../config/pages/*/index.js');

const NotFound = { default: () => <div>Page not found.</div> };
const LoadError = { default: () => <div>Unable to load the page, please reload.</div> };


export default function CustomPage() {

    const { page } = useParams();
    const loadPage = pages[`../../config/pages/${page}/index.js`];
    const MyComponent  = lazy(() => loadPage ? loadPage().catch(error => reloadOnStaleChunk(error, LoadError)) : Promise.resolve(NotFound));


    return (
        <div className='mb-4 mt-4 w-full px-3'>
            <Suspense fallback={<div>Loading...</div>}>
                <MyComponent />
            </Suspense>
        </div>
    )

};
