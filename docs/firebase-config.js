// Конфиг твоего проекта Firebase.
// Где взять: консоль Firebase → настройки проекта (шестерёнка) →
// «Ваши приложения» → выбери веб-приложение → «Конфигурация SDK».
// Скопируй значения из объекта firebaseConfig сюда.
export const firebaseConfig = {
  apiKey: 'AIzaSyBuk802JDoM4KwwVLAjfBx8hlZXG_GKX2M',
  authDomain: 'facts-769d3.firebaseapp.com',
  projectId: 'facts-769d3',
  storageBucket: 'facts-769d3.firebasestorage.app',
  messagingSenderId: '771344741484',
  appId: '1:771344741484:web:73a8282b0771407b56d449',
  measurementId: "G-27QQTDG4M7"
};

// Необязательно, но рекомендуется: App Check c reCAPTCHA v3.
// Защищает Firestore и Storage от запросов не с твоего сайта.
// Оставь null, если пока не настраивал (см. SETUP.md, шаг 6).
export const appCheckSiteKey = null;
