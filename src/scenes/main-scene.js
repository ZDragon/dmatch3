import Phaser from 'phaser';
import { UIManager } from '../ui/UIManager';
import { GameLogic } from '../core/GameLogic';
import { ReplayManager } from '../core/ReplayManager';

const GRID_WIDTH = 8;
const GRID_HEIGHT = 8;
const ELEMENT_TYPES = 7;
const BOMB = 6;
const VERTICAL_BOMB = 7;
const HORIZONTAL_BOMB = 8;
const elementWidth = 64;
const elementHeight = 64;
const elementSpacing = 8;
const gemSize = 56;
const MAX_MOVES = 7;

export class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        
        // Инициализация состояния игры
        this.gridSubArea = [];
        this.gridSubAreaSprites = [];
        this.grid = [];
        this.sprites = [];
        this.selectedElement = null;
        this.movesLeft = MAX_MOVES;
        this.gameOver = false;
        this.collectedGems = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        this.objective = null;
        this.currentSeed = 12345;
        this.gemModifier = { targetGemType: 1, multiplier: 1 };
        this.randomCallCounter = 0;
        this.isAnimating = false;
        this.showGrid = false; // Флаг для отображения сетки
        this.gridGraphics = null; // Графика для отрисовки сетки
        
        // Реплей
        this.actionLog = [];
        this.isReplaying = false;
        this.replayIndex = 0;
        
        // Окна
        this.gameOverWindow = null;
        this.winWindow = null;
        
        // Инициализация менеджеров
        this.uiManager = new UIManager(this);
        this.gameLogic = new GameLogic(this);
        this.replayManager = new ReplayManager(this);
        this.lastState = null; // Сохраняем последнее состояние для отмены
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
        // Активный гем (бомба)
        const bombGraphics = this.add.graphics();
        bombGraphics.fillStyle(0x222222);
        bombGraphics.fillCircle(gemSize/2, gemSize/2, gemSize/2-2);
        bombGraphics.lineStyle(4, 0xffd700);
        bombGraphics.strokeCircle(gemSize/2, gemSize/2, gemSize/2-6);
        bombGraphics.fillStyle(0xff0000);
        bombGraphics.fillCircle(gemSize/2, gemSize/2, 10);
        bombGraphics.generateTexture('gem6', gemSize, gemSize);
        bombGraphics.destroy();

        // Вертикальная бомба
        const verticalBombGraphics = this.add.graphics();
        verticalBombGraphics.fillStyle(0x222222);
        verticalBombGraphics.fillRoundedRect(0, 0, gemSize, gemSize, 8);
        verticalBombGraphics.lineStyle(4, 0x00ff00);
        verticalBombGraphics.strokeRoundedRect(4, 4, gemSize-8, gemSize-8, 8);
        verticalBombGraphics.fillStyle(0x00ff00);
        verticalBombGraphics.fillRect(gemSize/2-4, 8, 8, gemSize-16);
        verticalBombGraphics.generateTexture('gem7', gemSize, gemSize);
        verticalBombGraphics.destroy();

        // Горизонтальная бомба
        const horizontalBombGraphics = this.add.graphics();
        horizontalBombGraphics.fillStyle(0x222222);
        horizontalBombGraphics.fillRoundedRect(0, 0, gemSize, gemSize, 8);
        horizontalBombGraphics.lineStyle(4, 0xff00ff);
        horizontalBombGraphics.strokeRoundedRect(4, 4, gemSize-8, gemSize-8, 8);
        horizontalBombGraphics.fillStyle(0xff00ff);
        horizontalBombGraphics.fillRect(8, gemSize/2-4, gemSize-16, 8);
        horizontalBombGraphics.generateTexture('gem8', gemSize, gemSize);
        horizontalBombGraphics.destroy();
    }

    create() {
        this.cameras.main.setBackgroundColor('#ffffff');
        this.createUI();
        
        // Проверяем, есть ли миссия
        if (this.scene.settings.data.mission) {
            this.startMission(this.scene.settings.data.mission);
        } else if (this.scene.settings.data.savedState) {
            this.loadSavedState(this.scene.settings.data.savedState);
        } else {
            this.startNewGame();
        }

        // Создаем графику для отрисовки сетки
        this.gridGraphics = this.add.graphics();
        this.gridGraphics.setDepth(100); // Поверх всех гемов
        this.gridTexts = []; // Массив для хранения текстов
        this.showGrid = false; // Инициализируем флаг видимости сетки
        this.updateGridOverlay();
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
        
        // Кнопки навигации вверху
        this.createNavigationButtons(uiX, uiY - 40);
        
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

        // Отображение текущих настроек
        this.settingsText = this.add.text(uiX, uiY + 450, '', {
            fontSize: '10px',
            fill: '#666',
            wordWrap: { width: 140 }
        });
        this.updateSettingsDisplay();
    }

    createNavigationButtons(x, y) {
        console.log('Creating navigation buttons at', x, y);
        
        // Кнопка возврата к замку
        const backButton = this.add.rectangle(x, y, 100, 30, 0x4CAF50)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                if (this.missionData) {
                    // Если мы на миссии с карты, возвращаемся на карту
                    this.scene.start('MapScene');
                } else {
                    // Иначе возвращаемся в меню
                    this.scene.start('MenuScene');
                }
            })
            .on('pointerover', () => backButton.setFillStyle(0x66BB6A))
            .on('pointerout', () => backButton.setFillStyle(0x4CAF50));
            
        this.add.text(x, y, 'Назад', { 
            fontSize: '14px', 
            fill: '#ffffff' 
        }).setOrigin(0.5);

        // Кнопка Админ
        const adminButton = this.add.rectangle(x, y + 40, 100, 30, 0x4CAF50)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.scene.launch('AdminPanelScene');
            })
            .on('pointerover', () => adminButton.setFillStyle(0x66BB6A))
            .on('pointerout', () => adminButton.setFillStyle(0x4CAF50));
            
        this.add.text(x, y + 40, 'Админ', { 
            fontSize: '14px', 
            fill: '#ffffff' 
        }).setOrigin(0.5);

        // Кнопка отображения сетки
        const toggleGridButton = this.add.rectangle(x, y + 80, 100, 30, 0x4CAF50)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                console.log('Toggle grid button clicked, current state:', this.showGrid);
                this.showGrid = !this.showGrid;
                console.log('New grid state:', this.showGrid);
                toggleGridButtonText.setText(this.showGrid ? 'Скрыть сетку' : 'Показать сетку');
                this.updateGridOverlay();
            })
            .on('pointerover', () => toggleGridButton.setFillStyle(0x66BB6A))
            .on('pointerout', () => toggleGridButton.setFillStyle(0x4CAF50));
            
        const toggleGridButtonText = this.add.text(x, y + 80, 'Показать сетку', { 
            fontSize: '14px', 
            fill: '#ffffff' 
        }).setOrigin(0.5);

        // Кнопка отмены хода
        const undoButton = this.add.rectangle(x, y + 120, 100, 30, 0x4CAF50)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                console.log('Undo button clicked');
                this.undoLastMove();
            })
            .on('pointerover', () => undoButton.setFillStyle(0x66BB6A))
            .on('pointerout', () => undoButton.setFillStyle(0x4CAF50));
            
        this.add.text(x, y + 120, 'Отменить ход', { 
            fontSize: '14px', 
            fill: '#ffffff' 
        }).setOrigin(0.5);
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

    startNewGame() {
        this.actionLog = [];
        this.selectedElement = null;
        this.isReplaying = false;
        this.replayIndex = 0;
        this.movesLeft = MAX_MOVES;
        this.gameOver = false;
        this.collectedGems = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        this.randomCallCounter = 0;
        this.clearAllOverlays();
        this.hideGameOverWindow();
        this.hideWinWindow();
        this.input.off('pointerdown', this.handleInput, this);
        this.gameLogic.setSeed(this.currentSeed);
        console.log(`Сид установлен: ${this.currentSeed}, модификатор: тип ${this.gemModifier.targetGemType} x${this.gemModifier.multiplier}`);

        // --- Используем миссию, если она есть ---
        if (this.missionData) {
            const mission = this.missionData.zoneData.missions[this.missionData.currentLevel];
            this.objective = {
                gemType: mission.gemType,
                amount: mission.amount,
                description: `Собрать ${mission.amount} ${this.getGemColorName(mission.gemType)} камней`
            };
            this.movesLeft = mission.moves;
        } else {
            this.generateObjective();
        }

        this.grid = this.createInitialGridDeterministic();
        this.renderGrid();
        this.input.on('pointerdown', this.handleInput, this);
        this.updateMovesDisplay();
        this.updateObjectiveDisplay();
        this.updateProgressDisplay();
        this.updateSettingsDisplay();
        this.updateStatus(`Игра начата. Сид: ${this.currentSeed}, Random calls: ${this.randomCallCounter}`);
        this.updateActionLog();
    }

    generateObjective() {
        const gemNames = ['красных', 'синих', 'зеленых', 'желтых', 'фиолетовых'];
        
        // ДЕТЕРМИНИРОВАННЫЙ порядок вызовов
        const targetGemType = this.getRandomTracked(1, ELEMENT_TYPES, 'objective-type');
        const targetAmount = this.getRandomTracked(15, 25, 'objective-amount');
        
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

    // Обновляем логирование для включения состояния генератора
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
            gemModifier: this.gemModifier,
            randomCallCounter: this.randomCallCounter // Добавляем счетчик вызовов
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

    generateGemWithModifier(context = 'unknown') {
        const rand = this.getRandomTracked(1, 10000, `gem-${context}`) / 10000;
        const baseProb = 1 / ELEMENT_TYPES;
        const targetProb = Math.min(baseProb * this.gemModifier.multiplier, 0.95);
        const totalTargetProb = targetProb;
        const remainingProb = 1 - totalTargetProb;
        const otherProb = remainingProb / (ELEMENT_TYPES - 1);
        
        let cumulative = 0;
        for (let gemType = 1; gemType <= ELEMENT_TYPES; gemType++) {
            const prob = (gemType === this.gemModifier.targetGemType) ? targetProb : otherProb;
            cumulative += prob;
            
            if (rand <= cumulative) {
                return gemType;
            }
        }
        
        return 1;
    }

    getRandomTracked(min, max, context = 'unknown') {
        this.randomCallCounter++;
        const result = this.gameLogic.getRandom(min, max);
        console.log(`Random call #${this.randomCallCounter} [${context}]: ${result} (${min}-${max})`);
        return result;
    }

    createGridSubArea() {
        this.gridSubArea = [];
        this.gridSubAreaSprites = [];
        for (let y = 0; y < GRID_HEIGHT; y++) {
            const row = [];
            for (let x = 0; x < GRID_WIDTH; x++) {
                if (x >= 1 && x < GRID_WIDTH - 1 && y >= 1 && y < GRID_HEIGHT - 1) {
                    row.push(1);
                } else {
                    row.push(0);
                }
            }
            this.gridSubArea.push(row);
        }
        this.gridSubAreaSprites = [];
        for (let y = 0; y < GRID_HEIGHT; y++) {
            const row = [];
            for (let x = 0; x < GRID_WIDTH; x++) {
                row.push(null);
            }
            this.gridSubAreaSprites.push(row);
        }
    }

    updateGridSubArea(x, y) {
        this.gridSubArea[y][x] = 0;

    }

    createInitialGridDeterministic() {
        let grid;
        let attempts = 0;
        const maxAttempts = 100;
        
        do {
            grid = [];
            for (let y = 0; y < GRID_HEIGHT; y++) {
                const row = [];
                for (let x = 0; x < GRID_WIDTH; x++) {
                    // Генерируем только обычные гемы (типы 1-5)
                    row.push(this.getRandomTracked(1, 5, `initial-${y}-${x}`));
                }
                grid.push(row);
            }
            attempts++;
            
            const matches = this.gameLogic.detectMatches(grid);
            if (matches.length === 0) break;
            
        } while (attempts < maxAttempts);
        
        if (attempts >= maxAttempts) {
            console.warn('Не удалось создать сетку без начальных матчей за 100 попыток');
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
                sprite.setInteractive({ useHandCursor: true });
                sprite.setDepth(1);
                sprite.gridX = x;
                sprite.gridY = y;
                
                // Обработка клика по активным гемам
                if (gemType === 6) {
                    sprite.on('pointerdown', () => {
                        this.explodeBomb(x, y);
                    });
                } else if (gemType === VERTICAL_BOMB) {
                    sprite.on('pointerdown', () => {
                        this.activateVerticalBomb(x, y);
                    });
                } else if (gemType === HORIZONTAL_BOMB) {
                    sprite.on('pointerdown', () => {
                        this.activateHorizontalBomb(x, y);
                    });
                }
                
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
        this.grid = this.createInitialGridDeterministic();
    }

    // Обновляем обработчик ввода для блокировки во время анимации
    handleInput(pointer) {
        console.log('handleInput вызван, gameOver:', this.gameOver, 'isReplaying:', this.isReplaying, 'isAnimating:', this.isAnimating);
        
        if (this.isReplaying || this.gameOver || this.isAnimating || this.isProcessing) {
            console.log('Ввод заблокирован');
            return;
        }

        const x = Math.floor(pointer.x / (elementWidth + elementSpacing));
        const y = Math.floor(pointer.y / (elementHeight + elementSpacing));

        console.log('Клик по координатам:', x, y);

        // Проверяем, что координаты в пределах сетки
        if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
            return;
        }

        // Проверяем, не кликнули ли по специальному гему
        const gemType = this.grid[y][x];
        if (gemType === 6) {
            this.explodeBomb(x, y);
            return;
        } else if (gemType === VERTICAL_BOMB) {
            this.activateVerticalBomb(x, y);
            return;
        } else if (gemType === HORIZONTAL_BOMB) {
            this.activateHorizontalBomb(x, y);
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
        const matches = this.gameLogic.detectMatches(this.grid);
        
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
        this.gameOverElements = [];
        this.gameOverOverlay = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000,
            0.7
        ).setDepth(100);
        this.gameOverElements.push(this.gameOverOverlay);
        this.gameOverWindow = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            400,
            250,
            0xffffff
        ).setStrokeStyle(3, 0xff0000).setDepth(101);
        this.gameOverElements.push(this.gameOverWindow);
        const titleText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 80,
            this.missionData ? 'Миссия провалена' : 'ПОРАЖЕНИЕ',
            {
                fontSize: '24px',
                fill: '#ff0000',
                fontWeight: 'bold'
            }
        ).setOrigin(0.5).setDepth(102);
        this.gameOverElements.push(titleText);
        const current = this.collectedGems[this.objective.gemType] || 0;
        const resultText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 20,
            this.missionData
                ? `Вы не справились с заданием миссии!\n${this.objective.description}\nСобрано: ${current}/${this.objective.amount}`
                : `Ходы закончились!\n${this.objective.description}\nСобрано: ${current}/${this.objective.amount}\nНе хватило: ${this.objective.amount - current}`,
            {
                fontSize: '16px',
                fill: '#000000',
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(102);
        this.gameOverElements.push(resultText);
        // Кнопка "Вернуться в замок"
        const backButton = this.add.rectangle(
            this.cameras.main.centerX - 80,
            this.cameras.main.centerY + 60,
            150,
            40,
            0x2196F3
        ).setStrokeStyle(2, 0x1565C0)
        .setInteractive()
        .setDepth(102)
        .on('pointerdown', () => {
            this.scene.start('MapScene');
        })
        .on('pointerover', () => backButton.setFillStyle(0x42A5F5))
        .on('pointerout', () => backButton.setFillStyle(0x2196F3));
        this.gameOverElements.push(backButton);
        // Кнопка "Попробовать снова" (повторить миссию)
        if (this.missionData) {
            const retryButton = this.add.rectangle(
                this.cameras.main.centerX + 80,
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
            .on('pointerover', () => retryButton.setFillStyle(0x66BB6A))
            .on('pointerout', () => retryButton.setFillStyle(0x4CAF50));
            this.gameOverElements.push(retryButton);
            this.add.text(
                this.cameras.main.centerX + 80,
                this.cameras.main.centerY + 60,
                'Попробовать снова',
                {
                    fontSize: '16px',
                    fill: '#ffffff',
                    fontWeight: 'bold'
                }
            ).setOrigin(0.5).setDepth(103);
        }
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

    // Обновляем swapElements для использования анимации
    async swapElements(from, to, shouldLog = true) {
        console.log(`Обмен: (${from.x},${from.y}) <-> (${to.x},${to.y}), Random calls before: ${this.randomCallCounter}`);
        this.saveState();
        
        this.isAnimating = true;
        
        // Анимация обмена элементов
        await this.animateSwap(from, to);
        
        // Выполняем логический обмен
        const temp = this.grid[from.y][from.x];
        this.grid[from.y][from.x] = this.grid[to.y][to.x];
        this.grid[to.y][to.x] = temp;

        this.updateGridOverlay();

        // Обрабатываем матчи с анимацией
        await this.processMatchesAnimated();
        
        //this.rerenderGrid();
        this.isAnimating = false;
        
        console.log(`Обмен завершен, Random calls after: ${this.randomCallCounter}`);
    }

    rerenderGrid() {
        console.log('Rerendering grid');

        // Создаем новые спрайты
        this.grid.forEach((row, y) => {
            row.forEach((gemType, x) => {
                if (gemType > 0) {
                    this.sprites[y][x].destroy();
                    const sprite = this.createSprite(gemType, y, x, false);
                    this.sprites[y][x] = sprite;
                } else {
                    this.sprites[y][x].destroy();
                    this.sprites[y][x] = null;
                }
            });
        });

        // Обновляем отображение сетки
        this.updateGridOverlay();
    }

    // Анимация обмена двух элементов
    async animateSwap(from, to) {
        const sprite1 = this.sprites[from.y][from.x];
        const sprite2 = this.sprites[to.y][to.x];
        
        if (!sprite1 || !sprite2) return;
        
        // Получаем текущие и целевые позиции
        const sprite1StartX = sprite1.x;
        const sprite1StartY = sprite1.y;
        const sprite2StartX = sprite2.x;
        const sprite2StartY = sprite2.y;
        
        return new Promise(resolve => {
            // Создаем анимации обмена
            this.tweens.add({
                targets: sprite1,
                x: sprite2StartX,
                y: sprite2StartY,
                duration: 200,
                ease: 'Power2'
            });
            
            this.tweens.add({
                targets: sprite2,
                x: sprite1StartX,
                y: sprite1StartY,
                duration: 200,
                ease: 'Power2',
                onComplete: () => {
                    // Обновляем позиции в массиве спрайтов
                    sprite2.gridX = from.x;
                    sprite2.gridY = from.y;
                    sprite1.gridX = to.x;
                    sprite1.gridY = to.y;
                    this.sprites[from.y][from.x] = sprite2;
                    this.sprites[to.y][to.x] = sprite1;
                    resolve();
                }
            });
        });
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

    // Детерминированное заполнение пустых мест
    customSpawnNewElements(grid, cascadeNumber = 0) {
        const rows = grid.length;
        const cols = grid[0].length;
        let spawnCount = 0;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (grid[row][col] === 0) {
                    // Генерируем только обычные гемы (типы 1-5)
                    grid[row][col] = this.getRandomTracked(1, 5, `spawn-c${cascadeNumber}-${row}-${col}`);
                    spawnCount++;
                }
            }
        }
        
        console.log(`Заспавнено ${spawnCount} гемов в каскаде ${cascadeNumber}`);
    }

    // Детерминированная обработка матчей с анимацией
    async processMatchesAnimated() {
        let foundMatches = true;
        let cascadeCount = 0;
        let totalCollected = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let bombToActivate = [];
        while (foundMatches && cascadeCount < 20) {
            const matches = this.detectMatchesDeterministic(this.grid);
            // --- Сохраняем позиции для спец-гемов (матчи из 4 и 5) ---
            const bombPositions = [];
            const bombMatches = [];
            const verticalBombPositions = [];
            const horizontalBombPositions = [];

            matches.forEach(match => {
                if (Array.isArray(match)) {
                    if (match.length === 5) {
                        const {x, y} = match[0];
                        bombPositions.push({x, y});
                        bombMatches.push(match);
                    } else if (match.length === 4) {
                        // Проверяем, вертикальный или горизонтальный матч
                        const isVertical = match.every((pos, idx, arr) => 
                            idx === 0 || pos.x === arr[0].x
                        );
                        const isHorizontal = match.every((pos, idx, arr) => 
                            idx === 0 || pos.y === arr[0].y
                        );
                        
                        if (isVertical) {
                            const {x, y} = match[0];
                            verticalBombPositions.push({x, y});
                        } else if (isHorizontal) {
                            const {x, y} = match[0];
                            horizontalBombPositions.push({x, y});
                        }
                    }
                }
            });

            if (matches && matches.length > 0) {
                console.log(`Каскад #${cascadeCount + 1}: найдено ${matches.length} матчей`);
                this.sound.play('match', { volume: 0.5 });

                // Подсчитываем собранные камни
                matches.forEach((match, matchIndex) => {
                    if (Array.isArray(match)) {
                        match.forEach(({ x, y }) => {
                            if (y >= 0 && y < this.grid.length && x >= 0 && x < this.grid[0].length) {
                                const gemType = this.grid[y][x];
                                if (gemType >= 1 && gemType <= 5) {
                                    totalCollected[gemType]++;
                                }
                            }
                        });
                    }
                });

                // Обычная анимация для остальных матчей
                const otherMatches = matches.filter(m => !bombMatches.includes(m) && (!Array.isArray(m) || m.length !== 4 || m.length !== 5));
                if (otherMatches.length > 0) {
                    // Фильтруем только актуальные матчи
                    const validMatches = otherMatches.filter(match => this.isMatchStillValid(match));
                    if (validMatches.length > 0) {
                        await this.animateMatches(validMatches);
                    }
                }

                // --- Кастомная анимация для матчей из 5 ---
                for (const match of bombMatches) {
                    await this.animateBombCreation(match);
                    this.grid[match[0].y][match[0].x] = BOMB;
                }

                // Анимация для матчей из 4
                for (const match of matches.filter(m => Array.isArray(m) && m.length === 4)) {
                    const isVertical = match.every((pos, idx, arr) => idx === 0 || pos.x === arr[0].x);
                    if (isVertical) {
                        await this.animateVerticalBombCreation(match);
                        this.grid[match[0].y][match[0].x] = VERTICAL_BOMB;
                    } else {
                        await this.animateHorizontalBombCreation(match);
                        this.grid[match[0].y][match[0].x] = HORIZONTAL_BOMB;
                    }
                }

                // Проверяем, есть ли активные гемы рядом с матчами (автоактивация)
                matches.forEach(match => {
                    if (Array.isArray(match)) {
                        match.forEach(({x, y}) => {
                            // Проверяем, что в этой позиции есть обычный гем (1-5) и его спрайт видим
                            if (this.grid[y][x] >= 1 && this.grid[y][x] <= 5 && 
                                this.sprites[y][x] && this.sprites[y][x].visible) {
                                this.getNeighbors(x, y).forEach(({nx, ny}) => {
                                    if (this.grid[ny] && this.grid[ny][nx] === 6 && 
                                        this.sprites[ny][nx] && this.sprites[ny][nx].visible) {
                                        bombToActivate.push({x: nx, y: ny});
                                    }
                                });
                            }
                        });
                    }
                });

                bombToActivate = bombToActivate.filter((pos, idx, arr) => arr.findIndex(p => p.x === pos.x && p.y === pos.y) === idx);
                if (bombToActivate.length > 0) {
                    console.log('bombToActivate', bombToActivate);
                    for (const bomb of bombToActivate) {
                        await this.explodeBomb(bomb.x, bomb.y);
                    }
                    bombToActivate = [];
                }

                //debugger;
                await this.animateGravity();
                this.gameLogic.applyGravity(this.grid);
                this.rerenderGrid();
                this.customSpawnNewElements(this.grid, cascadeCount);
                await this.animateNewElements();

                // Проверяем новые матчи после создания бомб и применения гравитации
                const newMatches = this.detectMatchesDeterministic(this.grid);
                if (newMatches && newMatches.length > 0) {
                    console.log(`Найдены новые матчи после создания бомб: ${newMatches.length}`);
                    continue; // Продолжаем цикл с новыми матчами
                }

                cascadeCount++;
                await this.delay(300);
            } else {
                foundMatches = false;
            }
        }
        Object.keys(totalCollected).forEach(gemType => {
            if (totalCollected[gemType] > 0) {
                this.collectedGems[gemType] = (this.collectedGems[gemType] || 0) + totalCollected[gemType];
            }
        });
        this.updateProgressDisplay();
        this.checkWinCondition();
        console.log(`Обработано каскадов: ${cascadeCount}, Random calls: ${this.randomCallCounter}`);
    }

    // Проверяет, что матч все еще актуален (все гемы на месте и того же типа)
    isMatchStillValid(match) {
        if (!Array.isArray(match) || match.length === 0) return false;
        
        const firstGemType = this.grid[match[0].y][match[0].x];
        if (firstGemType === 0) return false; // Если первый гем уже удален, матч неактуален
        
        return match.every(({x, y}) => {
            // Проверяем, что гем существует и того же типа
            return this.grid[y] && 
                   this.grid[y][x] === firstGemType && 
                   this.sprites[y][x] && 
                   this.sprites[y][x].visible;
        });
    }

    // Анимация найденных матчей
    async animateMatches(matches) {
        const matchSprites = [];
        
        // Собираем все спрайты матчей
        matches.forEach(match => {
            if (Array.isArray(match)) {
                match.forEach(({ x, y }) => {
                    if (this.sprites[y] && this.sprites[y][x]) {
                        matchSprites.push(this.sprites[y][x]);
                    }
                });
            }
        });
        
        return new Promise(resolve => {
            // Первая фаза: подсветка матчей
            matchSprites.forEach(sprite => {
                sprite.setTint(0xffffff); // белая подсветка
                
                // Пульсирующая анимация
                this.tweens.add({
                    targets: sprite,
                    scaleX: 1.3,
                    scaleY: 1.3,
                    duration: 150,
                    yoyo: true,
                    repeat: 2,
                    ease: 'Power2'
                });
                
                // Эффект свечения
                this.tweens.add({
                    targets: sprite,
                    alpha: 0.7,
                    duration: 100,
                    yoyo: true,
                    repeat: 4,
                    ease: 'Power2'
                });
            });
            
            // Вторая фаза: исчезновение
            setTimeout(() => {
                matchSprites.forEach((sprite, index) => {
                    this.tweens.add({
                        targets: sprite,
                        scaleX: 0,
                        scaleY: 0,
                        alpha: 0,
                        angle: 360,
                        duration: 300,
                        delay: index * 50, // небольшая задержка между элементами
                        ease: 'Back.easeIn',
                        onComplete: () => {
                            const gridX = sprite.gridX;
                            const gridY = sprite.gridY;
                            this.grid[gridY][gridX] = 0;
                            sprite.setVisible(false);
                            sprite.destroy();
                            sprite = null;
                            if (index === matchSprites.length - 1) {
                                resolve(); // завершаем когда последний элемент исчез
                            }
                        }
                    });
                    
                    // Добавляем эффект частиц (звездочки)
                    this.createMatchParticles(sprite.x, sprite.y);
                });
            }, 600); // ждем завершения пульсации
        });
    }

    // Создание эффекта частиц при исчезновении матча
    createMatchParticles(x, y) {
        const particleCount = 8;
        const colors = [0xffff00, 0xff8800, 0xff0088, 0x88ff00, 0x0088ff];
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.add.circle(x, y, 3, colors[Math.floor(Math.random() * colors.length)]);
            particle.setDepth(50);
            
            const angle = (i / particleCount) * Math.PI * 2;
            const distance = 30 + Math.random() * 20;
            const targetX = x + Math.cos(angle) * distance;
            const targetY = y + Math.sin(angle) * distance;
            
            this.tweens.add({
                targets: particle,
                x: targetX,
                y: targetY,
                alpha: 0,
                scaleX: 0.1,
                scaleY: 0.1,
                duration: 400,
                ease: 'Power2',
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
    }

    // Анимация падения элементов
    async animateGravity() {
        const animationPromises = [];
        
        for (let col = 0; col < GRID_WIDTH; col++) {
            // Считаем сколько пустых мест в каждой колонке
            let emptySpaces = 0;
            
            for (let row = GRID_HEIGHT - 1; row >= 0; row--) {
                if (this.grid[row][col] === 0) {
                    emptySpaces++;
                } else if (emptySpaces > 0) {
                    // Элемент должен упасть
                    const sprite = this.sprites[row][col];
                    if (sprite && sprite.visible) {
                        const newRow = row + emptySpaces;
                        const newY = newRow * (elementHeight + elementSpacing) + elementHeight / 2;
                        
                        // Создаем анимацию падения
                        const promise = new Promise(resolve => {
                            this.tweens.add({
                                targets: sprite,
                                y: newY,
                                duration: 200 + emptySpaces * 50, // больше расстояние = дольше падение
                                ease: 'Bounce.easeOut',
                                onComplete: () => {
                                    // Обновляем координаты в спрайте
                                    sprite.gridY = newRow;
                                    resolve();
                                }
                            });
                        });

                        // Обновляем позицию в массиве спрайтов и в сетке
                        this.sprites[newRow][col] = sprite;
                        this.grid[newRow][col] = this.grid[row][col];
                        this.grid[row][col] = 0;
                        
                        animationPromises.push(promise);
                    }
                }
            }
        }
        
        await Promise.all(animationPromises);
    }

    // Анимация появления новых элементов
    async animateNewElements() {
        const newSprites = [];
        
        // Находим новые элементы и создаем для них спрайты
        for (let row = 0; row < GRID_HEIGHT; row++) {
            for (let col = 0; col < GRID_WIDTH; col++) {
                if (!this.sprites[row][col] || !this.sprites[row][col].visible) {
                    const gemType = this.grid[row][col];
                    if (gemType > 0) {
                        // Уничтожаем старый спрайт, если он существует
                        if (this.sprites[row][col]) {
                            this.sprites[row][col].destroy();
                            this.sprites[row][col] = null;
                        }

                        // Создаем новый спрайт
                        const sprite = this.add.image(
                            col * (elementWidth + elementSpacing) + elementWidth / 2,
                            -elementHeight, // начинаем выше экрана
                            `gem${gemType}`
                        );
                        sprite.setDisplaySize(gemSize, gemSize);
                        sprite.setInteractive({ useHandCursor: true });
                        sprite.setDepth(1);
                        sprite.setScale(0); // начинаем с нулевого размера
                        sprite.setAlpha(0); // и прозрачности
                        sprite.gridX = col;
                        sprite.gridY = row;
                        // --- ДОБАВЛЯЕМ: обработка клика по активному гемy ---
                        if (gemType === 6) {
                            sprite.on('pointerdown', () => {
                                this.explodeBomb(col, row);
                            });
                        }
                        this.sprites[row][col] = sprite;
                        newSprites.push({ sprite, targetY: row * (elementHeight + elementSpacing) + elementHeight / 2 });
                    }
                }
            }
        }
        
        // Анимируем появление новых элементов
        const animationPromises = newSprites.map(({ sprite, targetY }, index) => {
            return new Promise(resolve => {
                // Сначала элемент падает сверху
                this.tweens.add({
                    targets: sprite,
                    y: targetY,
                    duration: 300,
                    delay: index * 30, // небольшая задержка между элементами
                    ease: 'Bounce.easeOut'
                });
                
                // Одновременно появляется и увеличивается
                this.tweens.add({
                    targets: sprite,
                    scaleX: 1,
                    scaleY: 1,
                    alpha: 1,
                    duration: 200,
                    delay: index * 30,
                    ease: 'Back.easeOut',
                    onComplete: resolve
                });
            });
        });
        
        await Promise.all(animationPromises);
    }

    // Синхронная версия processMatches для неанимированных случаев
    processMatches() {
        let foundMatches = true;
        let cascadeCount = 0;
        let totalCollected = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        
        while (foundMatches && cascadeCount < 20) {
            const matches = this.detectMatchesDeterministic(this.grid);
            
            if (matches && matches.length > 0) {
                console.log(`Каскад #${cascadeCount + 1}: найдено ${matches.length} матчей`);
                
                // Подсчитываем собранные камни
                matches.forEach((match, matchIndex) => {
                    if (Array.isArray(match)) {
                        match.forEach(({ x, y }) => {
                            if (y >= 0 && y < this.grid.length && x >= 0 && x < this.grid[0].length) {
                                const gemType = this.grid[y][x];
                                if (gemType >= 1 && gemType <= 5) {
                                    totalCollected[gemType]++;
                                }
                            }
                        });
                    }
                });
                
                this.gameLogic.removeMatches(this.grid, matches);
                this.gameLogic.applyGravity(this.grid);
                this.rerenderGrid();
                this.customSpawnNewElements(this.grid, cascadeCount);
                
                cascadeCount++;
            } else {
                foundMatches = false;
            }
        }
        
        // Обновляем счетчики
        Object.keys(totalCollected).forEach(gemType => {
            if (totalCollected[gemType] > 0) {
                this.collectedGems[gemType] = (this.collectedGems[gemType] || 0) + totalCollected[gemType];
            }
        });
        
        this.updateProgressDisplay();
        this.checkWinCondition();
        
        console.log(`Обработано каскадов: ${cascadeCount}, Random calls: ${this.randomCallCounter}`);
    }

    // Детерминированная детекция матчей (сортируем результат)
    detectMatchesDeterministic(grid) {
        const matches = this.gameLogic.detectMatches(grid);
        
        // Сортируем матчи для детерминированности
        if (matches && matches.length > 0) {
            matches.forEach(match => {
                if (Array.isArray(match)) {
                    match.sort((a, b) => {
                        if (a.y !== b.y) return a.y - b.y;
                        return a.x - b.x;
                    });
                }
            });
            
            matches.sort((a, b) => {
                if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) return 0;
                if (a[0].y !== b[0].y) return a[0].y - b[0].y;
                return a[0].x - b[0].x;
            });
        }
        
        return matches;
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
        this.winElements = [];
        const winOverlay = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000,
            0.7
        ).setDepth(100);
        this.winElements.push(winOverlay);
        const winWindow = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            400,
            250,
            0xffffff
        ).setStrokeStyle(3, 0x00aa00).setDepth(101);
        this.winElements.push(winWindow);
        const titleText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 80,
            this.missionData ? 'Миссия выполнена!' : 'ПОБЕДА!',
            {
                fontSize: '32px',
                fill: '#00aa00',
                fontWeight: 'bold'
            }
        ).setOrigin(0.5).setDepth(102);
        this.winElements.push(titleText);
        const current = this.collectedGems[this.objective.gemType] || 0;
        const usedMoves = MAX_MOVES - this.movesLeft;
        const reward = this.missionData ? 10 * (this.missionData.currentLevel + 1) : 0;
        const resultText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 30,
            this.missionData
                ? `Задание выполнено!\n${this.objective.description}\nСобрано: ${current}\nНаграда: +${reward} ресурсов`
                : `Задание выполнено!\n${this.objective.description}\nСобрано: ${current}\nИспользовано ходов: ${usedMoves}`,
            {
                fontSize: '16px',
                fill: '#000000',
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(102);
        this.winElements.push(resultText);
        // Кнопка "В замок" (зачислить награду, повысить уровень, сохранить)
        if (this.missionData) {
            const backButton = this.add.rectangle(
                this.cameras.main.centerX,
                this.cameras.main.centerY + 60,
                200,
                40,
                0x2196F3
            ).setStrokeStyle(2, 0x1565C0)
            .setInteractive()
            .setDepth(102)
            .on('pointerdown', () => {
                // Зачисляем ресурсы и повышаем уровень зоны
                const mapScene = this.scene.get('MapScene');
                if (mapScene) {
                    mapScene.updateZoneLevel(
                        this.missionData.zoneId,
                        this.missionData.zoneData,
                        this.missionData.currentLevel,
                        true,
                        reward,
                        this.missionData.isResourceMission
                    );
                }
                this.saveGameState();
                this.scene.start('MapScene');
            })
            .on('pointerover', () => backButton.setFillStyle(0x42A5F5))
            .on('pointerout', () => backButton.setFillStyle(0x2196F3));
            this.winElements.push(backButton);
            this.add.text(
                this.cameras.main.centerX,
                this.cameras.main.centerY + 60,
                'В замок',
                {
                    fontSize: '16px',
                    fill: '#ffffff',
                    fontWeight: 'bold'
                }
            ).setOrigin(0.5).setDepth(103);
        } else {
            // Обычная победа
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
            .on('pointerover', () => newGameButton.setFillStyle(0x66BB6A))
            .on('pointerout', () => newGameButton.setFillStyle(0x4CAF50));
            this.winElements.push(newGameButton);
            this.add.text(
                this.cameras.main.centerX,
                this.cameras.main.centerY + 60,
                'Новая игра',
                {
                    fontSize: '16px',
                    fill: '#ffffff',
                    fontWeight: 'bold'
                }
            ).setOrigin(0.5).setDepth(103);
        }
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

    loadSavedState(state) {
        // Восстанавливаем состояние игры
        this.grid = state.grid;
        this.movesLeft = state.movesLeft;
        this.gameOver = state.gameOver;
        this.collectedGems = state.collectedGems;
        this.objective = state.objective;
        this.currentSeed = state.seed;
        this.gemModifier = state.gemModifier;
        this.randomCallCounter = state.randomCallCounter;
        this.actionLog = state.actionLog;
        
        // Обновляем UI
        this.renderGrid();
        this.updateMovesDisplay();
        this.updateObjectiveDisplay();
        this.updateProgressDisplay();
        this.updateStatus('Игра загружена');
        this.updateActionLog();
    }

    // Добавляем метод сохранения состояния
    saveGameState() {
        const state = {
            grid: this.grid,
            movesLeft: this.movesLeft,
            gameOver: this.gameOver,
            collectedGems: this.collectedGems,
            objective: this.objective,
            seed: this.currentSeed,
            gemModifier: this.gemModifier,
            randomCallCounter: this.randomCallCounter,
            actionLog: this.actionLog
        };
        
        localStorage.setItem('match3-save', JSON.stringify(state));
        this.updateStatus('Игра сохранена');
    }

    shutdown() {
        // Очищаем все тексты сетки
        if (this.gridTexts) {
            this.gridTexts.forEach(text => text.destroy());
        }
        this.gridTexts = [];

        // Очищаем графику сетки
        if (this.gridGraphics) {
            this.gridGraphics.clear();
            this.gridGraphics.destroy();
        }

        // Очищаем все спрайты
        if (this.sprites) {
            this.sprites.forEach(row => {
                row.forEach(sprite => {
                    if (sprite) {
                        sprite.destroy();
                    }
                });
            });
        }
        this.sprites = [];
    }

    startMission(data) {
        this.missionData = {
            zoneId: data.zoneId,
            zoneData: data.zoneData,
            currentLevel: data.currentLevel,
            isResourceMission: data.isResourceMission
        };

        // Корректно выбираем миссию для обычной и ресурсной
        const mission = data.isResourceMission
            ? data.zoneData.missions[0]
            : data.zoneData.missions[data.currentLevel];

        // Устанавливаем параметры миссии
        this.objective = {
            type: mission.type,
            amount: mission.amount,
            gemType: mission.gemType
        };

        this.currentSeed = mission.seed;
        this.movesLeft = mission.moves;

        // Инициализируем игру
        this.startNewGame();
    }

    getGemColorName(gemType) {
        const colors = ['красных', 'синих', 'зеленых', 'желтых', 'фиолетовых'];
        return colors[gemType - 1] || 'неизвестных';
    }

    updateSettingsDisplay() {
        if (this.settingsText) {
            const missionInfo = this.missionData ? 
                `\nМиссия: ${this.missionData.zoneId} (уровень ${this.missionData.currentLevel})` : '';
            
            this.settingsText.setText(
                `Настройки:\n` +
                `Seed: ${this.currentSeed}\n` +
                `Модификатор: тип ${this.gemModifier.targetGemType} x${this.gemModifier.multiplier}` +
                missionInfo
            );
        }
    }

    // Вспомогательная функция: соседи клетки
    getNeighbors(x, y) {
        const dirs = [
            {dx: -1, dy: 0}, {dx: 1, dy: 0},
            {dx: 0, dy: -1}, {dx: 0, dy: 1},
            {dx: -1, dy: -1}, {dx: 1, dy: -1},
            {dx: -1, dy: 1}, {dx: 1, dy: 1}
        ];
        const res = [];
        for (const d of dirs) {
            const nx = x + d.dx;
            const ny = y + d.dy;
            if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
                res.push({nx, ny});
            }
        }
        return res;
    }
    // Взрыв активного гема: уничтожает все смежные гемы
    async explodeBomb(x, y) {
        if (this.grid[y][x] !== 6) return;
        // Визуальный эффект для самой бомбы
        const animPromises = [];
        if (this.sprites[y][x]) {
            animPromises.push(new Promise(resolve => {
                this.tweens.add({
                    targets: this.sprites[y][x],
                    scaleX: 1.5,
                    scaleY: 1.5,
                    alpha: 0,
                    duration: 250,
                    ease: 'Back.easeIn',
                    onComplete: () => {
                        if (this.sprites[y][x]) this.sprites[y][x].destroy();
                        // Обновляем состояние сетки только после завершения анимации
                        this.grid[y][x] = 0;
                        resolve();
                    }
                });
            }));
        } else {
            this.grid[y][x] = 0;
        }

        // Анимация уничтожения смежных гемов
        for (const {nx, ny} of this.getNeighbors(x, y)) {
            if (this.grid[ny][nx] > 0 && this.grid[ny][nx] <= 5) {
                if (this.sprites[ny][nx]) {
                    animPromises.push(new Promise(resolve => {
                        this.tweens.add({
                            targets: this.sprites[ny][nx],
                            scaleX: 0,
                            scaleY: 0,
                            alpha: 0,
                            duration: 200,
                            ease: 'Back.easeIn',
                            onComplete: () => {
                                if (this.sprites[ny][nx]) this.sprites[ny][nx].destroy();
                                // Обновляем состояние сетки только после завершения анимации
                                this.grid[ny][nx] = 0;
                                resolve();
                            }
                        });
                    }));
                } else {
                    this.grid[ny][nx] = 0;
                }
            } else {
                if (this.grid[ny][nx] === 6) {
                    await this.explodeBomb(nx, ny);
                }
                if (this.grid[ny][nx] === VERTICAL_BOMB) {
                    await this.activateVerticalBomb(nx, ny);
                }
                if (this.grid[ny][nx] === HORIZONTAL_BOMB) {
                    await this.activateHorizontalBomb(nx, ny);
                }
            }
        }
        // Ждём завершения всех анимаций
        await Promise.all(animPromises);
        // После взрыва — применяем гравитацию и спавним новые элементы
        //debugger;
        await this.animateGravity();
        this.gameLogic.applyGravity(this.grid);
        this.rerenderGrid();
        this.customSpawnNewElements(this.grid, 0);
        await this.animateNewElements();
        await this.processMatchesAnimated();
    }

    // Анимация объединения пяти гемов в бомбу
    async animateBombCreation(match) {
        if (!Array.isArray(match) || match.length !== 5) return;
        const target = match[0];
        const sprites = match.map(({x, y}) => this.sprites[y][x]).filter(Boolean);
        const targetSprite = this.sprites[target.y][target.x];
        const targetX = targetSprite ? targetSprite.x : (target.x * (elementWidth + elementSpacing) + elementWidth / 2);
        const targetY = targetSprite ? targetSprite.y : (target.y * (elementHeight + elementSpacing) + elementHeight / 2);

        // Анимируем стягивание всех гемов к первой позиции
        const promises = sprites.map((sprite, idx) => {
            return new Promise(resolve => {
                this.tweens.add({
                    targets: sprite,
                    x: targetX,
                    y: targetY,
                    scaleX: 0.5,
                    scaleY: 0.5,
                    alpha: 0.7,
                    duration: 300 + idx * 50,
                    ease: 'Power2',
                    onComplete: () => {
                        this.tweens.add({
                            targets: sprite,
                            scaleX: 0,
                            scaleY: 0,
                            alpha: 0,
                            duration: 150,
                            ease: 'Back.easeIn',
                            onComplete: () => {
                                sprite.setVisible(false);
                                // Обновляем состояние сетки только после завершения анимации
                                const gridX = sprite.gridX;
                                const gridY = sprite.gridY;
                                this.grid[gridY][gridX] = 0;
                                resolve();
                            }
                        });
                    }
                });
            });
        });
        await Promise.all(promises);
        // Визуальный эффект появления бомбы
        const bomb = this.createSprite(BOMB, target.y, target.x, true);
        await new Promise(resolve => {
            this.tweens.add({
                targets: bomb,
                scaleX: 1,
                scaleY: 1,
                alpha: 1,
                duration: 250,
                ease: 'Back.easeOut',
                onComplete: () => {
                    resolve();
                }
            });
        });
    }

    // Анимация объединения четырех гемов в вертикальную бомбу
    async animateVerticalBombCreation(match) {
        if (!Array.isArray(match) || match.length !== 4) return;
        const target = match[0];
        const sprites = match.map(({x, y}) => this.sprites[y][x]).filter(Boolean);
        const targetSprite = this.sprites[target.y][target.x];
        const targetX = targetSprite ? targetSprite.x : (target.x * (elementWidth + elementSpacing) + elementWidth / 2);
        const targetY = targetSprite ? targetSprite.y : (target.y * (elementHeight + elementSpacing) + elementHeight / 2);
        
        // Анимируем стягивание всех гемов к первой позиции
        const promises = sprites.map((sprite, idx) => {
            return new Promise(resolve => {
                this.tweens.add({
                    targets: sprite,
                    x: targetX,
                    y: targetY,
                    scaleX: 0.5,
                    scaleY: 0.5,
                    alpha: 0.7,
                    duration: 300 + idx * 50,
                    ease: 'Power2',
                    onComplete: () => {
                        this.tweens.add({
                            targets: sprite,
                            scaleX: 0,
                            scaleY: 0,
                            alpha: 0,
                            duration: 150,
                            ease: 'Back.easeIn',
                            onComplete: () => {
                                sprite.setVisible(false);
                                // Обновляем состояние сетки только после завершения анимации
                                const gridX = sprite.gridX;
                                const gridY = sprite.gridY;
                                this.grid[gridY][gridX] = 0;
                                resolve();
                            }
                        });
                    }
                });
            });
        });
        
        await Promise.all(promises);
        
        // Визуальный эффект появления вертикальной бомбы
        const bomb = this.createSprite(VERTICAL_BOMB, target.y, target.x, true);
        
        await new Promise(resolve => {
            this.tweens.add({
                targets: bomb,
                scaleX: 1,
                scaleY: 1,
                alpha: 1,
                duration: 250,
                ease: 'Back.easeOut',
                onComplete: () => {
                    resolve();
                }
            });
        });
    }

    // Анимация объединения четырех гемов в горизонтальную бомбу
    async animateHorizontalBombCreation(match) {
        if (!Array.isArray(match) || match.length !== 4) return;
        const target = match[0];
        const sprites = match.map(({x, y}) => this.sprites[y][x]).filter(Boolean);
        const targetSprite = this.sprites[target.y][target.x];
        const targetX = targetSprite ? targetSprite.x : (target.x * (elementWidth + elementSpacing) + elementWidth / 2);
        const targetY = targetSprite ? targetSprite.y : (target.y * (elementHeight + elementSpacing) + elementHeight / 2);
        
        // Анимируем стягивание всех гемов к первой позиции
        const promises = sprites.map((sprite, idx) => {
            return new Promise(resolve => {
                this.tweens.add({
                    targets: sprite,
                    x: targetX,
                    y: targetY,
                    scaleX: 0.5,
                    scaleY: 0.5,
                    alpha: 0.7,
                    duration: 300 + idx * 50,
                    ease: 'Power2',
                    onComplete: () => {
                        this.tweens.add({
                            targets: sprite,
                            scaleX: 0,
                            scaleY: 0,
                            alpha: 0,
                            duration: 150,
                            ease: 'Back.easeIn',
                            onComplete: () => {
                                sprite.setVisible(false);
                                // Обновляем состояние сетки только после завершения анимации
                                const gridX = sprite.gridX;
                                const gridY = sprite.gridY;
                                this.grid[gridY][gridX] = 0;
                                resolve();
                            }
                        });
                    }
                });
            });
        });
        
        await Promise.all(promises);
        
        // Визуальный эффект появления горизонтальной бомбы
        const bomb = this.createSprite(HORIZONTAL_BOMB, target.y, target.x, true);
        
        await new Promise(resolve => {
            this.tweens.add({
                targets: bomb,
                scaleX: 1,
                scaleY: 1,
                alpha: 1,
                duration: 250,
                ease: 'Back.easeOut',
                onComplete: () => {
                    resolve();
                }
            });
        });
    }

    // Активация вертикальной бомбы
    async activateVerticalBomb(x, y) {
        if (this.grid[y][x] !== VERTICAL_BOMB) return;
        
        // Визуальный эффект для самой бомбы
        const animPromises = [];
        if (this.sprites[y][x]) {
            animPromises.push(new Promise(resolve => {
                this.tweens.add({
                    targets: this.sprites[y][x],
                    scaleX: 1.5,
                    scaleY: 1.5,
                    alpha: 0,
                    duration: 250,
                    ease: 'Back.easeIn',
                    onComplete: () => {
                        if (this.sprites[y][x]) this.sprites[y][x].destroy();
                        resolve();
                    }
                });
            }));
        }
        
        this.grid[y][x] = 0;
        
        // Анимация уничтожения гемов по вертикали
        for (let ny = 0; ny < GRID_HEIGHT; ny++) {
            if (ny !== y && this.grid[ny][x] > 0 && this.grid[ny][x] <= 5) {
                if (this.sprites[ny][x]) {
                    animPromises.push(new Promise(resolve => {
                        this.tweens.add({
                            targets: this.sprites[ny][x],
                            scaleX: 0,
                            scaleY: 0,
                            alpha: 0,
                            duration: 200,
                            ease: 'Back.easeIn',
                            onComplete: () => {
                                if (this.sprites[ny][x]) this.sprites[ny][x].destroy();
                                resolve();
                            }
                        });
                    }));
                }
                this.grid[ny][x] = 0;
            } else {
                if (this.grid[ny][x] === 6) {
                    await this.explodeBomb(x, ny);
                }
                if (this.grid[ny][x] === VERTICAL_BOMB) {
                    await this.activateVerticalBomb(x, ny);
                }
                if (this.grid[ny][x] === HORIZONTAL_BOMB) {
                    await this.activateHorizontalBomb(x, ny);
                }
            }
        }
        
        // Ждём завершения всех анимаций
        await Promise.all(animPromises);
        
        // После взрыва — применяем гравитацию и спавним новые элементы
        await this.animateGravity();
        this.gameLogic.applyGravity(this.grid);
        this.rerenderGrid();
        this.customSpawnNewElements(this.grid, 0);
        await this.animateNewElements();
        await this.processMatchesAnimated();
    }

    // Активация горизонтальной бомбы
    async activateHorizontalBomb(x, y) {
        if (this.grid[y][x] !== HORIZONTAL_BOMB) return;
        
        // Визуальный эффект для самой бомбы
        const animPromises = [];
        if (this.sprites[y][x]) {
            animPromises.push(new Promise(resolve => {
                this.tweens.add({
                    targets: this.sprites[y][x],
                    scaleX: 1.5,
                    scaleY: 1.5,
                    alpha: 0,
                    duration: 250,
                    ease: 'Back.easeIn',
                    onComplete: () => {
                        if (this.sprites[y][x]) this.sprites[y][x].destroy();
                        resolve();
                    }
                });
            }));
        }
        
        this.grid[y][x] = 0;
        
        // Анимация уничтожения гемов по горизонтали
        for (let nx = 0; nx < GRID_WIDTH; nx++) {
            if (nx !== x && this.grid[y][nx] > 0 && this.grid[y][nx] <= 5) {
                if (this.sprites[y][nx]) {
                    animPromises.push(new Promise(resolve => {
                        this.tweens.add({
                            targets: this.sprites[y][nx],
                            scaleX: 0,
                            scaleY: 0,
                            alpha: 0,
                            duration: 200,
                            ease: 'Back.easeIn',
                            onComplete: () => {
                                if (this.sprites[y][nx]) this.sprites[y][nx].destroy();
                                resolve();
                            }
                        });
                    }));
                }
                this.grid[y][nx] = 0;
            } else {
                if (this.grid[y][nx] === 6) {
                    await this.explodeBomb(nx, y);
                }
                if (this.grid[y][nx] === VERTICAL_BOMB) {
                    await this.activateVerticalBomb(nx, y);
                }
                if (this.grid[y][nx] === HORIZONTAL_BOMB) {
                    await this.activateHorizontalBomb(nx, y);
                }
            }
        }
        
        // Ждём завершения всех анимаций
        await Promise.all(animPromises);
        
        // После взрыва — применяем гравитацию и спавним новые элементы
        await this.animateGravity();
        this.gameLogic.applyGravity(this.grid);
        this.rerenderGrid();
        this.customSpawnNewElements(this.grid, 0);
        await this.animateNewElements();
        await this.processMatchesAnimated();
    }

    createSprite(gemType, row, col, invisible = false) {
        // Уничтожаем старый спрайт, если он существует
        if (this.sprites[row][col]) {
            this.sprites[row][col].destroy();
            this.sprites[row][col] = null;
        }

        if (gemType > 0) {
            // Создаем новый спрайт
            const sprite = this.add.image(
                col * (elementWidth + elementSpacing) + elementWidth / 2,
                row * (elementHeight + elementSpacing) + elementHeight / 2,
                `gem${gemType}`
            );
            sprite.setDisplaySize(gemSize, gemSize);
            sprite.setInteractive({ useHandCursor: true });
            sprite.setDepth(1);
            if (invisible) {
                sprite.setScale(0); // начинаем с нулевого размера
                sprite.setAlpha(0); // и прозрачности
            }
            sprite.gridX = col;
            sprite.gridY = row;
            // --- ДОБАВЛЯЕМ: обработка клика по активному гемy ---
            if (gemType === 6) {
                sprite.on('pointerdown', () => {
                    this.explodeBomb(col, row);
                });
            }
            this.sprites[row][col] = sprite;
            return sprite;
        }
        return null;
    }

    // Метод для обновления отображения сетки
    updateGridOverlay() {
        console.log('Updating grid overlay, showGrid:', this.showGrid);
        
        // Очищаем все тексты
        if (this.gridTexts) {
            this.gridTexts.forEach(text => text.destroy());
        }
        this.gridTexts = [];
        
        // Очищаем графику
        this.gridGraphics.clear();
        
        if (!this.showGrid) return;

        // Рисуем сетку
        this.gridGraphics.lineStyle(1, 0xffffff, 0.5);
        
        // Вертикальные линии
        for (let x = 0; x <= this.grid[0].length; x++) {
            const xPos = x * (elementWidth + elementSpacing);
            this.gridGraphics.moveTo(xPos, 0);
            this.gridGraphics.lineTo(xPos, this.grid.length * (elementHeight + elementSpacing));
        }
        
        // Горизонтальные линии
        for (let y = 0; y <= this.grid.length; y++) {
            const yPos = y * (elementHeight + elementSpacing);
            this.gridGraphics.moveTo(0, yPos);
            this.gridGraphics.lineTo(this.grid[0].length * (elementWidth + elementSpacing), yPos);
        }

        // Отображаем типы гемов
        this.grid.forEach((row, y) => {
            row.forEach((gemType, x) => {
                if (gemType > 0) {
                    const xPos = x * (elementWidth + elementSpacing) + elementWidth / 2;
                    const yPos = y * (elementHeight + elementSpacing) + elementHeight / 2;
                    console.log(`Creating text at ${xPos}, ${yPos} for gem type ${gemType}`);
                    const text = this.add.text(
                        xPos,
                        yPos,
                        gemType.toString(),
                        { 
                            fontSize: '16px', 
                            fill: '#ffffff',
                            backgroundColor: '#000000',
                            padding: { x: 2, y: 2 }
                        }
                    ).setOrigin(0.5).setDepth(1000);
                    this.gridTexts.push(text);
                }
            });
        });
    }

    // Сохраняем состояние перед ходом
    saveState() {
        console.log('Saving state before move');
        this.lastState = {
            grid: this.grid.map(row => [...row]),
            sprites: this.sprites.map(row => row.map(sprite => {
                if (!sprite) return null;
                return {
                    x: sprite.x,
                    y: sprite.y,
                    texture: sprite.texture.key,
                    visible: sprite.visible,
                    type: parseInt(sprite.texture.key.replace('gem', ''))
                };
            }))
        };
        console.log('Saved state:', this.lastState);
    }

    // Отменяем последний ход
    undoLastMove() {
        console.log('Attempting to undo last move');
        if (!this.lastState) {
            console.log('No move to undo');
            return;
        }

        console.log('Restoring state:', this.lastState);

        // Восстанавливаем сетку
        this.grid = this.lastState.grid.map(row => [...row]);
        
        // Перерисовываем все спрайты
        this.rerenderGrid();

        this.lastState = null; // Очищаем сохраненное состояние
        console.log('State restored');
    }
}

export default MainScene; 