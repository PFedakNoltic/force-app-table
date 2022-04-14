import {LightningElement, api, track, wire} from "lwc";
import {ShowToastEvent} from "lightning/platformShowToastEvent";
import {NavigationMixin} from "lightning/navigation";
import getFiles from "@salesforce/apex/DocxsyController.getFilesList";
import deleteFile from "@salesforce/apex/DocxsyController.deleteFile";
import uploadFileToFolder from "@salesforce/apex/DocxsyController.uploadFileToFolder";
import renameFile from "@salesforce/apex/DocxsyController.renameFile";
import createFolder from "@salesforce/apex/DocxsyController.createFolder";
import downloadFile from "@salesforce/apex/DocxsyController.downloadFile";
import linkFile from "@salesforce/apex/DocxsyController.linkFile";
import unLinkFile from "@salesforce/apex/DocxsyController.unLinkFile";

const actions = [
    {label: 'Open', name: 'open'},
    {label: 'Link to Record', name: 'linkto'},
    {label: 'Unlink Record', name: 'unlink'},
    {label: 'Delete', name: 'delete'},
    {label: 'Rename', name: 'rename'},
    {label: 'Download', name: 'download'},
];


export default class DocxsyAccUserTable extends NavigationMixin(LightningElement) {
    @api recordId;
    @track data;
    @track error;
    @track changedData = [];
    @track pathList = [{id: "home", name: "Home"}];
    selectedRecords;
    parentFolderId;
    isNameModalOpen = false;
    isUploadModalOpen = false;
    isDeleteModalOpen = false;
    googleDriveId;
    recordToRenameId;
    nameBeforeRename;
    renamedName;
    action;
    showRow = true;
    gridSetting = "slds-col slds-large-size_12-of-12 slds-medium-size_12-of-12 slds-size_12-of-12";
    changeViewIcon = "utility:assignment";
    relatedToRecord = true;
    filteredIcon = "utility:groups";
    filteredHelpText = "View All";
    isLoading = false;
    isServiceAcc = false;
    isNoData = false;
    isErrorWithLogin = false;
    modalHeaderText = "";
    modalLabelText = "";
    isSearchOpen = false;
    searchText = "";
    rootId;
    defaultSortDirection = 'asc';
    sortDirection = 'asc';
    sortedBy;

    @track columns = [{
        label: 'File name',
        fieldName: "name",
        sortable: true,
        cellAttributes: {
            iconName: {
                fieldName: 'displayIconName'
            }
        }
    },
        {
            type: 'action', typeAttributes: {rowActions: actions}, cellAttributes: {alignment: 'bottom-right'}
        }
    ];


    get acceptedFormats() {
        return [".pdf", ".png", ".jpeg", ".jpg", ".xlsx", ".docx"];
    }

    get dataAvailableClasses() {
        return this.isNoData ? "file-tile noData slds-m-top_x-large" : "file-tile slds-m-top_x-large";
    }

    connectedCallback() {
        this.fetchData();
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.messageHandler = ({data, origin}) => {
            if (origin === window.location.origin) {
                if (data.datarow) {
                    this.findChildToOpen(this.data, data.datarow);
                }
            }
        };
        window.addEventListener('message', this.messageHandler);
    }

    disconnectedCallback() {
        window.removeEventListener('message', this.messageHandler);
    }

    iconType() {
        let contactsList = [];
        this.changedData.forEach(record => {
            let contactObj = {...record};
            if (record.mimeType.includes("folder")) {
                contactObj.displayIconName = "doctype:folder";
            } else if (record.mimeType.includes("image")) {
                contactObj.displayIconName = "doctype:image";
            } else if (record.mimeType.includes("spreadsheet")) {
                contactObj.displayIconName = "doctype:gsheet";
            } else if (record.mimeType.includes("document")) {
                contactObj.displayIconName = "doctype:gdoc";
            } else if (record.mimeType.includes("presentation")) {
                contactObj.displayIconName = "doctype:slide";
            } else if (record.mimeType.includes("video")) {
                contactObj.displayIconName = "doctype:video";
            } else {
                contactObj.displayIconName = "doctype:unknown";
            }
            contactsList.push(contactObj);
        });
        this.changedData = contactsList;
    }

