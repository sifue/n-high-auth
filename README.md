# N高生証明bot

ログインしているTwitterアカウントが、N高等学校の生徒のものであることをGoogleアカウントを使って証明するFirebaseを利用するWebアプリケーション。

なおTwitterと通信するので、Firebaseの課金設定はFlameかBlazeにする必要がある。
Blazeがおおすすめで、一日の課金額設定を [ドキュメント](https://firebase.google.com/docs/firestore/usage?hl=ja) を見ながらしておくとよい。開発程度では無料枠を超えない。

### Firebaseの環境整備方法

公式の[Get Started](https://firebase.google.com/docs/functions/get-started)を参照。

利用サービスは

- Hosting
- Funcitons
- Firestore

GitHub Actionsは使っていない。

その後

```
firebase init
```

にて適切な更新設定を行う。

### 環境変数設定

```
firebase functions:config:set nhighauth.secret="トークン暗号化のためのシークレット"  twitter.consumer_key="TwitterAPI操作に使うTwitterのコンシュマーキー" twitter.consumer_secret="TwitterAPI操作に使うTwitterのコンシュマーシークレット" twitter.access_token_key="TwitterAPI操作に使うTwitterのアクセストークンキー" twitter.access_token_secret="TwitterAPI操作に使うTwitterのアクセストークンシークレット"
```

以上で設定し、以下で環境変数の設定を確認

```
firebase functions:config:get
```

### デバッグ方法

functionsは本番環境のものを利用する。functionsをデプロイしてローカル実行。
firebase deploy で全デプロイをする。

```
firebase logout
firebase login
firebase deploy
firebase serve --only hosting -o 0.0.0.0
```

特定のfunctionsだけデプロイの時は、

```
firebase deploy --only functions:checkTweetable
```

などを使う。あとはコードを修正する。SPAとしての遷移が多いので、ブレークポイントやconsole.logを多用してデバッグが必要。あと変数がconstからvarに変更になったのは、モバイルSafari対応のため。

### Datastore ルール

functionsにおいてAdminのみがDatastoreを読み書きできるように変更。コンソール上でこれを設定しないとだれでもDatastoreを変更できてしまう。

```
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### LICENSE

ISC license

### Copyright
Copyright © 2019- Soichiro Yoshimura All Rights Reserved.

