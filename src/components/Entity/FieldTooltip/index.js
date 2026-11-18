import React from 'react';
import { SimpleTooltip } from '../../ui/tooltip';
import Icon from '../../BodyElements/Icon';


export default function FieldTooltip({ fieldKey, view }) {


    if((view.properties.columns[fieldKey].options && view.properties.columns[fieldKey].options.tooltip)) {
        return (
            <SimpleTooltip
                side="bottom"
                content={view.properties.columns[fieldKey].options.tooltip}
            >
                <span className='inline-block'>
                    <Icon name="circle-info" size="lg" color={'#999'} className='ms-1' />
                </span>
            </SimpleTooltip>
        )
    }
    else {
        return (
            <></>
        )
    }
};
