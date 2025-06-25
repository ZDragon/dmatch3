# Руководство разработчика

Полное руководство по разработке и расширению Match-3 Engine.

## 🎯 Для кого это руководство

- Разработчики, которые хотят модифицировать игру
- Программисты, изучающие архитектуру игрового движка
- Контрибьюторы проекта
- Разработчики похожих игр

---

## 🚀 Настройка среды разработки

### Рекомендуемые инструменты

#### IDE/Редакторы
```bash
# Visual Studio Code (рекомендуется)
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint

# Альтернативы
# WebStorm (платный, но мощный)
# Sublime Text с пакетами для JS
```

#### Browser DevTools
- **Chrome DevTools** - лучшая поддержка WebGL
- **Firefox Developer Tools** - отличный профайлер
- **Performance Monitor** - мониторинг FPS

#### Дополнительные инструменты
```bash
# Phaser Inspector (Chrome Extension)
# Redux DevTools (для state debugging)
# Webpack Bundle Analyzer
npm install -g webpack-bundle-analyzer
```

### Конфигурация VSCode

Создайте `.vscode/settings.json`:

```json
{
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": true
    },
    "editor.rulers": [80, 120],
    "files.associations": {
        "*.js": "javascript"
    },
    "emmet.includeLanguages": {
        "javascript": "javascriptreact"
    }
}
```

---

## 🏗️ Архитектурные принципы

### 1. Разделение ответственностей

```javascript
// ❌ Плохо: всё в одном методе
async handleClick(x, y) {
    this.playSound('click');
    this.highlightGem(x, y);
    this.checkMatches();
    this.updateUI();
    this.saveToDatabase();
}

// ✅ Хорошо: разделение по слоям
async handleClick(x, y) {
    this.uiManager.highlightGem(x, y);
    this.soundManager.play('click');
    
    const move = this.inputHandler.processClick(x, y);
    if (move) {
        await this.gameLogic.executeMove(move);
        this.dataManager.saveGameState();
    }
}
```

### 2. Immutable Data Patterns

```javascript
// ❌ Плохо: мутация состояния
updateGrid(x, y, newValue) {
    this.grid[y][x] = newValue;
    this.rerenderGrid();
}

// ✅ Хорошо: immutable updates
updateGrid(x, y, newValue) {
    const newGrid = this.grid.map((row, rowIndex) => 
        rowIndex === y 
            ? row.map((cell, colIndex) => 
                colIndex === x ? newValue : cell
              )
            : [...row]
    );
    
    this.setGrid(newGrid);
    return newGrid;
}
```

### 3. Event-Driven Architecture

```javascript
class GameEventManager {
    constructor() {
        this.events = new Map();
    }
    
    subscribe(event, handler) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(handler);
    }
    
    emit(event, data) {
        const handlers = this.events.get(event) || [];
        handlers.forEach(handler => handler(data));
    }
}

// Использование
this.events.subscribe('gem-matched', (data) => {
    this.soundManager.play('match');
    this.particleManager.createExplosion(data.x, data.y);
    this.scoreManager.addPoints(data.points);
});
```

---

## 🎮 Добавление новых фич

### Создание нового спец гема

#### 1. Определите константу

```javascript
// В начале main-scene.js
const NEW_SPECIAL_GEM = 12;
```

#### 2. Создайте текстуру

```javascript
// В методе preload()
preload() {
    // ... существующий код ...
    
    // Новый спец гем
    const newGemGraphics = this.add.graphics();
    newGemGraphics.fillStyle(0x00FFFF); // Цвет
    newGemGraphics.fillCircle(gemSize/2, gemSize/2, gemSize/2 - 4);
    
    // Добавьте уникальные детали
    newGemGraphics.fillStyle(0xFFFFFF);
    newGemGraphics.fillStar(gemSize/2, gemSize/2, 5, 8, 16);
    
    newGemGraphics.generateTexture('gem12', gemSize, gemSize);
    newGemGraphics.destroy();
}
```

#### 3. Добавьте условие создания

```javascript
// В processMatchesAnimated()
const newGemConditions = this.detectNewGemPattern(this.grid);

if (newGemConditions.length > 0) {
    // Логика создания
    newGemConditions.forEach(condition => {
        this.grid[condition.y][condition.x] = NEW_SPECIAL_GEM;
    });
}
```

