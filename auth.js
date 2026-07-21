/* auth.js — регистрация, вход, выход */

document.addEventListener('DOMContentLoaded', () => {

  // --- переключение вкладок Вход/Регистрация ---
  const tabBtns = document.querySelectorAll('.tab-btn');
  const forms = document.querySelectorAll('.auth-form');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      forms.forEach(f => f.classList.remove('active'));
      document.getElementById(btn.dataset.tab + 'Form').classList.add('active');
    });
  });

  // --- регистрация ---
  const registerForm = document.getElementById('registerForm');
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nick = document.getElementById('regNick').value.trim();
    const pass = document.getElementById('regPass').value;
    const pass2 = document.getElementById('regPass2').value;
    const errEl = document.getElementById('registerError');

    if(nick.length < 3){ errEl.textContent = 'Ник минимум 3 символа'; return; }
    if(pass.length < 4){ errEl.textContent = 'Пароль минимум 4 символа'; return; }
    if(pass !== pass2){ errEl.textContent = 'Пароли не совпадают'; return; }
    if(Storage.userExists(nick)){ errEl.textContent = 'Такой ник уже занят'; return; }

    errEl.textContent = '';
    const user = Storage.createUser(nick, pass);
    Storage.setSession(user.nick);
    enterLobby(user);
  });

  // --- вход ---
  const loginForm = document.getElementById('loginForm');
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nick = document.getElementById('loginNick').value.trim();
    const pass = document.getElementById('loginPass').value;
    const errEl = document.getElementById('loginError');

    const res = Storage.validateLogin(nick, pass);
    if(!res.ok){
      errEl.textContent = res.reason === 'no_user' ? 'Пользователь не найден' : 'Неверный пароль';
      return;
    }
    errEl.textContent = '';
    Storage.setSession(res.user.nick);
    enterLobby(res.user);
  });

  // --- выход ---
  document.getElementById('logoutBtn').addEventListener('click', () => {
    Storage.clearSession();
    switchScreen('authScreen');
  });

  // --- автовход по сессии ---
  const existing = Storage.getSessionUser();
  if(existing){
    enterLobby(existing);
  }
});

function enterLobby(user){
  window.currentUser = user;
  switchScreen('lobbyScreen');
  if(window.refreshProfileUI) window.refreshProfileUI();
  if(window.renderGameGrid) window.renderGameGrid();
  if(window.renderShop) window.renderShop();
}

function switchScreen(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
