/**
 * ペンペンアプリの設定ファイル
 * 環境に応じた設定値を管理します
 */

// 環境の判定
const isProduction = window.location.hostname !== 'localhost' && 
                     window.location.hostname !== '127.0.0.1';

// リダイレクトURLを動的に取得
const getRedirectUrl = () => {
  if (isProduction) {
    // 本番環境: 現在のドメインを使用
    return window.location.origin;
  } else {
    // 開発環境: ローカルサーバー
    return 'http://localhost:5500';
  }
};

// Supabaseの設定
const supabaseConfig = {
  url: 'https://hzofzvlhptgwcusbnavp.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6b2Z6dmxocHRnd2N1c2JuYXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNzYzNjQsImV4cCI6MjA2NTc1MjM2NH0.NVfUTUJE9QK13jzi6mQQI3eTYy7z_dsrbiju86_L6tQ',
  redirectUrl: getRedirectUrl(),
  siteName: 'ペンペンと一緒に',
};

// メール認証の設定
const emailAuthConfig = {
  emailRedirectTo: supabaseConfig.redirectUrl,
  passwordMinLength: 8,
};

// アプリの一般設定
const appConfig = {
  notification: {
    defaultEnabled: true,
    icon: 'images/55b5453a51a444569199c2ab5b5d4e4a.png',
  },
  coins: {
    taskComplete: 20,
    moodRecord: 10,
    dailyLogin: 10,
    streakBonus: 50,
  },
  levelUp: {
    coinsPerLevel: 100,
  },
};

// 設定をエクスポート
const CONFIG = {
  supabase: supabaseConfig,
  emailAuth: emailAuthConfig,
  app: appConfig,
  isProduction: isProduction,
};

// デバッグ情報をコンソールに出力
console.log('PenPenApp Config:', {
  isProduction,
  redirectUrl: supabaseConfig.redirectUrl,
  currentURL: window.location.href
});