    handleSelect(event) {
        let selectedDiv = event.currentTarget.dataset.item;
        let value = event.currentTarget.dataset.value;
        let type = event.currentTarget.dataset.type;
        let name = event.currentTarget.dataset.name;

        event.preventDefault();
        // const selectedEvent = new CustomEvent('selected', {
        //     detail: {
        //         "id": selectedDiv, "action": value, 'type': type, "name": name
        //     }
        // });
        // this.dispatchEvent(selectedEvent);
    }

    fetchData() {
        this.showSpinner();
        getFiles({salesforceId: this.recordId, filtered: this.relatedToRecord, isServiceAcc: this.isServiceAcc})
            .then((result) => {
                let data = this.transformData(result);
                this.data = data;
                this.rootId = this.data.find(x => x.parent?.length === 19).parent;
                this.changedData = this.arrayFromJsonToTree(data);
                this.iconType();

                this.pathList.length = 1;
                this.parentFolderId = "root";
                this.hideSpinner();
                this.isNoData = this.changedData.length === 0;
                this.isErrorWithLogin = false;
            })
            .catch((error) => {
                //this.error = error;
                this.hideSpinner();
                this.data = null;
                this.changedData = null;
                this.isErrorWithLogin = true;
                // this.showToastEvent("Error","error","There is some error with login to your Google Account");
            });
    }

    transformData(rawData) {
        let value = JSON.parse(rawData).files.map((record) => {
            let newObject = record;
            if (record?.parents) {
                newObject["parent"] = record.parents["0"];
                delete record.parents;
            }
            if (record?.appProperties?.SalesforceId) {
                newObject["salesforceId"] = record.appProperties.SalesforceId;
                delete record.appProperties;
            }
            return newObject;
        });

        return value;
    }

    //TODO: refactor later
    arrayFromJsonToTree(data) {
        let items = this.filteredData(data.slice(0));
        const hashTable = Object.create(null);
        items.forEach(item => hashTable[item.id] = {...item, _children: []});
        const dataTree = [];
        items.forEach(item => {
            if (hashTable[item.parent]) {
                hashTable[item.parent]?._children.push(hashTable[item.id]);
            } else {
                dataTree.push(hashTable[item.id]);
            }
        });
        return dataTree;
    }

    findChildToOpen(originalData, ids, key = "id") {
        const found = originalData.find(x => x.id === ids);
        const {id, name, mimeType} = found;
        if (!mimeType.includes("folder")) return;

        const find = (items, id, link = "parent") => {
            let toRet = items
                .filter(item => (item[link] === id))
                .map(item => ({...item, _children: find(items, item.id, link)}));
            return toRet;
        };

        this.changedData = find(originalData, id);
        this.iconType();
        this.pathList.push({id, name});
        return found;
    }

    handleChildActions(event) {
        this.action = event.detail.action.name;
        let googleDriveRecordId = event.detail.row.id;
        let type = event.detail.row.mimeType;
        let name = event.detail.row.name;
        let web = event.detail.row.webViewLink;
        if (this.action === "open") {
            console.log('open');
            window.open(web, '_blank')
        }
        if (this.action === "delete") {
            this.isDeleteModalOpen = true;
            this.googleDriveId = googleDriveRecordId;
        }
        if (this.action === "rename") {
            this.isNameModalOpen = true;
            this.recordToRenameId = googleDriveRecordId;
            this.nameBeforeRename = name;
            this.modalHeaderText = "Rename file/folder";
            this.modalLabelText = "Enter new name";
        }
        if (this.action === "download") {
            // let name = event.detail.name;
            this.handleDownload(googleDriveRecordId, type, name);
        }
        if (this.action === "linkto") {
            // let name = event.detail.name;
            this.handleLinkFile(googleDriveRecordId, type, name);
        }
        if (this.action === "unlink") {
            // let name = event.detail.name;
            this.handleUnLinkFile(googleDriveRecordId);
        }
    }

