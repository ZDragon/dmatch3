import Phaser from 'phaser';
import { UIManager } from '../ui/UIManager';
import { GameLogic } from '../core/GameLogic';
import { ReplayManager } from '../core/ReplayManager';

const GRID_WIDTH = 8;
const GRID_HEIGHT = 8;
const ELEMENT_TYPES = 7;
const VERTICAL_BOMB = 7;
const HORIZONTAL_BOMB = 8;
const DRONE = 9;
const DISCO_BALL = 10;
const DYNAMITE = 11;
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

        // Дрон
        const droneGraphics = this.add.graphics();
        droneGraphics.fillStyle(0x333333);
        droneGraphics.fillRoundedRect(0, 0, gemSize, gemSize, 8);
        droneGraphics.lineStyle(3, 0x00ccff);
        droneGraphics.strokeRoundedRect(3, 3, gemSize-6, gemSize-6, 8);
        
        // Корпус дрона
        droneGraphics.fillStyle(0x666666);
        droneGraphics.fillEllipse(gemSize/2, gemSize/2, gemSize*0.6, gemSize*0.4);
        
        // Пропеллеры
        droneGraphics.fillStyle(0x00ccff);
        droneGraphics.fillCircle(gemSize*0.25, gemSize*0.25, 6);
        droneGraphics.fillCircle(gemSize*0.75, gemSize*0.25, 6);
        droneGraphics.fillCircle(gemSize*0.25, gemSize*0.75, 6);
        droneGraphics.fillCircle(gemSize*0.75, gemSize*0.75, 6);
        
        // Центральный индикатор
        droneGraphics.fillStyle(0xff4444);
        droneGraphics.fillCircle(gemSize/2, gemSize/2, 4);
        
        droneGraphics.generateTexture('gem9', gemSize, gemSize);
        droneGraphics.destroy();

        // Дискошар
        const discoBallGraphics = this.add.graphics();
        discoBallGraphics.fillStyle(0x111111);
        discoBallGraphics.fillRoundedRect(0, 0, gemSize, gemSize, 8);
        discoBallGraphics.lineStyle(3, 0xffd700);
        discoBallGraphics.strokeRoundedRect(3, 3, gemSize-6, gemSize-6, 8);
        
        // Основной шар
        discoBallGraphics.fillStyle(0x444444);
        discoBallGraphics.fillCircle(gemSize/2, gemSize/2, gemSize*0.35);
        
        // Блестящие квадратики на шаре (имитация зеркальных панелей)
        const squares = 12;
        for (let i = 0; i < squares; i++) {
            const angle = (i / squares) * Math.PI * 2;
            const radius = gemSize * 0.25;
            const x = gemSize/2 + Math.cos(angle) * radius;
            const y = gemSize/2 + Math.sin(angle) * radius;
            
            // Чередуем цвета для эффекта диско
            const colors = [0xffd700, 0xff69b4, 0x00ffff, 0xff4500];
            discoBallGraphics.fillStyle(colors[i % colors.length]);
            discoBallGraphics.fillRect(x - 2, y - 2, 4, 4);
        }
        
        // Центральный блик
        discoBallGraphics.fillStyle(0xffffff);
        discoBallGraphics.fillCircle(gemSize/2 - 4, gemSize/2 - 4, 3);
        
        discoBallGraphics.generateTexture('gem10', gemSize, gemSize);
        discoBallGraphics.destroy();

        // Динамит
        const dynamiteGraphics = this.add.graphics();
        dynamiteGraphics.fillStyle(0x8B4513);
        dynamiteGraphics.fillRoundedRect(0, 0, gemSize, gemSize, 8);
        dynamiteGraphics.lineStyle(3, 0xFF4500);
        dynamiteGraphics.strokeRoundedRect(3, 3, gemSize-6, gemSize-6, 8);
        
        // Основной корпус динамита (цилиндр)
        dynamiteGraphics.fillStyle(0xFF4500);
        dynamiteGraphics.fillRect(gemSize*0.3, gemSize*0.2, gemSize*0.4, gemSize*0.6);
        
        // Полоски на динамите
        dynamiteGraphics.fillStyle(0x8B0000);
        dynamiteGraphics.fillRect(gemSize*0.3, gemSize*0.35, gemSize*0.4, 3);
        dynamiteGraphics.fillRect(gemSize*0.3, gemSize*0.5, gemSize*0.4, 3);
        dynamiteGraphics.fillRect(gemSize*0.3, gemSize*0.65, gemSize*0.4, 3);
        
        // Фитиль
        dynamiteGraphics.fillStyle(0x000000);
        dynamiteGraphics.fillRect(gemSize*0.48, gemSize*0.1, 2, gemSize*0.15);
        
        // Искры на фитиле
        dynamiteGraphics.fillStyle(0xFFD700);
        dynamiteGraphics.fillCircle(gemSize*0.49, gemSize*0.08, 2);
        dynamiteGraphics.fillStyle(0xFF6347);
        dynamiteGraphics.fillCircle(gemSize*0.47, gemSize*0.06, 1.5);
        dynamiteGraphics.fillCircle(gemSize*0.51, gemSize*0.05, 1);
        
        // Предупреждающие символы
        dynamiteGraphics.fillStyle(0xFFFF00);
        dynamiteGraphics.fillRect(gemSize*0.15, gemSize*0.4, 6, 6);
        dynamiteGraphics.fillRect(gemSize*0.73, gemSize*0.4, 6, 6);
        
        dynamiteGraphics.generateTexture('gem11', gemSize, gemSize);
        dynamiteGraphics.destroy();
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
                if (gemType === VERTICAL_BOMB) {
                    sprite.on('pointerdown', () => {
                        this.activateVerticalBomb(x, y);
                    });
                } else if (gemType === HORIZONTAL_BOMB) {
                    sprite.on('pointerdown', () => {
                        this.activateHorizontalBomb(x, y);
                    });
                } else if (gemType === DRONE) {
                    sprite.on('pointerdown', () => {
                        this.activateDrone(x, y);
                    });
                } else if (gemType === DISCO_BALL) {
                    sprite.on('pointerdown', () => {
                        this.activateDiscoBall(x, y);
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
        if (gemType === VERTICAL_BOMB) {
            this.activateVerticalBomb(x, y);
            return;
        } else if (gemType === HORIZONTAL_BOMB) {
            this.activateHorizontalBomb(x, y);
            return;
        } else if (gemType === DRONE) {
            this.activateDrone(x, y);
            return;
        } else if (gemType === DISCO_BALL) {
            this.activateDiscoBall(x, y);
            return;
        }

        if (this.selectedElement) {
            const dx = Math.abs(this.selectedElement.x - x);
            const dy = Math.abs(this.selectedElement.y - y);
            
            if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
                // Проверяем, есть ли дрон в выбранном элементе или целевом
                const selectedGemType = this.grid[this.selectedElement.y][this.selectedElement.x];
                const targetGemType = this.grid[y][x];
                
                if (selectedGemType === DRONE) {
                    // Дрон сдвигается на соседнюю клетку - активируем его
                    const droneAction = {
                        type: 'drone_move',
                        from: this.selectedElement,
                        to: { x, y }
                    };
                    
                    this.activateDroneMove(this.selectedElement, { x, y });
                    this.logAction(droneAction);
                } else if (targetGemType === DRONE) {
                    // Пытаемся сдвинуть на дрон - активируем дрон
                    const droneAction = {
                        type: 'drone_activate',
                        position: { x, y }
                    };
                    
                    this.activateDrone(x, y);
                    this.logAction(droneAction);
                } else if (selectedGemType === DISCO_BALL) {
                    // Дискошар сдвигается на соседнюю клетку - активируем его
                    const discoBallAction = {
                        type: 'disco_ball_move',
                        from: this.selectedElement,
                        to: { x, y },
                        targetColor: targetGemType
                    };
                    
                    this.activateDiscoBallMove(this.selectedElement, { x, y });
                    this.logAction(discoBallAction);
                } else if (targetGemType === DISCO_BALL) {
                    // Пытаемся сдвинуть на дискошар - активируем дискошар
                    const discoBallAction = {
                        type: 'disco_ball_activate',
                        position: { x, y }
                    };
                    
                    this.activateDiscoBall(x, y);
                    this.logAction(discoBallAction);
                } else {
                    // Обычная логика ходов
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
        
        // Проверяем, есть ли специальные гемы для активации при перемещении
        const fromGem = this.grid[from.y][from.x];
        const toGem = this.grid[to.y][to.x];
        
        // Выполняем логический обмен
        const temp = this.grid[from.y][from.x];
        this.grid[from.y][from.x] = this.grid[to.y][to.x];
        this.grid[to.y][to.x] = temp;

        this.updateGridOverlay();

        // Проверяем активацию спец гемов при перемещении
        if (fromGem === DRONE) {
            await this.activateDroneMove(from, to);
            this.isAnimating = false;
            return;
        } else if (toGem === DRONE) {
            await this.activateDroneMove(to, from);
            this.isAnimating = false;
            return;
        } else if (fromGem === DISCO_BALL) {
            await this.activateDiscoBallMove(from, to);
            this.isAnimating = false;
            return;
        } else if (toGem === DISCO_BALL) {
            await this.activateDiscoBallMove(to, from);
            this.isAnimating = false;
            return;
        } else if (fromGem === DYNAMITE) {
            await this.activateDynamiteMove(from, to);
            this.isAnimating = false;
            return;
        } else if (toGem === DYNAMITE) {
            await this.activateDynamiteMove(to, from);
            this.isAnimating = false;
            return;
        }

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
                    // Проверяем, существует ли спрайт перед его удалением
                    if (this.sprites[y][x] && this.sprites[y][x].destroy) {
                        this.sprites[y][x].destroy();
                    }
                    const sprite = this.createSprite(gemType, y, x, false);
                    this.sprites[y][x] = sprite;
                } else {
                    // Проверяем, существует ли спрайт перед его удалением
                    if (this.sprites[y][x] && this.sprites[y][x].destroy) {
                        this.sprites[y][x].destroy();
                    }
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
            const squares2x2 = this.detectSquares2x2(this.grid);
            const tShapes = this.detectTShapes(this.grid);
            const lShapes = this.detectLShapes(this.grid);
            
            // --- Сохраняем позиции для спец-гемов (матчи из 4 и 5, квадраты 2x2) ---
            const verticalBombPositions = [];
            const horizontalBombPositions = [];
            const dronePositions = [];
            const droneSquares = [];
            const discoBallPositions = [];
            const discoBallMatches = [];
            const dynamitePositions = [];
            const dynamiteShapes = [];

            matches.forEach(match => {
                if (Array.isArray(match)) {
                    if (match.length === 5) {
                        const {x, y} = match[0];
                        discoBallPositions.push({x, y});
                        discoBallMatches.push(match);
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

            // Обрабатываем квадраты 2x2 для создания дронов
            squares2x2.forEach(square => {
                if (Array.isArray(square) && square.length === 4) {
                    const {x, y} = square[0]; // позиция для дрона (верхний левый угол)
                    dronePositions.push({x, y});
                    droneSquares.push(square);
                }
            });

            // Обрабатываем T-образные фигуры для создания динамита
            tShapes.forEach(shape => {
                if (Array.isArray(shape) && shape.length === 5) {
                    // Находим центральную позицию фигуры для размещения динамита
                    let centerX = Math.round(shape.reduce((sum, pos) => sum + pos.x, 0) / shape.length);
                    let centerY = Math.round(shape.reduce((sum, pos) => sum + pos.y, 0) / shape.length);
                    dynamitePositions.push({x: centerX, y: centerY});
                    dynamiteShapes.push(shape);
                }
            });

            // Обрабатываем L-образные фигуры для создания динамита
            lShapes.forEach(shape => {
                if (Array.isArray(shape) && shape.length === 5) {
                    // Находим угловую позицию фигуры для размещения динамита (обычно первый элемент)
                    const {x, y} = shape[0];
                    dynamitePositions.push({x, y});
                    dynamiteShapes.push(shape);
                }
            });

            if (matches && matches.length > 0 || squares2x2 && squares2x2.length > 0 || tShapes && tShapes.length > 0 || lShapes && lShapes.length > 0) {
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

                // Подсчитываем собранные камни из квадратов 2x2
                squares2x2.forEach(square => {
                    if (Array.isArray(square)) {
                        square.forEach(({ x, y }) => {
                            if (y >= 0 && y < this.grid.length && x >= 0 && x < this.grid[0].length) {
                                const gemType = this.grid[y][x];
                                if (gemType >= 1 && gemType <= 5) {
                                    totalCollected[gemType]++;
                                }
                            }
                        });
                    }
                });

                // Подсчитываем собранные камни из T-образных фигур
                tShapes.forEach(shape => {
                    if (Array.isArray(shape)) {
                        shape.forEach(({ x, y }) => {
                            if (y >= 0 && y < this.grid.length && x >= 0 && x < this.grid[0].length) {
                                const gemType = this.grid[y][x];
                                if (gemType >= 1 && gemType <= 5) {
                                    totalCollected[gemType]++;
                                }
                            }
                        });
                    }
                });

                // Подсчитываем собранные камни из L-образных фигур
                lShapes.forEach(shape => {
                    if (Array.isArray(shape)) {
                        shape.forEach(({ x, y }) => {
                            if (y >= 0 && y < this.grid.length && x >= 0 && x < this.grid[0].length) {
                                const gemType = this.grid[y][x];
                                if (gemType >= 1 && gemType <= 5) {
                                    totalCollected[gemType]++;
                                }
                            }
                        });
                    }
                });


                // Анимация для квадратов 2x2 (создание дронов)
                for (const square of droneSquares) {
                    await this.animateDroneCreation(square);
                    this.grid[square[1].y][square[0].x] = DRONE;
                }

                // Анимация для T и L фигур (создание динамита)
                for (let i = 0; i < dynamiteShapes.length; i++) {
                    const shape = dynamiteShapes[i];
                    const position = dynamitePositions[i];
                    await this.animateDynamiteCreation(shape);
                    this.grid[position.y][position.x] = DYNAMITE;
                }

                // Анимация для матчей из 5 (создание дискошаров)
                for (const match of discoBallMatches) {
                    await this.animateDiscoBallCreation(match);
                    this.grid[match[0].y][match[0].x] = DISCO_BALL;
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

                // Обычная анимация для остальных матчей (исключаем матчи из 4 и 5)
                const otherMatches = matches.filter(m => (!Array.isArray(m) || (m.length !== 4 && m.length !== 5)));
                if (otherMatches.length > 0) {
                    // Фильтруем только актуальные матчи
                    const validMatches = otherMatches.filter(match => this.isMatchStillValid(match));
                    if (validMatches.length > 0) {
                        await this.animateMatches(validMatches);
                    }
                }

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

    // Детекция квадратов 2x2 для создания дронов
    detectSquares2x2(grid) {
        const squares = [];
        const rows = grid.length;
        const cols = grid[0].length;
        
        for (let y = 0; y < rows - 1; y++) {
            for (let x = 0; x < cols - 1; x++) {
                const topLeft = grid[y][x];
                const topRight = grid[y][x + 1];
                const bottomLeft = grid[y + 1][x];
                const bottomRight = grid[y + 1][x + 1];
                
                // Проверяем, что все 4 гема одинаковые и это обычные гемы (1-5)
                if (topLeft >= 1 && topLeft <= 5 &&
                    topLeft === topRight &&
                    topLeft === bottomLeft &&
                    topLeft === bottomRight) {
                    
                    squares.push([
                        { x: x, y: y },         // top-left
                        { x: x + 1, y: y },     // top-right
                        { x: x, y: y + 1 },     // bottom-left
                        { x: x + 1, y: y + 1 }  // bottom-right
                    ]);
                }
            }
        }
        
        return squares;
    }

    // Детекция T-образных паттернов для создания динамита
    detectTShapes(grid) {
        const tShapes = [];
        const rows = grid.length;
        const cols = grid[0].length;
        
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const gem = grid[y][x];
                if (!gem || gem < 1 || gem > 5) continue;
                
                // T-образная фигура: 3 гема сверху + 2 гема снизу по центру
                if (x >= 1 && x < cols - 1 && y < rows - 2) {
                    const topLeft = grid[y][x - 1];
                    const topCenter = grid[y][x];
                    const topRight = grid[y][x + 1];
                    const bottomCenter1 = grid[y + 1][x];
                    const bottomCenter2 = grid[y + 2][x];
                    
                    if (topLeft === gem && topCenter === gem && topRight === gem &&
                        bottomCenter1 === gem && bottomCenter2 === gem) {
                        tShapes.push([
                            { x: x - 1, y: y },
                            { x: x, y: y },
                            { x: x + 1, y: y },
                            { x: x, y: y + 1 },
                            { x: x, y: y + 2 }
                        ]);
                    }
                }
                
                // Перевернутая T-образная фигура: 2 гема сверху по центру + 3 гема снизу
                if (x >= 1 && x < cols - 1 && y >= 2) {
                    const topCenter1 = grid[y - 2][x];
                    const topCenter2 = grid[y - 1][x];
                    const bottomLeft = grid[y][x - 1];
                    const bottomCenter = grid[y][x];
                    const bottomRight = grid[y][x + 1];
                    
                    if (topCenter1 === gem && topCenter2 === gem &&
                        bottomLeft === gem && bottomCenter === gem && bottomRight === gem) {
                        tShapes.push([
                            { x: x, y: y - 2 },
                            { x: x, y: y - 1 },
                            { x: x - 1, y: y },
                            { x: x, y: y },
                            { x: x + 1, y: y }
                        ]);
                    }
                }
                
                // Боковая T-образная фигура слева: 3 гема по вертикали + 2 гема справа
                if (x < cols - 2 && y >= 1 && y < rows - 1) {
                    const leftTop = grid[y - 1][x];
                    const leftCenter = grid[y][x];
                    const leftBottom = grid[y + 1][x];
                    const rightCenter1 = grid[y][x + 1];
                    const rightCenter2 = grid[y][x + 2];
                    
                    if (leftTop === gem && leftCenter === gem && leftBottom === gem &&
                        rightCenter1 === gem && rightCenter2 === gem) {
                        tShapes.push([
                            { x: x, y: y - 1 },
                            { x: x, y: y },
                            { x: x, y: y + 1 },
                            { x: x + 1, y: y },
                            { x: x + 2, y: y }
                        ]);
                    }
                }
                
                // Боковая T-образная фигура справа: 2 гема слева + 3 гема по вертикали
                if (x >= 2 && y >= 1 && y < rows - 1) {
                    const leftCenter1 = grid[y][x - 2];
                    const leftCenter2 = grid[y][x - 1];
                    const rightTop = grid[y - 1][x];
                    const rightCenter = grid[y][x];
                    const rightBottom = grid[y + 1][x];
                    
                    if (leftCenter1 === gem && leftCenter2 === gem &&
                        rightTop === gem && rightCenter === gem && rightBottom === gem) {
                        tShapes.push([
                            { x: x - 2, y: y },
                            { x: x - 1, y: y },
                            { x: x, y: y - 1 },
                            { x: x, y: y },
                            { x: x, y: y + 1 }
                        ]);
                    }
                }
            }
        }
        
        return tShapes;
    }

    // Детекция L-образных паттернов для создания динамита
    detectLShapes(grid) {
        const lShapes = [];
        const rows = grid.length;
        const cols = grid[0].length;
        
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const gem = grid[y][x];
                if (!gem || gem < 1 || gem > 5) continue;
                
                // L-образная фигура: 3 гема вертикально + 2 гема сверху справа
                if (x < cols - 2 && y < rows - 2) {
                    const vertical1 = grid[y][x];
                    const vertical2 = grid[y + 1][x];
                    const vertical3 = grid[y + 2][x];
                    const horizontal1 = grid[y][x + 1];
                    const horizontal2 = grid[y][x + 2];
                    
                    if (vertical1 === gem && vertical2 === gem && vertical3 === gem &&
                        horizontal1 === gem && horizontal2 === gem) {
                        lShapes.push([
                            { x: x, y: y },
                            { x: x, y: y + 1 },
                            { x: x, y: y + 2 },
                            { x: x + 1, y: y },
                            { x: x + 2, y: y }
                        ]);
                    }
                }
                
                // L-образная фигура: 3 гема вертикально + 2 гема сверху слева
                if (x >= 2 && y < rows - 2) {
                    const vertical1 = grid[y][x];
                    const vertical2 = grid[y + 1][x];
                    const vertical3 = grid[y + 2][x];
                    const horizontal1 = grid[y][x - 1];
                    const horizontal2 = grid[y][x - 2];
                    
                    if (vertical1 === gem && vertical2 === gem && vertical3 === gem &&
                        horizontal1 === gem && horizontal2 === gem) {
                        lShapes.push([
                            { x: x, y: y },
                            { x: x, y: y + 1 },
                            { x: x, y: y + 2 },
                            { x: x - 1, y: y },
                            { x: x - 2, y: y }
                        ]);
                    }
                }
                
                // L-образная фигура: 3 гема вертикально + 2 гема снизу справа
                if (x < cols - 2 && y >= 2) {
                    const vertical1 = grid[y - 2][x];
                    const vertical2 = grid[y - 1][x];
                    const vertical3 = grid[y][x];
                    const horizontal1 = grid[y][x + 1];
                    const horizontal2 = grid[y][x + 2];
                    
                    if (vertical1 === gem && vertical2 === gem && vertical3 === gem &&
                        horizontal1 === gem && horizontal2 === gem) {
                        lShapes.push([
                            { x: x, y: y - 2 },
                            { x: x, y: y - 1 },
                            { x: x, y: y },
                            { x: x + 1, y: y },
                            { x: x + 2, y: y }
                        ]);
                    }
                }
                
                // L-образная фигура: 3 гема вертикально + 2 гема снизу слева
                if (x >= 2 && y >= 2) {
                    const vertical1 = grid[y - 2][x];
                    const vertical2 = grid[y - 1][x];
                    const vertical3 = grid[y][x];
                    const horizontal1 = grid[y][x - 1];
                    const horizontal2 = grid[y][x - 2];
                    
                    if (vertical1 === gem && vertical2 === gem && vertical3 === gem &&
                        horizontal1 === gem && horizontal2 === gem) {
                        lShapes.push([
                            { x: x, y: y - 2 },
                            { x: x, y: y - 1 },
                            { x: x, y: y },
                            { x: x - 1, y: y },
                            { x: x - 2, y: y }
                        ]);
                    }
                }
            }
        }
        
        return lShapes;
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
                    duration: 50 + idx * 50,
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
                    duration: 50 + idx * 50,
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

    // Анимация создания дискошара из матча 5 элементов
    async animateDiscoBallCreation(match) {
        const target = match[0]; // позиция дискошара (первый элемент матча)
        
        // Удаляем спрайты всех гемов матча с анимацией
        const animPromises = [];
        match.forEach(({ x, y }) => {
            if (this.sprites[y] && this.sprites[y][x]) {
                animPromises.push(new Promise(resolve => {
                    this.tweens.add({
                        targets: this.sprites[y][x],
                        scaleX: 0.1,
                        scaleY: 0.1,
                        alpha: 0.2,
                        rotation: Math.PI * 4,
                        duration: 400,
                        ease: 'Power2.easeIn',
                        onComplete: () => {
                            if (this.sprites[y][x]) {
                                this.sprites[y][x].destroy();
                                this.sprites[y][x] = null;
                            }
                            resolve();
                        }
                    });
                }));
            }
            this.grid[y][x] = 0;
        });
        
        await Promise.all(animPromises);
        
        // Создаем спрайт дискошара в позиции первого элемента
        const discoBall = this.createSprite(DISCO_BALL, target.y, target.x, true);
        
        // Анимация появления дискошара с блестящим эффектом
        await new Promise(resolve => {
            this.tweens.add({
                targets: discoBall,
                scaleX: 1.5,
                scaleY: 1.5,
                alpha: 1,
                rotation: Math.PI * 2,
                duration: 500,
                ease: 'Back.easeOut',
                onComplete: () => {
                    this.tweens.add({
                        targets: discoBall,
                        scaleX: 1,
                        scaleY: 1,
                        duration: 300,
                        ease: 'Elastic.easeOut',
                        onComplete: resolve
                    });
                }
            });
        });
    }

    // Активация дискошара при клике
    async activateDiscoBall(x, y) {
        if (this.grid[y][x] !== DISCO_BALL) return;
        
        console.log(`Активация дискошара в позиции: ${x}, ${y}`);
        
        // Убираем ход
        this.movesLeft--;
        this.updateMovesDisplay();
        
        // Находим случайный гем рядом
        const neighbors = this.getNeighbors(x, y).filter(({nx, ny}) => {
            return this.grid[ny] && this.grid[ny][nx] >= 1 && this.grid[ny][nx] <= 5;
        });
        
        if (neighbors.length === 0) {
            console.log('Нет соседних гемов для активации дискошара');
            // Удаляем дискошар без эффекта
            await this.removeDiscoBall(x, y);
            return;
        }
        
        // Выбираем случайного соседа
        const randomNeighbor = neighbors[this.getRandomTracked(0, neighbors.length - 1, `disco-neighbor-${x}-${y}`)];
        const targetColor = this.grid[randomNeighbor.ny][randomNeighbor.nx];
        
        console.log(`Дискошар выбрал цвет: ${targetColor}`);
        
        // Убираем все гемы этого цвета
        await this.removeAllGemsOfColor(targetColor, x, y);
        
        // Проверяем условие поражения
        if (this.movesLeft <= 0) {
            this.triggerGameOver();
        }
    }

    // Активация дискошара при сдвигании
    async activateDiscoBallMove(from, to) {
        console.log(`Дискошар сдвигается с ${from.x}, ${from.y} на ${to.x}, ${to.y}`);
        
        // Убираем ход
        this.movesLeft--;
        this.updateMovesDisplay();
        
        const targetColor = this.grid[to.y][to.x];
        
        if (targetColor >= 1 && targetColor <= 5) {
            console.log(`Дискошар выбрал цвет: ${targetColor}`);
            
            // Убираем все гемы этого цвета
            await this.removeAllGemsOfColor(targetColor, from.x, from.y);
        } else {
            console.log('Целевая клетка не содержит обычный гем');
            // Удаляем дискошар без эффекта
            await this.removeDiscoBall(from.x, from.y);
        }
        
        // Проверяем условие поражения
        if (this.movesLeft <= 0) {
            this.triggerGameOver();
        }
    }

    // Удаляет все гемы указанного цвета с поля
    async removeAllGemsOfColor(color, discoBallX, discoBallY) {
        console.log(`Удаляем все гемы цвета ${color}`);
        
        const animPromises = [];
        
        // Сначала анимация самого дискошара
        if (this.sprites[discoBallY][discoBallX]) {
            animPromises.push(new Promise(resolve => {
                this.tweens.add({
                    targets: this.sprites[discoBallY][discoBallX],
                    scaleX: 2,
                    scaleY: 2,
                    alpha: 0,
                    rotation: Math.PI * 6,
                    duration: 600,
                    ease: 'Power2.easeOut',
                    onComplete: () => {
                        if (this.sprites[discoBallY][discoBallX]) {
                            this.sprites[discoBallY][discoBallX].destroy();
                        }
                        resolve();
                    }
                });
            }));
        }
        this.grid[discoBallY][discoBallX] = 0;
        
        // Затем анимация всех гемов указанного цвета
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                if (this.grid[y][x] === color) {
                    if (this.sprites[y][x]) {
                        const delay = Math.sqrt((x - discoBallX) ** 2 + (y - discoBallY) ** 2) * 50; // задержка в зависимости от расстояния
                        
                        animPromises.push(new Promise(resolve => {
                            this.time.delayedCall(delay, () => {
                                if (this.sprites[y][x]) {
                                    this.tweens.add({
                                        targets: this.sprites[y][x],
                                        scaleX: 0,
                                        scaleY: 0,
                                        alpha: 0,
                                        rotation: Math.PI * 2,
                                        duration: 250,
                                        ease: 'Back.easeIn',
                                        onComplete: () => {
                                            if (this.sprites[y][x]) {
                                                this.sprites[y][x].destroy();
                                            }
                                            resolve();
                                        }
                                    });
                                } else {
                                    resolve();
                                }
                            });
                        }));
                    }
                    this.grid[y][x] = 0;
                }
            }
        }
        
        // Ждём завершения всех анимаций
        await Promise.all(animPromises);
        
        // Применяем физику и обрабатываем новые матчи
        await this.animateGravity();
        this.gameLogic.applyGravity(this.grid);
        this.rerenderGrid();
        this.customSpawnNewElements(this.grid, 0);
        await this.animateNewElements();
        await this.processMatchesAnimated();
    }

    // Простое удаление дискошара без эффекта
    async removeDiscoBall(x, y) {
        if (this.sprites[y][x]) {
            this.sprites[y][x].destroy();
        }
        this.grid[y][x] = 0;
        
        await this.animateGravity();
        this.gameLogic.applyGravity(this.grid);
        this.rerenderGrid();
        this.customSpawnNewElements(this.grid, 0);
        await this.animateNewElements();
    }

    // Анимация создания дрона из квадрата 2x2
    async animateDroneCreation(square) {
        const target = square[0]; // позиция дрона (верхний левый угол)
        
        // Удаляем спрайты всех гемов квадрата с анимацией
        const animPromises = [];
        square.forEach(({ x, y }) => {
            if (this.sprites[y] && this.sprites[y][x]) {
                animPromises.push(new Promise(resolve => {
                    this.tweens.add({
                        targets: this.sprites[y][x],
                        scaleX: 0.2,
                        scaleY: 0.2,
                        alpha: 0.3,
                        duration: 300,
                        ease: 'Power2.easeIn',
                        onComplete: () => {
                            if (this.sprites[y][x]) {
                                this.sprites[y][x].destroy();
                                this.sprites[y][x] = null;
                            }
                            resolve();
                        }
                    });
                }));
            }
            this.grid[y][x] = 0;
        });
        
        await Promise.all(animPromises);
        
        // Создаем спрайт дрона в позиции верхнего левого угла
        const drone = this.createSprite(DRONE, target.y, target.x, true);
        
        // Анимация появления дрона
        await new Promise(resolve => {
            this.tweens.add({
                targets: drone,
                scaleX: 1.2,
                scaleY: 1.2,
                alpha: 1,
                duration: 400,
                ease: 'Back.easeOut',
                onComplete: () => {
                    this.tweens.add({
                        targets: drone,
                        scaleX: 1,
                        scaleY: 1,
                        duration: 200,
                        ease: 'Power2.easeOut',
                        onComplete: resolve
                    });
                }
            });
        });
    }

    // Активация дрона при клике
    async activateDrone(x, y) {
        if (this.grid[y][x] !== DRONE) return;
        
        console.log(`Активация дрона в позиции: ${x}, ${y}`);
        
        // Убираем ход
        this.movesLeft--;
        this.updateMovesDisplay();
        
        // Взрыв в радиусе 1 клетки
        await this.explodeDroneArea(x, y);
        
        // Имитация полета к препятствиям (заглушка)
        this.logAction({
            type: 'drone_obstacle_attack',
            position: { x, y },
            message: 'Дрон атаковал случайное препятствие'
        });
        
        console.log('Дрон атаковал препятствие (заглушка)');
        
        // Проверяем условие поражения
        if (this.movesLeft <= 0) {
            this.triggerGameOver();
        }
    }

    // Активация дрона при сдвигании
    async activateDroneMove(from, to) {
        console.log(`Дрон сдвигается с ${from.x}, ${from.y} на ${to.x}, ${to.y}`);
        
        // Убираем ход
        this.movesLeft--;
        this.updateMovesDisplay();
        
        // Взрыв в радиусе 1 клетки от исходной позиции дрона
        await this.explodeDroneArea(from.x, from.y);
        
        // Имитация полета к препятствиям (заглушка)
        this.logAction({
            type: 'drone_obstacle_attack',
            position: from,
            target: to,
            message: 'Дрон переместился и атаковал случайное препятствие'
        });
        
        console.log('Дрон переместился и атаковал препятствие (заглушка)');
        
        // Проверяем условие поражения
        if (this.movesLeft <= 0) {
            this.triggerGameOver();
        }
    }

    // Взрыв дрона в радиусе 1 клетки
    async explodeDroneArea(x, y) {
        console.log(`Взрыв дрона в радиусе 1 от позиции: ${x}, ${y}`);
        
        // Анимация самого дрона
        const animPromises = [];
        if (this.sprites[y][x]) {
            animPromises.push(new Promise(resolve => {
                this.tweens.add({
                    targets: this.sprites[y][x],
                    scaleX: 1.8,
                    scaleY: 1.8,
                    alpha: 0,
                    duration: 400,
                    ease: 'Back.easeIn',
                    onComplete: () => {
                        if (this.sprites[y][x]) this.sprites[y][x].destroy();
                        resolve();
                    }
                });
            }));
        }
        
        this.grid[y][x] = 0;
        
        // Взрываем все гемы в радиусе 1 клетки (8 соседей)
        const neighbors = this.getNeighbors(x, y);
        neighbors.forEach(({ nx, ny }) => {
            if (this.grid[ny] && this.grid[ny][nx] && this.grid[ny][nx] >= 1 && this.grid[ny][nx] <= 5) {
                if (this.sprites[ny][nx]) {
                    animPromises.push(new Promise(resolve => {
                        this.tweens.add({
                            targets: this.sprites[ny][nx],
                            scaleX: 0,
                            scaleY: 0,
                            alpha: 0,
                            rotation: Math.PI * 2,
                            duration: 300,
                            ease: 'Back.easeIn',
                            onComplete: () => {
                                if (this.sprites[ny][nx]) this.sprites[ny][nx].destroy();
                                resolve();
                            }
                        });
                    }));
                }
                this.grid[ny][nx] = 0;
            }
        });
        
        // Ждём завершения всех анимаций
        await Promise.all(animPromises);
        
        // Применяем физику и обрабатываем матчи
        await this.animateGravity();
        this.gameLogic.applyGravity(this.grid);
        this.rerenderGrid();
        this.customSpawnNewElements(this.grid, 0);
        await this.animateNewElements();
        await this.processMatchesAnimated();
    }

    // Анимация создания динамита
    async animateDynamiteCreation(shape) {
        const animPromises = [];
        
        // Анимация исчезновения всех гемов в фигуре
        shape.forEach(({ x, y }) => {
            if (this.sprites[y] && this.sprites[y][x]) {
                animPromises.push(new Promise(resolve => {
                    this.tweens.add({
                        targets: this.sprites[y][x],
                        scaleX: 0,
                        scaleY: 0,
                        alpha: 0,
                        rotation: Math.PI,
                        duration: 400,
                        ease: 'Back.easeIn',
                        onComplete: () => {
                            if (this.sprites[y][x]) {
                                this.sprites[y][x].destroy();
                                this.sprites[y][x] = null;
                            }
                            this.grid[y][x] = 0;
                            resolve();
                        }
                    });
                }));
            }
        });
        
        await Promise.all(animPromises);
        await this.delay(200);
        
        // Создаём динамит в центральной позиции с эффектной анимацией
        const centerX = Math.round(shape.reduce((sum, pos) => sum + pos.x, 0) / shape.length);
        const centerY = Math.round(shape.reduce((sum, pos) => sum + pos.y, 0) / shape.length);
        
        // Эффект взрыва-появления
        const explosion = this.add.circle(
            centerX * (elementWidth + elementSpacing) + elementWidth / 2,
            centerY * (elementHeight + elementSpacing) + elementHeight / 2,
            5,
            0xFF4500
        );
        explosion.setDepth(10);
        
        return new Promise(resolve => {
            this.tweens.add({
                targets: explosion,
                radius: 40,
                alpha: 0,
                duration: 300,
                ease: 'Power2',
                onComplete: () => {
                    explosion.destroy();
                    
                    // Создаём спрайт динамита с появлением
                    const dynamiteSprite = this.createSprite(DYNAMITE, centerY, centerX, true);
                    
                    this.tweens.add({
                        targets: dynamiteSprite,
                        scaleX: 1,
                        scaleY: 1,
                        alpha: 1,
                        duration: 300,
                        ease: 'Back.easeOut',
                        onComplete: resolve
                    });
                }
            });
        });
    }

    // Активация динамита при клике
    async activateDynamite(x, y) {
        console.log(`Активация динамита на позиции: ${x}, ${y}`);
        this.logAction({
            type: 'ACTIVATE_DYNAMITE',
            data: { x, y },
            randomContext: 'dynamite_activation'
        });

        await this.explodeDynamiteArea(x, y);
    }

    // Активация динамита при перемещении
    async activateDynamiteMove(from, to) {
        console.log(`Перемещение и активация динамита: ${from.x},${from.y} -> ${to.x},${to.y}`);
        this.logAction({
            type: 'ACTIVATE_DYNAMITE_MOVE',
            data: { from, to },
            randomContext: 'dynamite_move_activation'
        });

        // Перемещаем динамит
        this.grid[to.y][to.x] = DYNAMITE;
        this.grid[from.y][from.x] = 0;
        
        await this.explodeDynamiteArea(to.x, to.y);
    }

    // Взрыв динамита в радиусе 2 клеток
    async explodeDynamiteArea(x, y) {
        console.log(`Взрыв динамита в радиусе 2 от позиции: ${x}, ${y}`);
        
        // Анимация самого динамита с мощным взрывом
        const animPromises = [];
        if (this.sprites[y][x]) {
            // Создаём эффект взрыва
            const explosionEffect = this.add.circle(
                x * (elementWidth + elementSpacing) + elementWidth / 2,
                y * (elementHeight + elementSpacing) + elementHeight / 2,
                10,
                0xFF4500
            );
            explosionEffect.setDepth(15);
            
            animPromises.push(new Promise(resolve => {
                this.tweens.add({
                    targets: explosionEffect,
                    radius: 80,
                    alpha: 0,
                    duration: 600,
                    ease: 'Power2',
                    onComplete: () => {
                        explosionEffect.destroy();
                        resolve();
                    }
                });
            }));
            
            animPromises.push(new Promise(resolve => {
                this.tweens.add({
                    targets: this.sprites[y][x],
                    scaleX: 2.5,
                    scaleY: 2.5,
                    alpha: 0,
                    duration: 500,
                    ease: 'Power2',
                    onComplete: () => {
                        if (this.sprites[y][x]) this.sprites[y][x].destroy();
                        resolve();
                    }
                });
            }));
        }
        
        this.grid[y][x] = 0;
        
        // Взрываем все гемы в радиусе 2 клеток
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                if (dx === 0 && dy === 0) continue; // Пропускаем центр (сам динамит)
                
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < this.gameLogic.gridWidth && 
                    ny >= 0 && ny < this.gameLogic.gridHeight) {
                    
                    const gemType = this.grid[ny][nx];
                    if (gemType >= 1 && gemType <= 5) {
                        if (this.sprites[ny][nx]) {
                            const delay = Math.abs(dx) + Math.abs(dy); // Задержка на основе расстояния
                            animPromises.push(new Promise(resolve => {
                                this.time.delayedCall(delay * 50, () => {
                                    this.tweens.add({
                                        targets: this.sprites[ny][nx],
                                        scaleX: 0,
                                        scaleY: 0,
                                        alpha: 0,
                                        rotation: Math.PI * 2,
                                        duration: 400,
                                        ease: 'Back.easeIn',
                                        onComplete: () => {
                                            if (this.sprites[ny][nx]) this.sprites[ny][nx].destroy();
                                            resolve();
                                        }
                                    });
                                });
                            }));
                        }
                        this.grid[ny][nx] = 0;
                    }
                    
                    // TODO: Здесь будет логика снятия уровня у препятствий
                    console.log(`Потенциальное повреждение препятствия на ${nx}, ${ny}`);
                }
            }
        }
        
        // Ждём завершения всех анимаций
        await Promise.all(animPromises);
        
        // Применяем физику и обрабатываем матчи
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
            if (gemType === DRONE) {
                sprite.on('pointerdown', () => {
                    this.activateDrone(col, row);
                });
            } else if (gemType === DISCO_BALL) {
                sprite.on('pointerdown', () => {
                    this.activateDiscoBall(col, row);
                });
            } else if (gemType === DYNAMITE) {
                sprite.on('pointerdown', () => {
                    this.activateDynamite(col, row);
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