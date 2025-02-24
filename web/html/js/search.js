
function showSearchDialog()
{
    // Load existing search params
    let search_params = [];

    if (typeof URLSearchParams !== 'undefined') {
        const url = new URL(window.location.href);
        const params = new URLSearchParams(url.search);
        const param_string = params.get('searchparams');

        if (param_string) {
            search_params = safeJSONParse(atob(param_string));
        }

        if (typeof search_params === 'undefined'  || !search_params) search_params = [];

    } else {
        console.log('Your browser does not support URLSearchParams');
    }

    showSearchDialogWithOptions(search_params);
}

function showSearchDialogWithOptions(options, type, name)
{
    // Delete existing dialog if it exists
    if ($('#search-dialog').length) {
        $('#search-dialog').remove();
    }

    var html = '<dialog-box id="search-dialog" dialog-title="Advanced Search" width="700" height="430" style="display:none">';
    html += '<div slot="content"><h2>Scope</h2>';
    html += 'Search in <select id="search-scope"><option value="0">Current folder</option><option value="1"' + (options["scope"] == 1 ? ' selected="selected"':'') + '>Entire project</option></select>';

    html += '<h2>Match <select name="match_mode" id="search-match-mode" style="vertical-align:middle"><option value="0">All<option value="1"' + (options["match_mode"] == 1 ? ' selected="selected"':'') + '>Any</select></h2>';
    html += '<table id="search-match-table"></table>';
    html += '<button class="small" type="button" onclick="searchAddMatch()">+</button>';
    html += '</div>'

    if (type === 'saved_search') {
        html += '<input type="hidden" id="advanced-search-saved-name" value="' + name + '"/>';
        html += '<div slot="buttons" class="advanced-search-button-container"><div class="spacer"></div><button onclick="closeSearchDialog();">Cancel</button> <button class="actionbtn" onclick="saveSearch()">Update</button></div>';
    } else {
        html += '<div slot="buttons" class="advanced-search-button-container"><button class="actionbtn" onclick="saveSearch()">Save...</button><div class="spacer"></div><button onclick="closeSearchDialog();">Cancel</button> <button class="actionbtn" onclick="performSearch()">Search</button></div>';
    }

    html += '</dialog-box>';

    document.body.insertAdjacentHTML('beforebegin', html);

    // Set values
    if (options && Object.keys(options).length > 0) {
        for (let i=0; i < options['match'].length; i++) {
            const match = options['match'][i];

            // Add new row
            var row = searchAddMatch();

            var keyObj = row.find('.search-match-key');
            keyObj.val(match['key']);
            changeMatchType(keyObj[0]);

            row.find('.search-match-type').val(match['type']);
            row.find('.search-match-val').val(match['val']);

            if (match['subkey']) {
                row.find('.search-match-subkey').val(match['subkey']);
            }
        }
    } else {
        searchAddMatch();
    }

    // Show manually to prevent flash of unstyled content
    const dialog = document.getElementById('search-dialog');
    dialog.show();
}

function closeSearchDialog()
{
    const dialog = document.getElementById('search-dialog');
    if (dialog) dialog.remove();
}

function getSearchOptionsFromDialog()
{
    // Prep params
    const scope = parseInt($('#search-scope').val());
    const search_params = {match_mode: $('#search-match-mode').val(), scope: scope};
    const matches = [];

    $('#search-match-table tr').each(function() {
        const key = $(this).find('.search-match-key').val();
        const type = $(this).find('.search-match-type').val();
        const val = $(this).find('.search-match-val').val();

        const match = {key:key, type:type, val:val};

        if ($(this).find('.search-match-subkey').length) {
            match['subkey'] = $(this).find('.search-match-subkey').val();
        }

        matches.push(match);
    });

    search_params['match'] = matches;

    return search_params;
}

function performSearch()
{
    const search_params = getSearchOptionsFromDialog();
    const json_string = JSON.stringify(search_params);
    
    if (search_params.scope == 0) { // Current folder
        window.location.href = 'files?dept=' + jsconnect['folder']['dept_id'] + '&folder=' + encodeURIComponent(jsconnect['folder']['path']) + '&project=' + jsconnect['project']['id'] + '&searchparams=' + btoa(json_string);
    } else {
        window.location.href = 'files?searchparams=' + btoa(json_string);
    }
}

