var scroller = null;

$(document).ready(function() {
    $('#selectall').click(function() {
        $('input:checkbox.taskSelector').prop('checked', this.checked);
    });

    $('input[type=search]').on('search', function () {
        // Reset search field
        $(this).parent().submit();
    });

    // Context menu
    $(document).on("contextmenu", ".task-table tr", function(event) {
        event.preventDefault();
        var menuCopy = $('#task_dropdown_'+$(this).data('id')).clone();

        menuCopy.appendTo('body');
        menuCopy.show().menu().css({position:"absolute", top: event.pageY + "px", left: event.pageX + "px", maxWidth: "200px"});
    });

    $('#task-filter').on('change',function() {
        writeCookie('task_filter',$('#task-filter').val(),365);

        // Set start parameter back to 0
        if (window.location.href.indexOf('start=') > -1) {
            window.location.href = window.location.href.replace(/(start=)[^\&]+/, '$1' + '0');
        } else {
            window.location.reload(false);
        }
    });

    $(document).on('change', '.task_status_dropdown', function() {
        var task_id = +$(this).data('id');
        var status = $(this).val();

        // Get selected tasks
        var selection = selectedTasks();

        if (selection.indexOf(task_id) < 0) selection.push(task_id);

        $.post('ajax/task.php',{status:status, ids:selection.join(',')},function(data) {
            if (data === 'OK') {
                for (var i=0; i<2; i++) {
                    var parentObj = null;

                    if (i === 0) {
                        parentObj = $('tr[data-id="' + task_id + '"]');
                    } else {
                        parentObj = $('input:checkbox:checked.taskSelector').parent().parent();
                    }

                    parentObj.find('.task_status_dropdown').val(status);

                    parentObj.find('#task_status_icon').removeClass('pending');
                    parentObj.find('#task_status_icon').removeClass('completed');
                    parentObj.find('#task_status_icon').removeClass('progress');

                    switch (parseInt(status)) {
                        case 0:
                            parentObj.find('#task_status_icon').addClass('pending');
                            break;

                        case 3:
                            parentObj.find('#task_status_icon').addClass('completed');
                            break;

                        default:
                            parentObj.find('#task_status_icon').addClass('progress');
                            break;

                    }
                }

            } else {
                $('.error-alert').remove();
                $('<div class="error-alert">Some tasks could not be modified. Please make sure you have permission to change these tasks.</div>').prependTo('#page');
            }
        }).fail(function(jqXHR, textStatus, errorString) {
            alert(sanitize_string("Failed to set task status: " + errorString));
        });
    });

    $(document).on('change', '.task_priority_dropdown', function() {
        var task_id = +$(this).data('id');
        var priority = $(this).val();

        // Get selected tasks
        var selection = selectedTasks();

        if (selection.indexOf(task_id) < 0) selection.push(task_id);

        $.post('ajax/task.php',{priority:priority, ids:selection.join(',')},function(data) {
            if (data === 'OK') {
                for (var i=0; i<2; i++) {
                    var parentObj = null;

                    if (i === 0) {
                        parentObj = $('tr[data-id="' + task_id + '"]');
                    } else {
                        parentObj = $('input:checkbox:checked.taskSelector').parent().parent();
                    }

                    parentObj.find('.task_priority_dropdown').val(priority);

                    if (priority == 2) { // High
                        parentObj.addClass('priority');
                     } else {
                        parentObj.removeClass('priority');
                    }
                }

            } else {
                $('.error-alert').remove();
                $('<div class="error-alert">Some tasks could not be modified. Please make sure you have permission to change these tasks.</div>').prependTo('#page');
            }
        }).fail(function(jqXHR, textStatus, errorString) {
            alert(sanitize_string("Failed to set task priority: " + errorString));
        });
    });
});

function taskDropdownClicked(obj,itemID)
{
    $('#task_dropdown_'+itemID).show().menu();
}

function changeSorting(sort_id,desc) {
    if (sort_id) {
        writeCookie('task_sort',sort_id,365);

        if (desc) {
            writeCookie('task_sort_desc',desc,365);
        } else {
            writeCookie('task_sort_desc',desc,null);
        }

        location.reload(false);
    }
}

function selectedTasks()
{
    return $('input:checkbox:checked.taskSelector').map(function () {
        return +this.value;
    }).get();
}

function selectionChanged()
{

}

function showTaskExportDialog()
{
    $('#task_export_dialog').dialog({title:'Export Tasks', width:400}).show();
}

function clearSearch()
{
    if (typeof URLSearchParams !== 'undefined') {
        var url = new URL(window.location.href);
        var params = new URLSearchParams(url.search.slice(1));
        params.delete('search');

        window.location.href = 'tasks' + (params.length > 0 ? '?'+params.toString():'');

    } else {
        console.log('Your browser does not support URLSearchParams');
    }
}

function fileLinkClick(e)
{
    if (e.ctrlKey || e.metaKey) {
        // Go to player / files page
        window.location.href = e.target.getAttribute("data-url");
    } else {
        // Filter Share list for this file
        window.location.href = "tasks?filter_file_id=" + e.target.getAttribute("data-file-id");
    }
}