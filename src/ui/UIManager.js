import Phaser from 'phaser';

export class UIManager {
    constructor(scene) {
        this.scene = scene;
    }

    createInputField(x, y, width, height, placeholder) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = placeholder;
        input.style.position = 'absolute';
        
        // Получаем позицию canvas
        const canvas = this.scene.game.canvas;
        const rect = canvas.getBoundingClientRect();
        
        input.style.left = (rect.left + x) + 'px';
        input.style.top = (rect.top + y) + 'px';
        input.style.width = width + 'px';
        input.style.height = height + 'px';
        input.style.zIndex = '1000';
        input.style.fontSize = '12px';
        input.style.padding = '2px';
        input.style.border = '1px solid #ccc';
        input.style.backgroundColor = '#fff';
        input.style.borderRadius = '3px';
        
        document.body.appendChild(input);
        return input;
    }

    createButton(x, y, width, height, text, callback) {
        // Создаем прямоугольник с обводкой
        const button = this.scene.add.rectangle(x + width/2, y + height/2, width, height, 0x4CAF50)
            .setStrokeStyle(1, 0x2E7D32)
            .setInteractive()
            .on('pointerdown', callback)
            .on('pointerover', () => {
                button.setFillStyle(0x66BB6A);
            })
            .on('pointerout', () => {
                button.setFillStyle(0x4CAF50);
            });
            
        // Создаем текст на кнопке
        this.scene.add.text(x + width/2, y + height/2, text, { 
            fontSize: '12px', 
            fill: '#fff',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        return button;
    }

} 