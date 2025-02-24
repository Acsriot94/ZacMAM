/*!
 * jQuery UI Multidraggable 0.0.2
 * http://
 *
 * Copyright 2012 Riccardo Re
 * Released under the MIT license.
 * http://jquery.org/license
 *
 * http://api
 *
 * Depends:
 *	jquery.ui.core.js
 *	jquery.ui.mouse.js
 *	jquery.ui.widget.js
 *	jquery.ui.draggable.js
 */
(function( $, undefined ) {

$.widget("ui.multidraggable", $.ui.draggable, {
	version: "0.0.2",
	widgetEventPrefix: "drag",
	
	_getMDItems: function(){
		return $('.ui-multidraggable-element:not(.ui-draggable-dragging)');
	},
	
	_getPrimaryMDItem: function(){
		return this._getMDItems().filter(':not(.ui-multidraggable-secondary)');
	},
	
	_getSecondaryMDItems: function(){
		return this._getMDItems().filter('.ui-multidraggable-secondary');
	},
	
	_triggerOnSecondaryMDItems: function(sTrigger,aArguments){
		this._getSecondaryMDItems().each(function(iIndex,oDomElement){
			var _jObj=$( oDomElement );
			var _fWidget=_jObj.data('ui-multidraggable');
			if( _fWidget ){
				_fWidget[sTrigger].apply(_fWidget,aArguments);
			}
		});
	},
	
	_isPrimaryMDItem: function(){
		return $(this.element).is(this._getPrimaryMDItem());
	},
	
	_create: function() {
		//Inherite datas
		this.element.data( 'ui-draggable', this.element.data('ui-multidraggable') );
		this._superApply(arguments);
	},

	_destroy: function() {
		this.element.removeData( 'ui-draggable' );
		this._superApply(arguments);
	},

	_mouseCapture: function(event) {
		if( !this.element.hasClass('ui-multidraggable-element') ){
			var _jMDItems=this._getMDItems();
			if( !event.ctrlKey ){
				this._getMDItems().removeClass('ui-multidraggable-element ui-multidraggable-secondary');
			}
			this._getMDItems().addClass('ui-multidraggable-element ui-multidraggable-secondary');
		} else {
			this._getPrimaryMDItem().addClass('ui-multidraggable-secondary');
			this.element.removeClass('ui-multidraggable-secondary');
		}
		this.element.addClass('ui-multidraggable-element');
		
		return this._superApply(arguments);
	},

	_mouseStart: function(event) {
		if( !$.ui.ddmanager._multidraggable ){
			$.ui.ddmanager._multidraggable=new Array();
		}
		$.ui.ddmanager._multidraggable.push(this.element);
		
		if( this._isPrimaryMDItem() ){
			this._triggerOnSecondaryMDItems('_mouseStart',arguments);
		}
		return this._superApply(arguments);
	},

	_mouseDrag: function(event, noPropagation) {
		if( this._isPrimaryMDItem() ){
			this._triggerOnSecondaryMDItems('_mouseDrag',arguments);
		}
		return this._superApply(arguments);
	},

	_mouseStop: function(event) {
		if( this._isPrimaryMDItem() ){
			this._triggerOnSecondaryMDItems('_mouseStop',arguments);
		}
		this._getMDItems().removeClass('ui-multidraggable-element ui-multidraggable-secondary');
		return this._superApply(arguments);
	}
});
/*
$.ui.plugin.add("multidraggable", "connectToSortable", {
	drag: function(event, ui) {
		var inst = $(this).data("ui-draggable"), that = this;
		$.each(inst.sortables, function() {
			if( this.instance ){
				var _jCurrentItem = $.ui.ddmanager._multidraggable[0];
				for(var i=1;i< $.ui.ddmanager._multidraggable.length;i++){
					_jCurrentItem.after( $.ui.ddmanager._multidraggable[i] )
				}
				if( this.instance.currentItem && !this.instance.currentItem.is( _jCurrentItem ) ){
					//this.instance.currentItem.replaceWith( _jCurrentItem );
				} else {
					//this.instance.currentItem = _jCurrentItem;
				}
			}
		});
	}
});
*/

//Extending Droppable
$.widget("ui.droppable", $.ui.droppable, {
	_drop: function(event,custom) {
		var _bResult=false;
		var draggable = custom || $.ui.ddmanager.current;
		if( draggable.element.data('ui-multidraggable') ){
			draggable.element.removeClass('ui-multidraggable-element ui-multidraggable-secondary');
			//draggable.element.multidraggable('destroy');
			if( draggable.element.is(draggable._getPrimaryMDItem()) ){
				_bResult=this._superApply(arguments);
			} else {
				if( $.ui.ddmanager._multidraggable ){
					var _jElement=$.ui.ddmanager._multidraggable.pop();
					//Faking dragged element
					draggable.element =_jElement.removeClass('ui-multidraggable-element ui-multidraggable-secondary');
					//draggable.element =_jElement.multidraggable('destroy');
					
					if(this.accept.call(this.element[0],(draggable.currentItem || draggable.element))) {
						if(this.options.activeClass) this.element.removeClass(this.options.activeClass);
						if(this.options.hoverClass) this.element.removeClass(this.options.hoverClass);
						this._trigger('drop', event, this.ui(draggable));
						return this.element;
					}
				}
			}
		} else {
			_bResult=this._superApply(arguments);
		}
		return _bResult;
	},
});

})(jQuery);
