import Phaser from 'phaser';
import { UIManager } from '../ui/UIManager';

export class AdminPanelScene extends Phaser.Scene {
    constructor() {
        super({ key: 'AdminPanelScene' });
    }

    create() {
        // Инициализируем UIManager
        this.uiManager = new UIManager(this);

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
            800,
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
            this.shutdown();
            this.scene.stop();
        });
    }

    createInputFields() {
        const startX = this.cameras.main.centerX - 320;
        let y = this.cameras.main.centerY - 220;
        const labelStyle = { fontSize: '16px', fill: '#000', fontStyle: 'bold' };
        const smallLabelStyle = { fontSize: '14px', fill: '#000', fontStyle: 'bold' };
        const fieldWidth = 200;
        const fieldHeight = 28;
        const fieldSpacing = 38;
        const groupSpacing = 55;
        const labelFieldGap = 15;

        // Seed
        this.add.text(startX, y, 'Seed:', labelStyle);
        this.seedInput = document.createElement('input');
        this.seedInput.type = 'text';
        this.seedInput.placeholder = 'Введите сид';
        this.seedInput.style.position = 'absolute';
        this.seedInput.style.top = `${y + labelFieldGap + 7}px`;
        this.seedInput.style.left = `${startX}px`;
        this.seedInput.style.width = `${fieldWidth}px`;
        this.seedInput.style.height = `${fieldHeight}px`;
        this.seedInput.style.fontSize = '16px';
        this.seedInput.style.pointerEvents = 'auto';
        this.domContainer.appendChild(this.seedInput);
        y += groupSpacing;

        // Gem Modifier
        this.add.text(startX, y, 'Gem Modifier:', labelStyle);
        y += fieldSpacing;
        this.add.text(startX, y, 'Тип (1-5):', smallLabelStyle);
        this.gemTypeInput = document.createElement('input');
        this.gemTypeInput.type = 'number';
        this.gemTypeInput.placeholder = 'Тип гема';
        this.gemTypeInput.style.position = 'absolute';
        this.gemTypeInput.style.top = `${y + labelFieldGap + 7}px`;
        this.gemTypeInput.style.left = `${startX}px`;
        this.gemTypeInput.style.width = '80px';
        this.gemTypeInput.style.height = `${fieldHeight}px`;
        this.gemTypeInput.style.fontSize = '16px';
        this.gemTypeInput.style.pointerEvents = 'auto';
        this.domContainer.appendChild(this.gemTypeInput);
        this.add.text(startX + 100, y, 'x:', smallLabelStyle);
        this.gemMultiplierInput = document.createElement('input');
        this.gemMultiplierInput.type = 'number';
        this.gemMultiplierInput.placeholder = 'Множитель';
        this.gemMultiplierInput.style.position = 'absolute';
        this.gemMultiplierInput.style.top = `${y + labelFieldGap + 7}px`;
        this.gemMultiplierInput.style.left = `${startX + 120}px`;
        this.gemMultiplierInput.style.width = '80px';
        this.gemMultiplierInput.style.height = `${fieldHeight}px`;
        this.gemMultiplierInput.style.fontSize = '16px';
        this.gemMultiplierInput.style.pointerEvents = 'auto';
        this.domContainer.appendChild(this.gemMultiplierInput);
        y += groupSpacing;

        // Mission settings
        this.add.text(startX, y, 'Настройки миссии:', labelStyle);
        y += fieldSpacing;
        this.add.text(startX, y, 'Зона:', smallLabelStyle);
        this.zoneSelect = document.createElement('select');
        this.zoneSelect.style.position = 'absolute';
        this.zoneSelect.style.top = `${y + labelFieldGap + 7}px`;
        this.zoneSelect.style.left = `${startX}px`;
        this.zoneSelect.style.width = `${fieldWidth}px`;
        this.zoneSelect.style.height = `${fieldHeight}px`;
        this.zoneSelect.style.fontSize = '16px';
        this.zoneSelect.style.pointerEvents = 'auto';
        ['mill', 'mine', 'farm'].forEach(zone => {
            const option = document.createElement('option');
            option.value = zone;
            option.text = zone.charAt(0).toUpperCase() + zone.slice(1);
            this.zoneSelect.appendChild(option);
        });
        this.domContainer.appendChild(this.zoneSelect);
        y += fieldSpacing;
        this.add.text(startX, y, 'Уровень:', smallLabelStyle);
        this.levelSelect = document.createElement('select');
        this.levelSelect.style.position = 'absolute';
        this.levelSelect.style.top = `${y + labelFieldGap + 7}px`;
        this.levelSelect.style.left = `${startX}px`;
        this.levelSelect.style.width = `${fieldWidth}px`;
        this.levelSelect.style.height = `${fieldHeight}px`;
        this.levelSelect.style.fontSize = '16px';
        this.levelSelect.style.pointerEvents = 'auto';
        [0, 1, 2, 3].forEach(level => {
            const option = document.createElement('option');
            option.value = level;
            option.text = `Уровень ${level}`;
            this.levelSelect.appendChild(option);
        });
        this.domContainer.appendChild(this.levelSelect);
        y += groupSpacing;

        // Log import
        this.add.text(startX, y, 'Импорт лога:', labelStyle);
        y += fieldSpacing - 10;
        this.logInput = document.createElement('textarea');
        this.logInput.placeholder = 'Вставьте лог действий';
        this.logInput.style.position = 'absolute';
        this.logInput.style.top = `${y + labelFieldGap + 7}px`;
        this.logInput.style.left = `${startX}px`;
        this.logInput.style.width = '350px';
        this.logInput.style.height = '100px';
        this.logInput.style.fontSize = '15px';
        this.logInput.style.pointerEvents = 'auto';
        this.domContainer.appendChild(this.logInput);
    }

    createButtons() {
        const startX = this.cameras.main.centerX - 200 + 400; // Сдвигаем вправо на 400
        const startY = this.cameras.main.centerY - 220;
        const spacing = 50;

        // Кнопка запуска обычной игры
        this.createButton(startX, startY + spacing * 4 + 40, 150, 30, 'Запустить игру', () => {
            const seed = parseInt(this.seedInput.value) || 12345;
            const gemType = parseInt(this.gemTypeInput.value) || 1;
            const multiplier = parseFloat(this.gemMultiplierInput.value) || 1.0;
            
            this.shutdown();
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
        this.createButton(startX, startY + spacing * 4 + 80, 150, 30, 'Запустить миссию', () => {
            const seed = parseInt(this.seedInput.value) || 12345;
            const gemType = parseInt(this.gemTypeInput.value) || 1;
            const multiplier = parseFloat(this.gemMultiplierInput.value) || 1.0;
            const zoneId = this.zoneSelect.value;
            const level = parseInt(this.levelSelect.value);
            
            const missionObj = {
                type: 'collect',
                amount: 20,
                gemType: gemType,
                moves: 15
            };
            const missions = [missionObj, missionObj, missionObj, missionObj];
            const missionData = {
                zoneId: zoneId,
                zoneData: { missions },
                currentLevel: level,
                isResourceMission: false
            };
            
            this.shutdown();
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
        this.createButton(startX, startY + spacing * 4 + 120, 150, 30, 'Экспорт лога', () => {
            const mainScene = this.scene.get('MainScene');
            if (mainScene) {
                mainScene.exportActionLog();
            }
        });

        // Кнопка запуска реплея
        this.createButton(startX, startY + spacing * 4 + 160, 150, 30, 'Запустить реплей', () => {
            try {
                const logData = JSON.parse(this.logInput.value);
                if (logData && logData.actions) {
                    this.shutdown();
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