/* snake.js — Змейка с плавной (интерполированной) анимацией движения,
   поддержкой свайпов/стрелок и применением купленного скина. */

(function(){
  let canvas, ctx, loopId, moveTimer;
  let cell = 20, cols = 18, rows = 18;
  let snake, dir, nextDir, food, score, alive, moveInterval, lastMoveTime;
  let animProgress = 1; // 0..1 для интерполяции между клетками

  window.startSnake = function(stage){
    stage.innerHTML = `
      <div class="snk-wrap">
        <div class="snk-score">Счёт: <span id="snkScore">0</span></div>
        <canvas id="snkCanvas"></canvas>
        <div class="snk-pad">
          <button class="snk-btn" data-d="up">▲</button>
          <div class="snk-row">
            <button class="snk-btn" data-d="left">◀</button>
            <button class="snk-btn" data-d="right">▶</button>
          </div>
          <button class="snk-btn" data-d="down">▼</button>
        </div>
        <div class="snk-overlay" id="snkOverlay" style="display:none">
          <div class="snk-overlay-card">
            <h3>Игра окончена</h3>
            <p id="snkFinalScore"></p>
            <button class="btn-primary" id="snkRetry">Играть снова</button>
          </div>
        </div>
      </div>
      <style>
        .snk-wrap{ display:flex; flex-direction:column; align-items:center; gap:14px; position:relative; }
        .snk-score{ font-weight:800; font-size:16px; }
        #snkCanvas{ border-radius:18px; box-shadow:0 12px 30px rgba(0,0,0,0.45); background:#0d1017; }
        .snk-pad{ display:flex; flex-direction:column; align-items:center; gap:8px; }
        .snk-row{ display:flex; gap:64px; }
        .snk-btn{
          width:52px; height:52px; border-radius:16px; border:1px solid var(--border);
          background: rgba(255,255,255,0.06); color:#fff; font-size:18px; cursor:pointer;
          transition: transform .2s var(--ease-spring), background .2s;
        }
        .snk-btn:active{ transform: scale(0.85); background: rgba(255,255,255,0.15); }
        .snk-overlay{
          position:absolute; inset:0; background:rgba(8,10,15,0.75); backdrop-filter: blur(10px);
          display:flex; align-items:center; justify-content:center; border-radius:18px;
          animation: fadeSlide .35s var(--ease-out);
        }
        .snk-overlay-card{ text-align:center; }
        .snk-overlay-card h3{ margin:0 0 8px; }
        .snk-overlay-card p{ color:var(--text-dim); margin-bottom:16px; }
      </style>
    `;

    canvas = document.getElementById('snkCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = cols * cell;
    canvas.height = rows * cell;

    document.querySelectorAll('.snk-btn').forEach(b => {
      b.addEventListener('click', () => setDir(b.dataset.d));
    });

    document.addEventListener('keydown', keyHandler);
    let touchStartX=0, touchStartY=0;
    canvas.addEventListener('touchstart', e=>{ touchStartX=e.touches[0].clientX; touchStartY=e.touches[0].clientY; });
    canvas.addEventListener('touchend', e=>{
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if(Math.abs(dx) > Math.abs(dy)) setDir(dx>0?'right':'left');
      else setDir(dy>0?'down':'up');
    });

    document.getElementById('snkRetry').addEventListener('click', resetGame);

    resetGame();
  };

  function keyHandler(e){
    const map = { ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right', w:'up', s:'down', a:'left', d:'right' };
    if(map[e.key]) setDir(map[e.key]);
  }

  function setDir(d){
    const opposite = { up:'down', down:'up', left:'right', right:'left' };
    if(opposite[d] === dir) return; // нельзя развернуться на 180
    nextDir = d;
  }

  function resetGame(){
    snake = [{x:9,y:9},{x:8,y:9},{x:7,y:9}];
    dir = 'right'; nextDir = 'right';
    score = 0; alive = true; animProgress = 1;
    moveInterval = 140; lastMoveTime = performance.now();
    placeFood();
    document.getElementById('snkScore').textContent = 0;
    document.getElementById('snkOverlay').style.display = 'none';
    cancelAnimationFrame(loopId);
    loopId = requestAnimationFrame(loop);
  }

  function placeFood(){
    let ok = false;
    while(!ok){
      food = { x: Math.floor(Math.random()*cols), y: Math.floor(Math.random()*rows) };
      ok = !snake.some(s => s.x===food.x && s.y===food.y);
    }
  }

  function loop(now){
    if(!alive) return;
    const dt = now - lastMoveTime;
    animProgress = Math.min(1, dt / moveInterval);

    if(dt >= moveInterval){
      step();
      lastMoveTime = now;
      animProgress = 0;
    }
    draw();
    loopId = requestAnimationFrame(loop);
  }

  function step(){
    dir = nextDir;
    const head = { ...snake[0] };
    if(dir==='up') head.y--; if(dir==='down') head.y++;
    if(dir==='left') head.x--; if(dir==='right') head.x++;

    if(head.x<0 || head.y<0 || head.x>=cols || head.y>=rows || snake.some(s=>s.x===head.x && s.y===head.y)){
      gameOver();
      return;
    }

    snake.unshift(head);
    if(head.x===food.x && head.y===food.y){
      score += 10;
      document.getElementById('snkScore').textContent = score;
      moveInterval = Math.max(70, moveInterval - 2); // постепенное ускорение — приятная прогрессия
      placeFood();
    }else{
      snake.pop();
    }
  }

  function gameOver(){
    alive = false;
    document.getElementById('snkFinalScore').textContent = 'Счёт: ' + score;
    document.getElementById('snkOverlay').style.display = 'flex';
    const coins = Math.floor(score / 2);
    if(coins > 0) window.grantReward(coins, score);
  }

  function draw(){
    const skin = window.getActiveSkin();
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // сетка (тонкая, для глубины)
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    for(let x=0;x<=cols;x++){ ctx.beginPath(); ctx.moveTo(x*cell,0); ctx.lineTo(x*cell,canvas.height); ctx.stroke(); }
    for(let y=0;y<=rows;y++){ ctx.beginPath(); ctx.moveTo(0,y*cell); ctx.lineTo(canvas.width,y*cell); ctx.stroke(); }

    // еда с пульсацией
    const pulse = 1 + Math.sin(performance.now()/180)*0.12;
    ctx.fillStyle = '#FF5C7A';
    ctx.shadowColor = '#FF5C7A'; ctx.shadowBlur = 14;
    roundRect(food.x*cell + cell*0.15, food.y*cell + cell*0.15, cell*0.7*pulse, cell*0.7*pulse, 6);
    ctx.shadowBlur = 0;

    // змейка с плавной интерполяцией головы к следующей клетке
    const grad = ctx.createLinearGradient(0,0,canvas.width,canvas.height);
    grad.addColorStop(0, skin.gradient[0]);
    grad.addColorStop(1, skin.gradient[1]);
    ctx.fillStyle = grad;

    snake.forEach((seg, i) => {
      let dx = 0, dy = 0;
      if(i===0){
        if(dir==='up') dy = -(1-animProgress);
        if(dir==='down') dy = (1-animProgress);
        if(dir==='left') dx = -(1-animProgress);
        if(dir==='right') dx = (1-animProgress);
      }
      const size = i===0 ? cell*0.86 : cell*0.78;
      const off = (cell-size)/2;
      roundRect((seg.x+dx)*cell + off, (seg.y+dy)*cell + off, size, size, i===0?8:6);
    });
  }

  function roundRect(x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
    ctx.fill();
  }

  window.stopCurrentGame = function(){
    alive = false;
    cancelAnimationFrame(loopId);
    document.removeEventListener('keydown', keyHandler);
  };
  window.restartCurrentGame = function(){
    if(document.getElementById('snkCanvas')) resetGame();
  };
})();
