$(document).ready(function() {
   $('.workflow-check').click(function(e) {
       var checkbox = e.target;
       var parent = $(checkbox).parent().parent();

       if (!!checkbox.getAttribute('checked')) {
           parent.removeClass('collapsed');
       } else {
           parent.addClass('collapsed');
       }

       // Select dependencies
       if (!!checkbox.getAttribute('checked') && parent.data('dependency')) {
           const dependency_obj = document.getElementById(parent.data('dependency'));
           dependency_obj.classList.remove('collapsed');

           dependency_obj.querySelector('h3 check-box').setAttribute('checked','checked');
       }
    });

   $('#workflow-color-select').ddslick({width:48,background:'#545454',onSelected: function(data){$('#workflow-color-select .dd-selected-value').prop('name', 'workflow_color_id');}});

   $('.workflow_approval_users').click(function(e) {
       const checkbox = e.target;
       if (+checkbox.getAttribute("data-value") === -1) {
           if (!!checkbox.getAttribute('checked')) {
               document.querySelectorAll('.workflow_approval_users').forEach((obj) => {
                   obj.setAttribute('disabled', 'disabled');
                   obj.removeAttribute('checked');
               });

               document.querySelectorAll('.workflow_approval_depts').forEach((obj) => {
                   obj.setAttribute('disabled', 'disabled');
                   obj.removeAttribute('checked');
               });

               // Undo disable on current item
               checkbox.setAttribute('checked', 'checked');
               checkbox.removeAttribute('disabled');
           } else {
               document.querySelectorAll('.workflow_approval_users').forEach((obj) => {
                   obj.removeAttribute('disabled');
               });

               document.querySelectorAll('.workflow_approval_depts').forEach((obj) => {
                   obj.removeAttribute('disabled');
               });
           }
       }
   });
});

function workflowAddMatch()
{
    var typeSelect = '<select name="match_key[]" onchange="changeMatchType(this)">';

    for (var i=0; i<matchOptions.length; i++) {
        typeSelect += '<option value="'+matchOptions[i]['key']+'">'+matchOptions[i]['name'];
    }

    typeSelect += '</select>';

    var selectObj = $(typeSelect);
    var row = $('<tr><td></td><td></td><td></td><td><a href="#" onclick="deleteWorkflowMatch(this)"><div class="delete-btn"></div></a></td></tr>');
    row.find('td:first-child').append(selectObj);

    $('#workflow-match-table').append(row);

    changeMatchType(selectObj[0]);
}

function changeMatchType(obj)
{
    var row = $(obj).parent().parent();
    var matchType = obj.selectedIndex;

    var match = matchOptions[matchType];
    var td1 = row.find('td:nth-child(2)');
    var td2 = row.find('td:nth-child(3)');

    switch (match['type']) {
        case 0: // List
            td1.html('<select name="match_type[]"><option value="0">is</option><option value="1">is not</option></select>');

            var td2HTML = '<select name="match_val[]">';

            var vals = match['values'];
            var keys = Object.keys(vals);

            for (var i=0; i<keys.length; i++) {
                td2HTML += '<option value="'+keys[i]+'">'+match['values'][keys[i]]+'</option>';
            }

            td2HTML += '</select>';
            td2.html(td2HTML);
            break;

        case 1: // Text
            td1.html('<select name="match_type[]"><option value="0">is</option><option value="1">is not</option><option value="6">starts with</option><option value="7">ends with</option><option value="8">contains</option></select>');
            td2.html('<input name="match_val[]" type="text">');
            break;

        case 2: // Number
            td1.html('<select name="match_type[]"><option value="0">is</option><option value="1">is not</option><option value="2">less than</option><option value="3">greater than</option><option value="4">less than or equal to</option><option value="5">greater than or equal to</option></select>');
            td2.html('<input name="match_val[]" type="text">');
            break;

        case 3: // Boolean
            td1.html('<select name="match_type[]"><option value="0">is</option><option value="1">is not</option></select>');
            td2.html('<select name="match_val[]"><option value="1">True</option><option value="0">False</option></select>');
            break;

        default:
            break;
    }
}

function deleteWorkflowMatch(obj)
{
    var row = $(obj).parent().parent();
    row.remove();
}