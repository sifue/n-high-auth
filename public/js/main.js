'use strict';

var defaultTweetHTML = 
'【アカウント名】(<a href="#">@【ユーザー名】</a>) が現在、' +
 'N高等学校またはS高等学校の生徒であることが証明されました。<br>' + 
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
    var provider = new firebase.auth.GoogleAuthProvider();
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
      var email = user.email;
      var emailVerified = user.emailVerified;
      if (emailVerified && email.endsWith('@nnn.ed.jp')) { // リダイレクト後、Googleの nnn.ed.jp ログイン時
        console.log('User is signed in.');
        document.getElementById('login-logout').innerHTML = `${email}から<br>ログアウト`;
        document.getElementById('tweet').innerText = '読み込み中...';

        var createGoogleUserJWT = firebase.functions().httpsCallable('createGoogleUserJWT');
        createGoogleUserJWT().then((result) => {
          sessionStorage.setItem('googleUser', JSON.stringify(result.data));

          // Twitter認証を開始
          var twitterProvider = new firebase.auth.TwitterAuthProvider();
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

  var googleUser = JSON.parse(sessionStorage.getItem('googleUser'));

  if (!googleUser) { // セッションストレージからGoogleユーザーがとれなかったら、サインアウトしてやり直し
    console.log("Can't restore googleUser."); 
    signOutWithDOMReset();
    return;
  }
  
  document.getElementById('login-logout').innerHTML = `${googleUser.email}から<br>ログアウト`;
  var twitterUID = twitterUser.providerData[0].uid;

  // functionsでツイートできるのかチェック
  var checkTweetable = firebase.functions().httpsCallable('checkTweetable');
  var pCheckTweetable = checkTweetable({
    googleUser : googleUser,
    twitterUID : twitterUID}).then((result) => {
      var key = result.data.key;
      var tweetable = result.data.tweetable;
      var displayName = result.data.displayName;
      var screenName = result.data.screenName;

      if (displayName && screenName) {
        var tweetTextHTML = 
        `${displayName} (<a href="https://twitter.com/${screenName}">@${screenName}</a>) が` +
        '現在、N高等学校またはS高等学校の生徒であることが証明されました。<br>新規証明ツイートの発行はこちら→ ' +
        '<a href="https://n-high-auth.firebaseapp.com/">https://n-high-auth.firebaseapp.com/</a>';
        document.getElementById('tweet-text').innerHTML = tweetTextHTML;
      }

      var tweetButton = document.getElementById('tweet');
      if (tweetable) {
        console.log("Tweatable."); 
        tweetButton.innerText = '証明ツイートをする';
        tweetButton.disabled = false;
        tweetButton.dataset.key = key;
        tweetButton.addEventListener('click', executePostVerificationTweet, false);
      } else {
        console.log("Not tweatable."); 
        var reason = result.data.reason;

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
    console.error(e);
  });
}

function executePostVerificationTweet() {
  var googleUser = JSON.parse(sessionStorage.getItem('googleUser'));
  var tweetButton = document.getElementById('tweet');
  var key = tweetButton.dataset.key;

  var postVerificationTweet = firebase.functions().httpsCallable('postVerificationTweet');
  tweetButton.innerText = '証明ツイート投稿中...';
  tweetButton.disabled = true;
  postVerificationTweet({
    googleUser : googleUser,
    key : key}).then((result) => {

      var tweetId = result.data.tweet.id_str;
      var tweetURL = `https://twitter.com/n_high_auth_bot/status/${tweetId}`;
      var infoMessageHTML = 
      `<strong>ツイート完了！</strong><br>証明ツイートは<a href="${tweetURL}">こちらのリンク</a>よりご確認ください。`;
      document.getElementById('info-posted').style.display = 'block';
      document.getElementById('info-posted-message').innerHTML = infoMessageHTML;

      if (tweetId) {
        document.getElementById('tweet').innerText = '証明ツイート投稿完了';
      }

      console.log('Verification tweet done.');
  }).catch((e) => {
    document.getElementById('alert-not-tweet').style.display = 'block';
    console.error(e);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  initApp();
});