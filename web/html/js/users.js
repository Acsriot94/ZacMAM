var depts = [];

function appendNewUserForm(object,dept_id,should_focus)
{
    if (!canModifyTeam) return;

    var noAutoActivate = (getLocalStorage('new_user_no_auto_activate', 0) == 1);
    var shouldAutoActivate = !noAutoActivate;

    var lastRole = getLocalStorage('last_role_index', -1);

    var row = '<tr class="add-user-row" data-deptid="'+dept_id+'">';
    row += '<td colspan="3"><input type="email" class="new-user-email" placeholder="Enter an email address to add a user to this department" style="width:100%" list="email-suggest" required>';
    row += '<span style="margin-left:5px" class="tooltip" title="Automatically send the user an email with an activation link"><check-box class="new-user-activate" id="new-user-activate-check-'+dept_id+'"'+(shouldAutoActivate ? ' checked="checked"':'')+' small="small" text="Send activation link automatically"></check-box></span>';
    row += '<td valign="top"><select style="min-width:70%" class="new-user-role">'+generateRoleDropdownOptions(lastRole,false)+'</select>';
    row += '<td valign="top"><button class="new-user-add submitbtn">Add</button>';


    $(row).appendTo(object);

    // Autofocus
    if (should_focus) {
        object.find('.new-user-email').focus();
    }
}

function replaceDepts(newData)
{
    depts = newData;
}

function renderAllDepts(destObj)
{
    // First sort depts
    depts.sort(compareDepts);

    for (var i=0; i<depts.length; i++) {
        renderDept(depts[i],destObj);
    }
}

function renderDept(deptObj,destObj)
{
    var deptID = parseInt(deptObj['id']);

    // Hide dept if nothing inside
    if (!canModifyTeam && deptObj['users'].length == 0) {
        $('.user-dept[data-id="'+deptID+'"]').hide();
        return;
    }

    var container = '<div class="user-dept" data-id="'+deptID+'">';

    if (deptID != -1) {
        container += '<h2><span id="dept_title_' + deptID + '">' + deptObj['name'] + '</span>';

        if (canModifyTeam) {
            if (deptObj['custom_dept']) container += ' <a href="#" class="tooltip" title="Edit department name" onclick="editDepartmentName(' + deptID + ');"><span class="edit-btn"></span></a>';
            container += ' <a href="#" class="tooltip" title="Delete department" onclick="deleteDepartment(event,' + deptID + ');"><span class="delete-btn"></span></a>';
        }

        container += '</h2>';
    }

    var table = '<table data-id="'+deptID+'" class="usertable pagesectable" style="width:100%" cellspacing="1" cellpadding="2"><tr><th width="25%">Name<th width="25%">Email Address<th width="18%">Phone</th><th width="25%">Role<th></table>';
    var obj = container+table+'</div>';
    $(obj).appendTo(destObj);

    var destTable = $('.user-dept[data-id="'+deptID+'"] table');

    renderUsersInDept(deptObj,destTable);
    appendNewUserForm(destTable,deptID,false);
    reloadTooltips();
}

function renderUsersInDept(deptObj,destObj)
{
    // Sort alphabetically
    var users = deptObj['users'];
    users.sort(compareUsers);

    for (var i=0; i<users.length; i++) {
        renderUser(users[i],destObj);
    }
}