    filteredData(data, key = "salesforceId") {
        if (!this.relatedToRecord) {
            return data;
        }

        // return data
        let objects = data.filter((item) => (item.hasOwnProperty(key) && item[key] === this.recordId));
        const additional = [];
        const keys = objects.map(el => (el.id));
        // objects = objects.map(obj => !keys.includes(obj?.parent) && obj?.parent !== this.rootId ? { ...obj, parent: this.rootId } : obj);
        keys.forEach(item => {
            data.filter(e => (e.hasOwnProperty("parent") && e["parent"] === item)).forEach(i => {
                if (!keys.includes(i.id)) {
                    additional.push(i);
                }
            });
        });

        return [...objects, ...additional];
    }

    timeoutId;

    handleSearchValueChange(evt) {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }

        let search = typeof evt === "string" ? evt : evt.target.value;
        this.searchText = search;
        if (search.length >= 2) {
            this.timeoutId = setTimeout(() => {
                this.showSpinner();
                this.searchByKey(search);
                this.hideSpinner();
            }, 1000);
        }

        if (search.length === 0) {
            this.timeoutId = setTimeout(() => {
                this.showSpinner();
                this.changedData = this.arrayFromJsonToTree(this.data);
                this.iconType();
                this.timeoutId = null;
                this.hideSpinner();
            }, 500);
        }
    }

    searchByKey(search, key = "name") {
        if (this.searchText) {
            this.changedData = this.filteredData(this.data)
                .filter((item) => (item.hasOwnProperty(key) && item[key]?.toLowerCase().indexOf(search.toLowerCase()) > -1));
            this.iconType();
        } else {
            this.changedData = this.arrayFromJsonToTree(this.data);
            this.iconType();
        }
        this.timeoutId = null;
    }

    handlePathClick(event) {
        let clickedItemId = event.currentTarget.dataset.item;
        if (clickedItemId === "home") {
            this.searchByKey(this.searchText);
            this.pathList.length = 1;
            this.parentFolderId = "root";
        } else {
            let index = this.pathList.map(function (e) {
                return e.id;
            }).indexOf(clickedItemId);
            if (this.pathList.length > index + 1) {
                this.findChildToOpen(this.data, clickedItemId);
                this.pathList.length = index + 1;
            }
        }
    }

    handleDelete(id) {
        deleteFile({googleDriveRecordId: id, isServiceAcc: this.isServiceAcc})
            .then((result) => {
                if (result === "204") {
                    this.showToastEvent("Success", "success", "Folder/File Deleted successfully");
                    this.fetchData();
                } else {
                    this.showToastEvent("Error", "error", "There was some error");
                }
            })
            .catch((error) => {
                this.showToastEvent("Error", "error", "There was some error");
            });
        this.closeModal();
    }

    handleLinkFile(id) {
        linkFile({googleDriveRecordId: id, salesforceRecordId: this.recordId, isServiceAcc: this.isServiceAcc})
            .then((result) => {
                if (result === "200") {
                    this.showToastEvent("Success", "success", "File was linked successfully");
                    this.fetchData();
                } else {
                    this.showToastEvent("Error", "error", "There was some error");
                }
            })
            .catch((error) => {
                //this.error = error;
                this.showToastEvent("Error", "error", "There was some error");
            });
    }

    handleUnLinkFile(id) {
        unLinkFile({googleDriveRecordId: id, isServiceAcc: this.isServiceAcc})
            .then((result) => {
                if (result === "204") {
                    this.showToastEvent("Success", "success", "File was un linked successfully");
                    this.fetchData();
                } else {
                    this.showToastEvent("Error", "error", "There was some error");
                }
            })
            .catch((error) => {
                //this.error = error;
                this.showToastEvent("Error", "error", "There was some error");
            });
    }

    handleUploadFinished(event) {
        // Get the list of uploaded data
        const uploadedFiles = event.detail.files;
        let attachmentId = uploadedFiles[0].documentId;
        uploadFileToFolder({
            contentDocumentRecordId: attachmentId, parentFolderId: this.parentFolderId,
            salesforceRecordId: this.recordId, isServiceAcc: this.isServiceAcc
        })
            .then((result) => {
                if (result === "200") {
                    this.isUploadModalOpen = false;
                    this.showToastEvent("Success", "success", "File Uploaded successfully");
                    this.fetchData();
                } else {
                    this.showToastEvent("Error", "error", "There was some error");
                }
            })
            .catch((error) => {
                this.error = error;
                console.log(error);
            });
    }

    handleModalActions(event) {
        if (event.detail.action === "close") {
            this.closeModal();
        }
        if (event.detail.action === "submit") {
            if (this.action === "rename") {
                this.handleRename(this.recordToRenameId, this.renamedName);
            }
            if (this.action === "createFolder") {
                this.handleCreateFolder(this.renamedName);
            }
            if (this.action === "fileUpload") {
                this.isUploadModalOpen = false;
            }
            if (this.action === "delete") {
                this.handleDelete(this.googleDriveId);
            }
        }
    }

    closeModal() {
        this.isNameModalOpen = false;
        this.isUploadModalOpen = false;
        this.isDeleteModalOpen = false;
        this.recordToRenameId = "";
        this.nameBeforeRename = "";
    }

    handleRename(id, newName) {
        console.log(id);
        console.log(newName);
        console.log(this.isServiceAcc);
        renameFile({googleDriveRecordId: id, newName: newName, isServiceAcc: this.isServiceAcc})
            .then((result) => {
                if (result === "200") {
                    this.showToastEvent("Success", "success", "Folder/File Renamed successfully");
                    this.fetchData();
                    this.closeModal();
                } else {
                    this.hideSpinner();
                    this.showToastEvent("Error", "error", "There was some error");
                }
            })
            .catch((error) => {
                //this.error = error;
                this.showToastEvent("Error", "error", "There was some error");
                this.closeModal();
            });
    }

    handleCreateFolder(newName) {
        createFolder({
            folderName: newName,
            parentFolderId: this.parentFolderId,
            salesforceRecordId: this.recordId, isServiceAcc: this.isServiceAcc
        })
            .then((result) => {
                this.closeModal();
                if (result === "200") {
                    this.showToastEvent("Success", "success", "Folder Created successfully");
                    this.fetchData();
                } else {
                    this.showToastEvent("Error", "error", "There was some error");
                }
            })
            .catch((error) => {
                this.closeModal();
                this.showToastEvent("Error", "error", "There was some error");
            });
    }

    handleCreateFolderClick(event) {
        this.action = event.currentTarget.dataset.value;
        this.isNameModalOpen = true;
        this.modalHeaderText = "Create folder";
        this.modalLabelText = "Enter folder name";
    }

    handleUploadClick(event) {
        this.action = event.currentTarget.dataset.value;
        this.isUploadModalOpen = true;
    }

    handleDownload(id, mimeType, name) {
        downloadFile({googleDriveRecordId: id, mimeType: mimeType, isServiceAcc: this.isServiceAcc})
            .then((result) => {
                if (result) {
                    if (!mimeType.includes("folder")) {
                        if (mimeType.includes(".document")) {
                            name += ".docx";
                        } else if (mimeType.includes(".spreadsheet")) {
                            name += ".xlsx";
                        }
                        let a = document.createElement("a"); //Create <a>
                        a.href = "data:" + mimeType + ";base64," + result;
                        a.download = name; //File name Here
                        a.click(); //Downloaded file
                        this.showToastEvent("Success", "success", "File Downloaded Successfully");
                    } else {
                        var zip = new JSZip();

                        this.showToastEvent("Alert", "warning", "Unsupported Download Type");
                    }
                } else {
                    this.showToastEvent("Error", "error", "There was some error");
                }
            })
            .catch((error) => {
                console.log(error);
                this.showToastEvent("Error", "error", "There was some error");
            });
    }

    showToastEvent(title, variant, message) {
        const event = new ShowToastEvent({
            title: title,
            variant: variant,
            message: message
        });
        this.dispatchEvent(event);
    }

    handleToggleClick() {
        this.showRow = !this.showRow; //set to true if false, false if true.
        this.changeViewIcon = this.showRow ? "utility:assignment" : "utility:ad_set";
        this.gridSetting = this.showRow ? "slds-col slds-large-size_12-of-12 slds-medium-size_12-of-12 slds-size_12-of-12"
            : "slds-col slds-large-size_4-of-12 slds-medium-size_4-of-12 slds-size_4-of-12";
    }

    handleFilteredToggle() {
        this.relatedToRecord = !this.relatedToRecord;
        this.filteredIcon = this.relatedToRecord ? "utility:groups" : "utility:filterList";
        this.filteredHelpText = this.relatedToRecord ? "View All" : "View Record Related files";
        this.pathList.length = 1;
        // this.fetchData();
        this.changedData = this.arrayFromJsonToTree(this.data);
        this.iconType();
    }

    handleInputChange(event) {
        this.renamedName = event.target.value;
    }

    handleSearchToggle() {
        this.isSearchOpen = !this.isSearchOpen;
        this.searchText = "";
        if (!this.isSearchOpen) {
            this.searchByKey("");
        }
    }

    isSorted;
    direction;
    count = 0;

    handleSortToggle() {
        let sort;

        this.isSorted = true;

        if (this.count > 2) {
            this.direction = null;
            this.isSorted = false;
            this.count = 0;
            return;
        }

        if (this.direction) {
            this.count++;
            this.direction = false;
            sort = this.changedData.slice(0).sort((a, b) => (a.name < b.name ? 1 : -1));
        } else if (!this.direction) {
            this.count++;
            this.direction = true;
            sort = this.changedData.slice(0).sort((a, b) => (a.name > b.name ? 1 : -1));
        }

        this.changedData = sort;
        this.iconType();
    }

    get sortButtonIcon() {
        if (this.isSorted) {
            return this.direction ? "utility:arrowup" : "utility:arrowdown";
        } else {
            return "utility:sort";
        }
    }

    get searchButtonVariant() {
        return this.isSearchOpen ? "brand" : "border";
    }


    openVisualForcePage() {
        const urlWithParameters = "/apex/DocxsyLoginPage";
        this[NavigationMixin.Navigate]({
                type: "standard__webPage",
                attributes: {
                    url: urlWithParameters
                }
            }, false // Replaces the current page in your browser history with the URL
        );
    }

    showSpinner() {
        this.isLoading = true;
    }

    hideSpinner() {
        setTimeout(() => {
            this.isLoading = false;
        }, 100);
    }

    sortBy(field, reverse, primer) {
        const key = primer
            ? function (x) {
                return primer(x[field]);
            }
            : function (x) {
                return x[field];
            };

        return function (a, b) {
            a = key(a);
            b = key(b);
            return reverse * ((a > b) - (b > a));
        };
    }

    onHandleSort(event) {
        const {fieldName: sortedBy, sortDirection} = event.detail;
        const cloneData = [...this.changedData];

        cloneData.sort(this.sortBy(sortedBy, sortDirection === 'asc' ? 1 : -1));
        this.changedData = cloneData;
        this.sortDirection = sortDirection;
        this.sortedBy = sortedBy;
    }

}