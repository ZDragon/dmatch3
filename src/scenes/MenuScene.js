import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Фон
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000);
        
        // Заголовок
        this.add.text(width / 2, height / 4, 'MATCH-3', {
            fontSize: '64px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Создаем кнопки
        this.createButton(width / 2, height / 2, 'Новая игра', () => {
            this.sound.play('click');
            this.scene.start('MainScene');
        });
        
        this.createButton(width / 2, height / 2 + 80, 'Продолжить', () => {
            this.sound.play('click');
            this.loadGameState();
        });
        
        this.createButton(width / 2, height / 2 + 160, 'Настройки', () => {
            this.sound.play('click');
            this.showSettings();
        });
        
        // Запускаем фоновую музыку
        if (!this.sound.get('background-music')) {
            const music = this.sound.add('background-music', {
                volume: 0.5,
                loop: true
            });
            music.play();
        }
    }
    
    createButton(x, y, text, callback) {
        const button = this.add.rectangle(x, y, 200, 50, 0x4CAF50)
            .setInteractive()
            .on('pointerover', () => button.setFillStyle(0x66BB6A))
            .on('pointerout', () => button.setFillStyle(0x4CAF50))
            .on('pointerdown', callback);
            
        this.add.text(x, y, text, {
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        return button;
    }
    
    loadGameState() {
        const savedState = localStorage.getItem('match3-save');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                this.scene.start('MainScene', { savedState: state });
            } catch (e) {
                console.error('Ошибка загрузки сохранения:', e);
                this.showError('Ошибка загрузки сохранения');
            }
        } else {
            this.showError('Нет сохраненной игры');
        }
    }
    
    showSettings() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Создаем затемнение
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
        
        // Создаем окно настроек
        const settingsWindow = this.add.rectangle(width / 2, height / 2, 400, 300, 0xffffff)
            .setStrokeStyle(2, 0x000000);
            
        // Заголовок
        this.add.text(width / 2, height / 2 - 100, 'Настройки', {
            fontSize: '32px',
            color: '#000000'
        }).setOrigin(0.5);
        
        // Чекбокс для музыки
        const musicEnabled = this.sound.get('background-music')?.isPlaying ?? true;
        const musicCheckbox = this.add.rectangle(width / 2 - 100, height / 2, 30, 30, musicEnabled ? 0x4CAF50 : 0xcccccc)
            .setInteractive()
            .on('pointerdown', () => {
                const music = this.sound.get('background-music');
                if (music.isPlaying) {
                    music.stop();
                    musicCheckbox.setFillStyle(0xcccccc);
                } else {
                    music.play();
                    musicCheckbox.setFillStyle(0x4CAF50);
                }
            });
            
        this.add.text(width / 2 - 50, height / 2, 'Фоновая музыка', {
            fontSize: '24px',
            color: '#000000'
        }).setOrigin(0, 0.5);
        
        // Кнопка закрытия
        const closeButton = this.add.rectangle(width / 2, height / 2 + 100, 150, 40, 0x4CAF50)
            .setInteractive()
            .on('pointerdown', () => {
                overlay.destroy();
                settingsWindow.destroy();
                closeButton.destroy();
                musicCheckbox.destroy();
                this.children.list.forEach(child => {
                    if (child.type === 'Text' && child.text === 'Настройки' || child.text === 'Фоновая музыка') {
                        child.destroy();
                    }
                });
            });
            
        this.add.text(width / 2, height / 2 + 100, 'Закрыть', {
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(0.5);
    }
    
    showError(message) {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        const errorText = this.add.text(width / 2, height - 100, message, {
            fontSize: '24px',
            color: '#ff0000'
        }).setOrigin(0.5);
        
        this.time.delayedCall(2000, () => {
            errorText.destroy();
        });
    }
} 