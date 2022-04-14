import LightningDatatable from 'lightning/datatable';

function findParentRow(element) {
    if (element.tagName === 'TH') return element.parentElement;
    return findParentRow(element.parentElement);
}

export default class DocxsyFileItemTable extends LightningDatatable {

    renderedCallback() {
        super.renderedCallback();
        if (this._hasRendered) {
            return;
        }

        const table = this.template.querySelector('tbody');
        table.addEventListener(
            'click',
            (e) => {
                const parentRow = findParentRow(e.target);
                console.log(parentRow);
                if (parentRow) {
                    window.postMessage(
                        {
                            datarow: parentRow.getAttribute(
                                'data-row-key-value'
                            )
                        },
                        window.location.origin
                    );
                }
            },
            this._hasRendered = true
        );
    }
}