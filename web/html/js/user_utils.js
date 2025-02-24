$(document).ready(function() {
    $('input[type=search]').on('search', function () {
        // Reset search field
        $(this).parent().submit();
    });

    // Context menu
    $(document).on('contextmenu','.usertable tr', function(e) {
        e.preventDefault();

        var menuCopy = $(this).find('.menu').clone();
        menuCopy.appendTo('body');
        menuCopy.show().menu().css({position:"absolute", top: e.pageY + "px", left: e.pageX + "px", maxWidth: "200px"});
    });

    $('.export').click(function() {
        showMenuForButton($(this),$('#export_dropdown'));
    });

    $('.import').click(function() {
        showMenuForButton($(this),$('#import_dropdown'));
    });

    $(document).on('click','.dropdown',function(e) {
        e.preventDefault();

        $(this).parent().find('.menu').show().menu();//.css({position:"absolute", top: e.pageY + "px", left: e.pageX + "px", maxWidth: "200px"});
    });

    $(document).on('click','.delete',function(e) {
        e.preventDefault();

        if (!confirm("Are you sure you wish to remove this user?")) return false;

        var id_no = $(this).data("id");
        var row = $('tr[data-id="'+id_no+'"]');

        $('.menu').hide();

        $.post('ajax/users.php',{delete:id_no},function(data) {
            var json = safeJSONParse(data);

            if (json['error']) {
                alert(sanitize_string(json['error']));
            } else {
                deleteUserWithProjectUserID(id_no);
                row.remove();
            }
        });
    });

    $(document).on('change','.user-role',function(e) {
        var id_no = $(this).parent().parent('tr').data('id');
        var role_id = $(this).val();

        $.post('ajax/users.php',{changerole:role_id,id:id_no},function(data) {
            var json = safeJSONParse(data);

            if (json['error']) {
                alert(sanitize_string(json['error']));
            } else {
                changeRoleIDForAllUserInstances(role_id,id_no);
            }
        });
    });

    $(document).on('keydown','.new-user-email', function(e) {
        if (e.keyCode == 13) {
            e.preventDefault();
            $(this).parent().parent().find('.new-user-add').trigger('click');
        }
    });

    $(document).on('click','.new-user-activate',function(e) {
        if ($(this).is(':checked')) {
            $('.new-user-activate').prop('checked', 'checked');
        } else {
            $('.new-user-activate').prop('checked', '');
        }
    });

    $(document).on('click','.new-user-add',function(e) {
        e.preventDefault();

        var table = $(this).parent().parent().parent();
        var row = $(this).parent().parent();
        var email = row.find('.new-user-email').val();
        if (email) email = cleanupEmail(email);

        if (email.length === 0) {
            alert('Please enter an email address.');
            return false;
        }

        if (!validateEmail(email)) {
            alert('You have entered an invalid email address.');
            return false;
        }

        // Get dept
        var deptID = row.data("deptid");

        var role = row.find('.new-user-role').val();
        var auto_activate = !!row.find('.new-user-activate')[0].getAttribute('checked');

        // Save defaults
        writeLocalStorage('new_user_no_auto_activate', (auto_activate ? 0:1));
        writeLocalStorage('last_role_index', role);

        // Check email address isn't already part of dept
        for (var i=0; i<depts.length; i++) {
            var deptObj = depts[i];

            if (deptObj['id'] == deptID) {
                var users = deptObj['users'];

                for (var j=0; j<users.length; j++) {
                    if (users[j]['email'] == email) {
                        alert('This user already exists in this department.');
                        return false;
                    }
                }
            }
        }

        $.post('ajax/users.php',{add:email,role:role,dept:deptID,auto_activate:auto_activate,project:('jsconnect' in window && 'project' in window.jsconnect ?  window.jsconnect.project.id:-1)},function(data) {
            var json = safeJSONParse(data);

            if (json['error']) {
                alert(sanitize_string(json['error']));
            } else if (json[0]['users']) {
                row.remove();

                // Add new user object
                var newUser = json[0]['users'][0];
                var dept = departmentObjectWithID(deptID);
                dept['users'].push(newUser);
                renderUser(newUser,table);
                appendNewUserForm(table,deptID,true);

                changeRoleIDForAllUserInstances(role,newUser['id']);
            }
        });
    });

    $(document).on('click','.dept-add-submit',function(e) {
        var deptID = $(this).parent().find('.dept-add-select').val();
        if (deptID === undefined || deptID < 0) {
            alert('Invalid department');
            return;
        }

        $.post('ajax/users.php',{adddept:deptID},function(data) {
            var json = safeJSONParse(data);

            if (json['error']) {
                alert(sanitize_string(json['error']));
            } else if (json[0]['id']) {
                $('.add-dept-dialog').dialog('close');

                // Add new dept object
                var newDept = json[0];
                depts.push(newDept);
                renderDept(newDept,$('#user-dept-container'));

                // Autoscroll
                $('html, body').animate({
                    scrollTop: $('.user-dept[data-id="'+deptID+'"]').offset().top
                }, 1000);
            }
        });
    });

    $("#newuser").click(function() {
        $('#firstnameallrow').hide();
        $('#lastnameallrow').hide();
        $('#phoneallrow').hide();

        $("#newuserdialog").dialog({
            title:"Invite Users",
            width:800,
            close: function( event, ui ) {
                window.location.reload(true);
            }
        });
    });
});

