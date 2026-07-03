/**
 * NEXUS ARCADE: Senior Snake Module
 * Архитектура: Модульный инкапсулированный класс для обеспечения изоляции от других игр.
 */

class SnakeGame {
    constructor(canvas, scoreElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scoreElement = scoreElement;
        this.gridSize = 20;
        this.tileCount = 20;
        this.reset();
    }

    reset() {
        this.snake = [{ x: 10, y: 10 }];
        this.food = { x: 15, y: 15 };
        this.dx = 0;
        this.dy = 0;
        this.score = 0;
        this.gameOver = false;
        this.speed = 100;
        this.lastTime = 0;
    }

    update(currentTime) {
        if (this.gameOver) return;

        if (currentTime - this.lastTime < this.speed) {
            requestAnimationFrame((t) => this.update(t));
            return;
        }
        this.lastTime = currentTime;

        const head = { x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy };

        // Wall collision
        if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
            this.gameOver = true;
            return;
        }

        // Self collision
        for (let segment of this.snake) {
            if (head.x === segment.x && head.y === segment.y) {
                this.gameOver = true;
                return;
            }
        }

        this.snake.unshift(head);

        // Food logic
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.scoreElement.innerText = this.score;
            this.spawnFood();
        } else {
            this.snake.pop();
        }

        this.draw();
        requestAnimationFrame((t) => this.update(t));
    }

    spawnFood() {
        this.food = {
            x: Math.floor(Math.random() * this.tileCount),
            y: Math.floor(Math.random() * this.tileCount)
        };
    }

    draw() {
        // Clear background
        this.ctx.fillStyle = '#060810';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw food
        this.ctx.fillStyle = '#FF375F';
        this.ctx.fillRect(this.food.x * this.gridSize, this.food.y * this.gridSize, this.gridSize - 2, this.gridSize - 2);

        // Draw snake
        this.ctx.fillStyle = '#00EF72';
        for (let segment of this.snake) {
            this.ctx.fillRect(segment.x * this.gridSize, segment.y * this.gridSize, this.gridSize - 2, this.gridSize - 2);
        }
    }

    handleInput(direction) {
        if (direction === 'UP' && this.dy === 0) { this.dx = 0; this.dy = -1; }
        if (direction === 'DOWN' && this.dy === 0) { this.dx = 0; this.dy = 1; }
        if (direction === 'LEFT' && this.dx === 0) { this.dx = -1; this.dy = 0; }
        if (direction === 'RIGHT' && this.dx === 0) { this.dx = 1; this.dy = 0; }
    }
}

// Экспорт для инициализации в app.js
window.SnakeGame = SnakeGame;
