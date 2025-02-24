
$(document).ready(function() {
    setupTableResizing();
});

function setupTableResizing()
{
    if (isIphone) return;

    var thHeight = $("th.resizable:first").height();

    $('th.resizable').each(function() {
        var self = $(this);
        var tableObj = self.closest('table');

        tableObj.css('table-layout','fixed');
        self.append($('<span class="resizer ui-resizable-handle"></span>'));

        self.resizable({
            handles:{'e':'.resizer','w':'.resizer'},
            autoHide:true,
            minHeight:thHeight,
            maxHeight:thHeight,
            minWidth:70,
            resize: function (event, ui) {
                // Draggable interferes with this so undo what it does
                $(this).css('position','').css('left','').css('top','');
            },
            stop: function(event, ui) {
                saveTableColumnWidths(tableObj);
            }
        });
    });

    var colIndex = 0;

    $('th').each(function() {
        var self = $(this);
        var tableObj = self.closest('table');

        // Load previous col widths
        var colWidths = [];

        var colConfig = getLocalStorage(tableObj.attr('id') + '_column_widths', '');
        if (colConfig) colWidths = colConfig.split(',');

        // Set initial width
        if (colIndex < colWidths.length) self.width(colWidths[colIndex]);

        colIndex++;
    });

    $('th.draggable').each(function() {

        $(this).draggable({
            revert: "invalid",
            helper: "clone",
            cancel: ".resizer,.ui-resizable-handle"
        });

        $(this).droppable({
            accept: "th.draggable",
            hoverClass: "filetablerowdrop",
            refreshPositions: "false",
            tolerance: "pointer",
            drop: function(event, ui) {
                ui.helper.remove();

                var sourceIndex = ui.draggable.index();
                var destIndex = $(this).index();

                var tableObj = $(this).closest('table');

                reorderTableColumn(tableObj, sourceIndex, destIndex);
                saveTableColumnOrder(tableObj);
                saveTableColumnWidths(tableObj);
            }
        });
    });
}

function reorderTableColumn(table, old_index, new_index)
{
    var headers = table.find('th');

    var oldHeader = headers.eq(old_index);
    var newHeader = headers.eq(new_index);

    if (old_index < new_index) {
        oldHeader.insertAfter(newHeader);
    } else {
        oldHeader.insertBefore(newHeader);
    }

    // Move content
    var rows = table.find('tr');

    rows.each(function() {
        var cells = $(this).find('td');

        var oldCell = cells.eq(old_index);
        var newCell = cells.eq(new_index);

        if (old_index < new_index) {
            oldCell.insertAfter(newCell);
        } else {
            oldCell.insertBefore(newCell);
        }
    });
}

function saveTableColumnOrder(table)
{
    var cols = [];

    table.find('th').each(function() {
        var col_name = $(this).data('col');
        if (typeof col_name !== 'undefined') cols.push(col_name);
    });

    writeCookie(table.attr('id')+'_columns',cols.join(','),365);
}

function saveTableColumnWidths(table)
{
    var cols = [];

    table.find('th').each(function() {
        cols.push($(this).width());
    });

    writeLocalStorage(table.attr('id')+'_column_widths',cols.join(','));
}
