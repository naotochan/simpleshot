# Apple Development 証明書の作り方（Xcode 26）

Settings → Accounts の左下に `+` が無い場合は、こちらを使います。

1. このフォルダの `PashattSigning.xcodeproj` を開く（すでに開いていればそのまま）
2. 左のプロジェクトナビで **PashattSigning** ターゲットを選択
3. 上部タブ **Signing & Capabilities**
4. **Automatically manage signing** にチェック
5. **Team** のポップアップを開く → **Add an Account…**（または Add Account）
6. Apple ID でサインイン（無料で可。有料プログラム不要）
7. Team に **Personal Team**（自分の名前）が出たらそれを選択
8. エラーが消えたら完了（証明書が自動作成されます）

確認（ターミナル）:

```bash
security find-identity -v -p codesigning | grep "Apple Development"
```

1行でも出れば OK。そのあと Pashatt をビルドし直します。