function getSearchMatchOptions()
{
    var workflow_matches = {};
    if (workflows) {
        for (var i = 0; i < workflows.length; i++) {
            var workflow = workflows[i];
            workflow_matches[workflow['id']] = workflow['name'];
        }
    }

    workflow_matches['-1'] = '(No Workflow)';

   return [
        {name:'File Title',key:'title',type:1},
        {name:'File Type', key:'type', type:0,values:{1:'Video',2:'Audio',3:'Image',4:'Folder',5:'Comment Stream',6:'Document',7:'Compressed Archive',0:'Other'}},
        {name:'Description',key:'description',type:1},
        {name:'Age (days)',key:'age_days',type:2},
        {name:'Duration (seconds)',key:'duration_secs',type:2},
        {name:'File Size',key:'size',type:2, val_placeholder:'Bytes'},
        {name:'File Extension',key:'ext',type:1},
        {name:'Has Audio',key:'has_audio',type:3},
        {name:'Width',key:'width',type:2},
        {name:'Height',key:'height',type:2},
        {name:'Drop Frame',key:'drop_frame',type:3},
        {name:'MIME Type',key:'mime_type',type:1},
        {name:'Has Versions',key:'has_versions',type:3},
        {name:'Version Title',key:'version_title',type:1},
        {name:'Is Alias',key:'is_alias',type:3},
        {name:'Is Favorite',key:'is_favorite',type:3},
        {name:'Is Pinned',key:'pinned',type:3},
        {name:'Viewed By Me',key:'is_viewed',type:3},
        {name:'Views',key:'views',type:2},
        {name:'Downloads',key:'downloads',type:2},
        {name:'Has Transcript',key:'has_transcript',type:3},
        {name:'Transcript Text',key:'transcript',type:1},
        {name:'Has Comments',key:'has_comments',type:3},
        {name:'Comment Text',key:'comment',type:1},
        {name:'Custom Metadata',key:'custom_metadata',type:4,subkey_placeholder:'Tag Name'},
        {name:'Color',key:'color',type:0,values:{0:'No Color',1:'Red',2:'Black',3:'Orange',4:'Green',5:'Blue',6:'Turquoise',7:'Pink',8:'Purple'}},
        {name:'Status Text',key:'status_text',type:1},
        {name:'File Workflow',key:'workflow',type:0,values:workflow_matches},
        {name:'Tag Name',key:'tag',type:5}
   ];
}

function searchAddMatch()
{
    var typeSelect = '<select name="match_key[]" class="search-match-key" onchange="changeMatchType(this)">';

    var matchOptions = getSearchMatchOptions();

    for (var i=0; i<matchOptions.length; i++) {
        typeSelect += '<option value="'+matchOptions[i]['key']+'">'+matchOptions[i]['name'];
    }

    typeSelect += '</select>';

    var selectObj = $(typeSelect);
    var row = $('<tr><td></td><td colspan="2"></td><td></td><td><a href="#" onclick="deleteSearchMatch(this)"><div class="delete-btn"></div></a></td></tr>');
    row.find('td:first-child').append(selectObj);

    $('#search-match-table').append(row);

    changeMatchType(selectObj[0]);

    return row;
}

