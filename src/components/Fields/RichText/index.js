import React, { useEffect, useRef } from 'react';
import { ResourceManager } from '../../../core/resource-manager';
import { settings } from '../../../config/settings';
import RichTextComponent from './RichText';


export default function RichText({ entity, update, value, fieldKey }) {

    return (
        <RichTextComponent
            entity={entity}
            fieldKey={fieldKey}
            value={value}
            update={update}
        />
    )
}