#### 4. Реализуйте активацию

```javascript
async activateNewSpecialGem(x, y) {
    console.log(`Activating new special gem at ${x}, ${y}`);
    
    // Уникальная логика активации
    await this.newSpecialGemEffect(x, y);
    
    // Стандартная обработка
    this.grid[y][x] = 0;
    await this.processMatchesAnimated();
}

async newSpecialGemEffect(x, y) {
    // Реализация эффекта
    const affectedCells = this.calculateAffectedArea(x, y);
    
    for (const cell of affectedCells) {
        await this.animateDestruction(cell.x, cell.y);
        this.grid[cell.y][cell.x] = 0;
    }
}
```

#### 5. Добавьте обработку клика

```javascript
// В createSprite()
if (gemType === NEW_SPECIAL_GEM) {
    sprite.on('pointerdown', () => {
        this.activateNewSpecialGem(col, row);
    });
}
```

### Добавление новой анимации

#### 1. Создайте анимационный класс

```javascript
class CustomAnimation {
    constructor(scene) {
        this.scene = scene;
    }
    
    async playExplosion(x, y, radius = 50) {
        const worldPos = this.gridToWorld(x, y);
        
        // Создание эффекта
        const explosion = this.scene.add.circle(
            worldPos.x, 
            worldPos.y, 
            5, 
            0xFF0000
        );
        
        return new Promise(resolve => {
            this.scene.tweens.add({
                targets: explosion,
                radius: radius,
                alpha: 0,
                duration: 800,
                ease: 'Power3.easeOut',
                onComplete: () => {
                    explosion.destroy();
                    resolve();
                }
            });
        });
    }
    
    gridToWorld(x, y) {
        return {
            x: x * (elementWidth + elementSpacing) + elementWidth / 2,
            y: y * (elementHeight + elementSpacing) + elementHeight / 2
        };
    }
}
```

#### 2. Интеграция в игру

```javascript
// В create() методе MainScene
this.customAnimation = new CustomAnimation(this);

// Использование
await this.customAnimation.playExplosion(3, 4, 80);
```

### Добавление нового типа миссий

#### 1. Расширьте типы целей

```javascript
const MISSION_TYPES = {
    COLLECT_GEMS: 'collect_gems',
    USE_SPECIAL_GEMS: 'use_special_gems',
    CLEAR_OBSTACLES: 'clear_obstacles',
    ACHIEVE_SCORE: 'achieve_score',        // Новый тип
    CREATE_COMBOS: 'create_combos'         // Новый тип
};
```

#### 2. Реализуйте логику

```javascript
class MissionManager {
    checkComboMission(comboCount) {
        if (this.currentMission.type === MISSION_TYPES.CREATE_COMBOS) {
            this.currentMission.progress += comboCount;
            this.updateMissionUI();
            
            if (this.currentMission.progress >= this.currentMission.target) {
                this.completeMission();
            }
        }
    }
    
    checkScoreMission(newScore) {
        if (this.currentMission.type === MISSION_TYPES.ACHIEVE_SCORE) {
            if (newScore >= this.currentMission.target) {
                this.completeMission();
            }
        }
    }
}
```

---

## 🎨 Работа с анимациями

### Принципы хороших анимаций

#### 1. Timing (Тайминг)

```javascript
// ❌ Плохо: все анимации одинаковой длительности
this.tweens.add({
    targets: sprite,
    duration: 300  // Всегда 300ms
});

// ✅ Хорошо: разные длительности для разных эффектов
const ANIMATION_DURATIONS = {
    SWAP: 200,          // Быстро - пользователь ждёт
    MATCH: 400,         // Средне - важно показать результат
    GRAVITY: 300,       // Средне - физика должна быть believable
    EXPLOSION: 600,     // Медленно - зрелищный эффект
    UI_TRANSITION: 250  // Быстро - отзывчивость интерфейса
};
```

#### 2. Easing (Плавность)

