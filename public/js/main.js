'use strict';

$('.bs-component [data-toggle="popover"]').popover();
$('.bs-component [data-toggle="tooltip"]').tooltip();

document.addEventListener('DOMContentLoaded', function() {
  // // 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
  // // The Firebase SDK is initialized and available here!
  //
  // firebase.auth().onAuthStateChanged(user => { });
  // firebase.database().ref('/path/to/ref').on('value', snapshot => { });
  // firebase.messaging().requestPermission().then(() => { });
  // firebase.storage().ref('/path/to/ref').getDownloadURL().then(() => { });
  //
  // // 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥

  try {
    let app = firebase.app();
    let features = ['auth', 'database', 'messaging', 'storage'].filter(feature => typeof app[feature] === 'function');
    document.getElementById('load').innerHTML = `Firebase SDK loaded with ${features.join(', ')}`;
  } catch (e) {
    console.error(e);
    document.getElementById('load').innerHTML = 'Error loading the Firebase SDK, check the console.';
  }

  const googleProvider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(googleProvider).then(function(result) {
    // This gives you a Google Access Token. You can use it to access the Google API.
    const token = result.credential.accessToken;
    // The signed-in user info.
    const user = result.user;
    console.log(user);

    const twitterProvider = new firebase.auth.TwitterAuthProvider();
    firebase.auth().signInWithPopup(twitterProvider).then(function(result) {
      // This gives you a the Twitter OAuth 1.0 Access Token and Secret.
      // You can use these server side with your app's credentials to access the Twitter API.
      const token = result.credential.accessToken;
      const secret = result.credential.secret;
      // The signed-in user info.
      const user = result.user;
      console.log(user);
      // ...
    }).catch(function(error) {
      // Handle Errors here.
      const errorCode = error.code;
      const errorMessage = error.message;
      // The email of the user's account used.
      const email = error.email;
      // The firebase.auth.AuthCredential type that was used.
      const credential = error.credential;
      // ...
    });

    // ...
  }).catch(function(error) {
    // Handle Errors here.
    const errorCode = error.code;
    const errorMessage = error.message;
    // The email of the user's account used.
    const email = error.email;
    // The firebase.auth.AuthCredential type that was used.
    const credential = error.credential;
    // ...
  });
});