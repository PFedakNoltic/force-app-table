import {LightningElement, api} from 'lwc';


export default class DocxyFileItemCard extends LightningElement {
    @api changedData;
    @api recordId;
    @api fileLinked;
    linked;

    handleRedirect(event) {
        let selectedDiv = event.currentTarget.dataset.id;
        let value = event.currentTarget.dataset.value;
        event.preventDefault();
        const selectedEvent = new CustomEvent('redirect',
            {
                detail: {
                    "id": selectedDiv,
                    "action": value
                }
            });
        this.dispatchEvent(selectedEvent);
    }

    handleSelect(event) {
        let selectedDiv = event.currentTarget.dataset.id;
        let value = event.currentTarget.dataset.value;
        let type = event.currentTarget.dataset.type;
        let name = event.currentTarget.dataset.name;
        event.preventDefault();
        const selectedEvent = new CustomEvent('selected',
            {
                detail: {
                    "id": selectedDiv,
                    "action": value,
                    "type": type,
                    "name": name
                }
            });
        this.dispatchEvent(selectedEvent);
    }

    checkLinked(event) {
        this.changedData.forEach(record => {
            if (record.id === event.currentTarget.dataset.id){
                this.linked = (record.salesforceId && this.recordId === record.salesforceId) || this.fileLinked;
            }
        });

    }


    handleOpen(event) {
        let item;
        this.changedData.forEach(record => {
            if (record.id === event.currentTarget.dataset.id) {
                item = record;
            }
        });
        window.open(item.webViewLink, '_blank')
    }

}