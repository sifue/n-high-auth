'use strict';

const defaultTweetHTML = 
'【アカウント名】(<a href="#">@【ユーザー名】</a>)が現在、' +
 'N高等学校の生徒であることが証明されました。<br>' + 
 '新規証明ツイートの発行はこちら→ ' + 
 '<a href="https://n-high-auth.firebaseapp.com/">' + 
 'https://n-high-auth.firebaseapp.com/</a>';

function signOutWithDOMReset() {
  firebase.auth().signOut();
    document.getElementById('tweet-text').innerHTML = defaultTweetHTML;
    document.getElementById('tweet').innerText = '証明ツイートをする';
    document.getElementById('tweet').disabled = true;
    document.getElementById('login-logout').innerHTML = 'nnn.ed.jpドメインの<br>Googleアカウントでログイン';
}

function toggleSignIn() {
  if (!firebase.auth().currentUser) {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithRedirect(provider);
  } else {
    signOutWithDOMReset();
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

  firebase.auth().onAuthStateChanged(function(user) { // 通常時の処理 (Google認証の後もTwitter認証の後も来る)
    if (user) {
      const email = user.email;
      const emailVerified = user.emailVerified;
      if (emailVerified && /.*@nnn.ed.jp$/.test(email)) { // リダイレクト後、Googleの nnn.ed.jp ログイン時
        console.log('User is signed in.');
        document.getElementById('login-logout').innerHTML = `${email}から<br>ログアウト`;
        document.getElementById('tweet').innerText = '読み込み中...';

        const createGoogleUserJWT = firebase.functions().httpsCallable('createGoogleUserJWT');
        createGoogleUserJWT().then((result) => {
          sessionStorage.setItem('googleUser', JSON.stringify(result.data));

          // Twitter認証を開始
          const twitterProvider = new firebase.auth.TwitterAuthProvider();
          firebase.auth().signInWithRedirect(twitterProvider); // リダイレクト
        }).catch((e) => console.error(e));

      } else if (user.providerData[0].providerId === 'twitter.com') { // リダイレクト後、Twitter ログイン時
        createTweetableCondition(user)
      } else {
        // もしnnn.ed.jpドメインでなければメッセージ
        console.log('User is not nnn.ed.jp domain.');
        document.getElementById('alert-not-nnn').style.display = 'block';
        signOutWithDOMReset();
      }
    } else {
      console.log('User is signed out.');
      signOutWithDOMReset();
    }
    document.getElementById('login-logout').disabled = false;
  });

  document.getElementById('login-logout').addEventListener('click', toggleSignIn, false);
}


function createTweetableCondition(twitterUser) {
  console.log("Execiting. 'createTweetableCondition'"); 
  document.getElementById('tweet').innerText = '読み込み中...';

  const googleUser = JSON.parse(sessionStorage.getItem('googleUser'));

  if (!googleUser) { // セッションストレージからGoogleユーザーがとれなかったら、サインアウトしてやり直し
    console.log("Can't restore googleUser."); 
    signOutWithDOMReset();
    return;
  }
  
  document.getElementById('login-logout').innerHTML = `${googleUser.email}から<br>ログアウト`;
  const twitterUID = twitterUser.providerData[0].uid;

  // functionsでツイートできるのかチェック
  const checkTweetable = firebase.functions().httpsCallable('checkTweetable');
  const pCheckTweetable = checkTweetable({
    googleUser : googleUser,
    twitterUID : twitterUID}).then((result) => {
      const tweetable = result.data.tweetable;
      const displayName = result.data.displayName;
      const screenName = result.data.screenName;

      if (displayName && screenName) {
        const tweetTextHTML = 
        `${displayName}(<a href="https://twitter.com/${screenName}">@${screenName}</a>)が` +
        '現在、N高等学校の生徒であることが証明されました。<br>新規証明ツイートの発行はこちら→ ' +
        '<a href="https://n-high-auth.firebaseapp.com/">https://n-high-auth.firebaseapp.com/</a>';
        document.getElementById('tweet-text').innerHTML = tweetTextHTML;
      }

      const tweetButton = document.getElementById('tweet');
      if (tweetable) {
        console.log("Tweatable."); 
        tweetButton.innerText = '証明ツイートをする';
        tweetButton.disabled = false;
      } else {
        console.log("Not tweatable."); 
        const reason = result.data.reason;
        // TODO reasonごとでメッセージを分岐

        if (reason === 'INVALID_EMAIL') {
          document.getElementById('alert-tweetable-auth').style.display = 'block';
        } else if (reason === 'IN_24_HOURS') {
          document.getElementById('alert-tweetable-in-24h').style.display = 'block';
        }

        tweetButton.innerText = '証明ツイートはできません';
        tweetButton.disabled = true;
      }
  }).catch((e) => {
    document.getElementById('alert-tweetable-error').style.display = 'block';
    console.error(e)
  });

  // TODO ツイートさせる処理
}

document.addEventListener('DOMContentLoaded', function() {
  initApp();
});