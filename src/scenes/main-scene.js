import Phaser from 'phaser';
import { UIManager } from '../ui/UIManager';
import { GameLogic } from '../core/GameLogic';
import { AnimationManager } from '../animations/AnimationManager';
import { ReplayManager } from '../core/ReplayManager';
import { getRandom, setSeed } from '../core/deterministic';

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
        
        // Инициализация менеджеров
        this.uiManager = new UIManager(this);
        this.gameLogic = new GameLogic(this);
        this.animationManager = new AnimationManager(this);
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
        this.uiManager.createUI();
        this.gameLogic.startNewGame();
    }

    update() {
        this.gameLogic.update();
    }

    handleInput(pointer) {
        if (this.isReplaying || this.gameOver || this.isAnimating) return;
        
        const x = Math.floor(pointer.x / (elementWidth + elementSpacing));
        const y = Math.floor(pointer.y / (elementHeight + elementSpacing));

        if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return;

        if (this.selectedElement) {
            const dx = Math.abs(this.selectedElement.x - x);
            const dy = Math.abs(this.selectedElement.y - y);
            
            if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
                if (this.gameLogic.isValidMove(this.selectedElement, { x, y })) {
                    const swapAction = {
                        type: 'swap',
                        from: this.selectedElement,
                        to: { x, y }
                    };
                    
                    this.gameLogic.makeMove(this.selectedElement, { x, y });
                    this.gameLogic.logAction(swapAction);
                } else {
                    this.uiManager.updateStatus('Недопустимый ход - не создает матчей!');
                }
            }
            
            this.gameLogic.clearSelection();
            this.selectedElement = null;
        } else {
            this.selectedElement = { x, y };
            this.gameLogic.highlightElement(x, y);
        }
    }

    renderGrid() {
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
                row.push(sprite);
            }
            this.sprites.push(row);
        }
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
        const result = getRandom(min, max);
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

    generateObjective() {
        const gemNames = ['красных', 'синих', 'зеленых', 'желтых', 'фиолетовых'];
        const targetGemType = this.getRandomTracked(1, ELEMENT_TYPES, 'objective-type');
        const targetAmount = this.getRandomTracked(15, 25, 'objective-amount');
        
        this.objective = {
            gemType: targetGemType,
            amount: targetAmount,
            description: `Собрать ${targetAmount} ${gemNames[targetGemType - 1]} камней`
        };
    }

    updateGemModifier() {
        const targetType = parseInt(this.uiManager.gemTypeInput.value);
        const multiplier = parseFloat(this.uiManager.gemMultiplierInput.value);
        
        if (targetType >= 1 && targetType <= ELEMENT_TYPES) {
            this.gemModifier.targetGemType = targetType;
        } else {
            this.gemModifier.targetGemType = 1;
            this.uiManager.gemTypeInput.value = '1';
        }
        
        if (multiplier >= 0.1 && multiplier <= 10.0) {
            this.gemModifier.multiplier = multiplier;
        } else {
            this.gemModifier.multiplier = 1.0;
            this.uiManager.gemMultiplierInput.value = '1.0';
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
} 