```javascript
// Различные easing для разных эффектов
const EASING_TYPES = {
    SWAP: 'Power2.easeInOut',      // Плавное ускорение/замедление
    BOUNCE: 'Bounce.easeOut',      // Отскок для падения
    EXPLOSION: 'Power3.easeOut',   // Резкое начало, плавное затухание
    UI: 'Back.easeOut',            // Slight overshoot для кнопок
    ELASTIC: 'Elastic.easeOut'     // Упругость для специальных эффектов
};
```

#### 3. Последовательность и параллельность

```javascript
class AnimationSequence {
    constructor(scene) {
        this.scene = scene;
        this.queue = [];
    }
    
    // Последовательное выполнение
    async playSequential(animations) {
        for (const animation of animations) {
            await animation();
        }
    }
    
    // Параллельное выполнение
    async playParallel(animations) {
        const promises = animations.map(animation => animation());
        await Promise.all(promises);
    }
    
    // Каскадное выполнение с задержками
    async playCascade(animations, delay = 100) {
        const promises = animations.map((animation, index) => {
            return new Promise(resolve => {
                this.scene.time.delayedCall(index * delay, () => {
                    animation().then(resolve);
                });
            });
        });
        
        await Promise.all(promises);
    }
}
```

### Оптимизация анимаций

#### 1. Object Pooling

```javascript
class SpritePool {
    constructor(scene, textureKey, poolSize = 20) {
        this.scene = scene;
        this.textureKey = textureKey;
        this.available = [];
        this.inUse = [];
        
        // Предварительное создание объектов
        for (let i = 0; i < poolSize; i++) {
            const sprite = scene.add.image(0, 0, textureKey);
            sprite.setVisible(false);
            this.available.push(sprite);
        }
    }
    
    get() {
        if (this.available.length === 0) {
            // Расширяем пул при необходимости
            const sprite = this.scene.add.image(0, 0, this.textureKey);
            return sprite;
        }
        
        const sprite = this.available.pop();
        this.inUse.push(sprite);
        sprite.setVisible(true);
        return sprite;
    }
    
    release(sprite) {
        const index = this.inUse.indexOf(sprite);
        if (index > -1) {
            this.inUse.splice(index, 1);
            this.available.push(sprite);
            sprite.setVisible(false);
            
            // Сброс свойств
            sprite.setPosition(0, 0);
            sprite.setScale(1);
            sprite.setAlpha(1);
            sprite.setRotation(0);
        }
    }
}
```

#### 2. Batch Updates

```javascript
// ❌ Плохо: множественные обновления
gems.forEach(gem => {
    gem.sprite.setPosition(gem.x, gem.y);
    gem.sprite.setAlpha(gem.alpha);
    this.updateUI();  // Вызывается каждый раз!
});

// ✅ Хорошо: batch обновление
gems.forEach(gem => {
    gem.sprite.setPosition(gem.x, gem.y);
    gem.sprite.setAlpha(gem.alpha);
});
this.updateUI(); // Вызывается один раз
```

---

## 🧪 Тестирование

### Unit Testing

#### Настройка Jest

```bash
npm install --save-dev jest @jest/environment-jsdom
```

```javascript
// jest.config.js
module.exports = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/src/$1'
    }
};
```

#### Тестирование игровой логики

```javascript
// tests/GameLogic.test.js
import { GameLogic } from '../src/core/GameLogic.js';

describe('GameLogic', () => {
    let gameLogic;
    
    beforeEach(() => {
        gameLogic = new GameLogic();
    });
    
    describe('detectHorizontalMatches', () => {
        test('should detect 3-gem horizontal match', () => {
            const grid = [
                [1, 1, 1, 2],
                [2, 3, 4, 5],
                [3, 4, 5, 1]
            ];
            
            const matches = gameLogic.detectHorizontalMatches(grid);
            
            expect(matches).toHaveLength(1);
            expect(matches[0]).toEqual([
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 2, y: 0 }
            ]);
        });
        
        test('should detect multiple matches', () => {
            const grid = [
                [1, 1, 1, 2],
                [2, 3, 4, 5],
                [3, 3, 3, 3]
            ];
            
            const matches = gameLogic.detectHorizontalMatches(grid);
            expect(matches).toHaveLength(2);
        });
    });
    
    describe('isValidMove', () => {
        test('should validate adjacent moves', () => {
            const grid = [
                [1, 2, 3],
                [2, 1, 4],
                [3, 4, 1]
            ];
            
            expect(gameLogic.isValidMove(
                { x: 0, y: 0 }, 
                { x: 1, y: 0 }, 
                grid
            )).toBe(true);
            
            expect(gameLogic.isValidMove(
                { x: 0, y: 0 }, 
                { x: 2, y: 0 }, 
                grid
            )).toBe(false);
        });
    });
});
```

