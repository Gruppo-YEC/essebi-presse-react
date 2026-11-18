import React from 'react';
import MarkdownComponent from './Markdown';
import './style.css';


export default function Markdown({ entity, update, value, fieldKey, options }) {

    return (
        <MarkdownComponent
            entity={entity}
            fieldKey={fieldKey}
            value={value}
            update={update}
            options={options}
        />
    );
};
