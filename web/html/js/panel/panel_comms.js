// Setup iframe comms
document.addEventListener('message', handleParentMessage, false);

window.onmessage = function(e) {
    handleParentMessage(e);
};

function handleParentMessage(e) {
    console.log('parent message received');

    var json = safeJSONParse(e.data);
    if (!json) {
        console.log('Error getting data from parent');
        return;
    }

    switch (json['type']) {
        case 'endprogress':
            hideFileProgress(json['id']);
            break;

        default:
            console.log('Unknown message type \'' + json['type'] + '\'');
            break;
    }
}

function panelSendMarkers(file_id)
{
    // Load markers
    $.get('panel/ajax/markers?id='+file_id,function(data) {
        parent.postMessage(JSON.stringify({type:'markers',data:data}),'*');
    });
}

function panelImportFileID(file_id)
{
    var obj = pageObjectForFileID(file_id);
    if (!obj) return;

    var downloadURL = obj.data('download-url');

    if (!downloadURL) {
        alert('Unable to import file. You do not have permission to download files.');
        return;
    }

    panelImportFile(file_id,downloadURL,obj.data('download-filename'));
}

function panelImportFile(file_id,download_url,filename)
{
    showFileProgress(file_id);
    
    parent.postMessage(JSON.stringify({type:'import',id:file_id,url:download_url,filename:filename}),'*');
}

function panelSeekToPosition(position)
{
    parent.postMessage(JSON.stringify({type:'seek',pos:position}),'*');
}