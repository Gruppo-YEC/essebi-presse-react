import React from 'react';
import CodeEditor from './CodeEditor';


export default function CodeEditorComponent({ entity, update, value, fieldKey, options }) {

    //https://github.com/wooorm/refractor#syntaxes
    
    return (
        <>
            <CodeEditor
                value={value}
                update={update}
                fieldKey={fieldKey}
                options={options}
            />
        </>
    );
};