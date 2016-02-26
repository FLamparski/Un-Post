window.currentPost = {
  content: '',
  photos: []
};

window.Q = document.querySelector.bind(document);

window.blobs = [];

function swMessage(message) {
  // This wraps the message posting/response in a promise, which will resolve if the response doesn't
  // contain an error, and reject with the error if it does. If you'd prefer, it's possible to call
  // controller.postMessage() and set up the onmessage handler independently of a promise, but this is
  // a convenient wrapper.
  return new Promise(function(resolve, reject) {
    var messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = function(event) {
      if (event.data.error) {
        reject(event.data.error);
      } else {
        resolve(event.data);
      }
    };

    // This sends the message data as well as transferring messageChannel.port2 to the service worker.
    // The service worker can then use the transferred port to reply via postMessage(), which
    // will in turn trigger the onmessage handler on messageChannel.port1.
    // See https://html.spec.whatwg.org/multipage/workers.html#dom-worker-postmessage
    navigator.serviceWorker.controller.postMessage(message,
      [messageChannel.port2]);
  });
}

document.addEventListener('DOMContentLoaded', e => {
  window.db = new Dexie('unpost');
  db.version(2).stores({
    posts: 'id++,date,content,isSynced',
    photos: 'id++,post,name,type,content,isSynced'
  });
  db.open();

  function closeEditor(special) {
    Q('dialog').close();
    Q('#post-content-editor').value = '';
    Q('dialog .thumbs').innerHTML = '';
    Q('#add-post-photos-input').value = '';
    currentPost = {
      content: '',
      photos: []
    };
    if (special === 'no-refresh') refreshPosts();
  }

  function refreshPost(post) {
    let card = document.createElement('div');
    card.className = 'mdl-card mdl-shadow--2dp';
    card.innerHTML = '<div class="mdl-card__supporting-text">' + post.content + '<div class="post-photos"></div></div>';
    Q('#posts').appendChild(card);
    db.photos.where('post').equals(post.id).each(photo => {
      let img = document.createElement('img');
      let src = URL.createObjectURL(photo.content);
      blobs.push(src);
      img.src = src;
      card.querySelector('.post-photos').appendChild(img);
    });
  }

  function refreshPosts() {
    Q('#posts').innerHTML = '';
    blobs.forEach(URL.revokeObjectURL.bind(URL));
    db.posts.orderBy('date').reverse().each(refreshPost);
  }

  Q('#add-post-fab')
    .addEventListener('click', e => Q('dialog').showModal());
  Q('dialog .close')
    .addEventListener('click', closeEditor);
  Q('#add-post-add-photos')
    .addEventListener('click', e => Q('#add-post-photos-input').click());
  Q('#post-content-editor')
    .addEventListener('input', e => currentPost.content = e.target.value);
  Q('#add-post-photos-input')
    .addEventListener('change', e => Array.from(e.target.files).forEach(file => {
      currentPost.photos.push(file);
      let img = document.createElement('img');
      let fr = new FileReader();
      fr.onload = e => {
        img.src = e.target.result;
        Q('dialog .thumbs').appendChild(img);
      };
      fr.readAsDataURL(file);
    }));
  Q('dialog .primary')
    .addEventListener('click', e => {
      swMessage({name: 'savePost', post: currentPost});
      closeEditor('no-refresh');
    });

  navigator.serviceWorker.addEventListener('message', e => {
    console.log(e.data);
    if (e.data.name === 'updatePosts') setTimeout(refreshPosts, 0);
  });

  refreshPosts();

  navigator.serviceWorker.register('./serviceworker.js', {scope: '/'})
    .then(yes => {
      console.info('Registration complete, checking for controller...');
      setTimeout(_ => {
        if (!navigator.serviceWorker.controller) {
          location.reload();
        }
      }, 10);
    })
    .catch(no => console.error('Error registering:', no))
});
