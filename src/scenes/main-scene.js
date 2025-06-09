import Phaser from 'phaser';
import { recordAction } from '../core/replay-system';
import { applyGravity, detectMatches, removeMatches, spawnNewElements } from '../core/game-logic';
import { getRandom, setSeed } from '../core/deterministic';


const GRID_WIDTH = 8;
const GRID_HEIGHT = 8;
const ELEMENT_TYPES = 5;
const elementWidth = 64;
const elementHeight = 64;
const elementSpacing = 8;
const gemSize = 56;
const MAX_MOVES = 5; // максимальное количество ходов


class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        this.grid = [];
        this.selectedElement = null;
        this.actionLog = [];
        this.currentSeed = 12345;
        this.isReplaying = false;
        this.replayIndex = 0;
        this.movesLeft = MAX_MOVES;
        this.gameOver = false;
        
        // Система заданий
        this.objective = null;
        this.collectedGems = {};
        
        // Модификатор частоты появления гемов
        this.gemModifier = {
            targetGemType: 1, // какой тип гема усиливать (1-5)
            multiplier: 1.0   // множитель частоты (1.0 = нормально, 2.0 = в 2 раза чаще)
        };
    }
    
    preload() {
        // Создаем цветные квадраты программно с закругленными углами
        const colors = [0xff0000, 0x0000ff, 0x00ff00, 0xffff00, 0xff00ff];
        colors.forEach((color, index) => {
            const graphics = this.add.graphics();
            graphics.fillStyle(color);
            graphics.fillRoundedRect(0, 0, gemSize, gemSize, 8);
            graphics.generateTexture(`gem${index + 1}`, gemSize, gemSize);
            graphics.destroy();
        });
    }

    // Обновим метод create для обработки начальных матчей
    create() {
        // Устанавливаем белый фон для canvas
        this.cameras.main.setBackgroundColor('#ffffff');
        this.createUI();
        this.startNewGame();
    }    

    createUI() {
        // Размещаем UI справа от игрового поля
        const uiX = GRID_WIDTH * (elementWidth + elementSpacing) + 50;
        const uiY = 50;
        
        // Создаем белый фон для UI области
        const uiBackground = this.add.rectangle(
            uiX + 60,
            300,
            200,
            500,
            0xffffff
        ).setStrokeStyle(1, 0xcccccc);
        
        // Поле ввода сида
        this.add.text(uiX, uiY, 'Seed:', { fontSize: '14px', fill: '#000' });
        this.seedInput = this.createInputField(uiX, uiY + 20, 80, 20, this.currentSeed.toString());
        
        // Модификатор гемов
        this.add.text(uiX, uiY - 30, 'Gem Modifier:', { fontSize: '14px', fill: '#000' });
        
        // Поле выбора типа гема
        this.add.text(uiX, uiY - 10, 'Тип (1-5):', { fontSize: '12px', fill: '#000' });
        this.gemTypeInput = this.createInputField(uiX + 65, uiY - 15, 30, 20, this.gemModifier.targetGemType.toString());
        
        // Поле множителя
        this.add.text(uiX + 105, uiY - 10, 'x:', { fontSize: '12px', fill: '#000' });
        this.gemMultiplierInput = this.createInputField(uiX + 120, uiY - 15, 40, 20, this.gemModifier.multiplier.toString());

        // Счетчик ходов
        this.movesText = this.add.text(uiX, uiY + 50, `Ходы: ${this.movesLeft}`, { 
            fontSize: '16px', 
            fill: '#000',
            fontWeight: 'bold'
        });
        
        // Задание
        this.objectiveText = this.add.text(uiX, uiY + 80, '', { 
            fontSize: '12px', 
            fill: '#000',
            fontWeight: 'bold',
            wordWrap: { width: 140 }
        });
        
        // Прогресс по заданию
        this.progressText = this.add.text(uiX, uiY + 120, '', { 
            fontSize: '11px', 
            fill: '#333',
            wordWrap: { width: 140 }
        });
        
        // Кнопка "Новая игра"
        this.createButton(uiX, uiY + 160, 100, 25, 'Новая игра', () => {
            this.currentSeed = parseInt(this.seedInput.value) || 12345;
            this.updateGemModifier();
            this.startNewGame();
        });
        
        // Кнопка "Экспорт лога"
        this.createButton(uiX, uiY + 195, 100, 25, 'Экспорт лога', () => {
            this.exportActionLog();
        });
        
        // Поле загрузки лога
        this.add.text(uiX, uiY + 230, 'Импорт лога:', { fontSize: '12px', fill: '#000' });
        this.logInput = this.createInputField(uiX, uiY + 250, 140, 40, 'Вставьте лог...');
        
        // Кнопка "Импорт и реплей"
        this.createButton(uiX, uiY + 300, 100, 25, 'Реплей', () => {
            this.importAndReplay();
        });
        
        // Текст статуса
        this.statusText = this.add.text(uiX, uiY + 335, '', { 
            fontSize: '11px', 
            fill: '#666',
            wordWrap: { width: 140 }
        });
        
        // Лог действий
        this.logText = this.add.text(uiX, uiY + 385, 'Лог действий:', { 
            fontSize: '10px', 
            fill: '#333',
            wordWrap: { width: 140 }
        });
    }

    updateGemModifier() {
        // Читаем значения из полей ввода
        const targetType = parseInt(this.gemTypeInput.value);
        const multiplier = parseFloat(this.gemMultiplierInput.value);
        
        // Валидация
        if (targetType >= 1 && targetType <= ELEMENT_TYPES) {
            this.gemModifier.targetGemType = targetType;
        } else {
            this.gemModifier.targetGemType = 1;
            this.gemTypeInput.value = '1';
        }
        
        if (multiplier >= 0.1 && multiplier <= 10.0) {
            this.gemModifier.multiplier = multiplier;
        } else {
            this.gemModifier.multiplier = 1.0;
            this.gemMultiplierInput.value = '1.0';
        }
        
        console.log('Gem Modifier обновлен:', this.gemModifier);
    }

    createInputField(x, y, width, height, placeholder) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = placeholder;
        input.style.position = 'absolute';
        
        // Получаем позицию canvas
        const canvas = this.game.canvas;
        const rect = canvas.getBoundingClientRect();
        
        input.style.left = (rect.left + x) + 'px';
        input.style.top = (rect.top + y) + 'px';
        input.style.width = width + 'px';
        input.style.height = height + 'px';
        input.style.zIndex = '1000';
        input.style.fontSize = '12px';
        input.style.padding = '2px';
        input.style.border = '1px solid #ccc';
        input.style.backgroundColor = '#fff';
        input.style.borderRadius = '3px';
        
        document.body.appendChild(input);
        return input;
    }

    createButton(x, y, width, height, text, callback) {
        // Создаем прямоугольник с обводкой
        const button = this.add.rectangle(x + width/2, y + height/2, width, height, 0x4CAF50)
            .setStrokeStyle(1, 0x2E7D32)
            .setInteractive()
            .on('pointerdown', callback)
            .on('pointerover', () => {
                button.setFillStyle(0x66BB6A);
            })
            .on('pointerout', () => {
                button.setFillStyle(0x4CAF50);
            });
            
        // Создаем текст на кнопке
        this.add.text(x + width/2, y + height/2, text, { 
            fontSize: '12px', 
            fill: '#fff',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        return button;
    }

    startNewGame() {
        this.actionLog = [];
        this.selectedElement = null;
        this.isReplaying = false;
        this.replayIndex = 0;
        this.movesLeft = MAX_MOVES;
        this.gameOver = false;
        this.collectedGems = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        
        // Принудительно очищаем все overlay элементы СНАЧАЛА
        this.clearAllOverlays();
    
        // Скрываем окна победы/поражения СНАЧАЛА
        this.hideGameOverWindow();
        this.hideWinWindow();
        
        // Удаляем предыдущий обработчик событий
        this.input.off('pointerdown', this.handleInput, this);
        
        // СНАЧАЛА обновляем модификатор гемов
        this.updateGemModifier();
        
        // ПОТОМ устанавливаем сид
        setSeed(this.currentSeed);
        
        // ПОТОМ генерируем задание (которое использует getRandom)
        this.generateObjective();
        
        this.initializeGrid();
        this.processMatches();
        this.renderGrid();
        
        // Добавляем обработчик событий заново
        this.input.on('pointerdown', this.handleInput, this);
        
        this.updateMovesDisplay();
        this.updateObjectiveDisplay();
        this.updateProgressDisplay();
        this.updateStatus(`Новая игра начата с сидом: ${this.currentSeed}, модификатор: тип ${this.gemModifier.targetGemType} x${this.gemModifier.multiplier}`);
        this.updateActionLog();
    }

    generateObjective() {
        // Список цветов камней
        const gemNames = ['красных', 'синих', 'зеленых', 'желтых', 'фиолетовых'];
        
        // Случайно выбираем цвет и количество
        const targetGemType = getRandom(1, ELEMENT_TYPES);
        const targetAmount = getRandom(15, 25); // от 15 до 25 камней
        
        this.objective = {
            gemType: targetGemType,
            amount: targetAmount,
            description: `Собрать ${targetAmount} ${gemNames[targetGemType - 1]} камней`
        };
        
        console.log('Сгенерировано задание:', this.objective);
    }

    updateObjectiveDisplay() {
        if (this.objective && this.objectiveText) {
            this.objectiveText.setText(`Задание:\n${this.objective.description}`);
        }
    }

    updateProgressDisplay() {
        if (this.objective && this.progressText) {
            const current = this.collectedGems[this.objective.gemType] || 0;
            const target = this.objective.amount;
            const percentage = Math.floor((current / target) * 100);
            
            this.progressText.setText(`Прогресс: ${current}/${target} (${percentage}%)`);
            
            // Меняем цвет в зависимости от прогресса
            if (percentage >= 100) {
                this.progressText.setStyle({ fill: '#00ff00', fontWeight: 'bold' }); // зеленый
            } else if (percentage >= 75) {
                this.progressText.setStyle({ fill: '#88ff00', fontWeight: 'bold' }); // светло-зеленый
            } else if (percentage >= 50) {
                this.progressText.setStyle({ fill: '#ffff00', fontWeight: 'bold' }); // желтый
            } else {
                this.progressText.setStyle({ fill: '#333333', fontWeight: 'normal' }); // серый
            }
        }
    }

    updateMovesDisplay() {
        if (this.movesText) {
            this.movesText.setText(`Ходы: ${this.movesLeft}`);
            
            // Меняем цвет при малом количестве ходов
            if (this.movesLeft <= 5) {
                this.movesText.setStyle({ fill: '#ff0000', fontWeight: 'bold' }); // красный
            } else if (this.movesLeft <= 10) {
                this.movesText.setStyle({ fill: '#ff8800', fontWeight: 'bold' }); // оранжевый
            } else {
                this.movesText.setStyle({ fill: '#000000', fontWeight: 'bold' }); // черный
            }
        }
    }

    // Обновляем метод логирования для включения модификатора
    logAction(action) {
        const timestamp = Date.now();
        const logEntry = {
            timestamp,
            action: action.type,
            data: action,
            seed: this.currentSeed,
            movesLeft: this.movesLeft,
            objective: this.objective,
            progress: this.collectedGems[this.objective.gemType] || 0,
            gemModifier: this.gemModifier // добавляем модификатор в лог
        };
        
        this.actionLog.push(logEntry);
        this.updateActionLog();
        
        console.log('Действие записано:', logEntry);
    }

    // Обновляем отображение лога с информацией о ходах
    updateActionLog() {
        const lastActions = this.actionLog.slice(-5);
        const logString = lastActions.map((entry, index) => {
            const moveInfo = entry.movesLeft !== undefined ? ` (ходов: ${entry.movesLeft})` : '';
            return `${this.actionLog.length - 4 + index}: ${entry.action}${moveInfo}`;
        }).join('\n');
        
        this.logText.setText(`Лог действий (последние 5):\n${logString}`);
    }

    updateStatus(message) {
        this.statusText.setText(`Статус: ${message}`);
        console.log(message);
    }

    exportActionLog() {
        const exportData = {
            seed: this.currentSeed,
            gemModifier: this.gemModifier, // добавляем модификатор в экспорт
            actions: this.actionLog,
            timestamp: Date.now()
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        
        // Копируем в буфер обмена
        navigator.clipboard.writeText(dataStr).then(() => {
            this.updateStatus('Лог скопирован в буфер обмена');
        }).catch(() => {
            // Fallback - показываем в консоли
            console.log('Экспорт лога действий:', dataStr);
            this.updateStatus('Лог выведен в консоль');
        });
    }

    importAndReplay() {
        try {
            const importData = JSON.parse(this.logInput.value);
            
            if (!importData.seed || !importData.actions) {
                throw new Error('Неверный формат данных');
            }
            
            this.currentSeed = importData.seed;
            this.seedInput.value = this.currentSeed.toString();
            
            // Восстанавливаем модификатор гемов из лога
            if (importData.gemModifier) {
                this.gemModifier = importData.gemModifier;
                this.gemTypeInput.value = this.gemModifier.targetGemType.toString();
                this.gemMultiplierInput.value = this.gemModifier.multiplier.toString();
            }
            
            // Начинаем новую игру с импортированными настройками
            this.actionLog = [];
            
            // Обновляем модификатор ПЕРЕД установкой сида
            this.updateGemModifier();
            
            // Устанавливаем сид
            setSeed(this.currentSeed);
            
            // Генерируем задание
            this.generateObjective();
            
            this.initializeGrid();
            this.processMatches();
            this.renderGrid();
            
            // Запускаем реплей
            this.startReplay(importData.actions);
            
        } catch (error) {
            this.updateStatus(`Ошибка импорта: ${error.message}`);
        }
    }

    startReplay(actions) {
        this.isReplaying = true;
        this.replayIndex = 0;
        this.replayActions = actions;
        
        this.updateStatus(`Начинаем реплей ${actions.length} действий...`);
        
        // Запускаем реплей с задержкой между действиями
        this.replayNextAction();
    }

    // Обновляем метод реплея для учета ходов
    replayNextAction() {
        if (this.replayIndex >= this.replayActions.length) {
            this.isReplaying = false;
            this.updateStatus('Реплей завершен');
            return;
        }
        
        const actionEntry = this.replayActions[this.replayIndex];
        const action = actionEntry.data;
        
        this.updateStatus(`Воспроизводим действие ${this.replayIndex + 1}/${this.replayActions.length}: ${action.type}`);
        
        // Подсвечиваем выполняемое действие
        if (action.type === 'swap') {
            this.highlightReplayAction(action);
            
            // Выполняем обмен
            setTimeout(() => {
                // В реплее не уменьшаем ходы, просто выполняем действие
                this.swapElements(action.from, action.to, false);
                this.replayIndex++;
                
                // Продолжаем через 1 секунду
                setTimeout(() => this.replayNextAction(), 1000);
            }, 500);
        } else {
            this.replayIndex++;
            setTimeout(() => this.replayNextAction(), 100);
        }
    }

    highlightReplayAction(action) {
        // Очищаем предыдущие подсветки
        this.clearSelection();
        
        // Подсвечиваем элементы участвующие в действии
        if (this.sprites[action.from.y] && this.sprites[action.from.y][action.from.x]) {
            this.sprites[action.from.y][action.from.x].setTint(0xff0000); // красный
            this.sprites[action.from.y][action.from.x].setScale(1.2);
        }
        
        if (this.sprites[action.to.y] && this.sprites[action.to.y][action.to.x]) {
            this.sprites[action.to.y][action.to.x].setTint(0x0000ff); // синий
            this.sprites[action.to.y][action.to.x].setScale(1.2);
        }
    }

    // Функция для детерминированной генерации гемов с модификатором
    generateGemWithModifier() {
        // Используем детерминированный генератор
        const rand = getRandom(1, 10000) / 10000; // случайное число от 0 до 1
        
        // Базовая вероятность для каждого типа гема
        const baseProb = 1 / ELEMENT_TYPES; // 0.2 для 5 типов
        
        // Увеличиваем вероятность целевого гема
        const targetProb = baseProb * this.gemModifier.multiplier;
        
        // Нормализуем вероятности если они превышают 1
        let totalProb = targetProb + (baseProb * (ELEMENT_TYPES - 1));
        if (totalProb > 1) {
            const normalizer = 1 / totalProb;
            const normalizedTargetProb = targetProb * normalizer;
            const normalizedOtherProb = baseProb * normalizer;
            
            // Генерируем гем на основе нормализованных вероятностей
            let cumulative = 0;
            
            for (let gemType = 1; gemType <= ELEMENT_TYPES; gemType++) {
                const prob = (gemType === this.gemModifier.targetGemType) ? normalizedTargetProb : normalizedOtherProb;
                cumulative += prob;
                
                if (rand <= cumulative) {
                    return gemType;
                }
            }
        } else {
            // Перераспределяем вероятности остальных гемов
            const otherProb = (1 - targetProb) / (ELEMENT_TYPES - 1);
            
            // Генерируем гем на основе вероятностей
            let cumulative = 0;
            
            for (let gemType = 1; gemType <= ELEMENT_TYPES; gemType++) {
                const prob = (gemType === this.gemModifier.targetGemType) ? targetProb : otherProb;
                cumulative += prob;
                
                if (rand <= cumulative) {
                    return gemType;
                }
            }
        }
        
        // Fallback - возвращаем целевой гем
        return this.gemModifier.targetGemType;
    }
    
    // Также обновим метод создания начальной сетки, чтобы избежать стартовых комбинаций
    createInitialGrid() {
        let grid;
        let attempts = 0;
        const maxAttempts = 100;
        
        do {
            grid = [];
            for (let y = 0; y < GRID_HEIGHT; y++) {
                const row = [];
                for (let x = 0; x < GRID_WIDTH; x++) {
                    row.push(this.generateGemWithModifier());
                }
                grid.push(row);
            }
            attempts++;
        } while (detectMatches(grid).length > 0 && attempts < maxAttempts);
        
        if (attempts >= maxAttempts) {
            console.warn('Не удалось создать сетку без начальных матчей');
        }
        
        return grid;
    }
    
    renderGrid() {
        // Удаляем старые спрайты, если есть
        if (this.sprites) {
            this.sprites.forEach(row => row.forEach(sprite => {
                if (sprite && sprite.destroy) {
                    sprite.destroy(true);
                }
            }));
        }
        
        this.sprites = [];
        for (let y = 0; y < GRID_HEIGHT; y++) {
            const row = [];
            for (let x = 0; x < GRID_WIDTH; x++) {
                const gemType = this.grid[y][x];
                const sprite = this.add.image(
                    x * (elementWidth + elementSpacing) + elementWidth / 2,
                    y * (elementHeight + elementSpacing) + elementHeight / 2,
                    `gem${gemType}`
                );
                sprite.setDisplaySize(gemSize, gemSize);
                sprite.setInteractive({ useHandCursor: true }); // добавляем курсор для интерактивности
                sprite.setDepth(1); // устанавливаем низкий depth для игровых элементов
                sprite.gridX = x;
                sprite.gridY = y;
                row.push(sprite);
            }
            this.sprites.push(row);
        }
        
        console.log('Сетка отрендерена, спрайтов:', this.sprites.length * this.sprites[0].length);
    }

    // Добавьте метод для принудительной очистки всех overlay элементов
    clearAllOverlays() {
        // Удаляем все элементы с depth >= 100
        if (this.children && this.children.list) {
            const overlayElements = this.children.list.filter(child => child.depth >= 100);
            overlayElements.forEach(element => {
                try {
                    element.destroy(true);
                } catch (e) {
                    console.warn('Ошибка при удалении overlay элемента:', e);
                }
            });
        }
        
        // Очищаем массивы элементов
        this.gameOverElements = [];
        this.winElements = [];
        this.gameOverOverlay = null;
        this.gameOverWindow = null;
    }

    update() {
        // Update game state here
    }

    initializeGrid() {
        // Initialize the grid with elements
        this.grid = this.createInitialGrid();
    }

    // Обновите обработчик ввода для отладки
    handleInput(pointer) {
        console.log('handleInput вызван, gameOver:', this.gameOver, 'isReplaying:', this.isReplaying);
        
        if (this.isReplaying || this.gameOver) {
            console.log('Ввод заблокирован');
            return;
        }
        
        const x = Math.floor(pointer.x / (elementWidth + elementSpacing));
        const y = Math.floor(pointer.y / (elementHeight + elementSpacing));

        console.log('Клик по координатам:', x, y);

        if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
            console.log('Клик за пределами сетки');
            return;
        }

        if (this.selectedElement) {
            const dx = Math.abs(this.selectedElement.x - x);
            const dy = Math.abs(this.selectedElement.y - y);
            
            if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
                // Проверяем, создает ли ход валидные матчи
                if (this.isValidMove(this.selectedElement, { x, y })) {
                    const swapAction = {
                        type: 'swap',
                        from: this.selectedElement,
                        to: { x, y }
                    };
                    
                    this.makeMove(this.selectedElement, { x, y });
                    this.logAction(swapAction);
                } else {
                    this.updateStatus('Недопустимый ход - не создает матчей!');
                }
            }
            
            this.clearSelection();
            this.selectedElement = null;
        } else {
            this.selectedElement = { x, y };
            this.highlightElement(x, y);
            console.log('Выбран элемент:', this.selectedElement);
        }
    }

    isValidMove(from, to) {
        // Временно делаем обмен
        const temp = this.grid[from.y][from.x];
        this.grid[from.y][from.x] = this.grid[to.y][to.x];
        this.grid[to.y][to.x] = temp;
        
        // Проверяем, есть ли матчи
        const matches = detectMatches(this.grid);
        
        // Возвращаем обмен обратно
        this.grid[to.y][to.x] = this.grid[from.y][from.x];
        this.grid[from.y][from.x] = temp;
        
        return matches.length > 0;
    }

    makeMove(from, to) {
        // Уменьшаем количество ходов
        this.movesLeft--;
        this.updateMovesDisplay();
        
        // Выполняем обмен
        this.swapElements(from, to, true);
        
        // Проверяем, закончились ли ходы
        if (this.movesLeft <= 0) {
            this.triggerGameOver();
        }
    }

    triggerGameOver() {
        this.gameOver = true;
        this.showGameOverWindow();
        this.updateStatus('Игра окончена - ходы закончились!');
    }

    showGameOverWindow() {
        // Массив для хранения всех элементов окна
        this.gameOverElements = [];
        
        // Создаем полупрозрачный фон
        this.gameOverOverlay = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000,
            0.7
        ).setDepth(100);
        this.gameOverElements.push(this.gameOverOverlay);

        // Создаем окно проигрыша
        this.gameOverWindow = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            400,
            250,
            0xffffff
        ).setStrokeStyle(3, 0xff0000).setDepth(101);
        this.gameOverElements.push(this.gameOverWindow);

        // Заголовок
        const titleText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 80,
            'ПОРАЖЕНИЕ',
            {
                fontSize: '24px',
                fill: '#ff0000',
                fontWeight: 'bold'
            }
        ).setOrigin(0.5).setDepth(102);
        this.gameOverElements.push(titleText);

        // Текст с результатом
        const current = this.collectedGems[this.objective.gemType] || 0;
        const resultText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 20,
            `Ходы закончились!\n${this.objective.description}\nСобрано: ${current}/${this.objective.amount}\nНе хватило: ${this.objective.amount - current}`,
            {
                fontSize: '16px',
                fill: '#000000',
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(102);
        this.gameOverElements.push(resultText);

        // Кнопка "Новая игра"
        const newGameButton = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY + 60,
            150,
            40,
            0x4CAF50
        ).setStrokeStyle(2, 0x2E7D32)
        .setInteractive()
        .setDepth(102)
        .on('pointerdown', () => {
            this.startNewGame();
        })
        .on('pointerover', () => {
            newGameButton.setFillStyle(0x66BB6A);
        })
        .on('pointerout', () => {
            newGameButton.setFillStyle(0x4CAF50);
        });
        this.gameOverElements.push(newGameButton);

        const buttonText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY + 60,
            'Новая игра',
            {
                fontSize: '16px',
                fill: '#ffffff',
                fontWeight: 'bold'
            }
        ).setOrigin(0.5).setDepth(103);
        this.gameOverElements.push(buttonText);
    }

    hideGameOverWindow() {
        // Удаляем все элементы окна проигрыша
        if (this.gameOverElements) {
            this.gameOverElements.forEach(element => {
                if (element && element.destroy) {
                    element.destroy(true);
                }
            });
            this.gameOverElements = [];
        }
        
        // Очищаем ссылки
        this.gameOverOverlay = null;
        this.gameOverWindow = null;

        // Принудительная очистка всех overlay элементов
        this.clearAllOverlays();
        
        // Дополнительная очистка всех элементов с высоким depth
        if (this.children && this.children.list) {
            this.children.list.forEach(child => {
                if (child && child.depth >= 100) {
                    try {
                        child.destroy(true);
                    } catch (e) {
                        console.warn('Ошибка при удалении элемента:', e);
                    }
                }
            });
        }
    }

    swapElements(from, to, shouldLog = true) {
        const temp = this.grid[from.y][from.x];
        this.grid[from.y][from.x] = this.grid[to.y][to.x];
        this.grid[to.y][to.x] = temp;

        this.processMatches();
        this.renderGrid();
    }
    
    highlightElement(x, y) {
        this.clearSelection();
        
        // Подсвечиваем выбранный элемент ярко-желтым
        if (this.sprites[y] && this.sprites[y][x]) {
            this.sprites[y][x].setTint(0xffff00); // ярко-желтая подсветка
            this.sprites[y][x].setScale(1.1); // увеличиваем размер для акцента
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
            if (newX >= 0 && newX < GRID_WIDTH && newY >= 0 && newY < GRID_HEIGHT) {
                if (this.sprites[newY] && this.sprites[newY][newX]) {
                    // Подсвечиваем доступные позиции светло-зеленым
                    this.sprites[newY][newX].setTint(0x90EE90); // светло-зеленый
                    this.sprites[newY][newX].setAlpha(0.8); // немного прозрачности
                }
            }
        });
    }
    
    clearSelection() {
        if (this.sprites) {
            this.sprites.forEach(row => 
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

    // Обновляем функцию spawnNewElements чтобы использовать модификатор детерминированно
    customSpawnNewElements(grid) {
        const rows = grid.length;
        const cols = grid[0].length;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (grid[row][col] === 0) {
                    grid[row][col] = this.generateGemWithModifier();
                }
            }
        }
    }

    processMatches() {
        let foundMatches = true;
        let cascadeCount = 0;
        let totalCollected = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        
        while (foundMatches && cascadeCount < 20) {
            const matches = detectMatches(this.grid);
            
            if (matches && Array.isArray(matches) && matches.length > 0) {
                console.log(`Найдено матчей: ${matches.length}, каскад #${cascadeCount + 1}`);
                
                // Подсчитываем собранные камни
                matches.forEach((match, matchIndex) => {
                    // Проверяем, что match является массивом
                    if (Array.isArray(match)) {
                        match.forEach(({ x, y }) => {
                            if (typeof x === 'number' && typeof y === 'number' && 
                                y >= 0 && y < this.grid.length && 
                                x >= 0 && x < this.grid[0].length) {
                                const gemType = this.grid[y][x];
                                if (gemType && gemType >= 1 && gemType <= 5) {
                                    totalCollected[gemType]++;
                                }
                            }
                        });
                    } else {
                        console.error('Match не является массивом:', match);
                    }
                });
                
                removeMatches(this.grid, matches);
                applyGravity(this.grid);
                // Используем нашу детерминированную функцию вместо стандартной
                this.customSpawnNewElements(this.grid);
                
                cascadeCount++;
            } else {
                foundMatches = false;
            }
        }
        
        // Обновляем счетчики собранных камней
        Object.keys(totalCollected).forEach(gemType => {
            if (totalCollected[gemType] > 0) {
                this.collectedGems[gemType] = (this.collectedGems[gemType] || 0) + totalCollected[gemType];
                console.log(`Собрано камней типа ${gemType}: +${totalCollected[gemType]} (всего: ${this.collectedGems[gemType]})`);
            }
        });
        
        // Обновляем отображение прогресса
        this.updateProgressDisplay();
        
        // Проверяем победу
        this.checkWinCondition();
        
        if (cascadeCount > 0) {
            console.log(`Обработано каскадов: ${cascadeCount}`);
        }
    }

    checkWinCondition() {
        if (this.objective && !this.gameOver) {
            const current = this.collectedGems[this.objective.gemType] || 0;
            if (current >= this.objective.amount) {
                this.triggerWin();
            }
        }
    }

    triggerWin() {
        this.gameOver = true;
        this.showWinWindow();
        this.updateStatus('Поздравляем! Задание выполнено!');
    }

    showWinWindow() {
        // Массив для хранения всех элементов окна
        this.winElements = [];
        
        // Создаем полупрозрачный фон
        const winOverlay = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000,
            0.7
        ).setDepth(100);
        this.winElements.push(winOverlay);

        // Создаем окно победы
        const winWindow = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            400,
            250,
            0xffffff
        ).setStrokeStyle(3, 0x00aa00).setDepth(101);
        this.winElements.push(winWindow);

        // Заголовок
        const titleText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 80,
            'ПОБЕДА!',
            {
                fontSize: '32px',
                fill: '#00aa00',
                fontWeight: 'bold'
            }
        ).setOrigin(0.5).setDepth(102);
        this.winElements.push(titleText);

        // Текст с результатом
        const current = this.collectedGems[this.objective.gemType] || 0;
        const usedMoves = MAX_MOVES - this.movesLeft;
        const resultText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 30,
            `Задание выполнено!\n${this.objective.description}\nСобрано: ${current}\nИспользовано ходов: ${usedMoves}`,
            {
                fontSize: '16px',
                fill: '#000000',
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(102);
        this.winElements.push(resultText);

        // Кнопка "Новая игра"
        const newGameButton = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY + 60,
            150,
            40,
            0x4CAF50
        ).setStrokeStyle(2, 0x2E7D32)
        .setInteractive()
        .setDepth(102)
        .on('pointerdown', () => {
            this.startNewGame();
        })
        .on('pointerover', () => {
            newGameButton.setFillStyle(0x66BB6A);
        })
        .on('pointerout', () => {
            newGameButton.setFillStyle(0x4CAF50);
        });
        this.winElements.push(newGameButton);

        const buttonText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY + 60,
            'Новая игра',
            {
                fontSize: '16px',
                fill: '#ffffff',
                fontWeight: 'bold'
            }
        ).setOrigin(0.5).setDepth(103);
        this.winElements.push(buttonText);
    }

    hideWinWindow() {
        // Удаляем все элементы окна победы
        if (this.winElements) {
            this.winElements.forEach(element => {
                if (element && element.destroy) {
                    element.destroy(true);
                }
            });
            this.winElements = [];
        }
        
        // Дополнительная очистка всех элементов с высоким depth
        if (this.children && this.children.list) {
            this.children.list.forEach(child => {
                if (child && child.depth >= 100) {
                    try {
                        child.destroy(true);
                    } catch (e) {
                        console.warn('Ошибка при удалении элемента:', e);
                    }
                }
            });
        }

        // Принудительная очистка всех overlay элементов
        this.clearAllOverlays();
    }

    // Опциональный метод для задержки (если нужны анимации)
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default MainScene;