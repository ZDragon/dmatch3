import { recordAction } from './replay-system';

export class ReplayManager {
    constructor(scene) {
        this.scene = scene;
    }

    startReplay(log) {
        this.scene.actionLog = log;
        this.scene.isReplaying = true;
        this.scene.replayIndex = 0;
        this.scene.updateStatus('Начало воспроизведения реплея');
        this.replayNextAction();
    }

    async replayNextAction() {
        if (!this.scene.isReplaying || this.scene.replayIndex >= this.scene.actionLog.length) {
            this.scene.isReplaying = false;
            this.scene.updateStatus('Воспроизведение реплея завершено');
            return;
        }

        const action = this.scene.actionLog[this.scene.replayIndex];
        this.scene.replayIndex++;

        switch (action.action) {
            case 'swap':
                await this.swapElementsForReplay(action.data);
                break;
            case 'match':
                await this.handleMatchForReplay(action.data);
                break;
            default:
                console.warn('Неизвестное действие в реплее:', action);
        }

        // Запускаем следующее действие с небольшой задержкой
        setTimeout(() => this.replayNextAction(), 500);
    }

    async swapElementsForReplay(action) {
        const { from, to } = action;
        
        // Обновляем состояние игры
        const temp = this.scene.grid[from.y][from.x];
        this.scene.grid[from.y][from.x] = this.scene.grid[to.y][to.x];
        this.scene.grid[to.y][to.x] = temp;
        
        // Анимируем обмен
        await this.scene.animationManager.animateSwap(from, to);
        
        // Проверяем матчи
        const matches = this.scene.gameLogic.detectMatches(this.scene.grid);
        if (matches.length > 0) {
            await this.handleMatchForReplay({ matches });
        }
    }

    async handleMatchForReplay(action) {
        const { matches } = action;
        
        // Анимируем удаление матчей
        await this.scene.animationManager.animateMatches(matches);
        
        // Удаляем матчи из сетки
        this.scene.gameLogic.removeMatches(this.scene.grid, matches);
        
        // Применяем гравитацию
        this.scene.gameLogic.applyGravity(this.scene.grid);
        await this.scene.animationManager.animateGravity();
        
        // Создаем новые элементы
        this.scene.gameLogic.spawnNewElements(this.scene.grid);
        await this.scene.animationManager.animateNewElements();
        
        // Обновляем отображение
        this.scene.renderGrid();
        this.scene.updateProgressDisplay();
    }
} 