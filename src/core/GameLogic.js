import { getRandom, setSeed } from './deterministic';

export class GameLogic {
    constructor(scene) {
        this.scene = scene;
    }

    detectMatches(grid) {
        const matches = [];
        const rows = grid.length;
        const cols = grid[0].length;

        // Проверка горизонтальных совпадений
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols - 2; x++) {
                const gemType = grid[y][x];
                if (gemType && gemType === grid[y][x + 1] && gemType === grid[y][x + 2]) {
                    const match = { type: gemType, positions: [] };
                    let currentX = x;
                    while (currentX < cols && grid[y][currentX] === gemType) {
                        match.positions.push({ x: currentX, y });
                        currentX++;
                    }
                    matches.push(match);
                    x = currentX - 1;
                }
            }
        }

        // Проверка вертикальных совпадений
        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows - 2; y++) {
                const gemType = grid[y][x];
                if (gemType && gemType === grid[y + 1][x] && gemType === grid[y + 2][x]) {
                    const match = { type: gemType, positions: [] };
                    let currentY = y;
                    while (currentY < rows && grid[currentY][x] === gemType) {
                        match.positions.push({ x, y: currentY });
                        currentY++;
                    }
                    matches.push(match);
                    y = currentY - 1;
                }
            }
        }

        return matches;
    }

    removeMatches(grid, matches) {
        matches.forEach(match => {
            match.positions.forEach(pos => {
                grid[pos.y][pos.x] = null;
            });
        });
    }

    applyGravity(grid) {
        const cols = grid[0].length;
        const rows = grid.length;

        for (let x = 0; x < cols; x++) {
            let emptySpaces = 0;
            for (let y = rows - 1; y >= 0; y--) {
                if (grid[y][x] === null) {
                    emptySpaces++;
                } else if (emptySpaces > 0) {
                    grid[y + emptySpaces][x] = grid[y][x];
                    grid[y][x] = null;
                }
            }
        }
    }

    spawnNewElements(grid, generateGem) {
        const cols = grid[0].length;
        const rows = grid.length;

        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                if (grid[y][x] === null) {
                    grid[y][x] = generateGem();
                }
            }
        }
    }

    startNewGame() {
        this.scene.actionLog = [];
        this.scene.selectedElement = null;
        this.scene.isReplaying = false;
        this.scene.replayIndex = 0;
        this.scene.movesLeft = this.scene.MAX_MOVES;
        this.scene.gameOver = false;
        this.scene.collectedGems = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        this.scene.randomCallCounter = 0; // Сбрасываем счетчик
        
        // Принудительно очищаем все overlay элементы СНАЧАЛА
        this.scene.uiManager.clearAllOverlays();
        this.scene.uiManager.hideGameOverWindow();
        this.scene.uiManager.hideWinWindow();
        
        // Удаляем предыдущий обработчик событий
        this.scene.input.off('pointerdown', this.scene.handleInput, this.scene);
        
        // КРИТИЧЕСКИ ВАЖНЫЙ ПОРЯДОК:
        // 1. Обновляем модификатор (НЕ использует getRandom)
        this.scene.updateGemModifier();
        
        // 2. Устанавливаем сид
        setSeed(this.scene.currentSeed);
        console.log(`Сид установлен: ${this.scene.currentSeed}, модификатор: тип ${this.scene.gemModifier.targetGemType} x${this.scene.gemModifier.multiplier}`);
        
        // 3. Генерируем задание (использует getRandom 2 раза)
        this.scene.generateObjective();
        
        // 4. Создаем сетку БЕЗ обработки матчей
        this.scene.grid = this.scene.createInitialGridDeterministic();
        
        // 5. Рендерим сетку
        this.scene.renderGrid();
        
        // Добавляем обработчик событий
        this.scene.input.on('pointerdown', this.scene.handleInput, this.scene);
        
        this.scene.uiManager.updateMovesDisplay();
        this.scene.uiManager.updateObjectiveDisplay();
        this.scene.uiManager.updateProgressDisplay();
        this.scene.uiManager.updateStatus(`Игра начата. Сид: ${this.scene.currentSeed}, Random calls: ${this.scene.randomCallCounter}`);
        this.scene.uiManager.updateActionLog();
    }

    update() {
        // Update game state here
    }

    isValidMove(from, to) {
        // Временно делаем обмен
        const temp = this.scene.grid[from.y][from.x];
        this.scene.grid[from.y][from.x] = this.scene.grid[to.y][to.x];
        this.scene.grid[to.y][to.x] = temp;
        
        // Проверяем, есть ли матчи
        const matches = this.detectMatches(this.scene.grid);
        
        // Возвращаем обмен обратно
        this.scene.grid[to.y][to.x] = this.scene.grid[from.y][from.x];
        this.scene.grid[from.y][from.x] = temp;
        
        return matches.length > 0;
    }

    async makeMove(from, to) {
        // Уменьшаем количество ходов
        this.scene.movesLeft--;
        this.scene.uiManager.updateMovesDisplay();
        
        // Сначала обновляем состояние сетки
        const temp = this.scene.grid[from.y][from.x];
        this.scene.grid[from.y][from.x] = this.scene.grid[to.y][to.x];
        this.scene.grid[to.y][to.x] = temp;
        
        // Обновляем спрайты
        const fromSprite = this.scene.sprites[from.y][from.x];
        const toSprite = this.scene.sprites[to.y][to.x];
        fromSprite.setTexture(`gem${this.scene.grid[from.y][from.x]}`);
        toSprite.setTexture(`gem${this.scene.grid[to.y][to.x]}`);
        
        // Проверяем матчи
        const matches = this.detectMatches(this.scene.grid);
        if (matches.length > 0) {
            // Анимируем обмен
            await this.scene.animationManager.animateSwap(from, to);
            
            // Анимируем удаление матчей
            await this.scene.animationManager.animateMatches(matches);
            
            // Удаляем матчи из сетки
            this.removeMatches(this.scene.grid, matches);
            
            // Обновляем счетчик собранных камней
            matches.forEach(match => {
                this.scene.collectedGems[match.type] = (this.scene.collectedGems[match.type] || 0) + match.positions.length;
            });
            
            // Применяем гравитацию
            this.applyGravity(this.scene.grid);
            await this.scene.animationManager.animateGravity();
            
            // Создаем новые элементы
            this.spawnNewElements(this.scene.grid, () => this.scene.generateGemWithModifier('new-element'));
            await this.scene.animationManager.animateNewElements();
            
            // Обновляем отображение
            this.scene.renderGrid();
            this.scene.uiManager.updateProgressDisplay();
            
            // Проверяем условие победы
            this.checkWinCondition();
        } else {
            // Если нет матчей, возвращаем состояние сетки
            this.scene.grid[to.y][to.x] = this.scene.grid[from.y][from.x];
            this.scene.grid[from.y][from.x] = temp;
            
            // Возвращаем спрайты в исходное состояние
            fromSprite.setTexture(`gem${this.scene.grid[from.y][from.x]}`);
            toSprite.setTexture(`gem${this.scene.grid[to.y][to.x]}`);
            
            // Анимируем обмен и возврат
            await this.scene.animationManager.animateSwap(from, to);
            await this.scene.animationManager.animateSwap(from, to);
            
            // Возвращаем ход
            this.scene.movesLeft++;
            this.scene.uiManager.updateMovesDisplay();
        }
        
        // Проверяем, закончились ли ходы
        if (this.scene.movesLeft <= 0 && !this.scene.gameOver) {
            this.triggerGameOver();
        }
    }

    clearSelection() {
        if (this.scene.sprites) {
            this.scene.sprites.forEach(row => 
                row.forEach(sprite => {
                    if (sprite) {
                        sprite.clearTint();
                        sprite.setScale(1.0); // возвращаем нормальный размер
                        sprite.setAlpha(1.0); // убираем прозрачность
                    }
                })
            );
        }
    }

    highlightElement(x, y) {
        this.clearSelection();
        
        // Подсвечиваем выбранный элемент ярко-желтым
        if (this.scene.sprites[y] && this.scene.sprites[y][x]) {
            this.scene.sprites[y][x].setTint(0xffff00); // ярко-желтая подсветка
            this.scene.sprites[y][x].setScale(1.1); // увеличиваем размер для акцента
        }
        
        // Подсвечиваем доступные для перемещения позиции
        this.highlightAvailableMoves(x, y);
    }

    highlightAvailableMoves(selectedX, selectedY) {
        // Массив направлений: вверх, вниз, влево, вправо
        const directions = [
            { dx: 0, dy: -1 }, // вверх
            { dx: 0, dy: 1 },  // вниз
            { dx: -1, dy: 0 }, // влево
            { dx: 1, dy: 0 }   // вправо
        ];
        
        directions.forEach(({ dx, dy }) => {
            const newX = selectedX + dx;
            const newY = selectedY + dy;
            
            // Проверяем, что позиция в границах сетки
            if (newX >= 0 && newX < this.scene.GRID_WIDTH && newY >= 0 && newY < this.scene.GRID_HEIGHT) {
                if (this.scene.sprites[newY] && this.scene.sprites[newY][newX]) {
                    // Подсвечиваем доступные позиции светло-зеленым
                    this.scene.sprites[newY][newX].setTint(0x90EE90); // светло-зеленый
                    this.scene.sprites[newY][newX].setAlpha(0.8); // немного прозрачности
                }
            }
        });
    }

    checkWinCondition() {
        if (this.scene.objective && !this.scene.gameOver) {
            const current = this.scene.collectedGems[this.scene.objective.gemType] || 0;
            if (current >= this.scene.objective.amount) {
                this.triggerWin();
            }
        }
    }

    triggerGameOver() {
        this.scene.gameOver = true;
        this.scene.uiManager.showGameOverWindow();
        this.scene.uiManager.updateStatus('Игра окончена - ходы закончились!');
    }

    triggerWin() {
        this.scene.gameOver = true;
        this.scene.uiManager.showWinWindow();
        this.scene.uiManager.updateStatus('Поздравляем! Задание выполнено!');
    }

    logAction(action) {
        const timestamp = Date.now();
        const logEntry = {
            timestamp,
            action: action.type,
            data: action,
            seed: this.scene.currentSeed,
            movesLeft: this.scene.movesLeft,
            objective: this.scene.objective,
            progress: this.scene.collectedGems[this.scene.objective.gemType] || 0,
            gemModifier: this.scene.gemModifier,
            randomCallCounter: this.scene.randomCallCounter
        };
        
        this.scene.actionLog.push(logEntry);
        this.scene.uiManager.updateActionLog();
        
        console.log('Действие записано:', logEntry);
    }
}

export default GameLogic; 