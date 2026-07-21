/* games.js — реестр всех игр библиотеки.
   playable:true -> открывается по клику через launcher (window.Games.launch)
   playable:false -> карточка помечена "скоро", кладём заготовку на будущее */

const GAME_LIST = [
  { id:'snake',      name:'Змейка',        icon:'🐍', playable:true  },
  { id:'blockblast', name:'Block Blast',   icon:'🧊', playable:true  },
  { id:'tetris',     name:'Тетрис',        icon:'🧱', playable:false },
  { id:'2048',       name:'2048',          icon:'🔢', playable:false },
  { id:'flappy',     name:'Флэппи Флай',   icon:'🐦', playable:false },
  { id:'runner',     name:'Раннер',        icon:'🏃', playable:false },
  { id:'memory',     name:'Память',        icon:'🃏', playable:false },
  { id:'minesweeper',name:'Сапёр',         icon:'💣', playable:false },
  { id:'pong',       name:'Понг',          icon:'🏓', playable:false },
  { id:'breakout',   name:'Арканоид',      icon:'🧨', playable:false },
  { id:'tictactoe',  name:'Крестики-нолики', icon:'❌', playable:false },
  { id:'connect4',   name:'4 в ряд',       icon:'🔴', playable:false },
  { id:'sudoku',     name:'Судоку',        icon:'🔟', playable:false },
  { id:'wordguess',  name:'Угадай слово',  icon:'🔤', playable:false },
  { id:'maze',       name:'Лабиринт',      icon:'🌀', playable:false },
  { id:'platformer', name:'Платформер',    icon:'🕹️', playable:false },
  { id:'towerdef',   name:'Tower Defense', icon:'🏰', playable:false },
  { id:'racer',      name:'Гонки',         icon:'🏎️', playable:false },
  { id:'fishing',    name:'Рыбалка',       icon:'🎣', playable:false },
  { id:'clicker',    name:'Кликер',        icon:'👆', playable:false },
  { id:'sim2048x2',  name:'Merge Cubes',   icon:'🟣', playable:false },
  { id:'chess',      name:'Шахматы',       icon:'♟️', playable:false },
  { id:'checkers',   name:'Шашки',         icon:'⚫', playable:false },
  { id:'bubbleshoot',name:'Bubble Shooter',icon:'🔵', playable:false },
  { id:'wordle',     name:'Wordle-клон',   icon:'📝', playable:false },
  { id:'colorflood', name:'Color Flood',   icon:'🎨', playable:false },
  { id:'stack',      name:'Stack Tower',   icon:'📚', playable:false },
  { id:'dodge',      name:'Dodge Rain',    icon:'☔', playable:false },
  { id:'spaceshoot',  name:'Space Shooter', icon:'🚀', playable:false },
  { id:'quiz',       name:'Викторина',     icon:'❓', playable:false },
];

function renderGameGrid(){
  const grid = document.getElementById('gameGrid');
  const search = document.getElementById('gameSearch');
  const query = (search.value || '').toLowerCase();

  grid.innerHTML = '';
  const filtered = GAME_LIST.filter(g => g.name.toLowerCase().includes(query));

  filtered.forEach((g, i) => {
    const card = document.createElement('div');
    card.className = 'game-card' + (g.playable ? '' : ' locked');
    card.style.animationDelay = (i * 0.03) + 's';
    card.innerHTML = `
      <div class="icon">${g.icon}</div>
      <div class="name">${g.name}</div>
      ${g.playable ? '' : '<span class="badge-soon">СКОРО</span>'}
    `;
    if(g.playable){
      card.addEventListener('click', () => window.Games.launch(g.id, g.name));
    }
    grid.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const search = document.getElementById('gameSearch');
  search.addEventListener('input', renderGameGrid);
});

window.renderGameGrid = renderGameGrid;

/* ====== launcher ====== */
window.Games = {
  launch(id, title){
    document.getElementById('gameTitle').textContent = title;
    switchScreen('gameScreen');
    const stage = document.getElementById('gameStage');
    stage.innerHTML = '';

    if(id === 'snake') window.startSnake(stage);
    if(id === 'blockblast') window.startBlockBlast(stage);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('backToLobby').addEventListener('click', () => {
    if(window.stopCurrentGame) window.stopCurrentGame();
    switchScreen('lobbyScreen');
    window.renderGameGrid();
  });
  document.getElementById('restartGame').addEventListener('click', () => {
    if(window.restartCurrentGame) window.restartCurrentGame();
  });
});
