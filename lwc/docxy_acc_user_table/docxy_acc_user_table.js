import {LightningElement, api, track} from "lwc";
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
import {loadScript} from "lightning/platformResourceLoader";
import jsSipLibrary from "@salesforce/resourceUrl/jszipmin";
import r from "@salesforce/apex/DocxsyController.kk";

async function blobToBase64(blob) {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    return new Promise((resolve, _) => {
        reader.onloadend = () => resolve(reader.result);
    });
}

const multiSearchOr = (text, searchWords) => (
    searchWords.some((el) => {
        return text.match(new RegExp(el, "i"))
    })
)


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
    downloadBool = false;
    downloadId;
    downloadMimeType;
    downloadName;
    zip;
    clId = "544696838446-1k2eg2h47251ir7hkb3s4s86pv6bv7r3.apps.googleusercontent.com";
    parentFolder;
    zipName;

    @track columns = [{
        label: 'File name',
        fieldName: "name",
        sortable: true,
        cellAttributes: {
            iconName: {
                fieldName: 'displayIconName'
            }
        }
    }, {
        label: 'Mime type',
        fieldName: "mimeType",
        sortable: true,
    },
        {
            type: 'action',
            typeAttributes: {
                rowActions: {
                    fieldName: 'reassignActions'
                }
            },
            cellAttributes: {alignment: 'bottom-right'}
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

        loadScript(this, jsSipLibrary).then(() => {
            console.log("loadded", jsSipLibrary);

        });
    }

    setupEventListeners() {
        this.messageHandler = ({data, origin}) => {
            if (origin === window.location.origin) {
                if (data.datarow) {
                    this.findChildToOpen(this.data, data.datarow);
                    console.log(this.data);
                    console.log(data.datarow);
                }
            }
        };
        window.addEventListener('message', this.messageHandler);
    }

    disconnectedCallback() {
        window.removeEventListener('message', this.messageHandler);
    }

    // renderedCallback() { // invoke the method when component rendered or loaded
    //
    //     Promise.all([
    //         loadScript(this, ZIP + '/gildas-lormeau-zip.js-3e79208/WebContent/zip.js'),
    //         loadScript(this, ZIP + '/gildas-lormeau-zip.js-3e79208/WebContent/inflate.js'),
    //         loadScript(this, ZIP + '/gildas-lormeau-zip.js-3e79208/WebContent/deflate.js'),
    //     ])
    //         .then(() => {
    //             this.error = undefined; // scripts loaded successfully
    //
    //             // eslint-disable-next-line no-undef
    //             this.Zip = zip
    //             this.Zip.useWebWorkers = false
    //
    //             this.initialize();
    //         })
    //         .catch(error => this.handleError(error))
    // }

    iconType() {
        let contactsList = [];
        this.changedData.forEach(record => {
            let contactObj = {...record};
            contactObj.reassignActions = [
                {label: 'Open', name: 'open'},
                {label: 'Delete', name: 'delete'},
                {label: 'Rename', name: 'rename'},
                {label: 'Download', name: 'download'},
            ];
            if (record.salesforceId === this.recordId) {
                contactObj.reassignActions.unshift({label: 'Unlink Record', name: 'unlink'});
            } else if (record.salesforceId !== this.recordId) {
                contactObj.reassignActions.unshift({label: 'Link to Record', name: 'linkto'});
            }
            if (record.mimeType.includes("folder")) {
                contactObj.displayIconName = "doctype:folder";
            } else if (record.mimeType.includes("image")) {
                contactObj.displayIconName = "doctype:image";
            } else if (record.mimeType.includes("spreadsheet")) {
                console.log(record.mimeType);
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

    zipFileOpen(event) {
        this.downloadBool = false;
        console.log(event.detail);
        console.log(this.data);
        this.findChildToOpen(this.data, event.detail);
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
        if (this.downloadBool === true) {
            console.log("id, mimeType, name");
            this.changedData = find(originalData, id);
            this.iconType();
            this.pathList.push({id, name});
            this.handleDownloadZip(id, mimeType, name)
        } else {
            this.changedData = find(originalData, id);
            this.iconType();
            this.pathList.push({id, name});
            return found;
        }
    }

    handleCardRedirect(event) {
        this.action = event.detail.action;
        let googleDriveRecordId = event.detail.id;
        if (this.action === "redirect") {
            this.findChildToOpen(this.data, googleDriveRecordId);
        }
    }

    handleCardChildActions(event) {
        this.action = event.detail.action;
        let googleDriveRecordId = event.detail.id;
        let type = event.detail.type;
        let name = event.detail.name;
        let url = event.detail.fileUrl;
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
            if (type.includes("folder")) {
                this.handleDownloadZip(googleDriveRecordId, type, name);
            } else {
                // let name = event.detail.name;
                this.handleDownload(googleDriveRecordId, type, name);
            }
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


    handleTableChildActions(event) {
        this.action = event.detail.action.name;
        let googleDriveRecordId = event.detail.row.id;
        let type = event.detail.row.mimeType;
        let name = event.detail.row.name;
        let web = event.detail.row.webViewLink;
        if (this.action === "open") {
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
            if (type.includes("folder")) {
                this.handleDownloadZip(googleDriveRecordId, type, name);
            } else {
                // let name = event.detail.name;
                this.handleDownload(googleDriveRecordId, type, name);
            }

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


    async handleDownloadZip(id, mimeType, name) {
        this.zip = new JSZip();
        let token;
        let exportAttribute;
        let fileType;
        r({clId: this.clId})
            .then((result) => {
                token = result.Access_token__c;
            })
            .then((c) => {
                console.log(token);
                console.log(id);
                console.log(mimeType);
                console.log(name);
                console.log(this.parentFolder);
                if (this.parentFolder !== undefined) {
                    this.changedData.forEach(record => {
                        if (record.mimeType.includes("image")) {
                            exportAttribute = "?alt=media";
                            fileType = ".jpeg";
                        } else if (record.mimeType.includes("document")) {
                            exportAttribute = "/export?mimeType=application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                            fileType = ".docx";
                        } else if (record.mimeType.includes("pdf")) {
                            exportAttribute = "?alt=media";
                            fileType = ".pdf";
                        } else if (record.mimeType.includes("presentation")) {
                            exportAttribute = "/export?mimeType=application/vnd.openxmlformats-officedocument.presentationml.presentation";
                            fileType = ".pptx";
                        } else if (record.mimeType.includes("apps.spreadsheet")) {
                            exportAttribute = "?alt=media";
                            fileType = ".xlsx";
                        } else if (record.mimeType.includes("spreadsheetml")) {
                            exportAttribute = "/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                            fileType = ".xlsx";
                        } else if (record.mimeType.includes("video")) {
                            exportAttribute = "?alt=media";
                            fileType = ".MOV";
                        } else if (record.mimeType.includes("gif")) {
                            exportAttribute = "?alt=media";
                            fileType = ".gif";
                        }
                        console.log(record.id);
                        console.log(exportAttribute);
                        console.log(fileType);
                        fetch("https://www.googleapis.com/drive/v2/files/" + record.id + exportAttribute, {
                            method: "GET",
                            headers: {
                                Authorization: 'Bearer ' + token + '',
                            }
                        }).then(response => response.blob())
                            .then(myBlob => {
                                blobToBase64(myBlob).then(myBase64 => {
                                    console.log(myBase64);
                                    myBase64 = myBase64.replace(/data.*base64,/, "");
                                    console.log(myBase64);
                                    let w = this.parentFolder.file(record.name + fileType, myBase64, {base64: true});
                                    console.log(w);
                                    let zipName = this.zipName;
                                    console.log(zipName);
                                    this.zip.generateAsync({
                                        type: "base64"
                                    }).then(function (content) {
                                        // window.location.href = "data:application/zip;base64," + content;

                                        let a = document.createElement("a"); //Create <a>
                                        a.href = "data:application/zip;base64," + content;
                                        a.download = zipName + ".zip"; //File name Here
                                        a.click(); //Downloaded file
                                        console.log(content);
                                    });
                                })
                            })


                    });
                    console.log(this.parentFolder);

                } else if (mimeType.includes("folder") && this.parentFolder === undefined) {
                    this.parentFolder = this.zip.folder(name);
                    this.zipName = name;
                    this.downloadBool = true;
                    this.findChildToOpen(this.data, id);
                }
            })


    }


    handleDownload(id, mimeType, name) {
        downloadFile({googleDriveRecordId: id, mimeType: mimeType, isServiceAcc: this.isServiceAcc})
            .then((result) => {
                if (result) {
                    if (!mimeType.includes("folder")) {
                        if (mimeType.includes(".document")) {
                            name += ".docx";
                            // contentType = toString(mimeType);
                        } else if (mimeType.includes(".spreadsheet")) {
                            name += ".xlsx";
                            // contentType = toString(mimeType);
                        }
                        console.log("result not folder");
                        console.log(result);
                        this.downloadId = id;
                        this.downloadMimeType = mimeType;
                        this.downloadName = name;
                        this.downloadBool = true;
                        this.showToastEvent("Success", "success", "File Downloaded Successfully");
                    } else if (mimeType.includes("folder")) {
                        console.log("result folder");
                        console.log(result);
                        this.downloadId = id;
                        this.downloadMimeType = mimeType;
                        this.downloadName = name;
                        this.downloadBool = true;
                        this.showToastEvent("Success", "success", "File Downloaded Successfully");
                    } else {
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