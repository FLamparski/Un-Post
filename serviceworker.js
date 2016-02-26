const CACHE_NAME = 'unpost-cache-v1';
const CACHE_URLS = [
  '/',
  '/bower_components/dexie/dist/latest/Dexie.js',
  '/bower_components/cache-polyfill/index.js',
  '/script.js',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://code.getmdl.io/1.1.1/material.blue_grey-indigo.min.css',
  'https://code.getmdl.io/1.1.1/material.min.js'
];

importScripts(CACHE_URLS[1], CACHE_URLS[2]);

const db = new Dexie('unpost');
db.version(2).stores({
  posts: 'id++,date,content,isSynced',
  photos: 'id++,post,name,type,content,isSynced'
});
db.open();

const messages = {
  savePost: msg => {
    db.posts.put({date: new Date(), content: msg.post.content, isSynced: false})
      .then(id =>
        Promise.all(msg.post.photos.map(p =>
          db.photos.put({post: id, name: p.name, type: p.type, content: p, isSynced: false})))
      ).then(updateClients);
  }
};

function updateClients() {
  self.clients.matchAll()
    .then(cs => cs.forEach(c => c.postMessage({name: 'updatePosts'})));
}

function routeMessage(message) {
  console.log('routeMessage', message.name);
  messages[message.name](message);
}

self.addEventListener('install', e => {
  console.info('service worker installing');
  e.waitUntil(
    caches.open(CACHE_NAME).then(
      cache => {
        console.info('Cache opened', CACHE_NAME);
        cache.addAll(CACHE_URLS.map(u => new Request(u, {mode: 'no-cors', redirect: 'follow'})));
      })
  )
});
self.addEventListener('activate', e => {
  console.info('service worker activated');
});

self.addEventListener('fetch', e => e.respondWith(
  caches.match(e.request)
    .then(res => res ? res : fetch(e.request))
    .catch(err => fetch(e.request))
  )
);

self.addEventListener('message', e => routeMessage(e.data));