### Integration Testing

```javascript
// tests/GameIntegration.test.js
import { MainScene } from '../src/scenes/main-scene.js';

describe('Game Integration', () => {
    let scene;
    let mockPhaserScene;
    
    beforeEach(() => {
        mockPhaserScene = {
            add: {
                image: jest.fn().mockReturnValue({
                    setInteractive: jest.fn().mockReturnThis(),
                    on: jest.fn()
                }),
                graphics: jest.fn().mockReturnValue({
                    fillStyle: jest.fn().mockReturnThis(),
                    fillRect: jest.fn().mockReturnThis(),
                    generateTexture: jest.fn(),
                    destroy: jest.fn()
                })
            },
            tweens: {
                add: jest.fn()
            },
            time: {
                delayedCall: jest.fn()
            }
        };
        
        scene = new MainScene();
        Object.assign(scene, mockPhaserScene);
    });
    
    test('should create initial grid', () => {
        scene.create();
        
        expect(scene.grid).toBeDefined();
        expect(scene.grid.length).toBe(8);
        expect(scene.grid[0].length).toBe(8);
    });
});
```

### Visual Regression Testing

```javascript
// tests/visual/VisualRegression.test.js
describe('Visual Regression', () => {
    test('should match gem textures', async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        
        const scene = new MainScene();
        scene.generateGemTexture(1, canvas);
        
        const imageData = canvas.toDataURL();
        expect(imageData).toMatchSnapshot();
    });
});
```

---

## 🔧 Отладка и профилирование

### Debugging Tools

#### 1. Grid Debugger

```javascript
class GridDebugger {
    constructor(scene) {
        this.scene = scene;
        this.debugGraphics = scene.add.graphics();
        this.isVisible = false;
    }
    
    toggle() {
        this.isVisible = !this.isVisible;
        this.render();
    }
    
    render() {
        this.debugGraphics.clear();
        
        if (!this.isVisible) return;
        
        const { grid } = this.scene;
        
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                const worldPos = this.gridToWorld(x, y);
                
                // Рамка клетки
                this.debugGraphics.lineStyle(1, 0x00FF00);
                this.debugGraphics.strokeRect(
                    worldPos.x - 32, 
                    worldPos.y - 32, 
                    64, 
                    64
                );
                
                // Номер гема
                this.scene.add.text(
                    worldPos.x, 
                    worldPos.y, 
                    grid[y][x].toString(),
                    { 
                        fontSize: '12px', 
                        color: '#00FF00',
                        align: 'center' 
                    }
                ).setOrigin(0.5);
            }
        }
    }
}

// Использование
this.gridDebugger = new GridDebugger(this);

// Горячая клавиша для переключения
this.input.keyboard.on('keydown-G', () => {
    this.gridDebugger.toggle();
});
```

#### 2. Performance Monitor

