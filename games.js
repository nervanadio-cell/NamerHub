/**
 * @file games.js
 * @description Модульный хаб игровых движков для Arcade Hub.
 * Реализует паттерн «Фабрика» и полиморфную архитектуру игр на базе единого жизненного цикла.
 * Включает премиальный движок игры Block Blast с адаптивным сенсорным управлением.
 * @version 1.0.0
 */

'use strict';

/**
 * 1. АБСТРАКТНЫЙ КЛАСС ИГРЫ (КОНТРАКТ ЖИЗНЕННОГО ЦИКЛА)
 * Все игры платформы обязаны наследоваться от этого класса.
 */
class BaseGame {
    constructor(canvas, context) {
        if (this.constructor === BaseGame) {
            throw new TypeError('Нельзя инициализировать абстрактный класс BaseGame напрямую.');
        }
        this.canvas = canvas;
        this.ctx = context;
        this.isRunning = false;
    }

    /** Инициализация ресурсов и подписка на события ввода */
    init() { throw new Error('Метод init() должен быть реализован в подклассе.'); }
    
    /** Запуск игрового процесса */
    start() { throw new Error('Метод start() должен быть реализован в подклассе.'); }
    
    /** Остановка игрового процесса (пауза или выход) */
    stop() { throw new Error('Метод stop() должен быть реализован в подклассе.'); }
    
    /** Уничтожение инстанса, очистка слушателей памяти (Предотвращает Memory Leaks) */
    destroy() { throw new Error('Метод destroy() должен быть реализован в подклассе.'); }
}

/**
 * 2. ДВИЖОК ИГРЫ BLOCK BLAST (GRID BLOCK PUZZLE)
 * Высокотехнологичная реализация популярной аркады на сетке 8x8.
 */
class BlockBlastGame extends BaseGame {
    constructor(canvas, context) {
        super(canvas, context);
        
        // Параметры геометрии сетки
        this.gridSize = 8;
        this.cellSize = 40; // 8 * 40 = 320px (ширина игрового поля)
        this.gridOffsetX = 40; // Центрирование на canvas 400px (40 + 320 + 40)
        this.gridOffsetY = 20;
        
        // Состояние игрового поля
        this.grid = [];
        this.availableShapes = [];
        this.selectedShapeIndex = -1;
        
        // Пул геометрических фигур (Tetromino/Block варианты)
        this.shapesRegistry = [
            { id: '1x1', matrix: [[1]], color: '#FF9500' },
            { id: '1x2', matrix: [[1, 1]], color: '#FF2D55' },
            { id: '2x1', matrix: [[1], [1]], color: '#FF2D55' },
            { id: '2x2', matrix: [[1, 1], [1, 1]], color: '#5AC8FA' },
            { id: '1x3', matrix: [[1, 1, 1]], color: '#4CD964' },
            { id: '3x1', matrix: [[1], [1], [1]], color: '#4CD964' },
            { id: 'L_left', matrix: [[1, 0], [1, 0], [1, 1]], color: '#5856D6' },
            { id: 'L_right', matrix: [[0, 1], [0, 1], [1, 1]], color: '#5856D6' },
            { id: '3x3_corner', matrix: [[1, 1, 1], [1, 0, 0], [1, 0, 0]], color: '#FFCC00' }
        ];

        // Координаты зон выбора фигур (внизу экрана)
        this.slotsY = 340;
        this.slots = [
            { x: 70, width: 60, height: 50 },
            { x: 200, width: 60, height: 50 },
            { x: 330, width: 60, height: 50 }
        ];

        this.score = 0;
        this._boundClickHandler = this._handleClick.bind(this);
    }

    init() {
        // Сброс матрицы поля (0 - пусто, строка цвета - блок занят)
        this.grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(0));
        this.availableShapes = [];
        this.selectedShapeIndex = -1;
        this.score = 0;
        this._updateScoreUI();
        
        // Генерация первой тройки фигур
        this._replenishShapes();

