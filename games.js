// ==========================================
// NEXUS ARCADE ENGINE // ДВИЖКИ ИГР И ЭФФЕКТЫ
// ==========================================

// --- СИСТЕМА ЧАСТИЦ (JUICE FX) ---
class Particle {
    constructor(x, y, color) {
        this.x = x; 
        this.y = y; 
        this.color = color;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.radius = Math.random() * 3 + 2;
        this.alpha = 1;
        this.decay = Math.random() * 0.02 + 0.015;
    }
    update() { 
        this.x += this.vx; 
        this.y += this.vy; 
        this.alpha -= this.decay; 
    }
    draw(ctx) {
        ctx.save(); 
        ctx.globalAlpha = this.alpha; 
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color; 
        ctx.shadowBlur = 10; 
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); 
        ctx.fill(); 
        ctx.restore();
    }
}

// --- 1. СНЕЙК (SENIOR SNAKE) ---
class SeniorSnake {
    constructor(canvas, mode) {
        this.canvas = canvas; 
        this.ctx = canvas.getContext('2d'); 
        this.mode = mode;
        this.gridSize = 20; 
        this.tile = canvas.width / this.gridSize;
        this.snake = [{x: 10, y: 10}]; 
        this.dir = {x: 1, y: 0}; 
        this.nextDir = {x: 1, y: 0};
        this.apple = {x: 5, y: 5}; 
        this.particles = []; 
        this.score = 0;
        this.speed = 120; 
        this.lastTick = 0; 
        this.alive = true;
        this.skinColor = STATE.activeSkin; 
        this.spawnApple(); 
        this.bind();
        this.loop(0);
    }
    bind() {
        this.kd = e => {
            const k = e.key.toLowerCase();
            if ((k === 'arrowup' || k === 'w' || k === 'ц') && this.dir.y === 0) this.nextDir = {x: 0, y: -1};
            if ((k === 'arrowdown' || k === 's' || k === 'ы') && this.dir.y === 0) this.nextDir = {x: 0, y: 1};
            if ((k === 'arrowleft' || k === 'a' || k === 'ф') && this.dir.x === 0) this.nextDir = {x: -1, y: 0};
            if ((k === 'arrowright' || k === 'd' || k === 'в') && this.dir.x === 0) this.nextDir = {x: 1, y: 0};
        };
        window.addEventListener('keydown', this.kd);
    }
    spawnApple() {
        this.apple.x = Math.floor(Math.random() * this.gridSize);
        this.apple.y = Math.floor(Math.random() * this.gridSize);
    }
    loop(t) {
        if(!this.alive) return;
        if(t - this.lastTick > this.speed) {
            this.lastTick = t; 
            this.dir = this.nextDir;
            let head = {x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y};

            if(this.mode === 'classic') {
                if(head.x < 0) head.x = this.gridSize - 1; 
                if(head.x >= this.gridSize) head.x = 0;
                if(head.y < 0) head.y = this.gridSize - 1; 
                if(head.y >= this.gridSize) head.y = 0;
            } else {
                if(head.x < 0 || head.x >= this.gridSize || head.y < 0 || head.y >= this.gridSize) { 
                    this.gameOver(); 
                    return; 
                }
            }

            for(let p of this.snake) { 
                if(p.x === head.x && p.y === head.y) { 
                    this.gameOver(); 
                    return; 
                } 
            }
            this.snake.unshift(head);

            if(head.x === this.apple.x && head.y === this.apple.y) {
                this.score++; 
                const scr = document.getElementById('current-game-score');
                if (scr) scr.innerText = this.score;
                triggerScreenShake();
                for(let i = 0; i < 15; i++) {
                    this.particles.push(new Particle(this.apple.x * this.tile + this.tile / 2, this.apple.y * this.tile + this.tile / 2, '#FFD60A'));
                }
                this.spawnApple();
                if(this.speed > 60) this.speed -= 2;
            } else { 
                this.snake.pop(); 
            }
        }

        this.ctx.fillStyle = '#060810'; 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#FFD60A'; 
        this.ctx.beginPath();
        this.ctx.arc(this.apple.x * this.tile + this.tile / 2, this.apple.y * this.tile + this.tile / 2, this.tile * 0.4, 0, Math.PI * 2); 
        this.ctx.fill();

        this.ctx.fillStyle = this.skinColor;
        this.snake.forEach(p => this.ctx.fillRect(p.x * this.tile + 1, p.y * this.tile + 1, this.tile - 2, this.tile - 2));

        this.particles.forEach((p, i) => { 
            p.update(); 
            p.draw(this.ctx); 
            if(p.alpha <= 0) this.particles.splice(i, 1); 
        });

        requestAnimationFrame((time) => this.loop(time));
    }
    gameOver() {
        this.alive = false; 
        triggerScreenShake();
        saveBestScore('snake', this.mode, this.score);
        alert(`Игра Окончена! Заработано очков: ${this.score}`);
        updateWallet(this.score); 
        navigateTo('screen-lobby');
    }
    destroy() { 
        this.alive = false; 
        window.removeEventListener('keydown', this.kd); 
    }
}

