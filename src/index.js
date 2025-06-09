import Phaser from 'phaser';  
import MainScene from './scenes/main-scene';  

const config = {  
    type: Phaser.AUTO,  
    width: 800,  
    height: 600,  
    scene: [MainScene],  
};  

const game = new Phaser.Game(config);  