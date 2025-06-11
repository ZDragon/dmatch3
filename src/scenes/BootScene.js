import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Создаем прогресс-бар
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Фон
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000);
        
        // Логотип игры
        const title = this.add.text(width / 2, height / 3, 'MATCH-3', {
            fontSize: '64px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Анимация пульсации логотипа
        this.tweens.add({
            targets: title,
            scale: 1.1,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });
        
        // Прогресс-бар
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2, 320, 50);
        
        // Текст прогресса
        const loadingText = this.add.text(width / 2, height / 2 - 50, 'Загрузка...', {
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // Обработчик прогресса загрузки
        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 + 10, 300 * value, 30);
        });
        
        // Обработчик завершения загрузки
        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            this.scene.start('MenuScene');
        });
        
        // Загружаем ресурсы
        this.loadAssets();
    }
    
    loadAssets() {
        // Загружаем звуки
        this.load.audio('background-music', 'assets/audio/background.wav');
        this.load.audio('click', 'assets/audio/click.wav');
        this.load.audio('match', 'assets/audio/match.wav');
        
        // Загружаем изображения для UI
        this.load.image('button', 'assets/images/button.png');
        this.load.image('button-hover', 'assets/images/button-hover.png');
        this.load.image('settings-icon', 'assets/images/settings.png');
    }
} 