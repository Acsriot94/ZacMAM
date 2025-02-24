class InfiniteScroller {
    constructor(table_obj, start, items_per_page, more_available, callback_function) {
        this.more_available = more_available;
        this.start = start;
        this.table_obj = table_obj;
        this.callback_function = callback_function;

        // Add objects to end of table
        var footer = this.table_obj.find('tfoot');
        if (!footer.length) {
            footer = $('<tfoot></tfoot>');
            footer.appendTo(this.table_obj);
        }

        if (!footer.find('#more-items').length) {
            // Get column count
            var colCount = (this.table_obj[0].rows.length === 0 ? 1 : this.table_obj[0].rows[0].cells.length);

            footer.append('<tr id="item-load-spinner" style="display:none;"><td colspan="' + colCount + '"><img src="img/spinner-white.svg"/></td></tr>');
            footer.append('<tr id="more-items"><td colspan="' + colCount + '">&nabla;</td></tr>');
        }

        this.updateMoreAvailableButton();

        var self = this;

        $(window).scroll(function() {
            var height = $(document).height() - $(window).height();
            var leeway = (height < 4000 ? 0.9:0.95);

            if (self.more_available && $(window).scrollTop() >= height*leeway) {
                self.more_available = false;
                $("#item-load-spinner").css('display', 'table-row');

                if (self.callback_function) self.callback_function(self.start);
                self.start += items_per_page;
            }
        });

/*        this.table_obj.find('#more-items').on('click', function() {
            if (this.more_available && this.callback_function) this.callback_function(this.start);
        });*/
    }

    setMoreAvailable(more_available) {
        this.more_available = more_available;

        this.updateMoreAvailableButton();
        $("#item-load-spinner").css('display', 'none');
    }

    updateMoreAvailableButton() {
        if (this.table_obj.length) {
            var more_items_btn = this.table_obj.find('#more-items');

            if (this.more_available) {
                more_items_btn.css('display', 'table-row');
            } else {
                more_items_btn.css('display', 'none');
            }
        }
    }

    setStart(idx) {
        this.start = idx;
    }
}
