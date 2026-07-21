/* blockblast.js — головоломка "перетащи фигуру на поле 8x8, собери линию".
   DOM-based drag&drop (мышь + touch), плавные анимации появления/очистки. */

(function(){
  const SIZE = 8;
  let boardEl, trayEl, scoreEl, overlayEl;
  let board, score, dragPiece, dragEl;
  let alive = true;

  const SHAPES = [
    [[1]], [[1,1]], [[1],[1]], [[1,1,1]], [[1],[1],[1]],
    [[1,1],[1,1]], [[1,1,0],[0,1,1]], [[0,1,1],[1,1,0]],
    [[1,1,1],[1,0,0]], [[1,1,1],[0,0,1]], [[1,0],[1,0],[1,1]],
    [[1,1],[0,1],[0,1]]
  ];

  window.startBlockBlast = function(stage){
    stage.innerHTML = `
      <div class="bb-wrap">
        <div class="bb-score">Счёт: <span id="bbScore">0</span></div>
        <div class="bb-board" id="bbBoard"></div>
        <div class="bb-tray" id="bbTray"></div>
        <div class="bb-overlay" id="bbOverlay" style="display:none">
          <div class="snk-overlay-card">
            <h3>Ходов больше нет</h3>
            <p id="bbFinalScore"></p>
            <button class="btn-primary" id="bbRetry">Играть снова</button>
          </div>
        </div>
      </div>
      <style>
        .bb-wrap{ display:flex; flex-direction:column; align-items:center; gap:16px; position:relative; }
        .bb-score{ font-weight:800; font-size:16px; }
        .bb-board{
          display:grid; grid-template-columns: repeat(${SIZE}, 34px); grid-template-rows: repeat(${SIZE}, 34px);
          gap:3px; background: rgba(255,255,255,0.04); padding:8px; border-radius:16px;
          border:1px solid var(--border);
        }
        .bb-cell{
          width:34px; height:34px; border-radius:7px; background: rgba(255,255,255,0.05);
          transition: background .25s var(--ease-out), transform .25s var(--ease-spring);
        }
        .bb-cell.filled{ box-shadow: inset 0 0 0 1px rgba(255,255,255,0.15); }
        .bb-cell.clearing{ animation: bbClear .4s var(--ease-snap) forwards; }
        @keyframes bbClear{ 0%{ transform:scale(1); opacity:1; } 60%{ transform:scale(1.25); } 100%{ transform:scale(0); opacity:0; } }
        .bb-tray{ display:flex; gap:22px; min-height:90px; align-items:center; }
        .bb-piece{ display:grid; gap:3px; cursor:grab; touch-action:none; transition: opacity .3s; }
        .bb-piece.dragging{ opacity:0.35; }
        .bb-piece .pc{ width:22px; height:22px; border-radius:5px; }
        .bb-drag-ghost{ position:fixed; pointer-events:none; z-index:999; display:grid; gap:3px; opacity:0.9; }
        .bb-drag-ghost .pc{ width:34px; height:34px; border-radius:7px; }
        .bb-overlay{
          position:absolute; inset:-10px; background:rgba(8,10,15,0.75); backdrop-filter: blur(10px);
          display:flex; align-items:center; justify-content:center; border-radius:18px;
        }
      </style>
    `;
    boardEl = document.getElementById('bbBoard');
    trayEl = document.getElementById('bbTray');
    scoreEl = document.getElementById('bbScore');
    overlayEl = document.getElementById('bbOverlay');
    document.getElementById('bbRetry').addEventListener('click', resetGame);
    resetGame();
  };

  function resetGame(){
    board = Array.from({length:SIZE}, () => Array(SIZE).fill(0));
    score = 0; alive = true;
    scoreEl.textContent = 0;
    overlayEl.style.display = 'none';
    drawBoard();
    fillTray();
  }

  function drawBoard(){
    boardEl.innerHTML = '';
    const skin = window.getActiveSkin();
    for(let y=0;y<SIZE;y++){
      for(let x=0;x<SIZE;x++){
        const cellDiv = document.createElement('div');
        cellDiv.className = 'bb-cell' + (board[y][x] ? ' filled' : '');
        if(board[y][x]) cellDiv.style.background = `linear-gradient(135deg, ${skin.gradient[0]}, ${skin.gradient[1]})`;
        cellDiv.dataset.x = x; cellDiv.dataset.y = y;
        boardEl.appendChild(cellDiv);
      }
    }
  }

  function fillTray(){
    trayEl.innerHTML = '';
    for(let i=0;i<3;i++){
      const shape = SHAPES[Math.floor(Math.random()*SHAPES.length)];
      const pieceEl = buildPieceEl(shape, 22);
      pieceEl.dataset.used = '0';
      attachDrag(pieceEl, shape);
      trayEl.appendChild(pieceEl);
    }
  }

  function buildPieceEl(shape, cellPx){
    const el = document.createElement('div');
    el.className = 'bb-piece';
    const rows = shape.length, cols = shape[0].length;
    el.style.gridTemplateColumns = `repeat(${cols}, ${cellPx}px)`;
    el.style.gridTemplateRows = `repeat(${rows}, ${cellPx}px)`;
    const skin = window.getActiveSkin();
    shape.forEach(row => row.forEach(v => {
      const c = document.createElement('div');
      if(v){ c.className = 'pc'; c.style.background = `linear-gradient(135deg, ${skin.gradient[0]}, ${skin.gradient[1]})`; }
      el.appendChild(c);
    }));
    return el;
  }

  function attachDrag(pieceEl, shape){
    const start = (clientX, clientY) => {
      if(pieceEl.dataset.used === '1') return;
      dragPiece = { shape, sourceEl: pieceEl };
      pieceEl.classList.add('dragging');
      dragEl = buildPieceEl(shape, 34);
      dragEl.classList.add('bb-drag-ghost');
      document.body.appendChild(dragEl);
      moveGhost(clientX, clientY);
    };
    pieceEl.addEventListener('mousedown', e => start(e.clientX, e.clientY));
    pieceEl.addEventListener('touchstart', e => { const t=e.touches[0]; start(t.clientX, t.clientY); }, {passive:true});
  }

  function moveGhost(clientX, clientY){
    if(!dragEl) return;
    dragEl.style.left = (clientX - 40) + 'px';
    dragEl.style.top = (clientY - 60) + 'px';
  }

  document.addEventListener('mousemove', e => { if(dragEl) moveGhost(e.clientX, e.clientY); highlightTarget(e.clientX, e.clientY); });
  document.addEventListener('touchmove', e => { if(dragEl && e.touches[0]){ moveGhost(e.touches[0].clientX, e.touches[0].clientY); highlightTarget(e.touches[0].clientX, e.touches[0].clientY); } }, {passive:true});
  document.addEventListener('mouseup', e => drop(e.clientX, e.clientY));
  document.addEventListener('touchend', e => { if(e.changedTouches[0]) drop(e.changedTouches[0].clientX, e.changedTouches[0].clientY); });

  function cellUnderPoint(clientX, clientY){
    const el = document.elementFromPoint(clientX, clientY - 40); // смещение над пальцем/курсором
    if(el && el.classList.contains('bb-cell')) return el;
    return null;
  }

  function highlightTarget(clientX, clientY){
    document.querySelectorAll('.bb-cell.preview').forEach(c => { c.classList.remove('preview'); if(!board[c.dataset.y][c.dataset.x]) c.style.background=''; });
    if(!dragPiece) return;
    const target = cellUnderPoint(clientX, clientY);
    if(!target) return;
    const ox = parseInt(target.dataset.x), oy = parseInt(target.dataset.y);
    forEachCellOfShape(dragPiece.shape, ox, oy, (x,y) => {
      if(x>=0 && y>=0 && x<SIZE && y<SIZE && !board[y][x]){
        const c = boardEl.children[y*SIZE+x];
        c.classList.add('preview');
        c.style.background = 'rgba(255,255,255,0.18)';
      }
    });
  }

  function forEachCellOfShape(shape, ox, oy, cb){
    shape.forEach((row, ry) => row.forEach((v, rx) => { if(v) cb(ox+rx, oy+ry); }));
  }

  function drop(clientX, clientY){
    if(!dragPiece) return;
    const target = cellUnderPoint(clientX, clientY);
    document.querySelectorAll('.bb-cell.preview').forEach(c => { c.classList.remove('preview'); if(!board[c.dataset.y][c.dataset.x]) c.style.background=''; });

    let placed = false;
    if(target){
      const ox = parseInt(target.dataset.x), oy = parseInt(target.dataset.y);
      let fits = true;
      forEachCellOfShape(dragPiece.shape, ox, oy, (x,y) => {
        if(x<0||y<0||x>=SIZE||y>=SIZE||board[y][x]) fits = false;
      });
      if(fits){
        forEachCellOfShape(dragPiece.shape, ox, oy, (x,y) => { board[y][x] = 1; });
        placed = true;
      }
    }

    if(placed){
      dragPiece.sourceEl.dataset.used = '1';
      dragPiece.sourceEl.style.visibility = 'hidden';
      score += countShapeCells(dragPiece.shape);
      scoreEl.textContent = score;
      drawBoard();
      setTimeout(checkLines, 80);
    }

    if(dragEl){ dragEl.remove(); dragEl = null; }
    if(dragPiece) dragPiece.sourceEl.classList.remove('dragging');
    dragPiece = null;

    const allUsed = [...trayEl.children].every(p => p.dataset.used === '1');
    if(allUsed) setTimeout(fillTray, 250);
  }

  function countShapeCells(shape){ return shape.flat().filter(Boolean).length; }

  function checkLines(){
    const fullRows = [];
    const fullCols = [];
    for(let y=0;y<SIZE;y++) if(board[y].every(v=>v)) fullRows.push(y);
    for(let x=0;x<SIZE;x++) if(board.every(row=>row[x])) fullCols.push(x);

    if(fullRows.length===0 && fullCols.length===0) return;

    fullRows.forEach(y => { for(let x=0;x<SIZE;x++) boardEl.children[y*SIZE+x].classList.add('clearing'); });
    fullCols.forEach(x => { for(let y=0;y<SIZE;y++) boardEl.children[y*SIZE+x].classList.add('clearing'); });

    const bonus = (fullRows.length + fullCols.length) * 20;
    score += bonus;
    scoreEl.textContent = score;
    window.showToast('Линия очищена! +' + bonus);

    setTimeout(() => {
      fullRows.forEach(y => { for(let x=0;x<SIZE;x++) board[y][x] = 0; });
      fullCols.forEach(x => { for(let y=0;y<SIZE;y++) board[y][x] = 0; });
      drawBoard();
    }, 380);
  }

  window.stopCurrentGame = function(){
    alive = false;
    if(dragEl){ dragEl.remove(); dragEl = null; }
    dragPiece = null;
  };
  window.restartCurrentGame = function(){
    if(document.getElementById('bbBoard')) resetGame();
  };
})();
