const functions = require('firebase-functions');
const jwt = require('jsonwebtoken');

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

const secret = functions.config().nhighauth.secret;

exports.createGoogleUserJWT = functions.https.onCall((data, context) => {
  const user = context.auth;
  const email = context.auth.token.email;
  console.log(user);
  const token = jwt.sign(user, secret);
  return {token: token, email : email};
});