```javascript
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            frameTime: [],
            matchDetectionTime: [],
            animationTime: []
        };
        this.display = null;
    }
    
    startMeasure(category) {
        performance.mark(`${category}-start`);
    }
    
    endMeasure(category) {
        performance.mark(`${category}-end`);
        performance.measure(category, `${category}-start`, `${category}-end`);
        
        const measure = performance.getEntriesByName(category)[0];
        this.recordMetric(category, measure.duration);
        
        performance.clearMarks(`${category}-start`);
        performance.clearMarks(`${category}-end`);
        performance.clearMeasures(category);
    }
    
    recordMetric(category, duration) {
        if (!this.metrics[category]) {
            this.metrics[category] = [];
        }
        
        this.metrics[category].push(duration);
        
        // Ограничиваем размер массива
        if (this.metrics[category].length > 100) {
            this.metrics[category].shift();
        }
    }
    
    getAverageTime(category) {
        const times = this.metrics[category] || [];
        if (times.length === 0) return 0;
        
        const sum = times.reduce((a, b) => a + b, 0);
        return sum / times.length;
    }
    
    createDisplay(scene) {
        this.display = scene.add.text(10, 10, '', {
            fontSize: '12px',
            color: '#00FF00',
            backgroundColor: '#000000',
            padding: { x: 5, y: 5 }
        });
        
        scene.time.addEvent({
            delay: 100,
            callback: this.updateDisplay,
            callbackScope: this,
            loop: true
        });
    }
    
    updateDisplay() {
        if (!this.display) return;
        
        const fps = Math.round(1000 / this.getAverageTime('frameTime'));
        const matchTime = this.getAverageTime('matchDetectionTime').toFixed(2);
        const animTime = this.getAverageTime('animationTime').toFixed(2);
        
        this.display.setText([
            `FPS: ${fps}`,
            `Match Detection: ${matchTime}ms`,
            `Animation: ${animTime}ms`
        ]);
    }
}
```

### Memory Management

#### 1. Texture Management

```javascript
class TextureManager {
    constructor(scene) {
        this.scene = scene;
        this.textureCache = new Map();
    }
    
    createGemTexture(type) {
        const cacheKey = `gem${type}`;
        
        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey);
        }
        
        const graphics = this.scene.add.graphics();
        // ... создание текстуры ...
        
        graphics.generateTexture(cacheKey, 64, 64);
        graphics.destroy();
        
        this.textureCache.set(cacheKey, cacheKey);
        return cacheKey;
    }
    
    clearUnusedTextures() {
        // Очистка неиспользуемых текстур
        this.textureCache.forEach((textureKey, cacheKey) => {
            if (!this.isTextureInUse(textureKey)) {
                this.scene.textures.remove(textureKey);
                this.textureCache.delete(cacheKey);
            }
        });
    }
    
    isTextureInUse(textureKey) {
        // Проверка использования текстуры
        return this.scene.children.list.some(child => 
            child.texture && child.texture.key === textureKey
        );
    }
}
```

#### 2. Event Cleanup

```javascript
class EventManager {
    constructor() {
        this.eventListeners = [];
    }
    
    addEventListener(emitter, event, handler) {
        emitter.on(event, handler);
        this.eventListeners.push({ emitter, event, handler });
    }
    
    removeAllListeners() {
        this.eventListeners.forEach(({ emitter, event, handler }) => {
            emitter.off(event, handler);
        });
        this.eventListeners = [];
    }
}

// В scene shutdown
shutdown() {
    this.eventManager.removeAllListeners();
    this.textureManager.clearUnusedTextures();
}
```

---

## 📦 Сборка и деплой

### Webpack Optimization

```javascript
// webpack.prod.js
const path = require('path');

module.exports = {
    mode: 'production',
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'game.[contenthash].js'
    },
    optimization: {
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    chunks: 'all'
                },
                phaser: {
                    test: /[\\/]node_modules[\\/]phaser[\\/]/,
                    name: 'phaser',
                    chunks: 'all'
                }
            }
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src')
        }
    }
};
```

### Asset Optimization

```javascript
// Сжатие текстур
class AssetOptimizer {
    static async optimizeTextures() {
        const images = await this.loadImages();
        
        for (const image of images) {
            if (image.size > 100 * 1024) { // > 100KB
                await this.compressImage(image);
            }
        }
    }
    
    static async compressImage(image) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Уменьшаем качество для больших изображений
        const quality = image.size > 500 * 1024 ? 0.7 : 0.85;
        
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        
        return canvas.toBlob(blob => {
            // Сохраняем сжатое изображение
        }, 'image/jpeg', quality);
    }
}
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
    - name: Install dependencies
      run: npm install
    - name: Run tests
      run: npm test
    - name: Run linting
      run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
    - name: Install dependencies
      run: npm install
    - name: Build
      run: npm run build
    - name: Upload artifacts
      uses: actions/upload-artifact@v2
      with:
        name: dist
        path: dist/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - name: Download artifacts
      uses: actions/download-artifact@v2
      with:
        name: dist
        path: dist/
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

---

## 🎯 Лучшие практики

### 1. Код-стайл

```javascript
// ✅ Используйте meaningful names
const isGameOverConditionMet = this.checkWinCondition();
const specialGemActivationPosition = { x: 3, y: 4 };