function renderUser(userObj,destObj) {
    var projectUserID = parseInt(userObj['id']);
    var userID = parseInt(userObj['user_id']);

    var row = '<tr data-id="' + projectUserID + '" data-user-id="' + userID + '">';
    row += '<td><a href="profile?view='+userID+'"><img src="'+userObj['avatar']+'" class="avatar"/><span class="avatar">'+userObj['first_name']+' '+userObj['last_name']+'</span></a>';

    if (parseInt(userObj['mfa_enabled']) === 1) {
        row += '<div class="mfa-enabled tooltip" title="User has Multi-Factor Authentication enabled"></div>';
    }

    if (userObj['needs_activation']) row += '<p><div class="info-alert">Activation needed<p><a href="#" onclick="generateActivationLink('+userObj['user_id']+')">Generate Activation Link</a></div>';

    row += '<td>' + userObj['email'];
    row += '<td>' + userObj['phone'];

    if (canModifyTeam) {
        row += '<td><select class="user-role" style="min-width:70%">' + generateRoleDropdownOptions(userObj['permission_role'],userObj['custom_permissions']) + '</select>';

        row += '<td><a href="#" class="dropdown" data-id="' + projectUserID + '"><img src="img/Dropdown.svg"/></a><div style="position:relative"> <ul class="menu" style="display:none;">';
        row += '<li><a href="permissions?user=' + userID + '&project=' + getJSConnectValue('project.id') + '">Permissions...</a>';
        row += '<li><a href="roles?project=' + getJSConnectValue('project.id') + '">Manage Roles...</a>';
        row += '<li><a href="#" class="delete" data-id="' + projectUserID + '">Delete</a></ul></div>';
        row += '</div>';
    } else {
        for (var i=0; i<roleCache.length; i++) {
            var role = roleCache[i];
            if (role['id'] == userObj['permission_role']) {
                row += '<td>' + role['title']+(userObj['custom_permissions'] == 1 ? ' (custom)':'');
                break;
            }
        }
        row += '<td>';
    }

    row += '</tr>';

    $(row).appendTo(destObj);
}

function departmentObjectWithID(dept_id)
{
    for (var i=0; i<depts.length; i++) {
        var deptObj = depts[i];
        if (parseInt(deptObj['id']) == parseInt(dept_id)) return deptObj;
    }

    return null;
}

function deleteUserWithProjectUserID(puid)
{
    for (var i=0; i<depts.length; i++) {
        var users = depts[i]['users'];

        for (j=0; j<users.length; j++) {
            if (parseInt(users[j]['id']) == parseInt(puid)) {
                users.splice(j,1);
                depts[i]['users'] = users;
                return;
            }
        }
    }
}

function deleteDepartmentWithID(dept_id)
{
    if (dept_id < 0) return;

    for (var i=0; i<depts.length; i++) {
        if (parseInt(depts[i]['id']) == parseInt(dept_id)) {
            depts.splice(i,1);
            return;
        }
    }
}

function userIDFromProjectUserID(puid)
{
    var obj = userObjectForProjectUserID(puid);

    if (obj) {
        return obj['user_id'];
    } else {
        return -1;
    }
}

function userObjectForProjectUserID(puid)
{
    for (var i=0; i<depts.length; i++) {
        var users = depts[i]['users'];

        for (j=0; j<users.length; j++) {
            if (parseInt(users[j]['id']) == parseInt(puid)) {
                return users[j];
            }
        }
    }

    return null;
}

function userObjectForUserID(uid)
{
    for (var i=0; i<depts.length; i++) {
        var users = depts[i]['users'];

        for (j=0; j<users.length; j++) {
            if (parseInt(users[j]['user_id']) == parseInt(uid)) {
                return users[j];
            }
        }
    }

    return null;
}

function allUserObjectsForUserID(uid)
{
    var objs = [];

    for (var i=0; i<depts.length; i++) {
        var users = depts[i]['users'];

        for (j=0; j<users.length; j++) {
            if (parseInt(users[j]['user_id']) == parseInt(uid)) {
                objs.push(users[j]);
            }
        }
    }

    return objs;
}

function generateRoleDropdownOptions(selected_id,custom_permissions)
{
    var outString = '';

    for (var i=0; i<roleCache.length; i++) {
        var role = roleCache[i];
        outString += '<option value="'+role['id']+'"'+(selected_id == role['id'] ? ' selected="selected"':'')+'>'+role['title']+(custom_permissions == 1 ? ' (custom)':'');
    }

    return outString;
}

function compareDepts(a,b)
{
    // Always put No Dept first
    if (a['department_id'] == -1) return -1;
    if (b['department_id'] == -1) return 1;

    // Otherwise order by name
    return a['name'].localeCompare(b['name']);
}

function compareUsers(a,b)
{
    var aName = a['last_name']+' '+a['first_name'];
    var bName = b['last_name']+' '+b['first_name'];

    return aName.localeCompare(bName);
}
