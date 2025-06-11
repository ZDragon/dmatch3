import Phaser from 'phaser';

export class AdminPanelScene extends Phaser.Scene {
    constructor() {
        super({ key: 'AdminPanelScene' });
    }

    create() {
        // Создаем контейнер для DOM-элементов
        this.domContainer = document.createElement('div');
        this.domContainer.style.position = 'absolute';
        this.domContainer.style.top = '0';
        this.domContainer.style.left = '0';
        this.domContainer.style.width = '100%';
        this.domContainer.style.height = '100%';
        this.domContainer.style.pointerEvents = 'none';
        document.body.appendChild(this.domContainer);

        // Добавляем полупрозрачный фон
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.8)
            .setOrigin(0, 0);

        // Создаем панель
        const panel = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            400,
            600,
            0xffffff
        ).setStrokeStyle(2, 0x000000);

        // Заголовок
        this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 270,
            'Панель администратора',
            {
                fontSize: '24px',
                fill: '#000000',
                fontWeight: 'bold'
            }
        ).setOrigin(0.5);

        // Создаем поля ввода
        this.createInputFields();
        
        // Создаем кнопки
        this.createButtons();

        // Кнопка закрытия
        const closeButton = this.add.rectangle(
            this.cameras.main.centerX + 180,
            this.cameras.main.centerY - 270,
            30,
            30,
            0xff0000
        ).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            this.scene.stop();
        });

        this.add.text(
            this.cameras.main.centerX + 180,
            this.cameras.main.centerY - 270,
            'X',
            {
                fontSize: '20px',
                fill: '#ffffff'
            }
        ).setOrigin(0.5);
    }

    createInputFields() {
        const startX = this.cameras.main.centerX - 150;
        const startY = this.cameras.main.centerY - 220;
        const spacing = 40;

        // Поле ввода сида
        this.add.text(startX, startY, 'Seed:', { fontSize: '16px', fill: '#000' });
        this.seedInput = document.createElement('input');
        this.seedInput.type = 'text';
        this.seedInput.placeholder = 'Введите сид';
        this.seedInput.style.position = 'absolute';
        this.seedInput.style.top = `${startY + 25}px`;
        this.seedInput.style.left = `${startX}px`;
        this.seedInput.style.width = '100px';
        this.seedInput.style.pointerEvents = 'auto';
        this.seedInput.style.zIndex = '1000';
        this.domContainer.appendChild(this.seedInput);

        // Модификатор гемов
        this.add.text(startX, startY + spacing + 10, 'Gem Modifier:', { fontSize: '16px', fill: '#000' });
        
        // Поле выбора типа гема
        this.add.text(startX, startY + spacing + 35, 'Тип (1-5):', { fontSize: '14px', fill: '#000' });
        this.gemTypeInput = document.createElement('input');
        this.gemTypeInput.type = 'number';
        this.gemTypeInput.placeholder = 'Тип гема';
        this.gemTypeInput.style.position = 'absolute';
        this.gemTypeInput.style.top = `${startY + spacing + 55}px`;
        this.gemTypeInput.style.left = `${startX}px`;
        this.gemTypeInput.style.width = '60px';
        this.gemTypeInput.style.pointerEvents = 'auto';
        this.gemTypeInput.style.zIndex = '1000';
        this.domContainer.appendChild(this.gemTypeInput);

        // Поле множителя
        this.add.text(startX + 80, startY + spacing + 35, 'x:', { fontSize: '14px', fill: '#000' });
        this.gemMultiplierInput = document.createElement('input');
        this.gemMultiplierInput.type = 'number';
        this.gemMultiplierInput.placeholder = 'Множитель';
        this.gemMultiplierInput.style.position = 'absolute';
        this.gemMultiplierInput.style.top = `${startY + spacing + 55}px`;
        this.gemMultiplierInput.style.left = `${startX + 100}px`;
        this.gemMultiplierInput.style.width = '60px';
        this.gemMultiplierInput.style.pointerEvents = 'auto';
        this.gemMultiplierInput.style.zIndex = '1000';
        this.domContainer.appendChild(this.gemMultiplierInput);

        // Настройки миссии
        this.add.text(startX, startY + spacing * 3 + 10, 'Настройки миссии:', { fontSize: '16px', fill: '#000' });
        
        // Выбор зоны
        this.add.text(startX, startY + spacing * 3 + 35, 'Зона:', { fontSize: '14px', fill: '#000' });
        this.zoneSelect = document.createElement('select');
        this.zoneSelect.style.position = 'absolute';
        this.zoneSelect.style.top = `${startY + spacing * 3 + 55}px`;
        this.zoneSelect.style.left = `${startX}px`;
        this.zoneSelect.style.width = '120px';
        this.zoneSelect.style.pointerEvents = 'auto';
        this.zoneSelect.style.zIndex = '1000';
        ['mill', 'mine', 'farm'].forEach(zone => {
            const option = document.createElement('option');
            option.value = zone;
            option.text = zone.charAt(0).toUpperCase() + zone.slice(1);
            this.zoneSelect.appendChild(option);
        });
        this.domContainer.appendChild(this.zoneSelect);

        // Уровень миссии
        this.add.text(startX, startY + spacing * 3 + 85, 'Уровень:', { fontSize: '14px', fill: '#000' });
        this.levelSelect = document.createElement('select');
        this.levelSelect.style.position = 'absolute';
        this.levelSelect.style.top = `${startY + spacing * 3 + 105}px`;
        this.levelSelect.style.left = `${startX}px`;
        this.levelSelect.style.width = '120px';
        this.levelSelect.style.pointerEvents = 'auto';
        this.levelSelect.style.zIndex = '1000';
        [0, 1, 2, 3].forEach(level => {
            const option = document.createElement('option');
            option.value = level;
            option.text = `Уровень ${level}`;
            this.levelSelect.appendChild(option);
        });
        this.domContainer.appendChild(this.levelSelect);

        // Поле загрузки лога
        this.add.text(startX, startY + spacing * 5 + 10, 'Импорт лога:', { fontSize: '16px', fill: '#000' });
        this.logInput = document.createElement('textarea');
        this.logInput.placeholder = 'Вставьте лог действий';
        this.logInput.style.position = 'absolute';
        this.logInput.style.top = `${startY + spacing * 5 + 35}px`;
        this.logInput.style.left = `${startX}px`;
        this.logInput.style.width = '280px';
        this.logInput.style.height = '100px';
        this.logInput.style.pointerEvents = 'auto';
        this.logInput.style.zIndex = '1000';
        this.domContainer.appendChild(this.logInput);
    }

    createButtons() {
        const startX = this.cameras.main.centerX - 150;
        const startY = this.cameras.main.centerY - 220;
        const spacing = 40;

        // Кнопка запуска обычной игры
        this.createButton(
            startX,
            startY + spacing * 2,
            150,
            30,
            'Запустить игру',
            () => {
                const mainScene = this.scene.get('MainScene');
                mainScene.currentSeed = parseInt(this.seedInput.value) || 12345;
                mainScene.gemModifier = {
                    targetGemType: parseInt(this.gemTypeInput.value) || 1,
                    multiplier: parseFloat(this.gemMultiplierInput.value) || 1
                };
                this.scene.stop();
                mainScene.scene.restart();
            }
        );

        // Кнопка запуска миссии
        this.createButton(
            startX,
            startY + spacing * 4 + 20,
            150,
            30,
            'Запустить миссию',
            () => {
                const mainScene = this.scene.get('MainScene');
                const zoneId = this.zoneSelect.value;
                const level = parseInt(this.levelSelect.value);
                
                // Создаем данные миссии
                const missionData = {
                    zoneId,
                    zoneData: {
                        missions: [
                            { type: 'collect', amount: 20, gemType: 1, moves: 15 },
                            { type: 'collect', amount: 25, gemType: 2, moves: 12 },
                            { type: 'collect', amount: 30, gemType: 3, moves: 10 },
                            { type: 'collect', amount: 35, gemType: 4, moves: 8 }
                        ]
                    },
                    currentLevel: level,
                    isResourceMission: level >= 3
                };

                mainScene.currentSeed = parseInt(this.seedInput.value) || 12345;
                mainScene.gemModifier = {
                    targetGemType: parseInt(this.gemTypeInput.value) || 1,
                    multiplier: parseFloat(this.gemMultiplierInput.value) || 1
                };

                this.scene.stop();
                mainScene.scene.restart({ mission: missionData });
            }
        );

        // Кнопка экспорта лога
        this.createButton(
            startX,
            startY + spacing * 7,
            150,
            30,
            'Экспорт лога',
            () => {
                const mainScene = this.scene.get('MainScene');
                mainScene.exportActionLog();
            }
        );

        // Кнопка импорта и реплея
        this.createButton(
            startX,
            startY + spacing * 8,
            150,
            30,
            'Импорт и реплей',
            () => {
                const mainScene = this.scene.get('MainScene');
                mainScene.replayManager.importAndReplay(this.logInput.value);
                this.scene.stop();
            }
        );
    }

    createButton(x, y, width, height, text, callback) {
        const button = this.add.rectangle(x + width/2, y + height/2, width, height, 0x4CAF50)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', callback)
            .on('pointerover', () => button.setFillStyle(0x66BB6A))
            .on('pointerout', () => button.setFillStyle(0x4CAF50));

        this.add.text(x + width/2, y + height/2, text, {
            fontSize: '14px',
            fill: '#ffffff'
        }).setOrigin(0.5);
    }

    shutdown() {
        // Удаляем все DOM-элементы
        if (this.domContainer) {
            // Удаляем все дочерние элементы
            while (this.domContainer.firstChild) {
                this.domContainer.removeChild(this.domContainer.firstChild);
            }
            // Удаляем сам контейнер
            document.body.removeChild(this.domContainer);
            this.domContainer = null;
        }

        // Очищаем ссылки на элементы
        this.seedInput = null;
        this.gemTypeInput = null;
        this.gemMultiplierInput = null;
        this.zoneSelect = null;
        this.levelSelect = null;
        this.logInput = null;
    }
}

export default AdminPanelScene; 