/**
 * @fileoverview 키 이벤트 핸들링 담당하는 Clipboard 정의
 * @author NHN Ent. FE Development Team
 */
'use strict';

var _ = require('underscore');

var View = require('../base/view');
var util = require('../common/util');
var classNameConst = require('../common/classNameConst');
var constMap = require('../common/constMap');
var keyCodeMap = constMap.keyCode;
var selTypeConst = constMap.selectionType;

/**
 * Clipboard view class
 * @module view/clipboard
 * @extends module:base/view
 * @param {Object} options - Options
 * @ignore
 */
var Clipboard = View.extend(/**@lends module:view/clipboard.prototype */{
    initialize: function(options) {
        this.setOwnProperties({
            dataModel: options.dataModel,
            columnModel: options.columnModel,
            focusModel: options.focusModel,
            selectionModel: options.selectionModel,
            dimensionModel: options.dimensionModel,
            coordRowModel: options.coordRowModel,
            coordConverterModel: options.coordConverterModel,
            renderModel: options.renderModel,
            useFormattedValue: !!tui.util.pick(options, 'copyOption', 'useFormattedValue'),
            timeoutIdForKeyIn: 0,
            isLocked: false
        });

        this.listenTo(this.focusModel, 'focusClipboard', this._onFocusClipboard);
    },

    tagName: 'textarea',

    className: classNameConst.CLIPBOARD,

    events: {
        'keydown': '_onKeyDown',
        'blur': '_onBlur'
    },

    /**
     * Event handler for blur event.
     * @private
     */
    _onBlur: function() {
        var focusModel = this.focusModel;

        setTimeout(function() {
            focusModel.refreshState();
        }, 0);
    },

    /**
     * Returns whether the element has focus
     * @returns {boolean}
     * @private
     */
    _hasFocus: function() {
        return this.$el.is(':focus');
    },

    /**
     * Event handler for 'focusClipboard' event on focusModel
     * @private
     */
    _onFocusClipboard: function() {
        try {
            if (!this._hasFocus()) {
                this.$el.focus();

                // bug fix for IE8 (calling focus() only once doesn't work)
                if (!this._hasFocus()) {
                    this.$el.focus();
                }
                this.focusModel.refreshState();
            }
        } catch (e) {
            // Do nothing.
            // This try/catch block is just for preventing 'Unspecified error'
            // in IE9(and under) when running test using karma.
        }
    },

    /**
     * 랜더링 한다.
     * @returns {View.Clipboard} this object
     */
    render: function() {
        return this;
    },

    /**
     * keyEvent 의 중복 호출을 방지하는 lock 을 설정한다.
     * @private
     */
    _lock: function() {
        clearTimeout(this.timeoutIdForKeyIn);
        this.isLocked = true;
        this.timeoutIdForKeyIn = setTimeout($.proxy(this._unlock, this), 10); // eslint-disable-line no-magic-numbers
    },

    /**
     * keyEvent 의 중복 호출을 방지하는 lock 을 해제한다.
     * @private
     */
    _unlock: function() {
        this.isLocked = false;
    },

    /**
     * keyDown 이벤트 핸들러
     * @param {Event} keyDownEvent 이벤트 객체
     * @private
     */
    _onKeyDown: function(keyDownEvent) { // eslint-disable-line complexity
        if (this.isLocked) {
            keyDownEvent.preventDefault();
            return;
        }

        if (keyDownEvent.shiftKey && (keyDownEvent.ctrlKey || keyDownEvent.metaKey)) {
            this._keyInWithShiftAndCtrl(keyDownEvent);
        } else if (keyDownEvent.shiftKey) {
            this._keyInWithShift(keyDownEvent);
        } else if (keyDownEvent.ctrlKey || keyDownEvent.metaKey) {
            this._keyInWithCtrl(keyDownEvent);
        } else {
            this._keyIn(keyDownEvent);
        }
        this._lock();
    },

    /**
     * ctrl, shift 둘다 눌리지 않은 상태에서의 key down 이벤트 핸들러
     * @param {Event} keyDownEvent 이벤트 객체
     * @private
     */
    _keyIn: function(keyDownEvent) { // eslint-disable-line complexity
        var focusModel = this.focusModel;
        var selectionModel = this.selectionModel;
        var focused = focusModel.which();
        var rowKey = focused.rowKey;
        var columnName = focused.columnName;
        var rowIdx = this.dataModel.indexOfRowKey(rowKey);
        var columnIdx = this.columnModel.indexOfColumnName(columnName, true);
        var isKeyIdentified = true;
        var keyCode = keyDownEvent.keyCode || keyDownEvent.which;
        var address;

        if (util.isBlank(focused.rowKey)) {
            return;
        }

        switch (keyCode) {
            case keyCodeMap.UP_ARROW:
                focusModel.focus(focusModel.prevRowKey(), columnName, true);
                break;
            case keyCodeMap.DOWN_ARROW:
                focusModel.focus(focusModel.nextRowKey(), columnName, true);
                break;
            case keyCodeMap.LEFT_ARROW:
                focusModel.focus(rowKey, focusModel.prevColumnName(), true);
                break;
            case keyCodeMap.RIGHT_ARROW:
                focusModel.focus(rowKey, focusModel.nextColumnName(), true);
                break;
            case keyCodeMap.PAGE_UP:
                focusModel.focusAt(this._getPageMovedRowIndex(rowIdx, false), columnIdx, true);
                break;
            case keyCodeMap.PAGE_DOWN:
                focusModel.focusAt(this._getPageMovedRowIndex(rowIdx, true), columnIdx, true);
                break;
            case keyCodeMap.HOME:
                focusModel.focus(rowKey, focusModel.firstColumnName(), true);
                break;
            case keyCodeMap.END:
                focusModel.focus(rowKey, focusModel.lastColumnName(), true);
                break;
            //space 와 enter 는 동일동작
            case keyCodeMap.SPACE:
            case keyCodeMap.ENTER:
                this._onEnterSpace(rowKey, columnName);
                break;
            case keyCodeMap.DEL:
                this._del(rowKey, columnName);
                break;
            case keyCodeMap.TAB:
                address = focusModel.nextAddress();
                focusModel.focusIn(address.rowKey, address.columnName, true);
                break;
            default:
                isKeyIdentified = false;
                break;
        }
        if (isKeyIdentified) {
            keyDownEvent.preventDefault();
        }
        selectionModel.end();
    },

    /**
     * enter 또는 space 가 입력되었을 때, 처리하는 로직
     * @param {(number|string)} rowKey 키 입력이 발생한 엘리먼트의 rowKey
     * @param {string} columnName 키 입력이 발생한 엘리먼트의 컬럼명
     * @private
     */
    _onEnterSpace: function(rowKey, columnName) {
        this.focusModel.focusIn(rowKey, columnName);
    },

    /**
     * Return index for reference of selection before moving by key event.
     * @returns {{row: number, column:number}} index
     * @private
     */
    _getIndexBeforeMove: function() {
        var focusedIndex = this.focusModel.indexOf();
        var selectionRange = this.selectionModel.get('range');
        var index = _.extend({}, focusedIndex);
        var selectionRowRange, selectionColumnRange;

        if (selectionRange) {
            selectionRowRange = selectionRange.row;
            selectionColumnRange = selectionRange.column;

            index.row = selectionRowRange[0];
            index.column = selectionColumnRange[0];

            if (selectionRowRange[1] > focusedIndex.row) {
                index.row = selectionRowRange[1];
            }
            if (selectionColumnRange[1] > focusedIndex.column) {
                index.column = selectionColumnRange[1];
            }
        }
        return index;
    },

    /**
     * Returns the row index moved by body height from given row.
     * @param {number} rowIdx - current row index
     * @param {Boolean} isDownDir - true: down, false: up
     * @returns {number}
     * @private
     */
    _getPageMovedRowIndex: function(rowIdx, isDownDir) {
        var curOffset = this.coordRowModel.getOffsetAt(rowIdx);
        var distance = this.dimensionModel.get('bodyHeight');
        var movedIdx;

        if (!isDownDir) {
            distance = -distance;
        }
        movedIdx = this.coordRowModel.indexOf(curOffset + distance);

        return util.clamp(movedIdx, 0, this.dataModel.length - 1);
    },

    /**
     * shift 가 눌린 상태에서의 key down event handler
     * @param {Event} keyDownEvent 이벤트 객체
     * @private
     */
    _keyInWithShift: function(keyDownEvent) { // eslint-disable-line complexity
        var focusModel = this.focusModel;
        var columnModelList = this.columnModel.getVisibleColumnModelList();
        var coordConverterModel = this.coordConverterModel;
        var keyCode = keyDownEvent.keyCode || keyDownEvent.which;
        var index = this._getIndexBeforeMove();
        var isKeyIdentified = true;
        var isSelection = true;
        var columnModel, scrollPosition, isValid, selectionType, address;

        switch (keyCode) {
            case keyCodeMap.UP_ARROW:
                index.row -= 1;
                break;
            case keyCodeMap.DOWN_ARROW:
                index.row += 1;
                break;
            case keyCodeMap.LEFT_ARROW:
                index.column -= 1;
                break;
            case keyCodeMap.RIGHT_ARROW:
                index.column += 1;
                break;
            case keyCodeMap.PAGE_UP:
                index.row = this._getPageMovedRowIndex(index.row, false);
                break;
            case keyCodeMap.PAGE_DOWN:
                index.row = this._getPageMovedRowIndex(index.row, true);
                break;
            case keyCodeMap.HOME:
                index.column = 0;
                break;
            case keyCodeMap.END:
                index.column = columnModelList.length - 1;
                break;
            case keyCodeMap.ENTER:
                isSelection = false;
                break;
            case keyCodeMap.TAB:
                isSelection = false;
                address = focusModel.prevAddress();
                focusModel.focusIn(address.rowKey, address.columnName, true);
                break;
            default:
                isSelection = false;
                isKeyIdentified = false;
                break;
        }

        columnModel = columnModelList[index.column];
        isValid = !!(columnModel && this.dataModel.getRowData(index.row));

        if (isSelection && isValid) {
            this._updateSelectionByKeyIn(index.row, index.column);
            scrollPosition = coordConverterModel.getScrollPosition(index.row, columnModel.columnName);
            if (scrollPosition) {
                selectionType = this.selectionModel.getType();
                if (selectionType === selTypeConst.COLUMN) {
                    delete scrollPosition.scrollTop;
                } else if (selectionType === selTypeConst.ROW) {
                    delete scrollPosition.scrollLeft;
                }
                this.renderModel.set(scrollPosition);
            }
        }

        if (isKeyIdentified) {
            keyDownEvent.preventDefault();
        }
    },

    /**
     * ctrl 가 눌린 상태에서의 key down event handler
     * @param {Event} keyDownEvent 이벤트 객체
     * @private
     */
    _keyInWithCtrl: function(keyDownEvent) {  // eslint-disable-line complexity
        var focusModel = this.focusModel;
        var keyCode = keyDownEvent.keyCode || keyDownEvent.which;

        switch (keyCode) {
            case keyCodeMap.CHAR_A:
                this.selectionModel.selectAll();
                break;
            case keyCodeMap.CHAR_C:
                this._copyToClipboard();
                break;
            case keyCodeMap.HOME:
                focusModel.focus(focusModel.firstRowKey(), focusModel.firstColumnName(), true);
                break;
            case keyCodeMap.END:
                focusModel.focus(focusModel.lastRowKey(), focusModel.lastColumnName(), true);
                break;
            case keyCodeMap.CHAR_V:
                this._pasteWhenKeyupCharV();
                break;
            default:
                break;
        }
    },

    /**
     * paste date
     * @private
     */
    _pasteWhenKeyupCharV: function() {
        var self = this;

        // pressing v long time, clear clipboard to keep final paste date
        this._clearClipBoard();
        if (this.pasting) {
            return;
        }

        this.pasting = true;
        this.$el.on('keyup', function() {
            self._pasteToGrid();
            self.pasting = false;
        });
    },

   /**
     * clipboard textarea clear
     * @private
     */
    _clearClipBoard: function() {
        this.$el.val('');
    },

    /**
     * paste text data
     * @private
     */
    _pasteToGrid: function() {
        var selectionModel = this.selectionModel;
        var focusModel = this.focusModel;
        var dataModel = this.dataModel;
        var startIdx, data;

        if (selectionModel.hasSelection()) {
            startIdx = selectionModel.getStartIndex();
        } else {
            startIdx = focusModel.indexOf();
        }
        data = this._getProcessClipBoardData();

        this.$el.off('keyup');
        dataModel.paste(data, startIdx);
    },

    /**
     * process data for paste to grid
     * @private
     * @returns {Array.<Array.<string>>} result
     */
    _getProcessClipBoardData: function() {
        var text = this.$el.val();
        var result = text.split('\n');
        var i = 0;
        var len = result.length;

        for (; i < len; i += 1) {
            result[i] = result[i].split('\t');
        }

        return result;
    },

    /**
     * ctrl, shift 둘다 눌린 상태에서의 key down event handler
     * @param {Event} keyDownEvent 이벤트 객체
     * @private
     */
    _keyInWithShiftAndCtrl: function(keyDownEvent) {
        var isKeyIdentified = true;
        var columnModelList = this.columnModel.getVisibleColumnModelList();
        var keyCode = keyDownEvent.keyCode || keyDownEvent.which;

        switch (keyCode) {
            case keyCodeMap.HOME:
                this._updateSelectionByKeyIn(0, 0);
                break;
            case keyCodeMap.END:
                this._updateSelectionByKeyIn(this.dataModel.length - 1, columnModelList.length - 1);
                break;
            default:
                isKeyIdentified = false;
                break;
        }
        if (isKeyIdentified) {
            keyDownEvent.preventDefault();
        }
    },

    /**
     * text type 의 editOption cell 의 data 를 빈 스트링으로 세팅한다.
     * selection 영역이 지정되어 있다면 selection 영역에 해당하는 모든 셀.
     * selection 영역이 지정되어 있지 않다면 focus된 셀
     * @private
     */
    _del: function() {
        var selectionModel = this.selectionModel;
        var dataModel = this.dataModel;
        var focused = this.focusModel.which();
        var rowKey = focused.rowKey;
        var columnName = focused.columnName;

        if (selectionModel.hasSelection()) {
            dataModel.delRange(selectionModel.get('range'));
        } else {
            dataModel.del(rowKey, columnName);
        }
    },

    /**
     * keyIn 으로 selection 영역을 update 한다. focus 로직도 함께 수행한다.
     * @param {Number} rowIndex 행의 index 정보
     * @param {Number} columnIndex 열의 index 정보
     * @private
     */
    _updateSelectionByKeyIn: function(rowIndex, columnIndex) {
        var selectionModel = this.selectionModel;

        selectionModel.update(rowIndex, columnIndex);
    },

    /**
     * clipboard 에 설정될 문자열 반환한다.
     * @returns {String} 데이터를 text 형태로 변환한 문자열
     * @private
     */
    _getClipboardString: function() {
        var selectionModel = this.selectionModel;
        var focused = this.focusModel.which();
        var text;

        if (selectionModel.hasSelection()) {
            text = this.selectionModel.getValuesToString(this.useFormattedValue);
        } else if (this.useFormattedValue) {
            text = this.renderModel.getCellData(focused.rowKey, focused.columnName).formattedValue;
        } else {
            text = this.dataModel.get(focused.rowKey).getValueString(focused.columnName);
        }

        return text;
    },

    /**
     * 현재 그리드의 data 를 clipboard 에 copy 한다.
     * @private
     */
    _copyToClipboard: function() {
        var text = this._getClipboardString();

        if (window.clipboardData) {
            window.clipboardData.setData('Text', text);
        } else {
            this.$el.val(text).select();
        }
    }
});

module.exports = Clipboard;
