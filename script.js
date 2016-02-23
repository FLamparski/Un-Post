window.currentPost = {
  content: '',
  photos: []
};

window.Q = document.querySelector.bind(document);

document.addEventListener('DOMContentLoaded', e => {
  window.db = new Dexie('unpost');
  db.version(2).stores({
    posts: 'id++,date,content,isSynced',
    photos: 'id++,post,name,type,content,isSynced'
  });
  db.open();

  function closeEditor() {
    Q('dialog').close();
    Q('#post-content-editor').value = '';
    Q('dialog .thumbs').innerHTML = '';
    Q('#add-post-photos-input').value = '';
    currentPost = {
      content: '',
      photos: []
    };
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
      db.posts.put({date: new Date(), content: currentPost.content, isSynced: false})
        .then(id =>
          Promise.all(currentPost.photos.map(p =>
            db.photos.put({post: id, name: p.name, type: p.type, content: p, isSynced: false})))
        ).then(closeEditor);
    });
});
