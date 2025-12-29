const assert = require('assert');
const {RangeListRange} = require('../structures/RangeList');

describe('Range', () => {
    describe('constructor', () => {
        it('should set the internal variables correctly', () => {
            let range = new RangeListRange(1,10);
            assert.strictEqual(range.min, 1);
            assert.strictEqual(range.max, 10);
        });
    });
    describe('toArray', () => {
        it('should return an array between min and max', () => {
            let range = new RangeListRange(1, 2);
            assert.deepStrictEqual(range.toArray(), [1,2]);
        });
    });
    describe('isInRange', () => {
        it('should return true if the given number is within the min and max', () => {
            let range = new RangeListRange(1, 100);
            assert.strictEqual(range.isInRange(10), true);
            assert.strictEqual(range.isInRange(100), true);
            assert.strictEqual(range.isInRange(0), false);
            assert.strictEqual(range.isInRange(101), false);
        });
    });
    describe('canExtendMax', () => {
        it('returns true if the number given is one above max', () => {
            let range = new RangeListRange(1, 100);
            assert.strictEqual(range.canExtendMax(101), true);
            assert.strictEqual(range.canExtendMax(100), false);
        });
    });
    describe('canExtendMin', () => {
        it('returns true if the number given is one below the min', () => {
            let range = new RangeListRange(1, 100);
            assert.strictEqual(range.canExtendMin(0), true);
            assert.strictEqual(range.canExtendMin(-1), false);
        });
    });
});