// --- 2. РЕАКТОР (TAP REACTOR) ---
class TapReactor {
    constructor(canvas, mode) {
        this.canvas = canvas; 
        this.ctx = canvas.getContext('2d'); 
        this.mode = mode;
        this.circles = []; 
        this.particles = []; 
        this.score = 0; 
        this.alive = true;
        this.tp = (e) => this.tap(e);
        this.canvas.addEventListener('pointerdown', this.tp);
        this.spawn(); 
        this.loop();
    }
    spawn() {
        if(!this.alive) return;
        let type = 'normal'; 
        let color = STATE.activeSkin;
        if(this.mode === 'chaos') {
            let r = Math.random();
            if(r < 0.15) { type = 'bomb'; color = '#FF453A'; }
            else if(r < 0.3) { type = 'gold'; color = '#FFD60A'; }
        }
        this.circles.push({
            x: Math.random() * (this.canvas.width - 60) + 30, 
            y: Math.random() * (this.canvas.height - 60) + 30,
            radius: 0, 
            maxRadius: 35, 
            color: color, 
            type: type, 
            life: 100
        });
        setTimeout(() => this.spawn(), Math.random() * 500 + 300);
    }
    tap(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left; 
        const y = e.clientY - rect.top;
        for(let i = this.circles.length - 1; i >= 0; i--) {
            let c = this.circles[i];
            if(Math.hypot(x - c.x, y - c.y) <= c.maxRadius) {
                this.circles.splice(i, 1); 
                triggerScreenShake();
                for(let k = 0; k < 20; k++) this.particles.push(new Particle(c.x, c.y, c.color));
                
                if(c.type === 'bomb') { 
                    this.score = Math.max(0, this.score - 10); 
                } else if(c.type === 'gold') { 
                    this.score += 5; 
                    updateWallet(5); 
                } else { 
                    this.score += 2; 
                }
                
                const scr = document.getElementById('current-game-score');
                if (scr) scr.innerText = this.score;
                return;
            }
        }
    }
    loop() {
        if(!this.alive) return;
        this.ctx.fillStyle = '#060810'; 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for(let i = this.circles.length - 1; i >= 0; i--) {
            let c = this.circles[i]; 
            if(c.radius < c.maxRadius) c.radius += 2.5;
            c.life -= 0.8;
            if(c.life <= 0) { 
                this.circles.splice(i, 1); 
                if(c.type === 'normal' && this.mode === 'chaos') this.score = Math.max(0, this.score - 2); 
                continue; 
            }

            this.ctx.save(); 
            this.ctx.globalAlpha = c.life / 100; 
            this.ctx.fillStyle = c.color;
            this.ctx.beginPath(); 
            this.ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2); 
            this.ctx.fill();
            if(c.type === 'bomb') { 
                this.ctx.fillStyle = '#000'; 
                this.ctx.font = '14px sans-serif'; 
                this.ctx.fillText('💣', c.x - 7, c.y + 5); 
            }
            this.ctx.restore();
        }

        this.particles.forEach((p, i) => { 
            p.update(); 
            p.draw(this.ctx); 
            if(p.alpha <= 0) this.particles.splice(i, 1); 
        });
        const scr = document.getElementById('current-game-score');
        if (scr) scr.innerText = this.score;
        saveBestScore('reactor', this.mode, this.score);
        requestAnimationFrame(() => this.loop());
    }
    destroy() { 
        this.alive = false; 
        this.canvas.removeEventListener('pointerdown', this.tp); 
    }
}

