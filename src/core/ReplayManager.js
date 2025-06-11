export class ReplayManager {
    constructor(scene) {
        this.scene = scene;
    }

    // Обновляем импорт для проверки детерминированности
    importAndReplay() {
        try {
            const importData = JSON.parse(this.scene.logInput.value);
            
            if (!importData.seed || !importData.actions) {
                throw new Error('Неверный формат данных');
            }
            
            console.log('=== НАЧАЛО ИМПОРТА И РЕПЛЕЯ ===');
            
            this.scene.currentSeed = importData.seed;
            this.scene.seedInput.value = this.scene.currentSeed.toString();
            
            // Восстанавливаем модификатор
            if (importData.gemModifier) {
                this.scene.gemModifier = importData.gemModifier;
                this.scene.gemTypeInput.value = this.scene.gemModifier.targetGemType.toString();
                this.scene.gemMultiplierInput.value = this.scene.gemModifier.multiplier.toString();
            }
            
            // Начинаем новую игру с точно такими же параметрами
            this.scene.actionLog = [];
            this.scene.updateGemModifier();
            this.scene.gameLogic.setSeed(this.scene.currentSeed);
            this.scene.randomCallCounter = 0;
            
            this.scene.generateObjective();
            this.scene.grid = this.scene.createInitialGridDeterministic();
            this.scene.renderGrid();
            
            console.log(`Состояние после инициализации: Random calls = ${this.randomCallCounter}`);
            console.log('Objective:', this.objective);
            console.log('Grid:', this.grid);
            
            // Запускаем реплей
            this.startReplay(importData.actions);
            
        } catch (error) {
            this.scene.updateStatus(`Ошибка импорта: ${error.message}`);
        }
    }

    startReplay(actions) {
        this.scene.isReplaying = true;
        this.scene.replayIndex = 0;
        this.scene.replayActions = actions;
        
        this.scene.updateStatus(`Начинаем реплей ${actions.length} действий...`);
        
        // Запускаем реплей с задержкой между действиями
        this.replayNextAction();
    }

    // Обновляем метод реплея для учета ходов
    async replayNextAction() {
        if (this.scene.replayIndex >= this.scene.replayActions.length) {
            this.scene.isReplaying = false;
            this.scene.updateStatus('Реплей завершен');
            return;
        }
        
        const actionEntry = this.scene.replayActions[this.scene.replayIndex];
        const action = actionEntry.data;
        
        this.scene.updateStatus(`Воспроизводим действие ${this.scene.replayIndex + 1}/${this.scene.replayActions.length}: ${action.type}`);
        
        // Подсвечиваем выполняемое действие
        if (action.type === 'swap') {
            this.highlightReplayAction(action);
            
            // Ждем 500мс перед началом действия
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Выполняем обмен и ждем его завершения
            await this.scene.swapElements(action.from, action.to, false);
            this.scene.replayIndex++;
            
            // Ждем 1 секунду перед следующим действием
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Продолжаем реплей
            this.replayNextAction();
        } else {
            this.replayIndex++;
            await new Promise(resolve => setTimeout(resolve, 100));
            this.replayNextAction();
        }
    }

    highlightReplayAction(action) {
        // Очищаем предыдущие подсветки
        this.scene.clearSelection();
        
        // Подсвечиваем элементы участвующие в действии
        if (this.scene.sprites[action.from.y] && this.scene.sprites[action.from.y][action.from.x]) {
            this.scene.sprites[action.from.y][action.from.x].setTint(0xff0000); // красный
            this.scene.sprites[action.from.y][action.from.x].setScale(1.2);
        }
        
        if (this.scene.sprites[action.to.y] && this.scene.sprites[action.to.y][action.to.x]) {
            this.scene.sprites[action.to.y][action.to.x].setTint(0x0000ff); // синий
            this.scene.sprites[action.to.y][action.to.x].setScale(1.2);
        }
    }
} 