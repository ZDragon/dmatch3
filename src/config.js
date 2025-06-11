import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { MainScene } from './scenes/main-scene';
import { MapScene } from './scenes/MapScene';
import { AdminPanelScene } from './scenes/AdminPanelScene';

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game',
    scene: [BootScene, MenuScene, MainScene, MapScene, AdminPanelScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    }
};

export default config; 