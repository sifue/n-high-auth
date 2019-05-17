const admin = require('firebase-admin')
const functions = require('firebase-functions');
const jwt = require('jsonwebtoken');
const Twitter = require('twitter');

admin.initializeApp(functions.config().firebase);
const db = admin.firestore();

const secret = functions.config().nhighauth.secret;

const twitterClient = new Twitter({
  consumer_key: functions.config().twitter.consumer_key,
  consumer_secret: functions.config().twitter.consumer_secret,
  access_token_key: functions.config().twitter.access_token_key,
  access_token_secret: functions.config().twitter.access_token_secret
});

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

exports.createGoogleUserJWT = functions.https.onCall((data, context) => {
  const user = context.auth;
  console.log(user);
  const email = context.auth.token.email;
  const token = jwt.sign(user, secret);
  return {token: token, email : email};
});

exports.checkTweetable = functions.https.onCall((data, context) => {
  const twitterUser = context.auth;
  console.log(twitterUser);
  const twitterUID = data.twitterUID;

  const googleUserToken = data.googleUser.token;
  const googleUser = jwt.verify(googleUserToken, secret);
  const googleEmailParam = data.googleUser.email;

  // JWTを復号した後のemailが違う場合やnnn.ed.jpじゃない場合は失敗
  if(googleUser.token.email !== googleEmailParam || !(googleEmailParam.endsWith('@nnn.ed.jp'))) {
    return { 
      tweetable : false,
      reason : 'INVALID_EMAIL'
    }
  }

  // twitter に UID から screen_name を確認
  const pLookupScreenName = twitterClient.get('users/lookup', {user_id: twitterUID})
  .then((twitterUsers) => {
    const screenName = twitterUsers[0].screen_name;
    return screenName;
  });

  // Firestore を確認
  const pResult = pLookupScreenName.then((screenName) => {
    const googleEmail = googleUser.token.email;
    const key = googleEmail + '=' + twitterUID;
    const relationRef = db.collection("google_twitter_relations").doc(key);
    return relationRef.get().then(doc => {
      if (!doc.exists) { // なければ作成
        const relation = {
          googleEmail : googleEmail,
          googleName : googleUser.token.name,
          twitterUID : twitterUID,
          twitterDisplayName : twitterUser.token.name,
          twitterScreenName : screenName,
          createdAt : admin.firestore.FieldValue.serverTimestamp()
        };
        return relationRef.set(relation).then(() => {
          return { 
                tweetable : true,
                key : key,
                displayName : twitterUser.token.name,
                screenName : screenName,
                reason : 'RELATION_CREATED'
              };
        });
      } else { // ある場合は24時間以内に作成してないかを確認
        if (doc.data().lastTweetedAt) {
          const lastTweetedAt = doc.data().lastTweetedAt.toDate().getTime();
          // 24時間前よりも前ならOK
          if (lastTweetedAt < Date.now() - (24 * 60 * 60 * 1000)) { 
            return { 
              tweetable : true,
              key : key,
              displayName : twitterUser.token.name,
              screenName : screenName,
              reason : 'OVER_24_HOURS'
            }
          } else {
            return { 
              tweetable : false,
              key : key,
              displayName : twitterUser.token.name,
              screenName : screenName,
              reason : 'IN_24_HOURS'
            }
          }
        } else {
          return { 
            tweetable : true,
            key : key,
            displayName : twitterUser.token.name,
            screenName : screenName,
            reason : 'NOT_TWEETED'
          }
        }
      }
    });
  });
  return pResult;
});

exports.postVerificationTweet = functions.https.onCall((data, context) => {
  const twitterUser = context.auth;
  console.log(twitterUser);

  const googleUserToken = data.googleUser.token;
  const googleUser = jwt.verify(googleUserToken, secret);
  const googleEmailParam = data.googleUser.email;
  // JWTを復号した後のemailが違う場合やnnn.ed.jpじゃない場合は失敗
  if(googleUser.token.email !== googleEmailParam || !(googleEmailParam.endsWith('@nnn.ed.jp'))) {
    return { 
      posted : false,
      reason : 'INVALID_EMAIL'
    }
  }

  const key = data.key;
  if(!key) {
    return { 
      posted : false,
      reason : 'KEY_NOT_FOUND'
    }
  }

  const relationRef = db.collection("google_twitter_relations").doc(key);
  return relationRef.get().then(doc => {
    if (doc.exists) { // keyで定義される関連があれば、投稿とフォロー
      const twitterDisplayName = doc.data().twitterDisplayName;
      const twitterScreenName = doc.data().twitterScreenName;
      const twitterUID = doc.data().twitterUID;
      const message = 
        `${twitterDisplayName} (@${twitterScreenName}) が` +
        '現在、N高等学校の生徒であることが証明されました。\n新規証明ツイートの発行はこちら→ ' +
        'https://n-high-auth.firebaseapp.com/';
      return twitterClient.post('statuses/update', {status: message})
      .then((tweet) => {
        const pStoreAndFollow = relationRef.set({
          lastTweetedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true }).then(() => {
          return twitterClient.post('friendships/create', {user_id: twitterUID, follow : true})
        });
        return pStoreAndFollow.then(() => {
          return {
            posted : true,
            tweet : tweet,
            reason : 'STORED_TIMESTAMP_AND_FOLLOW'
          };
        });
      });
    } else { // そもそも関係がないのであれば失敗
      return { 
        posted : false,
        reason : 'NOT_RELATION'
      }
    }
  });
});