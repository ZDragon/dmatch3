# API Reference

Полный справочник по API Match-3 Engine.

## 📋 Содержание

- [MainScene API](#mainscene-api)
- [GameLogic API](#gamelogic-api)
- [Animation API](#animation-api)
- [Special Gems API](#special-gems-api)
- [Utility Functions](#utility-functions)
- [Event System](#event-system)

---

## 🎮 MainScene API

Основной класс игровой сцены.

### Constructor

```javascript
class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }
}
```

### Properties

| Свойство | Тип | Описание |
|----------|-----|----------|
| `grid` | `Array<Array<number>>` | Двумерный массив игрового поля |
| `sprites` | `Array<Array<Sprite>>` | Массив спрайтов гемов |
| `gameLogic` | `GameLogic` | Экземпляр игровой логики |
| `movesLeft` | `number` | Количество оставшихся ходов |
| `gameOver` | `boolean` | Флаг окончания игры |
| `isAnimating` | `boolean` | Флаг выполнения анимации |

### Methods

#### Initialization

##### `preload()`
Загружает ресурсы игры (звуки, создаёт текстуры гемов).

```javascript
preload() {
    // Загрузка звуков
    this.load.audio('match', 'assets/audio/match.wav');
    
    // Создание текстур гемов
    this.createGemTextures();
}
```

##### `create()`
Инициализирует игровую сцену.

```javascript
create() {
    this.createUI();
    this.initializeGrid();
    this.renderGrid();
}
```

#### Game Logic

##### `makeMove(from, to)`
Выполняет ход игрока.

**Параметры:**
- `from` (`{x: number, y: number}`) - начальная позиция
- `to` (`{x: number, y: number}`) - конечная позиция

```javascript
makeMove({x: 2, y: 3}, {x: 2, y: 4});
```

##### `isValidMove(from, to)`
Проверяет валидность хода.

**Возвращает:** `boolean`

```javascript
const isValid = this.isValidMove(from, to);
if (isValid) {
    this.makeMove(from, to);
}
```

##### `async swapElements(from, to, shouldLog = true)`
Выполняет обмен элементов с анимацией.

**Параметры:**
- `from` (`{x: number, y: number}`) - первый элемент
- `to` (`{x: number, y: number}`) - второй элемент
- `shouldLog` (`boolean`) - записывать в лог

```javascript
await this.swapElements(from, to, true);
```

#### Match Detection

##### `detectMatchesDeterministic(grid)`
Детекция всех матчей на поле.

**Параметры:**
- `grid` (`Array<Array<number>>`) - игровое поле

**Возвращает:** `Array<Match>`

```javascript
const matches = this.detectMatchesDeterministic(this.grid);
console.log(`Found ${matches.length} matches`);
```

##### `detectSquares2x2(grid)`
Детекция квадратов 2x2 для создания дронов.

**Возвращает:** `Array<Square>`

```javascript
const squares = this.detectSquares2x2(this.grid);
squares.forEach(square => {
    console.log('Found 2x2 square at:', square[0]);
});
```

##### `detectTShapes(grid)`
Детекция T-образных фигур для динамита.

**Возвращает:** `Array<TShape>`

##### `detectLShapes(grid)`
Детекция L-образных фигур для динамита.

**Возвращает:** `Array<LShape>`

#### Animation System

##### `async processMatchesAnimated()`
Обрабатывает матчи с анимацией (основной цикл).

```javascript
await this.processMatchesAnimated();
```

##### `async animateSwap(from, to)`
Анимация обмена двух элементов.

**Длительность:** 200ms

##### `async animateGravity()`
Анимация падения гемов после удаления матчей.

##### `async animateNewElements()`
Анимация появления новых гемов.

#### Special Gems

##### `async activateVerticalBomb(x, y)`
Активация вертикальной бомбы.

##### `async activateHorizontalBomb(x, y)`
Активация горизонтальной линейной бомбы.

##### `async activateDrone(x, y)`
Активация дрона (клик).

##### `async activateDroneMove(from, to)`
Активация дрона (перемещение).

##### `async activateDiscoBall(x, y)`
Активация диско-шара (клик).

##### `async activateDiscoBallMove(from, to)`
Активация диско-шара (перемещение).

##### `async activateDynamite(x, y)`
Активация динамита (клик).

##### `async activateDynamiteMove(from, to)`
Активация динамита (перемещение).

#### Utility Methods

##### `getNeighbors(x, y)`
Получение соседних клеток.

**Возвращает:** `Array<{nx: number, ny: number}>`

```javascript
const neighbors = this.getNeighbors(3, 4);
neighbors.forEach(({nx, ny}) => {
    console.log(`Neighbor at ${nx}, ${ny}`);
});
```

##### `createSprite(gemType, row, col, invisible = false)`
Создание спрайта гема.

**Параметры:**
- `gemType` (`number`) - тип гема (1-11)
- `row` (`number`) - строка
- `col` (`number`) - столбец
- `invisible` (`boolean`) - создать невидимым

**Возвращает:** `Phaser.GameObjects.Image`

##### `getRandomTracked(min, max, context)`
Детерминированная генерация случайного числа.

**Параметры:**
- `min` (`number`) - минимальное значение
- `max` (`number`) - максимальное значение
- `context` (`string`) - контекст для логирования

**Возвращает:** `number`

```javascript
const randomGem = this.getRandomTracked(1, 5, 'gem_spawn');
```

##### `logAction(action)`
Запись действия в лог для replay системы.

**Параметры:**
- `action` (`ActionObject`) - объект действия

```javascript
this.logAction({
    type: 'MOVE',
    data: { from, to },
    randomContext: 'player_move'
});
```

---

## 🧠 GameLogic API

Класс с чистой игровой логикой.

### Methods

##### `detectHorizontalMatches(grid)`
Детекция горизонтальных матчей.

**Параметры:**
- `grid` (`Array<Array<number>>`) - игровое поле

**Возвращает:** `Array<Array<{x: number, y: number}>>`

##### `detectVerticalMatches(grid)`
Детекция вертикальных матчей.

##### `applyGravity(grid)`
Применение гравитации к полю.

**Изменяет:** переданный grid массив

```javascript
const gameLogic = new GameLogic();
gameLogic.applyGravity(this.grid);
```

##### `isValidMove(from, to, grid)`
Проверка валидности хода (чистая функция).

**Возвращает:** `boolean`

---

## 🎬 Animation API

### Tween Animations

##### Basic Tween
```javascript
this.tweens.add({
    targets: sprite,
    x: newX,
    y: newY,
    duration: 300,
    ease: 'Power2',
    onComplete: callback
});
```

##### Scale Animation
```javascript
this.tweens.add({
    targets: sprite,
    scaleX: 1.5,
    scaleY: 1.5,
    duration: 200,
    yoyo: true,
    ease: 'Back.easeOut'
});
```

##### Rotation Animation
```javascript
this.tweens.add({
    targets: sprite,
    rotation: Math.PI * 2,
    duration: 400,
    ease: 'Power2'
});
```

### Animation Helpers

##### `delay(ms)`
Создание задержки в async функции.

```javascript
await this.delay(300); // Пауза 300ms
```

##### `createMatchParticles(x, y)`
Создание частиц при матче.

**Параметры:**
- `x` (`number`) - позиция X в пикселях
- `y` (`number`) - позиция Y в пикселях

---

## 🔥 Special Gems API

### Constants

```javascript
const VERTICAL_BOMB = 7;
const HORIZONTAL_BOMB = 8;
const DRONE = 9;
const DISCO_BALL = 10;
const DYNAMITE = 11;
```

### Line Bombs API

##### `async activateVerticalBomb(x, y)`
Уничтожение всего столбца.

##### `async activateHorizontalBomb(x, y)`
Уничтожение всей строки.

### Drone API

##### `async activateDrone(x, y)`
Атака 8 соседних клеток + случайное препятствие.

##### `async activateDroneMove(from, to)`
Перемещение дрона с последующей активацией.

```javascript
// Перемещение дрона с (1,1) на (2,1) и активация
await this.activateDroneMove({x:1, y:1}, {x:2, y:1});
```

### Disco Ball API

##### `async activateDiscoBall(x, y)`
Удаление случайного цвета из соседних.

##### `async activateDiscoBallMove(from, to)`
Удаление конкретного цвета (цвет целевой клетки).

##### `async removeAllGemsOfColor(color, discoBallX, discoBallY)`
Удаление всех гемов указанного цвета.

**Параметры:**
- `color` (`number`) - цвет гемов (1-5)
- `discoBallX` (`number`) - X координата диско-шара
- `discoBallY` (`number`) - Y координата диско-шара

### Dynamite API

##### `async activateDynamite(x, y)`
Взрыв в радиусе 2 клеток (5x5 область).

##### `async activateDynamiteMove(from, to)`
Перемещение с последующим взрывом.

##### `async explodeDynamiteArea(x, y)`
Внутренняя функция взрыва динамита.

---

## 🛠️ Utility Functions

### Random Generation

##### `getRandomTracked(min, max, context)`
Детерминированная генерация с логированием.

```javascript
// Генерация случайного типа гема
const gemType = this.getRandomTracked(1, 5, 'spawn_gem');

// Генерация позиции
const x = this.getRandomTracked(0, 7, 'random_position_x');
```

### Grid Operations

##### `customSpawnNewElements(grid, cascadeNumber)`
Заполнение пустых мест новыми гемами.

**Параметры:**
- `grid` (`Array<Array<number>>`) - игровое поле
- `cascadeNumber` (`number`) - номер каскада

##### `rerenderGrid()`
Полная перерисовка игрового поля.

```javascript
// После изменения grid массива
this.rerenderGrid();
```

### UI Helpers

##### `highlightElement(x, y)`
Подсветка выбранного элемента.

##### `clearSelection()`
Очистка всех подсветок.

##### `updateMovesDisplay()`
Обновление отображения количества ходов.

##### `updateProgressDisplay()`
Обновление прогресса выполнения цели.

---

## 📡 Event System

### Game Events

События, которые генерирует игра:

##### `match-found`
Найден матч.

```javascript
this.events.on('match-found', (matches) => {
    console.log(`Found ${matches.length} matches`);
});
```

##### `special-gem-created`
Создан специальный гем.

```javascript
this.events.on('special-gem-created', (gemType, x, y) => {
    console.log(`Created ${gemType} at ${x},${y}`);
});
```

##### `game-over`
Игра завершена.

```javascript
this.events.on('game-over', (reason) => {
    if (reason === 'victory') {
        this.showWinWindow();
    } else {
        this.showGameOverWindow();
    }
});
```

### Scene Events

##### `scene-start`
Сцена запущена.

##### `scene-pause`
Сцена приостановлена.

##### `scene-resume`
Сцена возобновлена.

##### `scene-shutdown`
Сцена завершена.

---

## 🔍 Debug API

### Grid Debug

##### `updateGridOverlay()`
Показать/скрыть сетку с координатами.

```javascript
this.showGrid = true;
this.updateGridOverlay();
```

### Performance Monitoring

##### `console.time()` / `console.timeEnd()`
Измерение производительности.

```javascript
console.time('processMatches');
await this.processMatchesAnimated();
console.timeEnd('processMatches');
```

### Action Log

##### `exportActionLog()`
Экспорт лога действий для replay.

```javascript
const actions = this.exportActionLog();
console.log('Action log:', actions);
```

---

## 📦 Configuration API

### Game Config

```javascript
// Доступ к настройкам
import { GRID_WIDTH, GRID_HEIGHT, MAX_MOVES } from './config.js';

// Изменение в runtime
this.gameLogic.gridWidth = GRID_WIDTH;
this.gameLogic.gridHeight = GRID_HEIGHT;
```

### Scene Config

```javascript
const sceneConfig = {
    key: 'MainScene',
    physics: false,
    active: false,
    visible: false
};
```

---

## 🎯 Type Definitions

### Basic Types

```typescript
interface Position {
    x: number;
    y: number;
}

interface Match {
    positions: Position[];
    type: 'horizontal' | 'vertical' | 'special';
    gemType: number;
}

interface ActionLog {
    type: string;
    data: any;
    randomContext: string;
    timestamp: number;
}
```

### Game State

```typescript
interface GameState {
    grid: number[][];
    sprites: Phaser.GameObjects.Image[][];
    movesLeft: number;
    score: number;
    objective: Objective;
    collectedGems: Record<number, number>;
    gameOver: boolean;
    isAnimating: boolean;
}

interface Objective {
    gemType: number;
    amount: number;
    description: string;
}
```

---

## 📝 Usage Examples

### Basic Game Setup

```javascript
class MyGameScene extends MainScene {
    create() {
        super.create();
        
        // Кастомная инициализация
        this.setupCustomObjective();
        this.addCustomUI();
    }
    
    setupCustomObjective() {
        this.objective = {
            gemType: 1,
            amount: 20,
            description: 'Собрать 20 красных гемов'
        };
    }
}
```

### Custom Special Gem

```javascript
async activateCustomGem(x, y) {
    console.log(`Activating custom gem at ${x}, ${y}`);
    
    // Кастомная логика
    const neighbors = this.getNeighbors(x, y);
    
    for (const {nx, ny} of neighbors) {
        if (this.grid[ny][nx] >= 1 && this.grid[ny][nx] <= 5) {
            // Анимация исчезновения
            await this.animateGemDestroy(nx, ny);
            this.grid[ny][nx] = 0;
        }
    }
    
    // Применение физики
    await this.animateGravity();
    this.gameLogic.applyGravity(this.grid);
    this.rerenderGrid();
}
```

### Custom Animation

```javascript
async customExplosionEffect(x, y) {
    const worldX = x * (elementWidth + elementSpacing) + elementWidth / 2;
    const worldY = y * (elementHeight + elementSpacing) + elementHeight / 2;
    
    // Создание эффекта
    const explosion = this.add.circle(worldX, worldY, 5, 0xFFFF00);
    
    return new Promise(resolve => {
        this.tweens.add({
            targets: explosion,
            radius: 50,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                explosion.destroy();
                resolve();
            }
        });
    });
}
```

---

Этот API Reference покрывает основные функции Match-3 Engine. Для более подробной информации о конкретных методах смотрите исходный код или соответствующие разделы документации. 