function deleteDepartment(e,deptID)
{
    e.stopPropagation();

    if (deptID === undefined || !deptID || deptID < 0) return;

    if (confirm('Are you sure you wish to delete this department and all files inside it?')) {
        $.post('ajax/users.php',{removedept:deptID},function(data) {
            var json = safeJSONParse(data);

            if (json['error']) {
                alert(sanitize_string(json['error']));
            } else {
                $('.user-dept[data-id="'+deptID+'"]').remove();
                deleteDepartmentWithID(deptID);
            }
        });
    }

    return false;
}

function validateNewUsers()
{
    $('.error-alert').remove();
    $('.info-alert').remove();

	var errors = '';
	var rowCount = $("#user-add-table").children('tbody').children('tr').length-1;

	for (var i=0; i<rowCount; i++) {
	    var email = $("#user-add-email-"+i).val();
    	var pos = $("#user-add-role-"+i).val();
		
		if (email.length == 0) errors += 'Email cannot be empty<br>';
		if (!pos || pos.length == 0) errors += 'Role cannot be empty<br>';
	}

	if (errors.length > 0) $('<div class="error-alert">'+errors+'</div>').prependTo('#newuserdialog');

    return (errors.length == 0);
}

function toggleOptionalInfo() {
    $('#firstnameallrow').toggle();
    $('#lastnameallrow').toggle();
    $('#phoneallrow').toggle();
}

function teamDropdownClicked(obj,itemID)
{
    $('#team_dropdown_'+itemID).show().menu();
}

function populateRoles(dest_obj) {
    dest_obj.innerHTML = roleCache;
}

function createDept()
{
    // Remove all current messages
    $('#newuserdialog .error-alert').remove();
    $('#newuserdialog .info-alert').remove();

    var deptName = $('#new_dept_name').val();

    if (deptName.length == 0) {
        $('<div class="error-alert">New department name cannot be blank.</div>').prependTo('#newuserdialog');
        return;
    }

    $.post('update_user.php',{newdept:deptName},
        function(data) {
            if (data.length > 4 && data.substr(0,4) == 'ERR:') {
                $('<div class="error-alert">' + data.substr(4) + '</div>').prependTo('#newuserdialog');

            } else if (data.length > 3 && data.substr(0,3) == 'ID:') {
                var dept_id = parseInt(data.substr(3));

                $('#newdepartment').html($('#newdepartment').html()+'<option value="'+dept_id+'" selected="selected">'+deptName+'');

                // Hide new dept row
                $('#new_dept_name').val('');
                $('#new_dept_row').hide();

                // Reload positions
                populateRoles();

            } else {
                $('<div class="error-alert">Unknown error</div>').prependTo('#newuserdialog');
            }
    });

}