// ✅ Константы в UPPER_CASE
const MAX_CASCADE_ITERATIONS = 20;
const DEFAULT_ANIMATION_DURATION = 300;

// ✅ Функции делают одну вещь
function createBombExplosion(x, y) {
    return this.particleManager.createExplosion({
        position: { x, y },
        radius: 80,
        color: 0xFF4500
    });
}

// ✅ Раннее возвращение
function validateMove(from, to) {
    if (!from || !to) return false;
    if (!this.isInBounds(from) || !this.isInBounds(to)) return false;
    if (!this.areAdjacent(from, to)) return false;
    
    return this.wouldCreateMatch(from, to);
}
```

### 2. Обработка ошибок

```javascript
class ErrorHandler {
    static handleGameError(error, context = '') {
        console.error(`Game Error in ${context}:`, error);
        
        // Логирование для аналитики
        this.logError(error, context);
        
        // Graceful fallback
        this.attemptRecovery(error, context);
    }
    
    static attemptRecovery(error, context) {
        switch (context) {
            case 'animation':
                // Пропустить анимацию и продолжить
                this.skipCurrentAnimation();
                break;
            case 'sound':
                // Продолжить без звука
                this.disableSound();
                break;
            default:
                // Перезапустить сцену
                this.restartScene();
        }
    }
}

// Использование
try {
    await this.processMatchesAnimated();
} catch (error) {
    ErrorHandler.handleGameError(error, 'match-processing');
}
```

### 3. Производительность

```javascript
// ✅ Debounce для частых событий
class InputManager {
    constructor() {
        this.lastClickTime = 0;
        this.clickDelay = 100; // ms
    }
    
    handleClick(x, y) {
        const now = Date.now();
        if (now - this.lastClickTime < this.clickDelay) {
            return; // Игнорируем слишком частые клики
        }
        
        this.lastClickTime = now;
        this.processClick(x, y);
    }
}

// ✅ Кэширование вычислений
class MatchDetector {
    constructor() {
        this.matchCache = new Map();
    }
    
    detectMatches(grid) {
        const gridHash = this.hashGrid(grid);
        
        if (this.matchCache.has(gridHash)) {
            return this.matchCache.get(gridHash);
        }
        
        const matches = this.calculateMatches(grid);
        this.matchCache.set(gridHash, matches);
        
        // Ограничиваем размер кэша
        if (this.matchCache.size > 100) {
            const firstKey = this.matchCache.keys().next().value;
            this.matchCache.delete(firstKey);
        }
        
        return matches;
    }
}
```

---

## 🔍 Troubleshooting

### Частые проблемы

#### 1. Проблемы с анимациями

```javascript
// Проблема: анимации не синхронизированы
// Решение: используйте Promise.all для параллельных анимаций

// ❌ Плохо
await this.animateGem1();
await this.animateGem2(); // Ждёт завершения предыдущей

// ✅ Хорошо
await Promise.all([
    this.animateGem1(),
    this.animateGem2()
]); // Выполняются параллельно
```

#### 2. Memory Leaks

```javascript
// Проблема: спрайты не удаляются
// Решение: всегда вызывайте destroy()

cleanup() {
    if (this.sprites) {
        this.sprites.forEach(row => {
            row.forEach(sprite => {
                if (sprite && sprite.destroy) {
                    sprite.destroy();
                }
            });
        });
        this.sprites = [];
    }
}
```

#### 3. Random desync в replay

```javascript
// Проблема: неконсистентная генерация случайных чисел
// Решение: всегда используйте getRandomTracked

// ❌ Плохо
const randomGem = Math.floor(Math.random() * 5) + 1;

// ✅ Хорошо
const randomGem = this.getRandomTracked(1, 5, 'gem_spawn');
```

---

Это руководство охватывает основные аспекты разработки для Match-3 Engine. Следуйте этим принципам для создания качественного и поддерживаемого кода! 🚀 