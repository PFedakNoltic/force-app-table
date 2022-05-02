import {LightningElement, api} from "lwc";
import r from "@salesforce/apex/DocxsyController.kk";

async function blobToBase64(blob) {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    return new Promise((resolve, _) => {
        reader.onloadend = () => resolve(reader.result);
    });
}

export default class DocxyDownloadFile extends LightningElement {
    id = "1QDY6Y8OGYSipK1XSGrGsicQYUOVk4e-U";
    mimeType = "application/pdf";
    name = "Test large 407MB.pdf";
    clId = "544696838446-1k2eg2h47251ir7hkb3s4s86pv6bv7r3.apps.googleusercontent.com";

    // https://www.googleapis.com/drive/v3/files/1tQyU66ThJOSPgN8W4QRyjje8scTuVgmx?alt=media
    // https://drive.google.com/file/d/14DpeX-H78llRAHigZ_G6tyOt7qOrHYnl/edit?alt=media



    async handleDownload() {
        let token;
        let exportAttribute;
        let fileType;
        let b;
        r({clId: this.clId})
            .then((result) => {
                token = result.Access_token__c;
                console.log(result);
            })
            .then((c) => {
                console.log(token);
                console.log(this.id);
                console.log(this.mimeType);
                console.log(this.name);
                if (this.mimeType.includes("image")) {
                    exportAttribute = "?alt=media";
                    fileType = ".jpeg";
                } else if (this.mimeType.includes("document")) {
                    exportAttribute = "/export?mimeType=application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                    fileType = ".docx";
                } else if (this.mimeType.includes("pdf")) {
                    exportAttribute = "?alt=media";
                    fileType = ".pdf";
                } else if (this.mimeType.includes("presentation")) {
                    exportAttribute = "/export?mimeType=application/vnd.openxmlformats-officedocument.presentationml.presentation";
                    fileType = ".pptx";
                } else if (this.mimeType.includes("apps.spreadsheet")) {
                    exportAttribute = "?alt=media";
                    fileType = ".xlsx";
                } else if (this.mimeType.includes("spreadsheetml")) {
                    exportAttribute = "/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                    fileType = ".xlsx";
                } else if (this.mimeType.includes("video")) {
                    exportAttribute = "?alt=media";
                    fileType = ".MOV";
                } else if (this.mimeType.includes("gif")) {
                    exportAttribute = "?alt=media";
                    fileType = ".gif";
                }
                fetch("https://www.googleapis.com/drive/v2/files/" + this.id + exportAttribute, {
                    method: "GET",
                    headers: {
                        Authorization: 'Bearer ' + token + '',
                        'X-HTTP-Method-Override': 'HEAD'
                    }
                })
                    .then(response => {
                       console.log(response);
                       response.headers
                    })
                    .then(myBlob => {
                        console.log(myBlob);
                        blobToBase64(myBlob).then(myBase64 => {
                            console.log(myBase64);
                            let a = document.createElement("a"); //Create <a>
                            a.href = myBase64;
                            a.download = this.name; //File name Here
                            a.click(); //Downloaded file
                        })
                    });
// ---------
                //
                // let reader = response.body.getReader();
                // let bytesReceived = 0;
                // let responseDataArray = [];
                // let removeResponseBlob;
                //
                // // read() returns a promise that resolves
                // // when a value has been received
                // return reader.read().then(function processResult(result) {
                //     // Result objects contain two properties:
                //     // done  - true if the stream has already given
                //     //         you all its data.
                //     // value - some data. Always undefined when
                //     //         done is true.
                //     if (result.done) {
                //         console.log('Fetch complete');
                //         return;
                //     }
                //
                //     // result.value for fetch streams is a Uint8Array
                //     bytesReceived += result.value.length;
                //     if (bytesReceived >= 350000000) {
                //         console.log('Received', bytesReceived, 'bytes of data so far');
                //         responseDataArray.push(response.blob().replace(removeResponseBlob, ""));
                //         removeResponseBlob = response.blob();
                //         bytesReceived = 0;
                //     }
                //
                //
                //     // Read some more, and call this function again
                //     return reader.read().then(processResult);
                //

            })
    }
}