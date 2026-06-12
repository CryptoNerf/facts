import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-storage.js';
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-app-check.js';
import { firebaseConfig, appCheckSiteKey } from './firebase-config.js';

const grid = document.getElementById('grid');
const form = document.getElementById('fact-form');
const imageLabel = document.querySelector('.image-link');
const imageInput = document.getElementById('image');
const imagePreview = document.getElementById('image-preview');
const imageHint = document.getElementById('image-hint');
const formError = document.getElementById('form-error');
const submitBtn = document.getElementById('submit-btn');
const filterBar = document.getElementById('filter-bar');
const filterTag = document.getElementById('filter-tag');
const filterReset = document.getElementById('filter-reset');

const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const FACTS_LIMIT = 200;

function showNotice(message) {
  const notice = document.createElement('article');
  notice.className = 'item';
  const text = document.createElement('div');
  text.className = 'text';
  text.textContent = message;
  notice.appendChild(text);
  grid.appendChild(notice);
}

if (firebaseConfig.apiKey === 'PASTE_FROM_FIREBASE_CONSOLE') {
  showNotice('Firebase не настроен: заполни firebase-config.js значениями из консоли Firebase (см. SETUP.md).');
  throw new Error('firebase-config.js is not filled in');
}

const app = initializeApp(firebaseConfig);
if (appCheckSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}
const db = getFirestore(app);
const storage = getStorage(app);
const factsCollection = collection(db, 'facts');

function currentFilter() {
  const h = decodeURIComponent(location.hash.slice(1));
  return h ? '#' + h : null;
}

function applyFilter() {
  const tag = currentFilter();
  grid.querySelectorAll('.item:not(.form-card)').forEach((el) => {
    el.hidden = Boolean(tag) && el.dataset.tag !== tag;
  });
  filterBar.hidden = !tag;
  if (tag) filterTag.textContent = tag;
}

function normalizeTag(raw) {
  return ('#' + raw.replace(/^#+/, '').replace(/\s+/g, '_')).slice(0, 60);
}

// ссылку на автора пишут прямо в поле имени: "Имя https://..."
function parseAuthor(raw) {
  let author = raw.trim().slice(0, 400);
  let authorLink = null;
  const linkMatch = author.match(/(https?:\/\/\S+|www\.\S+)/i);
  if (linkMatch) {
    authorLink = linkMatch[1];
    if (!/^https?:\/\//i.test(authorLink)) authorLink = 'https://' + authorLink;
    authorLink = authorLink.slice(0, 300);
    author = author.replace(linkMatch[1], '').replace(/\s+/g, ' ').trim();
    if (!author) author = authorLink.replace(/^https?:\/\//i, '');
  }
  return { author: author.slice(0, 100) || null, authorLink };
}

function factCard(fact) {
  const card = document.createElement('article');
  card.className = 'item';
  card.dataset.tag = fact.tag;

  if (fact.image) {
    const img = document.createElement('img');
    img.className = 'fact-image';
    img.src = fact.image;
    img.alt = fact.tag;
    img.loading = 'lazy';
    card.appendChild(img);
  }

  const tag = document.createElement('a');
  tag.className = 'tag';
  tag.textContent = fact.tag;
  tag.href = '#' + encodeURIComponent(fact.tag.slice(1));
  card.appendChild(tag);

  const text = document.createElement('div');
  text.className = 'text';
  text.textContent = fact.text;
  card.appendChild(text);

  if (fact.author) {
    const author = document.createElement('div');
    author.className = 'author';
    if (fact.authorLink) {
      const a = document.createElement('a');
      a.href = fact.authorLink;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = fact.author;
      author.appendChild(a);
    } else {
      author.textContent = fact.author;
    }
    card.appendChild(author);
  }

  if (fact.createdAt && fact.createdAt.toDate) {
    const date = document.createElement('div');
    date.className = 'date';
    date.textContent = fact.createdAt.toDate().toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    card.appendChild(date);
  }

  return card;
}

const factsQuery = query(factsCollection, orderBy('createdAt', 'desc'), limit(FACTS_LIMIT));

onSnapshot(
  factsQuery,
  (snapshot) => {
    grid.querySelectorAll('.item:not(.form-card)').forEach((el) => el.remove());
    snapshot.forEach((docSnap) => {
      grid.appendChild(factCard(docSnap.data({ serverTimestamps: 'estimate' })));
    });
    applyFilter();
  },
  (err) => {
    console.error(err);
    showNotice('Не удалось загрузить факты: ' + err.message);
  }
);

window.addEventListener('hashchange', applyFilter);

filterReset.addEventListener('click', () => {
  location.hash = '';
});

function resetImage() {
  imageInput.value = '';
  imagePreview.hidden = true;
  imagePreview.removeAttribute('src');
  imageHint.textContent = '+ image/gif';
}

imageLabel.addEventListener('click', (e) => {
  if (imageInput.files.length) {
    e.preventDefault();
    resetImage();
  }
});

imageInput.addEventListener('change', () => {
  const file = imageInput.files[0];
  if (file) {
    imagePreview.src = URL.createObjectURL(file);
    imagePreview.hidden = false;
    imageHint.textContent = '× remove image';
  } else {
    resetImage();
  }
});

async function uploadImage(file) {
  if (!ALLOWED_TYPES[file.type]) {
    throw new Error('Можно загружать только jpeg, png, gif или webp');
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('Файл слишком большой (максимум 8 МБ)');
  }
  const fileRef = ref(storage, 'uploads/' + crypto.randomUUID() + ALLOWED_TYPES[file.type]);
  await uploadBytes(fileRef, file, { contentType: file.type });
  return getDownloadURL(fileRef);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.hidden = true;

  const tagRaw = form.tag.value.trim();
  const text = form.text.value.trim().slice(0, 1000);
  if (!tagRaw || !text) {
    formError.textContent = 'Нужны хэштег и сам факт';
    formError.hidden = false;
    return;
  }

  submitBtn.disabled = true;
  try {
    const { author, authorLink } = parseAuthor(form.author.value);
    const file = imageInput.files[0];
    const image = file ? await uploadImage(file) : null;

    await addDoc(factsCollection, {
      tag: normalizeTag(tagRaw),
      text,
      author,
      authorLink,
      image,
      createdAt: serverTimestamp(),
    });

    form.reset();
    resetImage();
  } catch (err) {
    console.error(err);
    formError.textContent = err.message || 'Не удалось отправить факт';
    formError.hidden = false;
  } finally {
    submitBtn.disabled = false;
  }
});
