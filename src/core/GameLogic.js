import seedrandom from 'seedrandom';

export class GameLogic {
    constructor(scene) {
        this.scene = scene;
        this.rng = seedrandom(this.scene.currentSeed);
    }

    setSeed(seed) {
        this.rng = seedrandom(seed);
    }

    getRandom(min, max) {
        return Math.floor(this.rng() * (max - min + 1)) + min;
    }

    detectMatches(grid) {
        const matches = [];
        const rows = grid.length;
        const cols = grid[0].length;
    
        // Горизонтальные матчи
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col <= cols - 3; col++) {
                if (grid[row][col] === grid[row][col + 1] && 
                    grid[row][col] === grid[row][col + 2] &&
                    grid[row][col] !== 0) {
                    
                    const match = [];
                    for (let i = col; i < cols && grid[row][i] === grid[row][col]; i++) {
                        match.push({ x: i, y: row });
                    }
                    matches.push(match);
                    col = col + match.length - 1; // пропускаем обработанные элементы
                }
            }
        }
    
        // Вертикальные матчи
        for (let col = 0; col < cols; col++) {
            for (let row = 0; row <= rows - 3; row++) {
                if (grid[row][col] === grid[row + 1][col] && 
                    grid[row][col] === grid[row + 2][col] &&
                    grid[row][col] !== 0) {
                    
                    const match = [];
                    for (let i = row; i < rows && grid[i][col] === grid[row][col]; i++) {
                        match.push({ x: col, y: i });
                    }
                    matches.push(match);
                    row = row + match.length - 1; // пропускаем обработанные элементы
                }
            }
        }
    
        return matches;
    }

    removeMatches(grid, matches) {
        // Добавляем проверку на валидность matches
        if (!matches || !Array.isArray(matches)) {
            console.warn('removeMatches: matches не является массивом', matches);
            return;
        }
    
        matches.forEach(match => {
            // Проверяем каждый match
            if (!match || !Array.isArray(match)) {
                console.warn('removeMatches: match не является массивом', match);
                return;
            }
    
            match.forEach(({ x, y }) => {
                if (typeof x === 'number' && typeof y === 'number' && 
                    y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
                    grid[y][x] = 0;
                } else {
                    console.warn('removeMatches: невалидные координаты', { x, y });
                }
            });
        });
    }

    applyGravity(grid) {
        const rows = grid.length;
        const cols = grid[0].length;
        
        for (let col = 0; col < cols; col++) {
            // Собираем все ненулевые элементы в колонке
            const nonZeroElements = [];
            for (let row = 0; row < rows; row++) {
                if (grid[row][col] !== 0) {
                    nonZeroElements.push(grid[row][col]);
                }
            }
            
            // Заполняем колонку: сначала нули, потом ненулевые элементы
            for (let row = 0; row < rows; row++) {
                if (row < rows - nonZeroElements.length) {
                    grid[row][col] = 0;
                } else {
                    grid[row][col] = nonZeroElements[row - (rows - nonZeroElements.length)];
                }
            }
        }
    }
}

export default GameLogic; 