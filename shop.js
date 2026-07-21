/* shop.js — магазин скинов. Скины хранятся как цвет/эмодзи-стиль
   и применяются в играх через window.getActiveSkin() */

const SKIN_LIST = [
  { id:'default', name:'Обычный',   price:0,   preview:'🟩', gradient:['#21D07A','#0FB55E'] },
  { id:'violet',  name:'Виолет',    price:100, preview:'🟪', gradient:['#7C5CFF','#4B2ED8'] },
  { id:'cyan',    name:'Неон Циан', price:150, preview:'🟦', gradient:['#00D4FF','#0091FF'] },
  { id:'sunset',  name:'Закат',     price:200, preview:'🟧', gradient:['#FF7A45','#FF3D68'] },
  { id:'gold',    name:'Золото',    price:350, preview:'🟨', gradient:['#FFE27A','#FFB020'] },
  { id:'obsidian',name:'Обсидиан',  price:500, preview:'⬛', gradient:['#3A3F4B','#141821'] },
];

function renderShop(){
  const grid = document.getElementById('shopGrid');
  const user = window.currentUser;
  grid.innerHTML = '';

  SKIN_LIST.forEach((skin, i) => {
    const owned = user.ownedSkins.includes(skin.id);
    const active = user.activeSkin === skin.id;

    const card = document.createElement('div');
    card.className = 'skin-card';
    card.style.animationDelay = (i * 0.04) + 's';
    card.innerHTML = `
      <div class="skin-preview" style="background:linear-gradient(135deg, ${skin.gradient[0]}, ${skin.gradient[1]})">${skin.preview}</div>
      <div class="skin-name">${skin.name}</div>
      <div class="skin-price">${skin.price === 0 ? 'Бесплатно' : '🪙 ' + skin.price}</div>
      <button class="skin-btn ${active ? 'active' : owned ? 'owned' : ''}">
        ${active ? 'Выбрано' : owned ? 'Выбрать' : 'Купить'}
      </button>
    `;

    card.querySelector('.skin-btn').addEventListener('click', () => {
      if(active) return;
      if(owned){
        user.activeSkin = skin.id;
        Storage.saveUser(user);
        renderShop();
        window.showToast('Скин выбран: ' + skin.name);
        return;
      }
      if(user.coins < skin.price){
        window.showToast('Не хватает монет 🪙');
        return;
      }
      user.coins -= skin.price;
      user.ownedSkins.push(skin.id);
      user.activeSkin = skin.id;
      Storage.saveUser(user);
      window.refreshProfileUI();
      renderShop();
      window.showToast('Куплено: ' + skin.name);
    });

    grid.appendChild(card);
  });
}

window.renderShop = renderShop;

window.getActiveSkin = function(){
  const user = window.currentUser;
  const skin = SKIN_LIST.find(s => s.id === user.activeSkin) || SKIN_LIST[0];
  return skin;
};
