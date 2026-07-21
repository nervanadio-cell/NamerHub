/* ui.js — тосты, шапка профиля, вкладки Игры/Магазин */

document.addEventListener('DOMContentLoaded', () => {
  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById('view-' + btn.dataset.view).classList.add('active');
      if(btn.dataset.view === 'shop') window.renderShop();
    });
  });
});

let toastTimer = null;
window.showToast = function(msg){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
};

window.refreshProfileUI = function(){
  const user = window.currentUser;
  if(!user) return;
  document.getElementById('profileName').textContent = user.nick;
  document.getElementById('profileLevel').textContent = user.level;
  document.getElementById('coinCount').textContent = user.coins;

  const skin = window.getActiveSkin();
  const avatar = document.getElementById('avatarPreview');
  avatar.style.background = `linear-gradient(135deg, ${skin.gradient[0]}, ${skin.gradient[1]})`;
};

/* Начисление монет/опыта после игры — используется играми */
window.grantReward = function(coins, xp){
  const user = window.currentUser;
  user.coins += coins;
  user.xp += xp;
  const needed = user.level * 100;
  if(user.xp >= needed){
    user.xp -= needed;
    user.level += 1;
    window.showToast('Новый уровень: ' + user.level + ' 🎉');
  }
  Storage.saveUser(user);
  window.refreshProfileUI();
};
