import Phaser from 'phaser';

export class UIManager {
    constructor(scene) {
        this.scene = scene;
        this.uiPosition = {
            x: this.scene.GRID_WIDTH * this.scene.TILE_SIZE + 20,
            y: 20
        };
        
        // Инициализация полей ввода
        this.gemTypeInput = null;
        this.gemMultiplierInput = null;
    }

    createUI() {
        // Создаем фон для UI
        this.scene.add.rectangle(
            this.uiPosition.x - 10,
            this.scene.GAME_HEIGHT / 2,
            200,
            this.scene.GAME_HEIGHT - 20,
            0x000000,
            0.1
        ).setOrigin(0, 0);

        // Создаем элементы UI
        this.createInputField('seed', 'Сид:', this.uiPosition.x, this.uiPosition.y);
        this.gemTypeInput = this.createInputField('gemType', 'Тип камня:', this.uiPosition.x, this.uiPosition.y + 40);
        this.gemMultiplierInput = this.createInputField('gemMultiplier', 'Множитель:', this.uiPosition.x, this.uiPosition.y + 80);
        this.createText('movesLeft', 'Ходов осталось: 0', this.uiPosition.x, this.uiPosition.y + 120);
        this.createText('objective', 'Задание: Собрать 0 камней', this.uiPosition.x, this.uiPosition.y + 160);
        this.createText('progress', 'Прогресс: 0/0', this.uiPosition.x, this.uiPosition.y + 200);
        this.createText('status', 'Статус: Готов к игре', this.uiPosition.x, this.uiPosition.y + 240);
        this.createText('actionLog', 'Лог действий:', this.uiPosition.x, this.uiPosition.y + 280);

        // Создаем кнопки
        this.createButton('newGame', 'Новая игра', this.uiPosition.x, this.uiPosition.y + 320, () => {
            this.scene.gameLogic.startNewGame();
        });

        this.createButton('exportLog', 'Экспорт лога', this.uiPosition.x, this.uiPosition.y + 360, () => {
            this.exportLog();
        });

        this.createButton('importLog', 'Импорт лога', this.uiPosition.x, this.uiPosition.y + 400, () => {
            this.importLog();
        });
    }

    createInputField(name, label, x, y) {
        // Создаем текст метки
        this.scene.add.text(x, y, label, {
            fontSize: '16px',
            fill: '#fff'
        }).setOrigin(0, 0);

        // Создаем поле ввода
        const input = this.scene.add.text(x, y + 20, '', {
            fontSize: '16px',
            fill: '#fff',
            backgroundColor: '#000',
            padding: { x: 5, y: 5 }
        }).setOrigin(0, 0);

        // Делаем поле интерактивным
        input.setInteractive();
        input.on('pointerdown', () => {
            const value = prompt(`Введите ${label.toLowerCase()}`);
            if (value !== null) {
                input.setText(value);
                if (name === 'seed') {
                    this.scene.currentSeed = parseInt(value) || 0;
                } else if (name === 'gemType') {
                    const type = parseInt(value);
                    if (!isNaN(type) && type >= 1 && type <= this.scene.ELEMENT_TYPES) {
                        this.scene.gemModifier.targetGemType = type;
                    }
                } else if (name === 'gemMultiplier') {
                    const multiplier = parseFloat(value);
                    if (!isNaN(multiplier) && multiplier >= 0.1 && multiplier <= 10.0) {
                        this.scene.gemModifier.multiplier = multiplier;
                    }
                }
            }
        });

        return input;
    }

    createButton(name, text, x, y, callback) {
        const button = this.scene.add.text(x, y, text, {
            fontSize: '16px',
            fill: '#fff',
            backgroundColor: '#000',
            padding: { x: 10, y: 5 }
        })
        .setOrigin(0, 0)
        .setInteractive()
        .on('pointerdown', callback);

        return button;
    }

    createText(name, text, x, y) {
        return this.scene.add.text(x, y, text, {
            fontSize: '16px',
            fill: '#fff'
        }).setOrigin(0, 0);
    }

    updateMovesDisplay() {
        const movesText = this.scene.children.list.find(child => 
            child.text && child.text.includes('Ходов осталось:')
        );
        if (movesText) {
            movesText.setText(`Ходов осталось: ${this.scene.movesLeft}`);
        }
    }

