import Phaser from 'phaser';

// Константы для зон
const ZONE_TYPES = {
    MILL: {
        name: 'Мельница',
        levels: [
            { image: 'mill-ruins', mission: { seed: 16765, gemType: 3, amount: 15, moves: 20 } },
            { image: 'mill-construction1', mission: { seed: 19873, gemType: 3, amount: 20, moves: 25 } },
            { image: 'mill-construction2', mission: { seed: 23456, gemType: 3, amount: 25, moves: 30 } },
            { image: 'mill-complete', mission: { seed: 26543, gemType: 3, amount: 30, moves: 35 } }
        ],
        resource: 'мука'
    },
    MINE: {
        name: 'Шахта',
        levels: [
            { image: 'mine-ruins', mission: { seed: 34567, gemType: 4, amount: 15, moves: 20 } },
            { image: 'mine-construction1', mission: { seed: 37654, gemType: 4, amount: 20, moves: 25 } },
            { image: 'mine-construction2', mission: { seed: 40543, gemType: 4, amount: 25, moves: 30 } },
            { image: 'mine-complete', mission: { seed: 43432, gemType: 4, amount: 30, moves: 35 } }
        ],
        resource: 'руда'
    },
    FARM: {
        name: 'Ферма',
        levels: [
            { image: 'farm-ruins', mission: { seed: 56789, gemType: 2, amount: 15, moves: 20 } },
            { image: 'farm-construction1', mission: { seed: 59678, gemType: 2, amount: 20, moves: 25 } },
            { image: 'farm-construction2', mission: { seed: 62567, gemType: 2, amount: 25, moves: 30 } },
            { image: 'farm-complete', mission: { seed: 65456, gemType: 2, amount: 30, moves: 35 } }
        ],
        resource: 'зерно'
    }
};

export class MapScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MapScene' });
        this.zones = {};
        this.resources = {};
    }

    init(data) {
        // Загружаем сохраненное состояние зон
        const savedState = localStorage.getItem('map-state');
        if (savedState) {
            const state = JSON.parse(savedState);
            this.zones = state.zones || {};
            this.resources = state.resources || {};
        }
    }

    preload() {
        // Загружаем изображения для всех уровней всех зон
        Object.values(ZONE_TYPES).forEach(zone => {
            zone.levels.forEach(level => {
                this.load.image(level.image, `assets/images/${level.image}.png`);
            });
        });
        
        // Загружаем изображение замка
        this.load.image('castle', 'assets/images/castle.png');
        
        // Загружаем изображения ресурсов
        this.load.image('resource-flour', 'assets/images/resource-flour.png');
        this.load.image('resource-ore', 'assets/images/resource-ore.png');
        this.load.image('resource-grain', 'assets/images/resource-grain.png');
    }

    create() {
        // Добавляем фон
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x87CEEB)
            .setOrigin(0, 0);

        // Добавляем замок в центре
        const castle = this.add.image(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            'castle'
        ).setScale(0.5);

        // Создаем зоны вокруг замка
        this.createZones();

        // Добавляем отображение ресурсов
        this.createResourceDisplay();

        // Добавляем кнопку возврата в меню
        this.createMenuButton();
    }

    createZones() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        const radius = 200; // Расстояние от центра до зон

        // Располагаем зоны по кругу вокруг замка
        Object.entries(ZONE_TYPES).forEach(([zoneId, zoneData], index) => {
            const angle = (index * (2 * Math.PI / Object.keys(ZONE_TYPES).length));
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);

            // Получаем текущий уровень зоны
            const currentLevel = this.zones[zoneId]?.level || 0;
            const levelData = zoneData.levels[currentLevel];

            // Создаем зону
            const zone = this.add.image(x, y, levelData.image)
                .setScale(0.3)
                .setInteractive({ useHandCursor: true });

            // Добавляем текст с названием и уровнем
            const text = this.add.text(x, y + 50, 
                `${zoneData.name}\nУровень: ${currentLevel + 1}/4`,
                { 
                    fontSize: '16px',
                    fill: '#000',
                    align: 'center'
                }
            ).setOrigin(0.5);

            // Добавляем обработчик клика
            zone.on('pointerdown', () => {
                this.startMission(zoneId, zoneData, currentLevel);
            });

            // Если зона максимального уровня, показываем количество ресурсов
            if (currentLevel === 3) {
                const resourceAmount = this.resources[zoneId] || 0;
                this.add.text(x, y + 80,
                    `${zoneData.resource}: ${resourceAmount}`,
                    { fontSize: '14px', fill: '#000' }
                ).setOrigin(0.5);
            }
        });
    }

    createResourceDisplay() {
        const startX = 20;
        const startY = 20;
        const spacing = 30;

        Object.entries(ZONE_TYPES).forEach(([zoneId, zoneData], index) => {
            const resourceAmount = this.resources[zoneId] || 0;
            
            // Иконка ресурса
            this.add.image(startX, startY + index * spacing, `resource-${zoneData.resource}`)
                .setScale(0.2);
            
            // Текст с количеством
            this.add.text(startX + 25, startY + index * spacing - 10,
                `${zoneData.resource}: ${resourceAmount}`,
                { fontSize: '16px', fill: '#000' }
            );
        });
    }

    createMenuButton() {
        const button = this.add.rectangle(
            this.cameras.main.width - 100,
            30,
            150,
            40,
            0x4CAF50
        ).setInteractive({ useHandCursor: true });

        const buttonText = this.add.text(
            this.cameras.main.width - 100,
            30,
            'Главное меню',
            { fontSize: '16px', fill: '#fff' }
        ).setOrigin(0.5);

        button.on('pointerdown', () => {
            this.scene.start('MenuScene');
        });
    }

    startMission(zoneId, zoneData, currentLevel) {
        if (currentLevel < 3) {
            // Запускаем миссию для повышения уровня
            const missionData = {
                zoneId,
                zoneData: {
                    missions: zoneData.levels.map(l => l.mission)
                },
                currentLevel: currentLevel,
                isResourceMission: false
            };
            this.scene.start('MainScene', { mission: missionData });
        } else {
            // Запускаем миссию для сбора ресурсов
            const missionData = {
                zoneId,
                zoneData: {
                    missions: [{
                        type: 'resource',
                        seed: Math.floor(Math.random() * 100000),
                        gemType: 1, // Используем любой тип гема
                        amount: 20,
                        moves: 25
                    }]
                },
                currentLevel: currentLevel,
                isResourceMission: true
            };
            this.scene.start('MainScene', { mission: missionData });
        }
    }

    updateZoneLevel(zoneId, zoneData, currentLevel, missionCompleted, reward, isResourceMission) {
        if (missionCompleted) {
            // Получаем актуальный уровень зоны
            const actualLevel = this.zones[zoneId]?.level || 0;
            if (isResourceMission) {
                // Только увеличиваем ресурсы, уровень не трогаем
                this.resources[zoneId] = (this.resources[zoneId] || 0) + (reward || 1);
            } else if (actualLevel < 3) {
                this.resources[zoneId] = (this.resources[zoneId] || 0) + (reward || 1);
                // Повышаем уровень
                this.zones[zoneId] = {
                    level: actualLevel + 1
                };
            }
            // Сохраняем состояние
            this.saveState();
            // Перезапускаем сцену для обновления отображения
            this.scene.restart();
        }
    }

    saveState() {
        const state = {
            zones: this.zones,
            resources: this.resources
        };
        localStorage.setItem('map-state', JSON.stringify(state));
    }
}

export default MapScene; 