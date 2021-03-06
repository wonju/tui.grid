'use strict';

var ModelManager = require('model/manager');
var DomState = require('domState');
var ColumnModel = require('model/data/columnModel');
var DataModel = require('model/data/rowList');
var DimensionModel = require('model/dimension');
var CoordRowModel = require('model/coordRow');
var SummaryModel = require('model/summary');

describe('model/manager', function() {
    var domState = new DomState($('<div>'));

    describe('creates dimension model', function() {
        it('with options', function() {
            var manager, dimension;
            manager = new ModelManager({
                headerHeight: 281,
                rowHeight: 72,
                fitToParentHeight: true,
                scrollX: true,
                scrollY: true,
                minimumColumnWidth: 192
            }, domState);

            dimension = manager.dimensionModel;
            expect(dimension.get('headerHeight')).toBe(281);
            expect(dimension.get('rowHeight')).toBe(72);
            expect(dimension.get('fitToParentHeight')).toBe(true);
            expect(dimension.get('scrollX')).toBe(true);
            expect(dimension.get('scrollY')).toBe(true);
            expect(dimension.get('minimumColumnWidth')).toBe(192);
        });

        it('with options (boolean)', function() {
            var manager, dimension;
            manager = new ModelManager({
                fitToParentHeight: false,
                scrollX: false,
                scrollY: false
            });

            dimension = manager.dimensionModel;
            expect(dimension.get('fitToParentHeight')).toBe(false);
            expect(dimension.get('scrollX')).toBe(false);
            expect(dimension.get('scrollY')).toBe(false);
        });

        it('with required models', function() {
            var manager, dimension;
            manager = new ModelManager({}, domState);
            dimension = manager.dimensionModel;

            expect(dimension.columnModel instanceof ColumnModel).toBe(true);
            expect(dimension.dataModel instanceof DataModel).toBe(true);
            expect(dimension.domState).toBe(domState);
        });
    });

    describe('creates renderer model', function() {
        it('with options', function() {
            var manager, renderModel, options;
            options = {
                emptyMessage: 'No Data',
                showDummyRows: true
            };
            manager = new ModelManager(options);
            renderModel = manager.renderModel;

            expect(renderModel.get('emptyMessage', options.emptyMessage));
            expect(renderModel.get('showDummyRows', options.showDummyRows));
        });

        it('with required models', function() {
            var manager, renderModel;
            manager = new ModelManager();
            renderModel = manager.renderModel;

            expect(renderModel.columnModel instanceof ColumnModel).toBe(true);
            expect(renderModel.dataModel instanceof DataModel).toBe(true);
            expect(renderModel.dimensionModel instanceof DimensionModel).toBe(true);
        });
    });

    describe('creates summary model', function() {
        it('only if footer.columnContent option exists', function() {
            var manager1 = new ModelManager();
            var manager2 = new ModelManager({
                footer: {
                    columnContent: {}
                }
            });

            expect(manager1.summaryModel).toBe(null);
            expect(manager2.summaryModel).toEqual(jasmine.any(SummaryModel));
        });

        it('with dataModel', function() {
            var manager = new ModelManager({
                footer: {columnContent: {}}
            });

            expect(manager.summaryModel.dataModel).toEqual(jasmine.any(DataModel));
        });

        it('with autoColumnes which contains columnNames only which has a template function' +
            'and its useAutoSummary is not false', function() {
            var manager = new ModelManager({
                footer: {
                    columnContent: {
                        c1: {
                            template: function() {}
                        },
                        c2: {
                            useAutoSummary: false,
                            template: function() {}
                        },
                        c3: {}
                    }
                }
            });
            expect(manager.summaryModel.autoColumnNames).toEqual(['c1']);
        });
    });

    it('creates coordRow model', function() {
        var manager = new ModelManager();

        expect(manager.coordRowModel).toEqual(jasmine.any(CoordRowModel));
    });
});
