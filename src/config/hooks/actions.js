import { ApiManager } from '../../core/api-manager';
import { settings } from '../../config/settings';
import { toast } from '../../components/ui/toast';

export const actions = {
    DataGridRow: {
        sample: [
            {
                label: "Test",
                icon: "share",
                func: test
            }
        ]
    },
    ModalDetailsFooter: {
        sample: [
            {
                label: "Test",
                icon: "share",
                func: test
            }
        ]
    }
}

function test(item) {
    console.warn("test", item)
}