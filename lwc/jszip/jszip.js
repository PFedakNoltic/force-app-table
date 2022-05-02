import {LightningElement, api} from "lwc";
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


export default class Jszip extends LightningElement {
    @api id;
    @api mimeType;
    @api name;
    zip;
    clId = "544696838446-1k2eg2h47251ir7hkb3s4s86pv6bv7r3.apps.googleusercontent.com";
    parentFolder;
    zipName;

    connectedCallback() {
        loadScript(this, jsSipLibrary).then(() => {
            console.log("loadded", jsSipLibrary);

        });
    }

    // https://www.googleapis.com/drive/v3/files/1tQyU66ThJOSPgN8W4QRyjje8scTuVgmx?alt=media
    // https://drive.google.com/file/d/14DpeX-H78llRAHigZ_G6tyOt7qOrHYnl/edit?alt=media
    async handleDownload() {
        this.zip = new JSZip();
        let p;
        let q;
        r({clId: this.clId})
            .then((result) => {
                p = result.Access_token__c;
                console.log(result);
            })
            .then((c) => {
                    console.log(p);
                    console.log(this.id);
                    console.log(this.mimeType);
                    console.log(this.name);
                    console.log(this.parentFolder);
                    console.log(this.parentFolder);
                    // if (this.mimeType.includes("folder") && this.parentFolder === undefined) {
                    //     this.parentFolder = this.zip.folder(this.name);
                    //     this.parentFolder.file("hello.txt", "Hello ppppp");
                    //     q = this.parentFolder.folder("second");
                    //     this.parentFolder = q;
                    //     this.parentFolder.file("chill.txt", "Hello ppppp");
                    //     this.zipName = this.name;
                    //     // this.dispatchEvent(new CustomEvent('parentfolder', {detail: this.id}));
                    // } else if (this.mimeType.includes("folder") && this.parentFolder !== undefined) {
                    //     this.parentFolder.folder(this.name);
                    //     this.parentFolder = this.parentFolder.folder("this.name");
                    // } else if (this.mimeType.includes("folder") && this.parentFolder !== undefined) {
                    //     this.parentFolder.folder(this.name);
                    //     this.parentFolder = this.parentFolder.folder("this.name");
                    // }
                    // console.log(this.parentFolder);

                    fetch("https://www.googleapis.com/drive/v2/files/1XsrTnBMSxSpYiY8NbchuykKeLWqSHwwC/?alt=media", {
                        method: "GET",
                        headers: {
                            Authorization: 'Bearer ' + p + '',
                        }
                    }).then(response => response.blob())
                        .then(myBlob => {
                            blobToBase64(myBlob).then(myBase64 => {
                                console.log(myBase64);
                                myBase64 = myBase64.replace(/data.*base64,/, "");
                                console.log(myBase64);
                                let folder = this.zip.folder("hello world");
                                folder.file("hello.jpeg", myBase64, {base64: true});
                                folder.folder("hello").file("hello.txt", "Hello world")
                                // folder.file("image.docx", myBase64, {base64: true});
                                let zipName = this.zipName;
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
                            });

                        })

                }
            )

    }
}