        // Подключаем унифицированный указатель (поддерживает мышь и тачскрин смартфона одинаково быстро)
        this.canvas.addEventListener('pointerdown', this._boundClickHandler);
    }

    start() {
        this.isRunning = true;
        this._render();
    }

    stop() {
        this.isRunning = false;
    }

    destroy() {
        this.stop();
        this.canvas.removeEventListener('pointerdown', this._boundClickHandler);
    }

    /** Генерация 3 случайных фигур в слоты */
    _replenishShapes() {
        this.availableShapes = [];
        for (let i = 0; i < 3; i++) {
            const randomType = this.shapesRegistry[Math.floor(Math.random() * this.shapesRegistry.length)];
            // Глубокое копирование объекта фигуры
            this.availableShapes.push({
                ...randomType,
                matrix: randomType.matrix.map(row => [...row])
            });
        }
    }

    /** Обработчик тапов/кликов с точной декомпозицией координат */
    _handleClick(event) {
        if (!this.isRunning) return;

        // Корректный расчет координат клика относительно масштабированного Canvas
        const rect = this.canvas.getBoundingClientRect();
        const clientX = event.clientX - rect.left;
        const clientY = event.clientY - rect.top;
        
        // Переводим пиксели окна в виртуальные пиксели canvas (400x400)
        const canvasX = (clientX / rect.width) * this.canvas.width;
        const canvasY = (clientY / rect.height) * this.canvas.height;

        // Зона 1: Клик по нижним слотам выбора фигур
        if (canvasY >= 320) {
            for (let i = 0; i < this.availableShapes.length; i++) {
                if (!this.availableShapes[i]) continue;
                const slot = this.slots[i];
                // Проверяем попадание в радиус слота фигурки
                if (Math.abs(canvasX - slot.x) < 40 && Math.abs(canvasY - this.slotsY) < 30) {
                    this.selectedShapeIndex = (this.selectedShapeIndex === i) ? -1 : i; // Toggle выбор
                    this._render();
                    if (window.store && store.get('settings.vibration') && navigator.vibrate) {
                        navigator.vibrate(10);
                    }
                    return;
                }
            }
        } 
        // Зона 2: Клик по игровому полю (попытка выставить выбранную фигуру)
        else if (this.selectedShapeIndex !== -1) {
            const cellX = Math.floor((canvasX - this.gridOffsetX) / this.cellSize);
            const cellY = Math.floor((canvasY - this.gridOffsetY) / this.cellSize);

            // Если кликнули в пределах матрицы поля
            if (cellX >= 0 && cellX < this.gridSize && cellY >= 0 && cellY < this.gridSize) {
                const currentShape = this.availableShapes[this.selectedShapeIndex];
                
                if (this._canPlaceShape(currentShape.matrix, cellX, cellY)) {
                    this._placeShape(currentShape, cellX, cellY);
                    this.availableShapes[this.selectedShapeIndex] = null; // Очищаем использованный слот
                    this.selectedShapeIndex = -1;

                    // Если все 3 фигуры выставлены — генерируем новые 3
                    if (this.availableShapes.every(shape => shape === null)) {
                        this._replenishShapes();
                    }

                    this._checkLinesAndClear();
                    this._render();

                    // Проверка на Game Over
                    if (this._checkGameOver()) {
                        this._triggerGameOver();
                    }
                }
            }
        }
    }

    /** Валидация возможности размещения матрицы фигуры в указанную координату сетки */
    _canPlaceShape(matrix, targetX, targetY) {
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c] === 1) {
                    const gridX = targetX + c;
                    const gridY = targetY + r;

                    // Выход за границы игрового поля
                    if (gridX < 0 || gridX >= this.gridSize || gridY < 0 || gridY >= this.gridSize) {
                        return false;
                    }
                    // Клетка уже занята другим блоком
                    if (this.grid[gridY][gridX] !== 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    /** Фиксация фигуры на поле */
    _placeShape(shape, targetX, targetY) {
        let placedBlocksCount = 0;
        for (let r = 0; r < shape.matrix.length; r++) {
            for (let c = 0; c < shape.matrix[r].length; c++) {
                if (shape.matrix[r][c] === 1) {
                    this.grid[targetY + r][targetX + c] = shape.color;
                    placedBlocksCount++;
                }
            }
        }
        this.score += placedBlocksCount;
        if (window.store) store.addBalance(1); // 1 монета за каждый установленный кубик
        this._updateScoreUI();
    }

    /** Сканирование поля на заполненные горизонтальные и вертикальные линии */
    _checkLinesAndClear() {
        let rowsToClear = [];
        let colsToClear = [];

        // Проверка строк
        for (let r = 0; r < this.gridSize; r++) {
            if (this.grid[r].every(cell => cell !== 0)) {
                rowsToClear.push(r);
            }
        }

        // Проверка столбцов
        for (let c = 0; c < this.gridSize; c++) {
            let isColFull = true;
            for (let r = 0; r < this.gridSize; r++) {
                if (this.grid[r][c] === 0) {
                    isColFull = false;
                    break;
                }
            }
            if (isColFull) colsToClear.push(c);
        }

        // Очистка и начисление очков (комбо увеличивает награду экспоненциально)
        const totalLines = rowsToClear.length + colsToClear.length;
        if (totalLines > 0) {
            rowsToClear.forEach(r => {
                for (let c = 0; c < this.gridSize; c++) this.grid[r][c] = 0;
            });

            colsToClear.forEach(c => {
                for (let r = 0; r < this.gridSize; r++) this.grid[r][c] = 0;
            });

            this.score += totalLines * 20;
            if (window.store) store.addBalance(totalLines * 10); // Бонусные монеты за взрыв линий
            this._updateScoreUI();

            if (window.store && store.get('settings.vibration') && navigator.vibrate) {
                navigator.vibrate([30, 20, 30]); // Двойной импульс взрыва блоков
            }
        }
    }

    /** Алгоритм проверки мата (Game Over) */
    _checkGameOver() {
        // Ищем хотя бы одну доступную фигуру
        for (let i = 0; i < this.availableShapes.length; i++) {
            const shape = this.availableShapes[i];
            if (!shape) continue;

            // Пробуем перебрать всю доску 8x8, встанет ли она куда-нибудь
            for (let r = 0; r < this.gridSize; r++) {
                for (let c = 0; c < this.gridSize; c++) {
                    if (this._canPlaceShape(shape.matrix, c, r)) {
                        return false; // Найдено валидное место, игра продолжается
                    }
                }
            }
        }
        return true; // Ни одна фигура не помещается на доску
    }

    _updateScoreUI() {
        const scoreEl = document.getElementById('live-score');
        if (scoreEl) scoreEl.textContent = `Счет: ${this.score}`;
    }

    _triggerGameOver() {
        this.stop();
        if (window.store) {
            const currentHighScore = store.get('highScores.blockblast') || 0;
            let recordMsg = '';
            if (this.score > currentHighScore) {
                store.set('highScores.blockblast', this.score);
                recordMsg = '\nНОВЫЙ РЕКОРД НА ПЛАТФОРМЕ!';
            }
            alert(`БЛОК БЛАСТ: ИГРА ОКОНЧЕНА!\nНабрано очков: ${this.score}${recordMsg}`);
        }
        if (window.ui) ui.navigateTo('lobby');
    }

    /** ОТРИСОВКА (RENDER GRAPHICS) НА CANVAS */
    _render() {
        if (!this.isRunning) return;

        // 1. Очистка подложки игрового экрана
        this.ctx.fillStyle = '#11141a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 2. Отрисовка основной сетки 8x8
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const cellVal = this.grid[r][c];
                const x = this.gridOffsetX + c * this.cellSize;
                const y = this.gridOffsetY + r * this.cellSize;

                if (cellVal === 0) {
                    // Пустые клетки — высококлассный Glassmorphic-дизайн со скошенными гранями
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
                    this.ctx.beginPath();
                    this.ctx.roundRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4, 6);
                    this.ctx.fill();
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.01)';
                    this.ctx.stroke();
                } else {
                    // Занятые ячейки с внутренним свечением
                    this.ctx.fillStyle = cellVal;
                    this.ctx.beginPath();
                    this.ctx.roundRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2, 6);
                    this.ctx.fill();
                }
            }
        }

        // 3. Рендеринг нижнего дока с доступными фигурами
        for (let i = 0; i < this.availableShapes.length; i++) {
            const shape = this.availableShapes[i];
            if (!shape) continue;

            const slot = this.slots[i];
            const isSelected = (this.selectedShapeIndex === i);

            // Если фигура выбрана тапом — рисуем вокруг слота неоновый ореол пульсации
            if (isSelected) {
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = '#007aff';
                this.ctx.strokeStyle = 'rgba(0, 122, 255, 0.6)';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.roundRect(slot.x - 30, this.slotsY - 25, 60, 50, 12);
                this.ctx.stroke();
                this.ctx.shadowBlur = 0; // Сброс тени
                this.ctx.lineWidth = 1;
            }

            // Масштабируем фигуру, чтобы она красиво помещалась в маленький слот выбора (scale 0.5)
            const scale = 0.45;
            const blockS = this.cellSize * scale;
            
            // Центрируем геометрию матрицы фигуры внутри слота
            const mRows = shape.matrix.length;
            const mCols = shape.matrix[0].length;
            const startX = slot.x - (mCols * blockS) / 2;
            const startY = this.slotsY - (mRows * blockS) / 2;

            this.ctx.fillStyle = shape.color;
            for (let r = 0; r < mRows; r++) {
                for (let c = 0; c < mCols; c++) {
                    if (shape.matrix[r][c] === 1) {
                        this.ctx.beginPath();
                        this.ctx.roundRect(
                            startX + c * blockS + 1,
                            startY + r * blockS + 1,
                            blockS - 2,
                            blockS - 2,
                            3
                        );
                        this.ctx.fill();
                    }
                }
            }
        }
    }
}

