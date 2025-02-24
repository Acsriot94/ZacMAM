function showEditFileTagsDialog(file_ids, callback)
{
    closeMenu();

    const html = `<dialog-box id="edit-tags-dialog" dialog-title="Edit Tags" width="400" height="200" show="show"><div slot="content"><center><div class="spinner" style="text-align:center"></div></center></div></dialog-box>`;
    document.body.insertAdjacentHTML('beforeend', html);

    populateFileTags(file_ids, callback);
}

async function populateFileTags(file_ids, callback)
{
    let siteURL = getJSConnectValue("site.url");
    if (siteURL === null) siteURL = "";

    const response = await fetch(siteURL + "/ajax/tags.php?files=" + file_ids.join(',') + (getJSConnectValue('link.id' , '') !== '' ? '&link=' + getJSConnectValue('link.id') : ''));
    const json = await response.json();

    if (json.error) {
        alert(sanitize_string(json.error));
    } else if (json.tags) {
        const dialog = document.getElementById('edit-tags-dialog');
        dialog.innerHTML = '';

        let html = `<div slot="content"><token-input id="tag-input" tokens="${json.tags.join(',')}" autofocus="autofocus"></token-input>`;
        html += `<input type="hidden" name="partials" id="tag-partials" value="${json.partials.join(',')}"/></div>`;
        html += `<div slot="buttons"><button class="actionbtn" onclick="saveFileTags('${file_ids.join(',')}', ${callback})">Save</button></div>`;
        dialog.insertAdjacentHTML('beforeend', html);

        const tagInput = document.getElementById('tag-input');
        tagInput.focus();
        tagInput.addEventListener('keyup', e => {
            if (e.key === 'Enter') {
                saveFileTags(file_ids.join(','), callback);
            }
        });
    }
}

async function saveFileTags(file_ids, callback)
{
    file_ids = file_ids.split(',');

    let siteURL = getJSConnectValue("site.url");
    if (siteURL === null) siteURL = "";

    const tagInput = document.getElementById('tag-input');
    const tags = tagInput.tokens;

    const partials = document.getElementById('tag-partials').value.split(',');

    const dialog = document.getElementById('edit-tags-dialog');
    dialog.close();

    const json = await postData(siteURL + "/ajax/tags.php", {files: file_ids.join(','), tags: tags, partials: partials});

    if (json.error) {
        alert(sanitize_string(json.error));
    } else if (json.success) {
        if (callback) eval(callback);
    }
}

function tagURLForValue(tag)
{
    const searchParams = {
        scope: 1,
        match: [
            {
                key: 'tag',
                type: 0,
                val: tag
            }
        ]
    };

    return 'files?searchparams=' + encodeURIComponent(btoa(JSON.stringify(searchParams))) + (getJSConnectValue('link.id' , '') !== '' ? '&link=' + getJSConnectValue('link.id') : '');
}