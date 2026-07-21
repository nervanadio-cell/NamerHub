/* storage.js — простая обёртка над localStorage.
   Хранит: базу пользователей и текущую сессию. */

const DB_KEY = 'nova_arcade_users_v1';
const SESSION_KEY = 'nova_arcade_session_v1';

const Storage = {
  _readAll(){
    try{
      return JSON.parse(localStorage.getItem(DB_KEY)) || {};
    }catch(e){ return {}; }
  },
  _writeAll(db){
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  },

  userExists(nick){
    const db = this._readAll();
    return !!db[nick.toLowerCase()];
  },

  createUser(nick, pass){
    const db = this._readAll();
    const key = nick.toLowerCase();
    db[key] = {
      nick,
      pass, // демо-проект: пароль в открытом виде, для прод-версии нужен бэкенд + хэш
      coins: 150,
      level: 1,
      xp: 0,
      ownedSkins: ['default'],
      activeSkin: 'default',
      createdAt: Date.now()
    };
    this._writeAll(db);
    return db[key];
  },

  validateLogin(nick, pass){
    const db = this._readAll();
    const user = db[nick.toLowerCase()];
    if(!user) return { ok:false, reason:'no_user' };
    if(user.pass !== pass) return { ok:false, reason:'bad_pass' };
    return { ok:true, user };
  },

  saveUser(user){
    const db = this._readAll();
    db[user.nick.toLowerCase()] = user;
    this._writeAll(db);
  },

  setSession(nick){
    localStorage.setItem(SESSION_KEY, nick.toLowerCase());
  },
  clearSession(){
    localStorage.removeItem(SESSION_KEY);
  },
  getSessionUser(){
    const key = localStorage.getItem(SESSION_KEY);
    if(!key) return null;
    const db = this._readAll();
    return db[key] || null;
  }
};
