import { logout } from './auth2.js';

document.getElementById('btnWarmup')?.addEventListener('click', () => {
  location.href = 'wu_form/wu_p1.html';
});

document.getElementById('btnMain')?.addEventListener('click', () => {
  location.href = 'main_form/1_category.html';
});

document.getElementById('btnShort')?.addEventListener('click', () => {
  location.href = 'sc_form/sc_p1.html';
});

document.getElementById('logoutBtn')?.addEventListener('click', logout);

console.log("Dashboard JS loaded");
