import Phaser from 'phaser';

export class AnimationManager {
    constructor(scene) {
        this.scene = scene;
    }

    async animateSwap(from, to) {
        const fromSprite = this.scene.sprites[from.y][from.x];
        const toSprite = this.scene.sprites[to.y][to.x];
        
        if (!fromSprite || !toSprite) return;
        
        const fromX = fromSprite.x;
        const fromY = fromSprite.y;
        const toX = toSprite.x;
        const toY = toSprite.y;
        
        return new Promise(resolve => {
            this.scene.tweens.add({
                targets: fromSprite,
                x: toX,
                y: toY,
                duration: 200,
                ease: 'Power2'
            });
            
            this.scene.tweens.add({
                targets: toSprite,
                x: fromX,
                y: fromY,
                duration: 200,
                ease: 'Power2',
                onComplete: resolve
            });
        });
    }

    async animateMatches(matches) {
        const animations = matches.flat().map(match => {
            const sprite = this.scene.sprites[match.y][match.x];
            if (!sprite) return null;
            
            return new Promise(resolve => {
                this.scene.tweens.add({
                    targets: sprite,
                    alpha: 0,
                    scale: 0.5,
                    duration: 300,
                    ease: 'Power2',
                    onComplete: resolve
                });
            });
        }).filter(Boolean);
        
        await Promise.all(animations);
    }

    async animateGravity() {
        const animations = [];
        
        for (let x = 0; x < this.scene.GRID_WIDTH; x++) {
            for (let y = this.scene.GRID_HEIGHT - 1; y >= 0; y--) {
                const sprite = this.scene.sprites[y][x];
                if (!sprite) continue;
                
                const targetY = y * this.scene.TILE_SIZE;
                if (sprite.y !== targetY) {
                    animations.push(new Promise(resolve => {
                        this.scene.tweens.add({
                            targets: sprite,
                            y: targetY,
                            duration: 300,
                            ease: 'Bounce',
                            onComplete: resolve
                        });
                    }));
                }
            }
        }
        
        await Promise.all(animations);
    }

    async animateNewElements() {
        const animations = [];
        
        for (let x = 0; x < this.scene.GRID_WIDTH; x++) {
            for (let y = 0; y < this.scene.GRID_HEIGHT; y++) {
                const sprite = this.scene.sprites[y][x];
                if (!sprite) continue;
                
                if (sprite.alpha === 0) {
                    sprite.setAlpha(0);
                    sprite.setScale(0.5);
                    
                    animations.push(new Promise(resolve => {
                        this.scene.tweens.add({
                            targets: sprite,
                            alpha: 1,
                            scale: 1,
                            duration: 300,
                            ease: 'Back',
                            onComplete: resolve
                        });
                    }));
                }
            }
        }
        
        await Promise.all(animations);
    }

    // ... existing code ...
} 