'use strict';

var DomState = require('domState');
var FocusModel = require('model/focus');
var SelectionModel = require('model/selection');
var ColumnModelData = require('model/data/columnModel');
var RowListData = require('model/data/rowList');

function createColumnModelList(names) {
    var models = [];
    tui.util.forEachArray(names, function(name, editType) {
        models.push({
            title: name,
            columnName: name,
            editOption: {
                type: editType || 'text'
            }
        });
    });
    return models;
}

function createRowList(columnModelList) {
    var columnModel = new ColumnModelData({
            columnModelList: columnModelList
        });

    return new RowListData([], {
        columnModel: columnModel
    });
}

describe('rowList.paste()', function() {
    var rowList;

    describe('텍스트 컬럼 (text, text-convertible)', function() {
        beforeEach(function() {
            var columnModelList = createColumnModelList(['c1', 'c2', 'c3']);
            columnModelList[1].editOption.type = 'text-convertible';

            rowList = createRowList(columnModelList);
            rowList.setRowList([
                {
                    c1: '0-1',
                    c2: '0-2',
                    c3: '0-3'
                }, {
                    c1: '1-1',
                    c2: '1-2',
                    c3: '1-3'
                }, {
                    c1: '2-1',
                    c2: '2-2',
                    c3: '2-3'
                }
            ]);
        });

        it('단일 데이터 붙여넣기', function() {
            rowList.paste([['New2-2']], {
                row: 2,
                column: 1
            });
            expect(rowList.getValue(2, 'c2')).toBe('New2-2');
        });

        it('2 x 2 배열 붙여넣기', function() {
            rowList.paste([
                ['New1-1', 'New1-2'],
                ['New2-1', 'New2-2']
            ], {
                row: 1,
                column: 0
            });
            expect(rowList.getValue(1, 'c1')).toBe('New1-1');
            expect(rowList.getValue(1, 'c2')).toBe('New1-2');
            expect(rowList.getValue(2, 'c1')).toBe('New2-1');
            expect(rowList.getValue(2, 'c2')).toBe('New2-2');
        });

        it('컬럼 범위를 넘어가는 값은 무시한다.', function() {
            rowList.paste([
                ['New2-3', 'New2-4', 'New2-5']
            ], {
                row: 2,
                column: 2
            });
            expect(rowList.getValue(2, 'c3')).toBe('New2-3');
        });

        it('행 범위를 넘어가는 값이 있으면 행을 추가해준다.', function() {
            rowList.paste([
                ['New2-2', 'New2-3'],
                ['New3-2', 'New3-3']
            ], {
                row: 2,
                column: 1
            });

            expect(rowList.getValue(2, 'c2')).toBe('New2-2');
            expect(rowList.getValue(2, 'c3')).toBe('New2-3');
            expect(rowList.getValue(3, 'c2')).toBe('New3-2');
            expect(rowList.getValue(3, 'c3')).toBe('New3-3');
        });

        // it('붙여넣기가 끝나면 변경된 범위만큼 셀렉션을 만들어준다.', function() {
        //     var startIdx, endIdx;
        //     rowList.grid.focusModel.focus(0, 'c1');
        //     rowList.paste([
        //         ['New1-1', 'New1-2'],
        //         ['New2-1', 'New2-2']
        //     ]);
        //     startIdx = rowList.grid.selectionModel.getStartIndex();
        //     endIdx = rowList.grid.selectionModel.getEndIndex();
        //
        //     expect(startIdx.row).toBe(0);
        //     expect(startIdx.column).toBe(0);
        //     expect(endIdx.row).toBe(1);
        //     expect(endIdx.column).toBe(1);
        // });
    });

    describe('편집 불가능한 셀은 값을 변경하지 않고 넘어간다', function() {
        it(': editOption이 없는 열', function() {
            var columnModelList = createColumnModelList(['c1', 'c2']);

            columnModelList[1].editOption = null; // disable to edit
            rowList = createRowList(columnModelList);
            rowList.setRowList([{
                    c1: '0-1',
                    c2: '0-2'
                }, {
                    c1: '1-1',
                    c2: '1-2'
                }
            ]);
            rowList.paste([
                ['New0-1', 'New0-2'],
                ['New1-1', 'New1-2']
            ], {
                row: 0,
                column: 0
            });

            expect(rowList.getValue(0, 'c1')).toBe('New0-1');
            expect(rowList.getValue(0, 'c2')).toBe('0-2');
            expect(rowList.getValue(1, 'c1')).toBe('New1-1');
            expect(rowList.getValue(1, 'c2')).toBe('1-2');
        });

        it(': disabled', function() {
            rowList = createRowList(createColumnModelList(['c1', 'c2']));
            rowList.setRowList([
                {
                    _extraData: {
                        rowState: 'DISABLED'
                    },
                    c1: '0-1',
                    c2: '0-2'
                }, {
                    c1: '1-1',
                    c2: '1-2'
                }
            ]);
            rowList.paste([
                ['New0-1', 'New0-2'],
                ['New1-1', 'New1-2']
            ], {
                row: 0,
                column: 0
            });
            expect(rowList.getValue(0, 'c1')).toBe('0-1');
            expect(rowList.getValue(0, 'c2')).toBe('0-2');
            expect(rowList.getValue(1, 'c1')).toBe('New1-1');
            expect(rowList.getValue(1, 'c2')).toBe('New1-2');
        });
    });

    it('숨겨진 컬럼은 제외하고 처리한다.', function() {
        var columnModelList = createColumnModelList(['c1', 'c2', 'c3']);
        columnModelList[1].isHidden = true;
        rowList = createRowList(columnModelList);
        rowList.setRowList([
            {
                c1: '0-1',
                c2: '0-2',
                c3: '0-3'
            }, {
                c1: '1-1',
                c2: '1-2',
                c3: '1-3'
            }
        ]);
        rowList.paste([
            ['New0-1', 'New0-3'],
            ['New1-1', 'New1-3']
        ], {
            row: 0,
            column: 0
        });
        expect(rowList.getValue(0, 'c1')).toBe('New0-1');
        expect(rowList.getValue(0, 'c2')).toBe('0-2');
        expect(rowList.getValue(0, 'c3')).toBe('New0-3');
        expect(rowList.getValue(1, 'c1')).toBe('New1-1');
        expect(rowList.getValue(1, 'c2')).toBe('1-2');
        expect(rowList.getValue(1, 'c3')).toBe('New1-3');
    });

    it('RowSpan이 적용된 컬럼일 경우 MainRow의 값만 변경한다', function() {
        rowList = createRowList(createColumnModelList(['c1', 'c2']))
        rowList.setRowList([
            {
                _extraData: {
                    rowSpan: {
                        c2: 2
                    }
                },
                c1: '0-1',
                c2: '0-2'
            }, {
                c1: '1-1',
                c2: '1-2'
            }
        ]);
        rowList.paste([
            ['New0-1', 'New0-2'],
            ['New1-1', 'New1-2']
        ], {
            row: 0,
            column: 0
        });
        expect(rowList.getValue(0, 'c1')).toBe('New0-1');
        expect(rowList.getValue(0, 'c2')).toBe('New0-2');
        expect(rowList.getValue(1, 'c1')).toBe('New1-1');
        expect(rowList.getValue(1, 'c2')).toBe('New0-2');
    });

    // it('셀렉션이 존재하는 경우 포커스된 셀이 아닌 셀렉션의 왼쪽 상단 셀을 기준으로 붙여넣기 한다', function() {
    //     rowList = createRowList(createColumnModelList(['c1', 'c2', 'c3']));
    //     rowList.setRowList([
    //         {
    //             c1: '0-1',
    //             c2: '0-2',
    //             c3: '0-3'
    //         }, {
    //             c1: '1-1',
    //             c2: '1-2',
    //             c3: '1-3'
    //         }, {
    //             c1: '2-1',
    //             c2: '2-2',
    //             c3: '2-3'
    //         }
    //     ]);
    //     rowList.grid.selectionModel.start(0, 0);
    //     rowList.grid.selectionModel.update(1, 1);
    //     rowList.grid.focusModel.focus(1, 'c2');
    //     rowList.paste([
    //         ['New0-1', 'New0-2'],
    //         ['New1-1', 'New1-2']
    //     ], {
    //         row: 0,
    //         column: 1
    //     });
    //     expect(rowList.getValue(0, 'c1')).toBe('New0-1');
    //     expect(rowList.getValue(0, 'c2')).toBe('New0-2');
    //     expect(rowList.getValue(1, 'c1')).toBe('New1-1');
    //     expect(rowList.getValue(1, 'c2')).toBe('New1-2');
    // });
});