function changeMatchType(obj)
{
    var row = $(obj).parent().parent();
    var matchType = obj.selectedIndex;

    // Remove additional column if set
    if (row.children().length == 5) row.children().eq(3).remove();

    var matchOptions = getSearchMatchOptions();

    var match = matchOptions[matchType];
    var td1 = row.find('td:nth-child(2)');
    var td2 = row.find('td:nth-child(3)');

    td1.attr("colspan","2");

    switch (match['type']) {
        case 0: // List
            td1.html('<select name="match_type[]" class="search-match-type"><option value="0">is</option><option value="1">is not</option></select>');

            var td2HTML = '<select name="match_val[]" class="search-match-val">';

            var vals = match['values'];
            var keys = Object.keys(vals);

            for (var i=0; i<keys.length; i++) {
                td2HTML += '<option value="'+keys[i]+'">'+match['values'][keys[i]]+'</option>';
            }

            td2HTML += '</select>';
            td2.html(td2HTML);
            break;

        case 1: // Text
            td1.html('<select name="match_type[]" class="search-match-type"><option value="8">contains</option><option value="0">is</option><option value="1">is not</option><option value="6">starts with</option><option value="7">ends with</option></select>');
            td2.html('<input name="match_val[]" class="search-match-val" type="text"' + (match['val_placeholder'] ? ' placeholder="' + match['val_placeholder'] + '"':'') + '>');
            break;

        case 2: // Number
            td1.html('<select name="match_type[]" class="search-match-type"><option value="0">is</option><option value="1">is not</option><option value="2">less than</option><option value="3">greater than</option><option value="4">less than or equal to</option><option value="5">greater than or equal to</option></select>');
            td2.html('<input name="match_val[]" class="search-match-val" type="number"' + (match['val_placeholder'] ? ' placeholder="' + match['val_placeholder'] + '"':'') + '>');
            break;

        case 3: // Boolean
            td1.html('<select name="match_type[]" class="search-match-type"><option value="0">is</option></select>');
            td2.html('<select name="match_val[]" class="search-match-val"><option value="1">True</option><option value="0">False</option></select>');
            break;

        case 4: // Key / Value
            // Add additional column
            td1.attr("colspan","1");
            $('<td><input type="text" class="search-match-subkey"' + (match['subkey_placeholder'] ? ' placeholder="' + match['subkey_placeholder'] + '"':'') + '></td>').insertBefore(td1);

            td1.html('<select name="match_type[]" class="search-match-type"><option value="8">contains</option><option value="0" selected="selected">is</option><option value="1">is not</option><option value="6">starts with</option><option value="7">ends with</option></select>');
            td2.html('<input name="match_val[]" class="search-match-val" type="text"' + (match['val_placeholder'] ? ' placeholder="' + match['val_placeholder'] + '"':'') + '>');
            break;

        case 5: // Bool Text
            td1.html('<select name="match_type[]" class="search-match-type"><option value="0">is</option><option value="1">is not</option></select>');
            td2.html('<input name="match_val[]" class="search-match-val" type="text"' + (match['val_placeholder'] ? ' placeholder="' + match['val_placeholder'] + '"':'') + '>');
            break;

        default:
            break;
    }

    if (row.find(".search-match-subkey").length) {
        row.find(".search-match-subkey").focus();
    } else {
        td2.find('.search-match-val').focus();
    }
}

function deleteSearchMatch(obj)
{
    var row = $(obj).parent().parent();
    row.remove();
}

async function saveSearch()
{
    let name = '';

    const nameElement = document.getElementById('advanced-search-saved-name');
    if (nameElement && nameElement.value) {
        name = nameElement.value;
    } else {
        name = prompt('Enter a name for the search:');
    }

    if (name) {
        const options = getSearchOptionsFromDialog();
        const jsonArray = JSON.stringify(options);

        const json = await postData(
            "/ajax/file_ops.php",
            {
                save_search: 1,
                name: name,
                project: getJSConnectValue('project.id', -1),
                params: jsonArray
            });

        if (json) {
            if (json.error) {
                alert(json.error);
            } else {
                closeSearchDialog();
                updateSavedSearches();
            }
        } else {
            alert("Unknown error");
        }
    }
}

function showSavedSearchManageDialog() {
    // Delete existing dialog if it exists
    if ($('#search-manage-dialog').length) {
        $('#search-manage-dialog').remove();
    }

    var html = '<dialog-box id="search-manage-dialog" dialog-title="Manage Saved Searches" width="400" height="300" style="display:none">';
    html += '<div slot="content" id="search-manage-dialog-content"><div style="display:flex;justify-content:center"><div class="spinner"></div></div>';
    html += '</div>'
    html += '</dialog-box>';

    document.body.insertAdjacentHTML('beforebegin', html);

    // Show manually to prevent flash of unstyled content
    const dialog = document.getElementById('search-manage-dialog');
    dialog.show();

    populateManageSearchesData();

    // Reset dropdown on close
    dialog.onCloseHandler = () => {
        const dropdown = document.getElementById('file-filter');
        dropdown.value = 0;
        updateSavedSearches();
    };
}

