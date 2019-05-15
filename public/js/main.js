'use strict';

function toggleSignIn() {
  if (!firebase.auth().currentUser) {
    var provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithRedirect(provider);
  } else {
    firebase.auth().signOut();
    document.getElementById('login-logout').innerHTML = 'nnn.ed.jpドメインの<br>Googleアカウントでログイン';
  }
  document.getElementById('login-logout').disabled = true;
}

function initApp() {
  $('.bs-component [data-toggle="popover"]').popover();
  $('.bs-component [data-toggle="tooltip"]').tooltip();

  firebase.auth().getRedirectResult().then(function(result) {
    // 特に何もしない
  }).catch(function(error) {
    console.error(error);
  });

  firebase.auth().onAuthStateChanged(function(user) { // 通常時の処理
    if (user) {
      const email = user.email;
      const emailVerified = user.emailVerified;
      if (emailVerified && /.*@nnn.ed.jp$/.test(email)) {
        console.log('User is signed in.');
        document.getElementById('login-logout').innerText = `${email}からログアウト`;
        createTweetableCondition(user);
      } else {
        // もしnnn.ed.jpドメインでなければメッセージ
        console.log('User is not nnn.ed.jp domain.');
        document.getElementById('alert-not-nnn').style.display = 'block';
        firebase.auth().signOut();
        document.getElementById('login-logout').innerHTML = 'nnn.ed.jpドメインの<br>Googleアカウントでログイン';
      }
    } else {
      console.log('User is signed out.');
      document.getElementById('login-logout').innerHTML = 'nnn.ed.jpドメインの<br>Googleアカウントでログイン';
    }
    document.getElementById('login-logout').disabled = false;
  });

  document.getElementById('login-logout').addEventListener('click', toggleSignIn, false);
}

function createTweetableCondition(googleUser) {

}

document.addEventListener('DOMContentLoaded', function() {
  initApp();
});