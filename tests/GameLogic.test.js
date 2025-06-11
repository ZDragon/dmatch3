const { detectMatches, applyGravity, removeMatches } = require('../src/core/GameLogic');

describe('Game Logic Tests', () => {
    test('Detect matches correctly', () => {
        const grid = [
            [1, 1, 1, 0],
            [0, 2, 2, 2],
            [3, 0, 3, 3]
        ];
        const expectedMatches = [
            { type: 1, positions: [[0, 0], [0, 1], [0, 2]] },
            { type: 2, positions: [[1, 1], [1, 2], [1, 3]] }
        ];
        expect(detectMatches(grid)).toEqual(expectedMatches);
    });

    test('Remove elements correctly', () => {
        const grid = [
            [1, 1, 1, 0],
            [0, 2, 2, 2],
            [3, 0, 3, 3]
        ];
        const matches = [
            { type: 1, positions: [[0, 0], [0, 1], [0, 2]] },
            { type: 2, positions: [[1, 1], [1, 2], [1, 3]] }
        ];
        const expectedGrid = [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [3, 0, 3, 3]
        ];
        expect(removeMatches(grid, matches)).toEqual(expectedGrid);
    });

    test('Gravity applies correctly', () => {
        const grid = [
            [1, 0, 2],
            [0, 0, 3]
        ];
        const expectedGrid = [
            [0, 0, 2],
            [1, 0, 3]
        ];
        expect(applyGravity(grid)).toEqual(expectedGrid);
    });
});