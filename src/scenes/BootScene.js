import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Создаем и отображаем прогресс-бар
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(240, 270, 320, 50);
        
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const loadingText = this.add.text(width / 2, height / 2 - 50, 'Загрузка...', {
            font: '20px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Обработчик прогресса загрузки
        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(250, 280, 300 * value, 30);
        });

        // Обработчик завершения загрузки
        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
        });

        // Загружаем звуки
        this.load.audio('background-music', 'assets/audio/background.wav');
        this.load.audio('click', 'assets/audio/click.wav');
        this.load.audio('match', 'assets/audio/match.wav');

        // Генерируем заглушки для всех изображений
        this.generatePlaceholders();
    }

    generatePlaceholders() {
        // Генерируем заглушку для замка
        this.generateCastle();

        // Генерируем заглушки для зон
        this.generateZonePlaceholders('mill', 0x8B4513); // Коричневый для мельницы
        this.generateZonePlaceholders('mine', 0x696969); // Серый для шахты
        this.generateZonePlaceholders('farm', 0x228B22); // Зеленый для фермы

        // Генерируем иконки ресурсов
        this.generateResourceIcons();
    }

    generateCastle() {
        const graphics = this.add.graphics();
        
        // Основное здание
        graphics.fillStyle(0x808080);
        graphics.fillRect(0, 0, 200, 150);
        
        // Башни
        graphics.fillStyle(0x696969);
        graphics.fillRect(20, 0, 40, 60);
        graphics.fillRect(140, 0, 40, 60);
        
        // Крыша
        graphics.fillStyle(0x8B0000);
        graphics.fillTriangle(0, 0, 100, -50, 200, 0);
        
        // Флаги
        graphics.fillStyle(0xFF0000);
        graphics.fillRect(30, -40, 10, 20);
        graphics.fillRect(150, -40, 10, 20);
        
        graphics.generateTexture('castle', 200, 150);
        graphics.destroy();
    }

    generateZonePlaceholders(prefix, baseColor) {
        // Разрушенное состояние
        this.generateRuins(prefix, baseColor);
        
        // Первый этап строительства
        this.generateConstruction1(prefix, baseColor);
        
        // Второй этап строительства
        this.generateConstruction2(prefix, baseColor);
        
        // Завершенное здание
        this.generateComplete(prefix, baseColor);
    }

    generateRuins(prefix, baseColor) {
        const graphics = this.add.graphics();
        
        // Основание
        graphics.fillStyle(baseColor);
        graphics.fillRect(0, 0, 150, 100);
        
        // Разрушенные стены
        graphics.fillStyle(0x696969);
        graphics.fillRect(20, 20, 30, 40);
        graphics.fillRect(100, 20, 30, 40);
        
        // Обломки
        graphics.fillStyle(0x8B4513);
        for (let i = 0; i < 5; i++) {
            graphics.fillRect(
                Math.random() * 100,
                Math.random() * 60 + 40,
                20,
                10
            );
        }
        
        graphics.generateTexture(`${prefix}-ruins`, 150, 100);
        graphics.destroy();
    }

    generateConstruction1(prefix, baseColor) {
        const graphics = this.add.graphics();
        
        // Фундамент
        graphics.fillStyle(0x696969);
        graphics.fillRect(0, 0, 150, 100);
        
        // Начало стен
        graphics.fillStyle(baseColor);
        graphics.fillRect(20, 20, 110, 60);
        
        // Строительные леса
        graphics.lineStyle(2, 0x8B4513);
        graphics.strokeRect(10, 10, 130, 80);
        graphics.lineBetween(10, 10, 140, 90);
        graphics.lineBetween(140, 10, 10, 90);
        
        graphics.generateTexture(`${prefix}-construction1`, 150, 100);
        graphics.destroy();
    }

    generateConstruction2(prefix, baseColor) {
        const graphics = this.add.graphics();
        
        // Основное здание
        graphics.fillStyle(baseColor);
        graphics.fillRect(0, 0, 150, 100);
        
        // Крыша
        graphics.fillStyle(0x8B0000);
        graphics.fillTriangle(0, 0, 75, -30, 150, 0);
        
        // Окна
        graphics.fillStyle(0x87CEEB);
        graphics.fillRect(30, 30, 20, 30);
        graphics.fillRect(100, 30, 20, 30);
        
        // Дверь
        graphics.fillStyle(0x8B4513);
        graphics.fillRect(65, 50, 20, 50);
        
        graphics.generateTexture(`${prefix}-construction2`, 150, 100);
        graphics.destroy();
    }

    generateComplete(prefix, baseColor) {
        const graphics = this.add.graphics();
        
        // Основное здание
        graphics.fillStyle(baseColor);
        graphics.fillRect(0, 0, 150, 100);
        
        // Крыша
        graphics.fillStyle(0x8B0000);
        graphics.fillTriangle(0, 0, 75, -30, 150, 0);
        
        // Окна с рамами
        graphics.fillStyle(0x87CEEB);
        graphics.fillRect(30, 30, 20, 30);
        graphics.fillRect(100, 30, 20, 30);
        graphics.lineStyle(2, 0x000000);
        graphics.strokeRect(30, 30, 20, 30);
        graphics.strokeRect(100, 30, 20, 30);
        
        // Дверь с деталями
        graphics.fillStyle(0x8B4513);
        graphics.fillRect(65, 50, 20, 50);
        graphics.lineStyle(2, 0x000000);
        graphics.strokeRect(65, 50, 20, 50);
        
        // Детали здания
        graphics.lineStyle(2, 0x000000);
        graphics.strokeRect(0, 0, 150, 100);
        
        graphics.generateTexture(`${prefix}-complete`, 150, 100);
        graphics.destroy();
    }

    generateResourceIcons() {
        // Иконка муки
        this.generateFlourIcon();
        
        // Иконка руды
        this.generateOreIcon();
        
        // Иконка зерна
        this.generateGrainIcon();
    }

    generateFlourIcon() {
        const graphics = this.add.graphics();
        
        // Мешок
        graphics.fillStyle(0xF5DEB3);
        graphics.fillRect(0, 0, 50, 70);
        
        // Детали мешка
        graphics.lineStyle(2, 0x8B4513);
        graphics.strokeRect(0, 0, 50, 70);
        graphics.lineBetween(0, 20, 50, 20);
        
        // Мука
        graphics.fillStyle(0xFFFFFF);
        graphics.fillCircle(25, 45, 15);
        
        graphics.generateTexture('resource-flour', 50, 70);
        graphics.destroy();
    }

    generateOreIcon() {
        const graphics = this.add.graphics();
        
        // Камень
        graphics.fillStyle(0x696969);
        graphics.fillRect(0, 0, 50, 50);
        
        // Блестящие частицы
        graphics.fillStyle(0xFFD700);
        for (let i = 0; i < 5; i++) {
            graphics.fillCircle(
                Math.random() * 40 + 5,
                Math.random() * 40 + 5,
                2
            );
        }
        
        graphics.generateTexture('resource-ore', 50, 50);
        graphics.destroy();
    }

    generateGrainIcon() {
        const graphics = this.add.graphics();
        
        // Колос
        graphics.fillStyle(0xFFD700);
        graphics.fillRect(20, 0, 10, 50);
        
        // Зерна
        for (let i = 0; i < 5; i++) {
            graphics.fillCircle(25, i * 10 + 5, 5);
        }
        
        graphics.generateTexture('resource-grain', 50, 50);
        graphics.destroy();
    }

    create() {
        this.scene.start('MenuScene');
    }
}

export default BootScene; 