/**
 * 3. ОРКЕСТРАТОР ИГРОВОЙ СРЕДЫ (ФАБРИКА РЕГИСТРАЦИИ)
 */
class GamesRegistry {
    constructor() {
        this.activeEngine = null;
    }

    init() {
        if (!window.globalStoreStoreBus) return;

        // Слушаем сигнал запуска игр из ядра app.js
        globalStoreStoreBus.on('game:start', (gameId) => {
            const canvas = document.getElementById('game-canvas');
            if (!canvas) return;
            const context = canvas.getContext('2d');

            // Безопасно уничтожаем предыдущий игровой цикл во избежание утечки CPU ресурсов
            if (this.activeEngine) {
                this.activeEngine.destroy();
                this.activeEngine = null;
            }

            // Фабричный запуск выбранной игры
            if (gameId === 'blockblast') {
                this.activeEngine = new BlockBlastGame(canvas, context);
                this.activeEngine.init();
                this.activeEngine.start();
            }
        });

        // Слушаем принудительный выход пользователя
        globalStoreStoreBus.on('game:requestExit', () => {
            if (this.activeEngine) {
                this.activeEngine.stop();
            }
        });
    }
}

// Запуск реестра при полной готовности DOM дерева
document.addEventListener('DOMContentLoaded', () => {
    const registry = new GamesRegistry();
    registry.init();
    
    // Динамически добавляем карточку Block Blast в лобби, если её там еще нет
    const grid = document.querySelector('.games-grid');
    if (grid && !document.querySelector('.game-card[data-game="blockblast"]')) {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.setAttribute('data-game', 'blockblast');
        card.innerHTML = `
            <h3>Block Blast</h3>
            <p>Рекорд: <span id="blockblast-high-score">0</span></p>
            <button class="btn-play">ИГРАТЬ</button>
        `;
        
        // Подвязываем клик запуска
        card.querySelector('.btn-play').addEventListener('click', () => {
            if (window.ui) ui.navigateTo('game');
            globalStoreStoreBus.emit('game:start', 'blockblast');
        });
        grid.appendChild(card);
        
        // Обновляем отображение рекордов для новой игры из localStorage
        setTimeout(() => {
            const el = document.getElementById('blockblast-high-score');
            if (el && window.store) el.textContent = store.get('highScores.blockblast') || 0;
        }, 50);
    }
});
