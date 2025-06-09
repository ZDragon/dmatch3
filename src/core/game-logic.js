import { getRandom } from './deterministic';
const MATCH_3_COUNT = 3;

function detectMatches(grid) {
    const matches = [];
    const rows = grid.length;
    const cols = grid[0].length;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const value = grid[row][col];
            if (value !== 0) {
                // Check horizontal match
                if (col <= cols - MATCH_3_COUNT && value === grid[row][col + 1] && value === grid[row][col + 2]) {
                    matches.push({ type: 'horizontal', positions: [[row, col], [row, col + 1], [row, col + 2]] });
                }
                // Check vertical match
                if (row <= rows - MATCH_3_COUNT && value === grid[row + 1][col] && value === grid[row + 2][col]) {
                    matches.push({ type: 'vertical', positions: [[row, col], [row + 1, col], [row + 2, col]] });
                }
            }
        }
    }
    return matches;
}

function removeMatches(grid, matches) {
    matches.forEach(match => {
        match.positions.forEach(([row, col]) => {
            grid[row][col] = 0; // Remove the matched element
        });
    });
}

function applyGravity(grid) {
    const rows = grid.length;
    const cols = grid[0].length;

    for (let col = 0; col < cols; col++) {
        let emptySpace = rows - 1;
        for (let row = rows - 1; row >= 0; row--) {
            if (grid[row][col] !== 0) {
                grid[emptySpace][col] = grid[row][col];
                if (emptySpace !== row) {
                    grid[row][col] = 0;
                }
                emptySpace--;
            }
        }
    }
}

export function spawnNewElements(grid, getRandom) {
    const rows = grid.length;
    const cols = grid[0].length;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (grid[row][col] === 0) {
                grid[row][col] = getRandom(1, 5); // генерируем новый элемент
            }
        }
    }
}

export { detectMatches, removeMatches, applyGravity };