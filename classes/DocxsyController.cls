public without sharing class DocxsyController {
    //Used for every HTTP call
    static String accessToken = '';
    // used in creating upload file requests
    static String boundary = '----------9889464542212';
    static String delimiter = '\r\n--' + boundary + '\r\n';
    static String close_delimiter = '\r\n--' + boundary + '--';
    private static String DRIVE_API_URI = 'https://www.googleapis.com/drive/v3/files';

    public static void switchAccessToken(Boolean isServiceAcc) {
        if (isServiceAcc) {
            accessToken = DocxsyObjectService.getServiceAccountCS().Value__c;
        } else {
            accessToken = DocxsyObjectService.getPersonAccountCS().Access_token__c;
        }
        if (accessToken == null) { accessToken = 'noToken'; }
    }

    @AuraEnabled
    public static String getFilesList(String salesforceId, Boolean filtered, Boolean isServiceAcc) {
        switchAccessToken(isServiceAcc);
//        String queryParam = '&q=appProperties%20has%20{%20key=%27SalesforceId%27%20and%20value=%27' + salesforceId + '%27}';
        String queryParam = '';
        String url = DRIVE_API_URI + '?pageSize=1000&fields=files/id,files/parents,files/name,files/mimeType,files/webViewLink,files/appProperties,files/modifiedTime,files/owners';
        url += filtered ? queryParam : '';
        HttpResponse res = fetchDataRequest(accessToken, url);
        if (res.getStatusCode() == 401) {
            accessToken = isServiceAcc ? DocxsyAuthorizationHelper.getJWTToken() : DocxsyAuthorizationHelper.refreshUserAuthtoken();
            HttpResponse res2 = fetchDataRequest(accessToken, url);
            if (res2.getStatusCode() == 200) {
                if (isServiceAcc) {
                    DocxsyAuthorizationHelper.updateCustomSetting(accessToken);
                } else {
                    DocxsyAuthorizationHelper.updateToken();
                }
                return res2.getBody();
            }
        } else {
            return res.getBody();
        }
        return 'error';
    }

    public static HttpResponse fetchDataRequest(String accessToken, String url) {
        Http h = new Http();
        HttpRequest req = new HttpRequest();
        HttpResponse res = new HttpResponse();
        req.setEndpoint(url);
        req.setMethod('GET');
        req.setHeader('Authorization', 'Bearer ' + accessToken);
        res = h.send(req);
        return res;
    }

    @AuraEnabled
    public static String deleteFile(String googleDriveRecordId, Boolean isServiceAcc) {
        String url = DRIVE_API_URI + '/' + googleDriveRecordId;
        HttpResponse resp = httpCallHandler(url, '', '', 'DELETE', isServiceAcc);
        return String.valueOf(resp.getStatusCode());
    }

    @AuraEnabled
    public static String uploadFileToFolder(String contentDocumentRecordId, String parentFolderId, String salesforceRecordId, Boolean isServiceAcc) {
        List<ContentVersion> cvList = DocxsyObjectService.getContentVersionDoc(contentDocumentRecordId);
        ContentVersion contentVersionItem = cvList.size() > 0 ? cvList[0] : new ContentVersion();
        String bodyEncoded;
        String body;
        //this code is to upload image
        if (contentVersionItem.FileType == 'JPG' || contentVersionItem.FileType == 'JPEG' || contentVersionItem.FileType == 'PNG') {
            bodyEncoded = EncodingUtil.base64Encode(contentVersionItem.VersionData);
            body = delimiter + 'Content-Type: application/json\r\n\r\n' + '{ "title" : "' + contentVersionItem.ContentDocument.Title + '",' +
                    '"mimeType" : "image/' + contentVersionItem.FileType.toLowerCase() + '",' + '"parents":[{"id":"' + parentFolderId + '"}],' +
                    '"properties": [{"value":"' + salesforceRecordId + '", "key":"SalesforceId"}]}' + delimiter +
                    'Content-Type: "imager/' + contentVersionItem.FileType.toLowerCase() + '\r\n' + 'Content-Transfer-Encoding: base64\r\n' +
                    '\r\n' + bodyEncoded + close_delimiter;
        }
        //this code is to upload PDF
        if (contentVersionItem.FileType == 'PDF') {
            bodyEncoded = EncodingUtil.base64Encode(contentVersionItem.VersionData);
            body = delimiter + 'Content-Type: application/json\r\n\r\n' + '{ "title" : "' + contentVersionItem.ContentDocument.Title + '",'
                    + ' "mimeType" : "application/' + contentVersionItem.FileType +
                    '","parents" :[{"id":"' + parentFolderId + '"}],' + '"properties": [{"value":"' + salesforceRecordId + '", "key":"SalesforceId"}]}'
                    + delimiter + 'Content-Type: application/' + contentVersionItem.FileType + '\r\n'
                    + 'Content-Transfer-Encoding: base64\r\n' + '\r\n' + bodyEncoded + close_delimiter;
        }
        //this code is to upload DOCX
        if (contentVersionItem.FileType == 'WORD_X') {
            bodyEncoded = EncodingUtil.base64Encode(contentVersionItem.VersionData);
            body = delimiter + 'Content-Type: application/json\r\n\r\n' + '{ "title" : "' + contentVersionItem.ContentDocument.Title + '",'
                    + ' "mimeType" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document","parents" :[{"id":"' + parentFolderId + '"}],'
                    + '"properties": [{"value":"' + salesforceRecordId + '", "key":"SalesforceId"}]}'
                    + delimiter + 'Content-Type: application/' + contentVersionItem.FileType + '\r\n' + 'Content-Transfer-Encoding: base64\r\n' + '\r\n' + bodyEncoded + close_delimiter;
        }
        //this code is to upload EXCEL
        if (contentVersionItem.FileType == 'EXCEL_X') {
            bodyEncoded = EncodingUtil.base64Encode(contentVersionItem.VersionData);
            body = delimiter + 'Content-Type: application/json\r\n\r\n' + '{ "title" : "' + contentVersionItem.ContentDocument.Title + '",'
                    + ' "mimeType" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","parents" :[{"id":"' + parentFolderId + '"}],'
                    + '"properties": [{"value":"' + salesforceRecordId + '", "key":"SalesforceId"}]}'
                    + delimiter + 'Content-Type: application/' + contentVersionItem.FileType + '\r\n' + 'Content-Transfer-Encoding: base64\r\n' + '\r\n' + bodyEncoded + close_delimiter;
        }
        if (bodyEncoded != null && body != null) {
            HttpResponse res = uploadRequest(body, isServiceAcc);
            if (!Test.isRunningTest()) {
                DocxsyObjectService.deleteContentDocument(contentVersionItem.ContentDocumentId);
            }
            return String.valueOf(res.getStatusCode());
        }
        return 'error';
    }

    @AuraEnabled
    public static String renameFile(String googleDriveRecordId, String newName, Boolean isServiceAcc) {
        String url = DRIVE_API_URI + '/' + googleDriveRecordId;
        String contentType = 'application/json';
        String body = '{"name":"' + newName + '"}';
        HttpResponse resp = httpCallHandler(url, contentType, body, 'PATCH', isServiceAcc);
        return String.valueOf(resp.getStatusCode());
    }

    @AuraEnabled
    public static String linkFile(String googleDriveRecordId,  String salesforceRecordId, Boolean isServiceAcc) {
        String url = DRIVE_API_URI + '/' + googleDriveRecordId;
        String contentType = 'application/json';
        String body = '{"appProperties":{"SalesforceId":"' + salesforceRecordId + '"}}';
        HttpResponse resp = httpCallHandler(url, contentType, body, 'PATCH', isServiceAcc);
        return String.valueOf(resp.getStatusCode());
    }

    @AuraEnabled
    public static String unLinkFile(String googleDriveRecordId, Boolean isServiceAcc) {
        String url = 'https://www.googleapis.com/drive/v2/files/' + googleDriveRecordId + '/properties/SalesforceId';
        HttpResponse resp = httpCallHandler(url, '', null, 'DELETE', isServiceAcc);
        return String.valueOf(resp.getStatusCode());
    }

    @AuraEnabled
    public static String createFolder(String folderName, String parentFolderId, String salesforceRecordId, Boolean isServiceAcc) {
        String url = 'https://www.googleapis.com/drive/v2/files';
        String contentType = 'application/json';
        String body = '{"title":"' + folderName + '","mimeType":"application/vnd.google-apps.folder",' +
                '"parents": [{"kind": "drive#fileLink","id": "' + parentFolderId + '"}],' +
                '"properties": [{"value":"' + salesforceRecordId + '", "key":"SalesforceId"}]}';
        HttpResponse resp = httpCallHandler(url, contentType, body, 'POST', isServiceAcc);
        return String.valueOf(resp.getStatusCode());
    }

    @AuraEnabled
    public static String downloadFile(String googleDriveRecordId, String mimeType, Boolean isServiceAcc) {
        String url;
        if (mimeType != null && mimeType.endsWith('.document')) {
            url = DRIVE_API_URI + '/' +
                    googleDriveRecordId +
                    '/export?mimeType=application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (mimeType != null && mimeType.endsWith('.spreadsheet')){
            url = DRIVE_API_URI + '/' +
                    googleDriveRecordId +
                    '/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else {
            url = DRIVE_API_URI + '/' + googleDriveRecordId + '?alt=media';
        }

        HttpResponse res = httpCallHandler(url, '', '', 'GET', isServiceAcc);
        if (res.getStatusCode() == 200) {
            return EncodingUtil.base64Encode(res.getBodyAsBlob());
        }
        return 'error';
    }

    public static HttpResponse uploadRequest(String body, Boolean isServiceAcc) {
        String url = 'https://www.googleapis.com/upload/drive/v2/files?uploadType=multipart';
        String contentType = 'multipart/mixed; boundary="' + boundary + '"';
        HttpResponse res = httpCallHandler(url, contentType, body, 'POST', isServiceAcc);
        return res;
    }

    public static HttpResponse httpCallHandler(String url, String contentType, String body, String callMethod, Boolean isServiceAcc) {
        switchAccessToken(isServiceAcc);
        Http http = new Http();
        HttpRequest req = new HttpRequest();
        req.setEndpoint(url);
        req.setHeader('Authorization', 'Bearer ' + accessToken);
        if (contentType != '') {
            req.setHeader('Content-Type', contentType);
            req.setBody(body);
        }
        req.setMethod(callMethod);
        req.setTimeout(60 * 1000);
        HttpResponse res = http.send(req);
        return res;
    }

}