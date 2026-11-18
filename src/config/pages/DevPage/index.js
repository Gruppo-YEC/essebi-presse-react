import React, { useEffect, useState } from 'react';
import { ApiManager  } from '../../../core/api-manager';



export default function DevPage() {

    async function testEmailDemo() {
        var body = {
            'emailTo': 'marcocekada@gmail.com',
            'userName': 'Marco Cekada'
        }
        var response = await ApiManager.sendAuthenticatedRequest('/custom/send_demo_email', body)
        console.warn("response", response)
    }


    return (
        <div className="dev-page">
            <h3>Dev</h3>
        </div>

    )

};
