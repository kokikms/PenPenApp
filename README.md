# PenPenApp - ペンペンと一緒に

ペンペンと一緒に日々のタスクを管理し、気分を記録するアプリケーションです。かわいいペンギンのペンペンがあなたの日常をサポートします。

![ペンペンアプリ](https://public.youware.com/users-website-assets/prod/2e47e800-241e-4f62-84d3-93b74b7977d2/g7620ac3db94f8278602ea273b7e82dfd58b4536d0090e5adb2c3955ba54ef7eb1b7f897d4098213f00b6e6fdf46ee3101143fd67c6373ba7f7b352b7176126ec_1280.png)

## 概要

「ペンペンと一緒に」は、ユーザーの日々の生活を優しく見守りながら、ToDo管理と心の状態をサポートし、自己肯定感を高めるペンギンキャラクター「ペンペン」とのインタラクティブなアプリです。

## 主要機能

1. **認証機能**
   - Google OAuth認証
   - メールアドレス認証（登録・ログイン）
   - ユーザープロフィール管理

2. **ToDo管理**
   - タスクの追加・完了・削除
   - 通知機能付きタスクリマインダー
   - タスク完了時のポジティブなフィードバック

3. **気分記録**
   - 4種類の気分を選択して記録（うれしい、ふつう、つかれた、かなしい）
   - 気分に応じたペンペンのリアクション
   - 日別気分履歴

4. **ゲーミフィケーション要素**
   - コイン獲得システム（タスク完了、気分記録、ログインボーナス）
   - ペンペンの着せ替え機能
   - 島のレベルアップシステム
   - 継続ログインボーナス

5. **ペンペンの島機能**
   - インタラクティブな島の表示
   - アイテムショップ
   - ペンペンのアニメーション

## 技術スタック

- HTML5
- CSS3
- JavaScript (Vanilla JS)
- Supabase (認証・データベース)

## セットアップ方法

1. リポジトリをクローン
```
git clone https://github.com/kokikms/PenPenApp.git
```

2. 必要なファイルがあることを確認
```
index.html
css/style.css
js/app.js
js/config.js
js/history.js
js/shop.js
```

3. ローカルサーバーでアプリを起動
```
// 例: Visual Studio Codeの場合
// Live Serverプラグインをインストールし、
// index.html上で右クリック→Open with Live Server
```

4. Supabase設定
   - config.jsファイルで環境に応じた設定を行います
   - 本番環境では適切なリダイレクトURLを設定してください

## 利用方法

1. アカウント作成/ログイン
2. 今日の気分を選択
3. タスクを追加・完了
4. ポイントを貯めてペンペンの島をレベルアップ
5. ショップでアイテムを購入してペンペンをカスタマイズ

## ライセンス

This project is licensed under the MIT License - see the LICENSE file for details.

## 作者

- [kokikms](https://github.com/kokikms)

## 謝辞

- かわいいペンペンのイラストを提供していただいた方々に感謝します。
- Supabaseチームの素晴らしいプラットフォームに感謝します。