import Phaser from 'phaser';

export class AdminPanelScene extends Phaser.Scene {
    constructor() {
        super({ key: 'AdminPanelScene' });
    }

    create() {
        // Создаем полупрозрачный фон
        this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000,
            0.7
        );

        // Создаем панель
        const panel = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            800, // Увеличиваем ширину панели
            600,
            0xffffff
        ).setStrokeStyle(2, 0x000000);

        // Создаем контейнер для DOM-элементов
        this.domContainer = document.createElement('div');
        this.domContainer.style.position = 'absolute';
        this.domContainer.style.top = '0';
        this.domContainer.style.left = '0';
        this.domContainer.style.width = '100%';
        this.domContainer.style.height = '100%';
        this.domContainer.style.pointerEvents = 'none';
        document.body.appendChild(this.domContainer);

        // Создаем элементы управления
        this.createInputFields();
        this.createButtons();

        // Добавляем кнопку закрытия
        this.add.text(
            this.cameras.main.centerX + 380,
            this.cameras.main.centerY - 280,
            'X',
            { fontSize: '24px', fill: '#000' }
        ).setInteractive()
        .on('pointerdown', () => {
            this.shutdown(); // Вызываем shutdown перед остановкой сцены
            this.scene.stop();
        });
    }

    createInputFields() {
        const startX = this.cameras.main.centerX - 350; // Сдвигаем влево из-за увеличенной ширины
        const startY = this.cameras.main.centerY - 220;
        const spacing = 50;

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
        this.domContainer.appendChild(this.seedInput);

        // Модификатор гемов
        this.add.text(startX, startY + spacing, 'Gem Modifier:', { fontSize: '16px', fill: '#000' });
        
        // Поле выбора типа гема
        this.add.text(startX, startY + spacing + 25, 'Тип (1-5):', { fontSize: '14px', fill: '#000' });
        this.gemTypeInput = document.createElement('input');
        this.gemTypeInput.type = 'number';
        this.gemTypeInput.placeholder = 'Тип гема';
        this.gemTypeInput.style.position = 'absolute';
        this.gemTypeInput.style.top = `${startY + spacing + 45}px`;
        this.gemTypeInput.style.left = `${startX}px`;
        this.gemTypeInput.style.width = '60px';
        this.gemTypeInput.style.pointerEvents = 'auto';
        this.domContainer.appendChild(this.gemTypeInput);

        // Поле множителя
        this.add.text(startX + 80, startY + spacing + 25, 'x:', { fontSize: '14px', fill: '#000' });
        this.gemMultiplierInput = document.createElement('input');
        this.gemMultiplierInput.type = 'number';
        this.gemMultiplierInput.placeholder = 'Множитель';
        this.gemMultiplierInput.style.position = 'absolute';
        this.gemMultiplierInput.style.top = `${startY + spacing + 45}px`;
        this.gemMultiplierInput.style.left = `${startX + 100}px`;
        this.gemMultiplierInput.style.width = '60px';
        this.gemMultiplierInput.style.pointerEvents = 'auto';
        this.domContainer.appendChild(this.gemMultiplierInput);

        // Настройки миссии
        this.add.text(startX, startY + spacing * 2 + 20, 'Настройки миссии:', { fontSize: '16px', fill: '#000' });
        
        // Выбор зоны
        this.add.text(startX, startY + spacing * 2 + 45, 'Зона:', { fontSize: '14px', fill: '#000' });
        this.zoneSelect = document.createElement('select');
        this.zoneSelect.style.position = 'absolute';
        this.zoneSelect.style.top = `${startY + spacing * 2 + 65}px`;
        this.zoneSelect.style.left = `${startX}px`;
        this.zoneSelect.style.width = '120px';
        this.zoneSelect.style.pointerEvents = 'auto';
        ['mill', 'mine', 'farm'].forEach(zone => {
            const option = document.createElement('option');
            option.value = zone;
            option.text = zone.charAt(0).toUpperCase() + zone.slice(1);
            this.zoneSelect.appendChild(option);
        });
        this.domContainer.appendChild(this.zoneSelect);

        // Уровень миссии
        this.add.text(startX, startY + spacing * 2 + 95, 'Уровень:', { fontSize: '14px', fill: '#000' });
        this.levelSelect = document.createElement('select');
        this.levelSelect.style.position = 'absolute';
        this.levelSelect.style.top = `${startY + spacing * 2 + 115}px`;
        this.levelSelect.style.left = `${startX}px`;
        this.levelSelect.style.width = '120px';
        this.levelSelect.style.pointerEvents = 'auto';
        [0, 1, 2, 3].forEach(level => {
            const option = document.createElement('option');
            option.value = level;
            option.text = `Уровень ${level}`;
            this.levelSelect.appendChild(option);
        });
        this.domContainer.appendChild(this.levelSelect);

        // Поле загрузки лога
        this.add.text(startX, startY + spacing * 3 + 40, 'Импорт лога:', { fontSize: '16px', fill: '#000' });
        this.logInput = document.createElement('textarea');
        this.logInput.placeholder = 'Вставьте лог действий';
        this.logInput.style.position = 'absolute';
        this.logInput.style.top = `${startY + spacing * 3 + 65}px`;
        this.logInput.style.left = `${startX}px`;
        this.logInput.style.width = '280px';
        this.logInput.style.height = '100px';
        this.logInput.style.pointerEvents = 'auto';
        this.domContainer.appendChild(this.logInput);
    }

    createButtons() {
        const startX = this.cameras.main.centerX - 200; // Сдвигаем вправо на 150 пикселей
        const startY = this.cameras.main.centerY - 220;
        const spacing = 50;

        // Кнопка запуска обычной игры
        this.uiManager.createButton(startX, startY + spacing * 4 + 40, 150, 30, 'Запустить игру', () => {
            const seed = parseInt(this.seedInput.value) || 12345;
            const gemType = parseInt(this.gemTypeInput.value) || 1;
            const multiplier = parseFloat(this.gemMultiplierInput.value) || 1.0;
            
            this.scene.stop();
            this.scene.start('MainScene', {
                seed: seed,
                gemModifier: {
                    targetGemType: gemType,
                    multiplier: multiplier
                }
            });
        });

        // Кнопка запуска миссии
        this.uiManager.createButton(startX, startY + spacing * 4 + 80, 150, 30, 'Запустить миссию', () => {
            const seed = parseInt(this.seedInput.value) || 12345;
            const gemType = parseInt(this.gemTypeInput.value) || 1;
            const multiplier = parseFloat(this.gemMultiplierInput.value) || 1.0;
            const zoneId = this.zoneSelect.value;
            const level = parseInt(this.levelSelect.value);
            
            const missionData = {
                zoneId: zoneId,
                zoneData: {
                    missions: [{
                        type: 'collect',
                        amount: 20,
                        gemType: gemType,
                        moves: 15
                    }]
                },
                currentLevel: level,
                isResourceMission: false
            };
            
            this.scene.stop();
            this.scene.start('MainScene', {
                mission: missionData,
                seed: seed,
                gemModifier: {
                    targetGemType: gemType,
                    multiplier: multiplier
                }
            });
        });

        // Кнопка экспорта лога
        this.uiManager.createButton(startX, startY + spacing * 4 + 120, 150, 30, 'Экспорт лога', () => {
            const mainScene = this.scene.get('MainScene');
            if (mainScene) {
                mainScene.exportActionLog();
            }
        });

        // Кнопка запуска реплея
        this.uiManager.createButton(startX, startY + spacing * 4 + 160, 150, 30, 'Запустить реплей', () => {
            try {
                const logData = JSON.parse(this.logInput.value);
                if (logData && logData.actions) {
                    this.scene.stop();
                    this.scene.start('MainScene', {
                        replay: logData
                    });
                }
            } catch (e) {
                console.error('Ошибка при парсинге лога:', e);
            }
        });
    }

    shutdown() {
        console.log('shutdown AdminPanelScene');
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

        // Очищаем все объекты сцены
        this.children.list.forEach(child => {
            if (child && child.destroy) {
                child.destroy(true);
            }
        });
    }
}

export default AdminPanelScene; 