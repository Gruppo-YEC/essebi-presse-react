import React, { useState, useEffect } from 'react';


export default function ObjPrinter({ data = null }) {


    
    const isObject = (value) => {
        try {
            return value.toString() === "[object Object]";
        } catch (e) { }
    };

    function ObjContainer({ obj }) {
        return (
            <ul>
                {Object.entries(obj).map(([k, v], i) => {
                    return <Node key={i} k={k} value={v} />;
                })}
            </ul>
        );
    }

    function ArrayNode({ value }) {
        return (
            <ol>
                {value.map((v, i) => {
                    return (
                        <React.Fragment key={i}>
                            <li>
                                <ObjContainer obj={v} />
                            </li>
                            <hr />
                        </React.Fragment>
                    );
                })}
            </ol>
        );
    }

    function Node({ k, value }) {
        return (
            <li>
                {Array.isArray(value) ? (
                    <>
                        <b>{k}:</b>
                        <ArrayNode value={value} />
                    </>
                ) : isObject(value) ? (
                    <>
                        <b>{k}:</b>
                        <ObjContainer obj={value} />
                    </>
                ) : (
                    <>
                        <b>{k}</b>: {value.toString()}
                    </>
                )}
            </li>
        );
    }

    if(data) { 
        return (
            <ObjContainer obj={data} />
        );
    }
};