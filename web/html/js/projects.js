var scroller = null;

$(document).ready(function() {
    // Context menu
    $(document).on("contextmenu", ".projecttable tr", function(event) {
        event.preventDefault();

        var project_id = $(this).data('id');
        showMenuForProject(project_id, event);
    });

    $('input[type=search]').on('search', function () {
        // Reset search field
        $(this).parent().submit();
    });

    $('#project-filter').on('change',function() {
        writeCookie('project_filter',$('#project-filter').val(),365);
        window.location.reload(false);
    });

    var exportBtn = document.getElementById('export-btn');
    exportBtn.addEventListener('click', function(e) {
        showMenuForButton($(exportBtn), $('#export_dropdown'));
    });
});

function changeSorting(sort_id,desc) {
    if (sort_id) {
        writeCookie('project_sort',sort_id,1000);

        if (desc) {
            writeCookie('project_sort_desc',desc,1000);
        } else {
            writeCookie('project_sort_desc',desc,null);
        }

        window.location.reload(false);
    }
}

function projectDropdownClicked(index) {
    showMenuForProject(index, $('#project_dropdown_'+index));
}

function showMenuForProject(project_id, event)
{
    const row_obj = $('tr[data-id=' + project_id + ']');

    if (!row_obj.length) {
        logError('Unable to locate project with ID ' + project_id);
        return;
    }

    const filter_index = +getJSConnectValue('projects.filter');
    const can_edit = +row_obj.data('can-edit') === 1;
    const subscribed = +row_obj.data('subscribed') === 1;
    const is_owner = +row_obj.data('is-owner') === 1;
    const is_public_owner = +row_obj.data('is-public-owner') === 1;
    const is_site_admin = getJSConnectValue('user.site_admin') == true;
    const is_project_admin = +row_obj.data('is-project-admin') === 1;

    let html = '<ul class="menu" id="project-menu" style="display:none">';

    if (can_edit) {
        html += '<li><a href="projects_modify?edit=' + project_id + (filter_index === 2 ? '&template' : '') + '">Edit</a>';

        if (filter_index !== 2) { // Not template
            html += '<li><a href="projects_modify?archive=' + project_id + '">' + (filter_index === 0 ? 'Archive' : 'Unarchive') + '</a>';
        }

        html += '<li><a href="projects_modify?delete=' + project_id + '">Delete...</a>';

        if ((is_owner || is_site_admin) && !is_public_owner) html += '<li><a href="projects_modify?changeowner=' + project_id + '">Change Owner to Me</a>';

    } else {
        html += '<li><a href="projects_modify?leave=' + project_id + '">Leave Project...</a>';
    }

    if (filter_index !== 2) { // Not template
        html += '<li><a href="projects_modify?subscribe=' + project_id + '">' + (subscribed ? 'Unsubscribe from Instant Alerts' : 'Subscribe to Instant Alerts') + '</a>';
    }

    if (is_project_admin) html += '<li><a href="#" onclick="showEditProjectTagsDialog(' + project_id + ')">Edit Tags...</a>';

    if (can_edit && filter_index !== 2) {
        html += '<li><a href="history?project=' + project_id + '">View History</a>';
    }

    html += '</ul>';

    var menu = $(html);

    if (event) {
        showMenuForEvent(menu, event);
    } else {
        showMenuForButton($('#project_dropdown_' + project_id), menu);
    }
}

function showEditProjectTagsDialog(project_id)
{
    $('.menu').remove();

    const html = `<dialog-box id="edit-tags-dialog" dialog-title="Edit Tags" width="400" height="200" show="show"><div slot="content"><center><div class="spinner" style="text-align:center"></div></center></div></dialog-box>`;
    document.body.insertAdjacentHTML('beforeend', html);

    populateProjectTags(project_id);
}

async function populateProjectTags(project_id)
{
    let siteURL = getJSConnectValue("site.url");
    if (siteURL === null) siteURL = "";

    const response = await fetch(siteURL + "/ajax/tags.php?project=" + project_id);
    const json = await response.json();

    if (json.error) {
        alert(sanitize_string(json.error));
    } else if (json.tags) {
        const dialog = document.getElementById('edit-tags-dialog');
        dialog.innerHTML = '';

        let html = `<div slot="content"><token-input id="tag-input" tokens="${json.tags.join(',')}" autofocus="autofocus"></token-input></div>`;
        html += `<div slot="buttons"><button class="actionbtn" onclick="saveProjectTags(${project_id})">Save</button></div>`;
        dialog.insertAdjacentHTML('beforeend', html);

        const tagInput = document.getElementById('tag-input');
        tagInput.focus();
    }
}

async function saveProjectTags(project_id)
{
    let siteURL = getJSConnectValue("site.url");
    if (siteURL === null) siteURL = "";

    const tagInput = document.getElementById('tag-input');
    const tags = tagInput.tokens;

    const dialog = document.getElementById('edit-tags-dialog');
    dialog.close();

    const json = await postData(siteURL + "/ajax/tags.php", {project: project_id, tags: tags});

    if (json.error) {
        alert(sanitize_string(json.error));
    } else if (json.success) {
        //TODO: Reload just this project
        window.location.reload();
    }
}