function createPosition()
{
    // Remove all current messages
    $('#newuserdialog .error-alert').remove();
    $('#newuserdialog .info-alert').remove();

    var department_id = $('#newdepartment').val();

    if (!department_id || department_id <= 0) {
        $('<div class="error-alert">Please choose a department before creating a position.</div>').prependTo('#newuserdialog');
        return;
    }

    var posName = $('#new_pos_name').val();

    if (posName.length == 0) {
        $('<div class="error-alert">New position title cannot be blank.</div>').prependTo('#newuserdialog');
        return;
    }

    $.post('update_user.php',{newpos:posName,dept:department_id},
        function(data) {
            if (data.length > 4 && data.substr(0,4) == 'ERR:') {
                $('<div class="error-alert">' + data.substr(4) + '</div>').prependTo('#newuserdialog');

            } else if (data.length > 3 && data.substr(0,3) == 'ID:') {
                var dept_id = parseInt(data.substr(3));

                // Hide new pos row
                $('#new_pos_name').val('');
                $('#new_pos_row').hide();

                // Reload positions
                populateRoles();

            } else {
                $('<div class="error-alert">Unknown error</div>').prependTo('#newuserdialog');
            }
        });
}

function showAddDeptDialog()
{
    var dialog = '<div class="add-dept-dialog" style="display:none">';
    var dept_options = '';


    // Filter out existing depts
    for (var i=0; i<deptCache.length; i++) {
        var dept = deptCache[i];
        var skipDept = false;

        for (var j=0; j<depts.length; j++) {
            if (depts[j]['id'] == dept['id']) {
                skipDept = true;
                break;
            }
        }

        if (!skipDept) dept_options += '<option value="'+dept['id']+'">'+dept['name'];
    }

    if (dept_options.length == 0) {
        dialog += 'You have added all available departments to this project.';
    } else {
        dialog += 'Department: <select class="dept-add-select">'+dept_options+'</select>';
        dialog += ' <button class="dept-add-submit">Add</button>';
    }


    dialog += '<p><a href="Javascript:createCustomDept();">Create Custom Department</a></div>';

    $(dialog).appendTo($('body')).dialog({title:'Add Department',width:450});
}

function createCustomDept()
{
    var deptName = prompt('Please enter a department name:');
    if (!deptName || deptName.length == 0) return;

    $.post('ajax/users.php',{createdept:deptName},function(data) {
        var json = safeJSONParse(data);

        if (json['error']) {
            alert(sanitize_string(json['error']));
        } else if (json[0]['id']) {
            // Add new dept object to cache
            var newDept = json[0];
            deptCache.push(newDept);

            // Add new dept object
            depts.push(newDept);
            renderDept(newDept,$('#user-dept-container'));

            // Autoscroll
            $('html, body').animate({
                scrollTop: $('.user-dept[data-id="'+newDept['id']+'"]').offset().top
            }, 1000);

        }
    });
}

function generateActivationLink(user_id)
{
    $.post('ajax/users.php',{activationlink:user_id, project:getJSConnectValue('project.id')},function(data) {
        var json = safeJSONParse(data);

        if (json['error']) {
            alert(sanitize_string(json['error']));
        } else if (json['url']) {
            $('.url-dialog').remove();
            var popup = '<div class="url-dialog">Copy the following URL and send it to the recipient:<p><textarea-copy-button style="width:100%;height:120px" readonly autoselect value="' + json['url'] + '"></textarea-copy-button></div>';
            $(popup).appendTo('body').dialog({title:'Activation Link',width:400,height:285});
        }
    });
}

function changeRoleIDForAllUserInstances(role_id,project_user_id)
{
    var user_id = userIDFromProjectUserID(project_user_id);
    if (user_id == -1) return;

    var allObjs = allUserObjectsForUserID(user_id);
    if (!allObjs) return;

    for (var i=0; i<allObjs.length; i++) {
        var obj = allObjs[i];

        if (obj['id'] == project_user_id) continue;

        // Set role
        obj['permission_role'] = role_id;
        $('tr[data-id="'+obj['id']+'"]').find('.user-role').val(role_id);
    }
}

function editDepartmentName(dept_id)
{
    editTextLabel($('#dept_title_' + dept_id), function(newValue) {
        $.post('ajax/users.php',{renamedept:dept_id, name:newValue, project:getJSConnectValue('project.id')}, function(data) {
            var json = safeJSONParse(data);

            if (json['error']) {
                alert(sanitize_string(json['error']));
            }
        }).fail(function(jqXHR, textStatus, errorString) {
            alert(sanitize_string("Failed to rename file: " + errorString));
        });
    });
}