async function populateManageSearchesData()
{
    const dialog = document.getElementById('search-manage-dialog');
    const content = document.getElementById('search-manage-dialog-content');

    // Query searches
    const response = await fetch("/ajax/file_ops.php?saved_searches&project=" + getJSConnectValue('project.id', -1));
    const json = await response.json();

    content.innerHTML = '';

    if (json) {
        if (json.error) {
            content.insertAdjacentHTML('beforeend', '<div class="error-alert">' + json.error + '</div>');
            return;
        }

        if (json.searches) {
            const searches = json.searches;

            if (searches.length === 0) {
                content.insertAdjacentHTML('beforeend', '<h3>No results found</h3>');
            } else {
                for (const search of searches) {
                    const html = '<div class="manage-search-dialog-item" data-id="' + search.id + '" data-name="' + search.name + '"><div class="manage-search-dialog-item-text">' + search.name + '</div><div class="fa-icon fa-icon-gear edit" title="Edit"></div><div class="fa-icon fa-icon-x delete" title="Delete"></div></div>';
                    content.insertAdjacentHTML('beforeend', html);
                }
            }

            const editIcons = document.querySelectorAll('.manage-search-dialog-item .edit');
            editIcons.forEach(item => {
                item.addEventListener('click', e => {
                    const parent = e.target.closest('.manage-search-dialog-item');
                    const id = parent.getAttribute('data-id');
                    const name = parent.getAttribute('data-name');

                    fetch("/ajax/file_ops.php?saved_search=" + id).then((response) => {
                        response.json().then((json) => {
                            if (json.error) {
                                alert(json.error);
                            } else if (json.search) {
                                dialog.close();
                                dialog.remove();

                                const params = JSON.parse(json.search.params);
                                showSearchDialogWithOptions(params, 'saved_search', name);
                            } else {
                                alert('Unknown error');
                            }
                        });
                    });
                });
            });

            const deleteIcons = document.querySelectorAll('.manage-search-dialog-item .delete');
            deleteIcons.forEach(item => {
                item.addEventListener('click', e => {
                    const parent = e.target.closest('.manage-search-dialog-item');
                    const id = parent.getAttribute('data-id');

                    postData("/ajax/file_ops.php", {delete_search: id}).then((data) => {
                        if (data.error) {
                            alert(data.error);
                        } else if (data.success) {
                            parent.remove();
                        } else {
                            alert('Unknown error');
                        }
                    });
                });
            });

            return;
        }
    }

    content.insertAdjacentHTML('beforeend', '<div class="error-alert">Unknown error</div>');
}

async function updateSavedSearches()
{
    // Remove existing items
    const items = document.querySelectorAll('.option-saved-search');
    items.forEach(item => {
        item.remove();
    });

    // Query searches
    const response = await fetch("/ajax/file_ops.php?saved_searches&project=" + getJSConnectValue('project.id', -1));
    const json = await response.json();

    if (json) {
        if (json.error) {
            alert(json.error);
            return;
        } else if (json.searches) {
            const searches = json.searches;

            if (searches.length > 0) {
                const dropdown = document.getElementById('file-filter');
                dropdown.insertAdjacentHTML('beforeend', '<hr class="option-saved-search" />');

                for (const search of searches) {
                    const html = '<option class="option-saved-search" value="custom' + search.id + '">' + search.name;
                    dropdown.insertAdjacentHTML('beforeend', html);
                }

                dropdown.insertAdjacentHTML('beforeend', '<hr class="option-saved-search" />');
                dropdown.insertAdjacentHTML('beforeend', '<option class="option-saved-search" value="manage">Manage Saved Searches...');
            }

            return;
        }
    }

    alert('Unknown error');
}