// --- 3. БЛОК БЛАСТ (BLOCK BLAST) ---
class BlockBlast {
    constructor(canvas, mode) {
        this.canvas = canvas; 
        this.ctx = canvas.getContext('2d'); 
        this.mode = mode;
        this.cols = 8; 
        this.rows = 8; 
        this.w = canvas.width / this.cols;
        this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
        this.particles = []; 
        this.score = 0; 
        this.alive = true;
        this.spawnBlockTimer = 0;
        this.cl = (e) => this.click(e);
        this.canvas.addEventListener('pointerdown', this.cl);
        this.loop();
    }
    click(e) {
        const rect = this.canvas.getBoundingClientRect();
        const cx = Math.floor((e.clientX - rect.left) / this.w);
        const cy = Math.floor((e.clientY - rect.top) / this.w);
        
        if(cx >= 0 && cx < this.cols && cy >= 0 && cy < this.rows && this.grid[cy][cx]) {
            let color = this.grid[cy][cx]; 
            this.grid[cy][cx] = null;
            this.score += 10; 
            triggerScreenShake();
            for(let i = 0; i < 12; i++) {
                this.particles.push(new Particle(cx * this.w + this.w / 2, cy * this.w + this.w / 2, color));
            }
            this.checkLines();
        }
    }
    checkLines() {
        for(let r = 0; r < this.rows; r++) {
            let empty = true; 
            for(let c = 0; c < this.cols; c++) { 
                if(this.grid[r][c]) empty = false; 
            }
            if(empty) { this.score += 50; }
        }
    }
    loop() {
        if(!this.alive) return;
        this.spawnBlockTimer++;
        if(this.spawnBlockTimer > 40) {
            this.spawnBlockTimer = 0;
            let rx = Math.floor(Math.random() * this.cols); 
            let ry = Math.floor(Math.random() * this.rows);
            this.grid[ry][rx] = STATE.activeSkin;
            
            let total = 0; 
            this.grid.forEach(r => r.forEach(c => { if(c) total++; }));
            if(total > 45) {
                this.alive = false; 
                saveBestScore('blockblast', this.mode, this.score);
                alert(`Поле заполнено! Результат: ${this.score}`); 
                updateWallet(Math.floor(this.score / 5));
                navigateTo('screen-lobby'); 
                return;
            }
        }

        this.ctx.fillStyle = '#060810'; 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for(let r = 0; r < this.rows; r++) {
            for(let c = 0; c < this.cols; c++) {
                this.ctx.strokeStyle = 'rgba(255,255,255,0.02)';
                this.ctx.strokeRect(c * this.w, r * this.w, this.w, this.w);
                if(this.grid[r][c]) {
                    this.ctx.fillStyle = this.grid[r][c];
                    this.ctx.fillRect(c * this.w + 2, r * this.w + 2, this.w - 4, this.w - 4);
                }
            }
        }

        this.particles.forEach((p, i) => { 
            p.update(); 
            p.draw(this.ctx); 
            if(p.alpha <= 0) this.particles.splice(i, 1); 
        });
        const scr = document.getElementById('current-game-score');
        if (scr) scr.innerText = this.score;
        requestAnimationFrame(() => this.loop());
    }
    destroy() { 
        this.alive = false; 
        this.canvas.removeEventListener('pointerdown', this.cl); 
    }
}

// --- 4. КИБЕР КВЕСТ / РАННЕР (CYBER DASH) ---
class CyberDash {
    constructor(canvas, mode) {
        this.canvas = canvas; 
        this.ctx = canvas.getContext('2d'); 
        this.mode = mode;
        this.player = { x: 50, y: canvas.height / 2, w: 20, h: 20, vy: 0, gravity: 0.6, isUp: false };
        this.obstacles = []; 
        this.particles = []; 
        this.score = 0; 
        this.alive = true; 
        this.frame = 0;
        this.fl = () => this.flip();
        this.canvas.addEventListener('pointerdown', this.fl);
        this.loop();
    }
    flip() {
        this.player.isUp = !this.player.isUp;
        this.player.gravity = this.player.isUp ? -0.6 : 0.6;
        for(let i = 0; i < 6; i++) this.particles.push(new Particle(this.player.x, this.player.y, STATE.activeSkin));
    }
    loop() {
        if(!this.alive) return; 
        this.frame++;
        
        this.player.vy += this.player.gravity; 
        this.player.y += this.player.vy;
        if(this.player.y < 0) { this.player.y = 0; this.player.vy = 0; }
        if(this.player.y > this.canvas.height - this.player.h) { 
            this.player.y = this.canvas.height - this.player.h; 
            this.player.vy = 0; 
        }

        if(this.frame % 70 === 0) {
            let h = Math.random() * 120 + 40; 
            let pass = Math.random() > 0.5;
            this.obstacles.push({ x: this.canvas.width, y: pass ? 0 : this.canvas.height - h, w: 24, h: h });
        }

        this.ctx.fillStyle = '#060810'; 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = STATE.activeSkin;
        this.ctx.fillRect(this.player.x, this.player.y, this.player.w, this.player.h);

        this.ctx.fillStyle = '#FF453A';
        for(let i = this.obstacles.length - 1; i >= 0; i--) {
            let o = this.obstacles[i]; 
            o.x -= 4.5;
            this.ctx.fillRect(o.x, o.y, o.w, o.h);

            if(this.player.x < o.x + o.w && this.player.x + this.player.w > o.x &&
               this.player.y < o.y + o.h && this.player.y + this.player.h > o.y) {
                this.alive = false; 
                triggerScreenShake();
                saveBestScore('cyberdash', this.mode, this.score);
                alert(`Система повреждена! Финальный счёт: ${this.score}`);
                updateWallet(Math.floor(this.score / 3)); 
                navigateTo('screen-lobby'); 
                return;
            }
            if(o.x + o.w < 0) { 
                this.obstacles.splice(i, 1); 
                this.score += 10; 
            }
        }

        this.particles.forEach((p, i) => { 
            p.update(); 
            p.draw(this.ctx); 
            if(p.alpha <= 0) this.particles.splice(i, 1); 
        });
        const scr = document.getElementById('current-game-score');
        if (scr) scr.innerText = this.score;
        requestAnimationFrame(() => this.loop());
    }
    destroy() { 
        this.alive = false; 
        this.canvas.removeEventListener('pointerdown', this.fl); 
    }
}