    updateObjectiveDisplay() {
        const objectiveText = this.scene.children.list.find(child => 
            child.text && child.text.includes('Задание:')
        );
        if (objectiveText && this.scene.objective) {
            objectiveText.setText(`Задание: Собрать ${this.scene.objective.amount} камней типа ${this.scene.objective.gemType}`);
        }
    }

    updateProgressDisplay() {
        const progressText = this.scene.children.list.find(child => 
            child.text && child.text.includes('Прогресс:')
        );
        if (progressText && this.scene.objective) {
            const current = this.scene.collectedGems[this.scene.objective.gemType] || 0;
            progressText.setText(`Прогресс: ${current}/${this.scene.objective.amount}`);
        }
    }

    updateStatus(message) {
        const statusText = this.scene.children.list.find(child => 
            child.text && child.text.includes('Статус:')
        );
        if (statusText) {
            statusText.setText(`Статус: ${message}`);
        }
    }

    updateActionLog() {
        const logText = this.scene.children.list.find(child => 
            child.text && child.text.includes('Лог действий:')
        );
        if (logText) {
            const lastAction = this.scene.actionLog[this.scene.actionLog.length - 1];
            if (lastAction) {
                logText.setText(`Лог действий: ${lastAction.action} (${new Date(lastAction.timestamp).toLocaleTimeString()})`);
            }
        }
    }

    clearAllOverlays() {
        if (this.scene.sprites) {
            this.scene.sprites.forEach(row => 
                row.forEach(sprite => {
                    if (sprite) {
                        sprite.clearTint();
                        sprite.setScale(1.0);
                        sprite.setAlpha(1.0);
                    }
                })
            );
        }
    }

    showGameOverWindow() {
        if (this.scene.gameOverWindow) {
            this.scene.gameOverWindow.destroy();
        }
        
        this.scene.gameOverWindow = this.scene.add.container(this.scene.GAME_WIDTH / 2, this.scene.GAME_HEIGHT / 2);
        
        const background = this.scene.add.rectangle(0, 0, 300, 200, 0x000000, 0.8);
        const text = this.scene.add.text(0, 0, 'Игра окончена!\nХоды закончились', {
            fontSize: '24px',
            fill: '#fff',
            align: 'center'
        }).setOrigin(0.5);
        
        const button = this.scene.add.text(0, 50, 'Новая игра', {
            fontSize: '20px',
            fill: '#fff',
            backgroundColor: '#000',
            padding: { x: 10, y: 5 }
        })
        .setOrigin(0.5)
        .setInteractive()
        .on('pointerdown', () => {
            this.scene.gameLogic.startNewGame();
        });
        
        this.scene.gameOverWindow.add([background, text, button]);
    }

    hideGameOverWindow() {
        if (this.scene.gameOverWindow) {
            this.scene.gameOverWindow.destroy();
            this.scene.gameOverWindow = null;
        }
    }

    showWinWindow() {
        if (this.scene.winWindow) {
            this.scene.winWindow.destroy();
        }
        
        this.scene.winWindow = this.scene.add.container(this.scene.GAME_WIDTH / 2, this.scene.GAME_HEIGHT / 2);
        
        const background = this.scene.add.rectangle(0, 0, 300, 200, 0x000000, 0.8);
        const text = this.scene.add.text(0, 0, 'Поздравляем!\nЗадание выполнено!', {
            fontSize: '24px',
            fill: '#fff',
            align: 'center'
        }).setOrigin(0.5);
        
        const button = this.scene.add.text(0, 50, 'Новая игра', {
            fontSize: '20px',
            fill: '#fff',
            backgroundColor: '#000',
            padding: { x: 10, y: 5 }
        })
        .setOrigin(0.5)
        .setInteractive()
        .on('pointerdown', () => {
            this.scene.gameLogic.startNewGame();
        });
        
        this.scene.winWindow.add([background, text, button]);
    }

    hideWinWindow() {
        if (this.scene.winWindow) {
            this.scene.winWindow.destroy();
            this.scene.winWindow = null;
        }
    }

    exportLog() {
        const logData = JSON.stringify(this.scene.actionLog, null, 2);
        const blob = new Blob([logData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `match3-log-${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importLog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const log = JSON.parse(event.target.result);
                        this.scene.actionLog = log;
                        this.scene.isReplaying = true;
                        this.scene.replayIndex = 0;
                        this.scene.replayNextAction();
                    } catch (error) {
                        console.error('Ошибка при импорте лога:', error);
                        this.updateStatus('Ошибка при импорте лога');
                    }
                };
                reader.readAsText(file);
            }
        };
        
        input.click();
    }
} 