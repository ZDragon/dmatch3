import Phaser from 'phaser';
import { UIManager } from '../ui/UIManager';
import { GameLogic } from '../core/GameLogic';
import { ReplayManager } from '../core/ReplayManager';

const GRID_WIDTH = 8;
const GRID_HEIGHT = 8;
const ELEMENT_TYPES = 5;
const elementWidth = 64;
const elementHeight = 64;
const elementSpacing = 8;
const gemSize = 56;
const MAX_MOVES = 7;

export class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        
        // Инициализация состояния игры
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
        
        // Кнопка "Новая игра"
        this.uiManager.createButton(uiX, uiY + 160, 100, 25, 'Новая игра', () => {
            this.startNewGame();
        });
        
        // Кнопка админ-панели
        this.uiManager.createButton(uiX, uiY + 195, 100, 25, 'Админ', () => {
            this.scene.launch('AdminPanelScene');
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

        const backText = this.add.text(x, y, '← Назад', {
            fontSize: '14px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Кнопка меню
        const menuButton = this.add.rectangle(x + 110, y, 100, 30, 0x2196F3)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.scene.start('MenuScene');
            })
            .on('pointerover', () => menuButton.setFillStyle(0x42A5F5))
            .on('pointerout', () => menuButton.setFillStyle(0x2196F3));

        const menuText = this.add.text(x + 110, y, 'Меню', {
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
        
        // Принудительно очищаем все overlay элементы СНАЧАЛА
        this.clearAllOverlays();
        this.hideGameOverWindow();
        this.hideWinWindow();
        
        // Удаляем предыдущий обработчик событий
        this.input.off('pointerdown', this.handleInput, this);
        
        // КРИТИЧЕСКИ ВАЖНЫЙ ПОРЯДОК:
        // 1. Устанавливаем сид
        this.gameLogic.setSeed(this.currentSeed);
        console.log(`Сид установлен: ${this.currentSeed}, модификатор: тип ${this.gemModifier.targetGemType} x${this.gemModifier.multiplier}`);
        
        // 2. Генерируем задание (использует getRandom 2 раза)
        this.generateObjective();
        
        // 3. Создаем сетку БЕЗ обработки матчей
        this.grid = this.createInitialGridDeterministic();
        
        // 4. Рендерим сетку
        this.renderGrid();
        
        // Добавляем обработчик событий
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

    createInitialGridDeterministic() {
        let grid;
        let attempts = 0;
        const maxAttempts = 100;
        
        do {
            grid = [];
            for (let y = 0; y < GRID_HEIGHT; y++) {
                const row = [];
                for (let x = 0; x < GRID_WIDTH; x++) {
                    row.push(this.generateGemWithModifier(`initial-${y}-${x}`));
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
        this.grid = this.createInitialGridDeterministic();
    }

    // Обновляем обработчик ввода для блокировки во время анимации
    handleInput(pointer) {
        console.log('handleInput вызван, gameOver:', this.gameOver, 'isReplaying:', this.isReplaying, 'isAnimating:', this.isAnimating);
        
        if (this.isReplaying || this.gameOver || this.isAnimating) {
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

    // Обновляем swapElements для использования анимации
    async swapElements(from, to, shouldLog = true) {
        console.log(`Обмен: (${from.x},${from.y}) <-> (${to.x},${to.y}), Random calls before: ${this.randomCallCounter}`);
        
        this.isAnimating = true;
        
        // Анимация обмена элементов
        await this.animateSwap(from, to);
        
        // Выполняем логический обмен
        const temp = this.grid[from.y][from.x];
        this.grid[from.y][from.x] = this.grid[to.y][to.x];
        this.grid[to.y][to.x] = temp;

        // Обрабатываем матчи с анимацией
        await this.processMatchesAnimated();
        
        this.isAnimating = false;
        
        console.log(`Обмен завершен, Random calls after: ${this.randomCallCounter}`);
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
                    grid[row][col] = this.generateGemWithModifier(`spawn-c${cascadeNumber}-${row}-${col}`);
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
        
        while (foundMatches && cascadeCount < 20) {
            const matches = this.detectMatchesDeterministic(this.grid);
            
            if (matches && matches.length > 0) {
                console.log(`Каскад #${cascadeCount + 1}: найдено ${matches.length} матчей`);
                
                // Воспроизводим звук совпадения
                this.sound.play('match', { volume: 0.5 });
                
                // Анимируем найденные матчи
                await this.animateMatches(matches);
                
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
                
                // Удаляем матчи
                this.gameLogic.removeMatches(this.grid, matches);
                
                // Анимируем падение элементов
                await this.animateGravity();
                
                // Применяем гравитацию
                this.gameLogic.applyGravity(this.grid);
                
                // Заполняем новыми элементами
                this.customSpawnNewElements(this.grid, cascadeCount);
                
                // Анимируем появление новых элементов
                await this.animateNewElements();
                
                cascadeCount++;
                
                // Небольшая пауза между каскадами
                await this.delay(300);
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
                            sprite.setVisible(false);
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
                                onComplete: resolve
                            });
                        });
                        
                        animationPromises.push(promise);
                        
                        // Обновляем позицию в массиве спрайтов
                        this.sprites[newRow][col] = sprite;
                        this.sprites[row][col] = null;
                    }
                }
            }
        }
        
        // Ждем завершения всех анимаций падения
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
        
        // Если это миссия с карты, обновляем уровень зоны
        if (this.missionData) {
            this.scene.start('MapScene');
            this.scene.get('MapScene').updateZoneLevel(
                this.missionData.zoneId,
                this.missionData.zoneData,
                this.missionData.currentLevel,
                true
            );
        } else {
            this.showWinWindow();
            this.updateStatus('Поздравляем! Задание выполнено!');
        }
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
        // Очищаем все текстовые поля
        if (this.movesText) {
            this.movesText.destroy();
            this.movesText = null;
        }
        if (this.objectiveText) {
            this.objectiveText.destroy();
            this.objectiveText = null;
        }
        if (this.progressText) {
            this.progressText.destroy();
            this.progressText = null;
        }
        if (this.statusText) {
            this.statusText.destroy();
            this.statusText = null;
        }
        if (this.logText) {
            this.logText.destroy();
            this.logText = null;
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
            this.sprites = [];
        }

        // Очищаем все оверлеи
        this.clearAllOverlays();
    }

    startMission(data) {
        this.missionData = {
            zoneId: data.zoneId,
            zoneData: data.zoneData,
            currentLevel: data.currentLevel,
            isResourceMission: data.isResourceMission
        };

        // Устанавливаем параметры миссии
        this.objective = {
            type: data.zoneData.missions[data.currentLevel].type,
            amount: data.zoneData.missions[data.currentLevel].amount,
            gemType: data.zoneData.missions[data.currentLevel].gemType
        };

        // Устанавливаем лимит ходов для миссии
        this.movesLeft = data.zoneData.missions[data.currentLevel].moves;

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
}

export default MainScene; 