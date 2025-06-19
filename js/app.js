// ペンペンアプリのJavaScript - Supabase連携版

// Supabaseクライアントの初期化
let supabaseClient;

// イベントリスナーの重複登録を防ぐフラグ
let eventListenersSetup = false;

// イベントハンドラーの参照を保持
let eventHandlers = {};

// ユーザーデータ
let userData = {
  id: null,
  name: 'ユーザー',
  coins: 0,
  todos: [],
  moods: [],
  items: [],
  lastVisit: new Date().toISOString(),
  streakDays: 0,
  islandLevel: 1
};

// 今日完了したが削除されたタスクを記録する
let completedTodayDeleted = [];

// DOM要素の取得
const loginScreen = document.getElementById('loginScreen');
const appScreen = document.getElementById('appScreen');
const penguinImage = document.getElementById('penguinImage');
const penguinSpeech = document.getElementById('penguinSpeech');
const todoList = document.getElementById('todoList');
const addTodoBtn = document.getElementById('addTodoBtn');
const todoModal = document.getElementById('todoModal');
const todoInput = document.getElementById('todoInput');
const notificationToggle = document.getElementById('notificationToggle');
const notificationTime = document.getElementById('notificationTime');
const saveTodoBtn = document.getElementById('saveTodoBtn');
const cancelTodoBtn = document.getElementById('cancelTodoBtn');
const islandLevel = document.getElementById('islandLevel');
const coinAmount = document.getElementById('coinAmount');
const islandContainer = document.getElementById('islandContainer');
const settingsBtn = document.getElementById('settingsBtn');
const userMenu = document.getElementById('userMenu');
const logoutMenuItem = document.getElementById('logoutMenuItem');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const emailLoginToggleBtn = document.getElementById('emailLoginToggleBtn');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const toggleSignupBtn = document.getElementById('toggleSignupBtn');
const toggleLoginBtn = document.getElementById('toggleLoginBtn');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');

// 気分ボタン・ToDoリストの親要素取得
const moodContainer = document.querySelector('.mood-selector');

// 設定モーダル関連の要素取得
const settingsModal = document.getElementById('settingsModal');
const logoutModalBtn = document.getElementById('logoutModalBtn');
const closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');

// 編集用モーダル要素の取得
const editTodoModal = document.getElementById('editTodoModal');
const editTodoInput = document.getElementById('editTodoInput');
const saveEditTodoBtn = document.getElementById('saveEditTodoBtn');
const cancelEditTodoBtn = document.getElementById('cancelEditTodoBtn');
let editingTodo = null;

let ignoreNextEditClick = false;

console.log('app.js loaded');

// Supabaseクライアントを初期化
function initSupabase() {
  try {
    // デバッグ: CONFIG オブジェクトの確認
    console.log('CONFIG object:', CONFIG);
    console.log('CONFIG.supabase:', CONFIG?.supabase);
    
    // デバッグ: 使用される URL と Key の確認
    const url = CONFIG?.supabase?.url || 'https://hzofzvlhptgwcusbnavp.supabase.co';
    const anonKey = CONFIG?.supabase?.anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6b2Z6dmxocHRnd2N1c2JuYXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNzYzNjQsImV4cCI6MjA2NTc1MjM2NH0.NVfUTUJE9QK13jzi6mQQI3eTYy7z_dsrbiju86_L6tQ';
    
    console.log('Using Supabase URL:', url);
    console.log('Using Supabase anonKey:', anonKey ? anonKey.substring(0, 20) + '...' : 'undefined');
    
    // デバッグ: supabase ライブラリの確認
    console.log('supabase library available:', typeof supabase);
    console.log('supabase.createClient available:', typeof supabase?.createClient);
    
    supabaseClient = supabase.createClient(url, anonKey);
    
    // デバッグ: 作成されたクライアントの確認
    console.log('Supabase client created:', supabaseClient);
    console.log('Supabase client type:', typeof supabaseClient);
    console.log('Supabase client auth:', supabaseClient?.auth);
    console.log('Supabase client from:', supabaseClient?.from);
    
    console.log('Supabase client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  }
}

// アプリの初期化
async function initApp() {
  try {
    console.log('Initializing app');
    
    // DOM要素の存在確認
    if (!loginScreen || !appScreen) {
      console.error('Required DOM elements not found:', {
        loginScreen: !!loginScreen,
        appScreen: !!appScreen
      });
      return;
    }
    
    // Supabaseクライアントを初期化
    initSupabase();
    
    if (!supabaseClient) {
      console.error('Supabase client is not available');
      showLoginScreen();
      return;
    }
    
    // イベントリスナーを最初に一度だけ設定
    setupEventListeners();
    
    // 認証状態の変化を監視
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
    
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          userData.id = session.user.id;
          await loadUserData();
          showAppScreen();
        } catch (error) {
          console.error('Authentication error:', error);
          // エラー時はログイン画面に戻す
          showLoginScreen();
        }
      } else if (event === 'SIGNED_OUT') {
        userData = {
          id: null,
          name: 'ユーザー',
          coins: 0,
          todos: [],
          moods: [],
          items: [],
          lastVisit: new Date().toISOString(),
          streakDays: 0,
          islandLevel: 1
        };
        showLoginScreen();
    }
  });
  
  // 初期ログイン状態をチェック（セッションとユーザー情報の両方を確認）
  const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
  
  console.log('Initial auth check:', {
    session: session ? 'exists' : 'none',
    user: user ? 'exists' : 'none',
    sessionError,
    userError
  });
  
  if ((session && session.user) || user) {
    // ログイン済みの場合
    userData.id = (session?.user?.id || user?.id);
    console.log('User is logged in, showing app screen immediately with cached data');
    
    // キャッシュされたデータがあれば即座に画面を表示
    const hasValidCache = loadCachedDataAndShowScreen();
    
    if (hasValidCache) {
      // キャッシュデータで画面表示後、バックグラウンドでデータを更新
      console.log('Showing app with cached data, updating in background');
      loadUserData().then(() => {
        console.log('Background data update completed');
        // データ更新後に画面を再描画
        updatePenguinState();
        renderTodos();
        updateCoinsDisplay();
        updateIslandLevel();
      }).catch(error => {
        console.error('Background data update failed:', error);
      });
    } else {
      // キャッシュがない場合は通常通りデータ読み込み後に表示
      console.log('No valid cache, loading data normally');
      await loadUserData();
      showAppScreen();
    }
  } else {
    // 未ログインの場合
    console.log('User is not logged in, showing login screen');
    showLoginScreen();
  }
  
  console.log('App initialization completed');
  
  // 初期化完了を示すクラスを追加（ローディング画面を非表示にする）
  document.body.classList.add('app-initialized');
  
  } catch (error) {
    console.error('Error during app initialization:', error);
    // フォールバック: ログイン画面を表示
    if (loginScreen) {
      loginScreen.style.display = 'block';
    }
    if (appScreen) {
      appScreen.style.display = 'none';
    }
    // エラー時でも初期化完了を示すクラスを追加
    document.body.classList.add('app-initialized');
  }
}

// ログイン画面の表示
function showLoginScreen() {
  console.log('Showing login screen');
  
  // DOM状態をリセット
  if (loginForm) {
    loginForm.classList.remove('active');
  }
  if (signupForm) {
    signupForm.classList.remove('active');
  }
  if (emailLoginToggleBtn) {
    emailLoginToggleBtn.style.display = 'block';
  }
  if (userMenu) {
    userMenu.classList.remove('active');
  }
  
  // 画面表示を切り替え
  if (loginScreen) {
    loginScreen.style.display = 'block';
  }
  if (appScreen) {
    appScreen.style.display = 'none';
  }
  
  console.log('Login screen displayed');
}

// キャッシュされたデータを読み込んで即座に画面表示
function loadCachedDataAndShowScreen() {
  try {
    const saved = localStorage.getItem('penpenUserData');
    const sessionInfo = localStorage.getItem('penpen-session-info');
    
    if (!saved || !sessionInfo) {
      console.log('No cached data or session info found');
      return false;
    }
    
    const sessionData = JSON.parse(sessionInfo);
    const now = new Date().getTime();
    
    // セッション情報が24時間以内かチェック
    if (now - sessionData.timestamp > 24 * 60 * 60 * 1000) {
      console.log('Cached session info is too old');
      localStorage.removeItem('penpen-session-info');
      return false;
    }
    
    // ユーザーIDが一致するかチェック
    if (sessionData.userId !== userData.id) {
      console.log('Cached session user ID does not match current user');
      localStorage.removeItem('penpen-session-info');
      return false;
    }
    
    const localData = JSON.parse(saved);
    
    // キャッシュデータをuserDataに適用
    userData.name = localData.name || 'ユーザー';
    userData.coins = localData.coins || 0;
    userData.streakDays = localData.streakDays || 0;
    userData.lastVisit = localData.lastVisit || new Date().toISOString();
    userData.islandLevel = localData.islandLevel || 1;
    userData.todos = localData.todos || [];
    userData.moods = localData.moods || [];
    userData.items = localData.items || [];
    
    console.log('Loaded cached data:', {
      name: userData.name,
      coins: userData.coins,
      todosCount: userData.todos.length,
      moodsCount: userData.moods.length
    });
    
    // 即座に画面を表示
    showAppScreen();
    
    return true;
  } catch (error) {
    console.error('Error loading cached data:', error);
    return false;
  }
}

// アプリ画面の表示
function showAppScreen() {
  loginScreen.style.display = 'none';
  appScreen.style.display = 'block';
  
  // データの表示
  updatePenguinState();
  renderTodos();
  updateCoinsDisplay();
  updateIslandLevel();
  checkLastVisit();
  setupTabSwitching();
}

// ユーザーデータの読み込み
async function loadUserData() {
  console.log('loadUserData: start');
  if (!supabaseClient || !userData.id) {
    console.log('loadUserData: no supabaseClient or userData.id');
    return;
}
  try {
    console.log('loadUserData: before profile fetch');
    // プロフィール情報を取得（タイムアウト付き）
    console.log('userData.id:', userData.id);
    console.log('supabaseClient:', supabaseClient);
    
    // タイムアウト処理を追加
    const profilePromise = supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userData.id)
      .single();
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Profile fetch timeout after 10 seconds')), 3000)
    );
    
    const { data: profile, error: profileError } = await Promise.race([
      profilePromise,
      timeoutPromise
    ]);
    
    console.log('profile:', profile);
    console.log('profileError:', profileError);
    
    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }
    
    if (profile) {
      userData.name = profile.display_name || 'ユーザー';
      userData.coins = profile.coins || 0;
      userData.streakDays = profile.streak_days || 0;
      userData.lastVisit = profile.last_visit || new Date().toISOString();
      userData.islandLevel = profile.level || 1;
    }
    
    // セッション情報をローカルストレージに保存（タイムスタンプ付き）
    const sessionInfo = {
      userId: userData.id,
      timestamp: new Date().getTime(),
      lastUpdate: new Date().toISOString()
    };
    localStorage.setItem('penpen-session-info', JSON.stringify(sessionInfo));
    
    // ToDosを取得
    const { data: todos, error: todosError } = await supabaseClient
      .from('todos')
      .select('*')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false });
    
    if (todosError) throw todosError;
    
    if (todos) {
      userData.todos = todos;
    }
    
    // Moodsを取得
    const { data: moods, error: moodsError } = await supabaseClient
      .from('moods')
      .select('*')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false });
    
    if (moodsError) throw moodsError;
    
    if (moods) {
      userData.moods = moods;
    }
    
    // アイテムを取得
    const { data: items, error: itemsError } = await supabaseClient
      .from('user_items')
      .select('*, items(*)')
      .eq('user_id', userData.id);
    
    if (itemsError) throw itemsError;
    
    if (items) {
      userData.items = items;
    }
    
    // データ取得成功時にローカルストレージを更新
    const dataToCache = {
      name: userData.name,
      coins: userData.coins,
      streakDays: userData.streakDays,
      lastVisit: userData.lastVisit,
      islandLevel: userData.islandLevel,
      todos: userData.todos,
      moods: userData.moods,
      items: userData.items
    };
    localStorage.setItem('penpenUserData', JSON.stringify(dataToCache));
    console.log('Updated cached user data');
    
  } catch (error) {
    console.error('データの読み込みエラー:', error);
    // エラー時はローカルストレージのデータがあれば使用
    const saved = localStorage.getItem('penpenUserData');
    if (saved) {
      const localData = JSON.parse(saved);
      userData = { ...userData, ...localData, id: userData.id };
    }
  }
}

// ユーザーデータの保存
async function saveUserData() {
  if (!supabaseClient || !userData.id) return;
  
  try {
    // プロフィール情報を更新
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .upsert({
        id: userData.id,
        display_name: userData.name,
        coins: userData.coins,
        streak_days: userData.streakDays,
        last_visit: userData.lastVisit,
        level: userData.islandLevel,
        updated_at: new Date().toISOString()
      });
    
    if (profileError) throw profileError;
    
    // バックアップとしてローカルストレージにも保存
    localStorage.setItem('penpenUserData', JSON.stringify({
      name: userData.name,
      coins: userData.coins,
      streakDays: userData.streakDays,
      lastVisit: userData.lastVisit,
      islandLevel: userData.islandLevel
    }));
    
  } catch (error) {
    console.error('データの保存エラー:', error);
  }
}

// イベントリスナーの削除
function removeEventListeners() {
  console.log('Removing existing event listeners');
  
  // 認証関連のイベントリスナーを削除
  if (eventHandlers.googleLogin && googleLoginBtn) {
    googleLoginBtn.removeEventListener('click', eventHandlers.googleLogin);
  }
  if (eventHandlers.emailLoginToggle && emailLoginToggleBtn) {
    emailLoginToggleBtn.removeEventListener('click', eventHandlers.emailLoginToggle);
  }
  if (eventHandlers.toggleSignup && toggleSignupBtn) {
    toggleSignupBtn.removeEventListener('click', eventHandlers.toggleSignup);
  }
  if (eventHandlers.toggleLogin && toggleLoginBtn) {
    toggleLoginBtn.removeEventListener('click', eventHandlers.toggleLogin);
  }
  if (eventHandlers.emailLogin && loginBtn) {
    loginBtn.removeEventListener('click', eventHandlers.emailLogin);
  }
  if (eventHandlers.signup && signupBtn) {
    signupBtn.removeEventListener('click', eventHandlers.signup);
  }
  if (eventHandlers.logout && logoutMenuItem) {
    logoutMenuItem.removeEventListener('click', eventHandlers.logout);
  }
  
  // UI関連のイベントリスナーを削除
  if (eventHandlers.settings && settingsBtn) {
    settingsBtn.removeEventListener('click', eventHandlers.settings);
  }
  if (eventHandlers.islandStatus) {
    const islandStatusElement = document.querySelector('.island-status');
    if (islandStatusElement) {
      islandStatusElement.removeEventListener('click', eventHandlers.islandStatus);
    }
  }
  
  // タスク関連のイベントリスナーを削除
  if (eventHandlers.addTodo && addTodoBtn) {
    addTodoBtn.removeEventListener('click', eventHandlers.addTodo);
  }
  if (eventHandlers.cancelTodo && cancelTodoBtn) {
    cancelTodoBtn.removeEventListener('click', eventHandlers.cancelTodo);
  }
  if (eventHandlers.saveTodo && saveTodoBtn) {
    saveTodoBtn.removeEventListener('click', eventHandlers.saveTodo);
  }
  if (eventHandlers.notificationToggle && notificationToggle) {
    notificationToggle.removeEventListener('change', eventHandlers.notificationToggle);
  }
  
  // 気分ボタンのイベントリスナーを削除（委譲方式）
  if (eventHandlers.moodContainerClick && moodContainer) {
    moodContainer.removeEventListener('click', eventHandlers.moodContainerClick);
  }
  
  // ToDoリストのイベントリスナーを削除（委譲方式）
  if (eventHandlers.todoListClick && todoList) {
    todoList.removeEventListener('click', eventHandlers.todoListClick);
  }
  
  // ドキュメントクリックイベントを削除
  if (eventHandlers.documentClick) {
    document.removeEventListener('click', eventHandlers.documentClick);
  }
  
  // ハンドラー参照をクリア
  eventHandlers = {};
}

// イベントリスナーの設定
function setupEventListeners() {
  console.log('setupEventListeners called');
  // 既にセットアップ済みの場合は重複を防ぐ
  if (eventListenersSetup) {
    console.log('Event listeners already setup, removing existing ones first');
    removeEventListeners();
  }
  
  console.log('Setting up event listeners');
  
  // イベントハンドラーを定義
  //eventHandlers.googleLogin = handleGoogleLogin;
  eventHandlers.emailLoginToggle = () => {
    if (loginForm && emailLoginToggleBtn) {
      loginForm.classList.add('active');
      emailLoginToggleBtn.style.display = 'none';
    }
  };
  eventHandlers.toggleSignup = () => {
    if (loginForm && signupForm) {
      loginForm.classList.remove('active');
      signupForm.classList.add('active');
    }
  };
  eventHandlers.toggleLogin = () => {
    if (signupForm && loginForm) {
      signupForm.classList.remove('active');
      loginForm.classList.add('active');
    }
  };
  eventHandlers.emailLogin = handleEmailLogin;
  eventHandlers.signup = handleSignup;
  eventHandlers.logout = handleLogout;
  eventHandlers.settings = () => {
    if (settingsModal) {
      settingsModal.classList.add('active');
    }
  };
  eventHandlers.islandStatus = () => {
    if (islandContainer) {
      islandContainer.classList.toggle('active');
    }
  };
  eventHandlers.addTodo = showTodoModal;
  eventHandlers.cancelTodo = hideTodoModal;
  eventHandlers.saveTodo = saveTodo;
  eventHandlers.notificationToggle = () => {
    if (notificationTime && notificationToggle) {
      notificationTime.style.display = notificationToggle.checked ? 'inline-block' : 'none';
    }
  };
  eventHandlers.documentClick = (e) => {
    if (settingsBtn && userMenu && e.target !== settingsBtn && !userMenu.contains(e.target)) {
      userMenu.classList.remove('active');
    }
  };
  
  // 認証関連のイベントリスナーを追加
  if (emailLoginToggleBtn) {
    emailLoginToggleBtn.addEventListener('click', eventHandlers.emailLoginToggle);
  }
  if (toggleSignupBtn) {
    toggleSignupBtn.addEventListener('click', eventHandlers.toggleSignup);
  }
  if (toggleLoginBtn) {
    toggleLoginBtn.addEventListener('click', eventHandlers.toggleLogin);
  }
  if (loginBtn) {
    loginBtn.addEventListener('click', eventHandlers.emailLogin);
  }
  if (signupBtn) {
    signupBtn.addEventListener('click', eventHandlers.signup);
  }
  if (logoutMenuItem) {
    logoutMenuItem.addEventListener('click', eventHandlers.logout);
  }
  
  // UI関連のイベントリスナーを追加
  if (settingsBtn) {
    settingsBtn.addEventListener('click', eventHandlers.settings);
  }
  
  const islandStatusElement = document.querySelector('.island-status');
  if (islandStatusElement) {
    islandStatusElement.addEventListener('click', eventHandlers.islandStatus);
  }
  
  // タスク関連のイベントリスナーを追加
  if (addTodoBtn) {
    addTodoBtn.addEventListener('click', eventHandlers.addTodo);
  }
  if (cancelTodoBtn) {
    cancelTodoBtn.addEventListener('click', eventHandlers.cancelTodo);
  }
  if (saveTodoBtn) {
    saveTodoBtn.addEventListener('click', eventHandlers.saveTodo);
  }
  if (notificationToggle) {
    notificationToggle.addEventListener('change', eventHandlers.notificationToggle);
  }
  
  // 気分ボタンのイベントリスナー（委譲方式）
  eventHandlers.moodContainerClick = async (e) => {
    // クリックされた要素がmood-btnでない場合、親要素を探す
    let btn = e.target;
    while (btn && !btn.classList.contains('mood-btn')) {
      btn = btn.parentElement;
    }
    if (btn && btn.classList.contains('mood-btn')) {
      const mood = btn.getAttribute('data-mood');
      document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      await saveMood(mood);
    }
  };
  if (moodContainer) {
    console.log('moodContainer:', moodContainer);
    moodContainer.addEventListener('click', eventHandlers.moodContainerClick);
  }
  
  // ToDoリストのイベントリスナー（委譲方式）
  eventHandlers.todoListClick = (e) => {
    if (e.target.classList.contains('todo-item')) {
      // ここでToDoの完了処理や詳細表示などを実装
      // 例: completeTodo(e.target.dataset.todoId);
    }
  };
  if (todoList) {
    todoList.addEventListener('click', eventHandlers.todoListClick);
  }
  
  // ドキュメントクリックイベントを追加
  document.addEventListener('click', eventHandlers.documentClick);
  
  // 設定モーダルのイベント
  if (logoutModalBtn) {
    logoutModalBtn.addEventListener('click', async () => {
      if (settingsModal) settingsModal.classList.remove('active');
      await handleLogout();
    });
  }
  if (closeSettingsModalBtn) {
    closeSettingsModalBtn.addEventListener('click', () => {
      if (settingsModal) settingsModal.classList.remove('active');
    });
  }
  
  // フラグを設定
  eventListenersSetup = true;
  console.log('Event listeners setup completed');
}

// メールログイン処理
async function handleEmailLogin() {
  if (!supabaseClient) return;
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  if (!email || !password) {
    alert('メールアドレスとパスワードを入力してください');
    return;
  }
  
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    if (data.user) {
      userData.id = data.user.id;
      await loadUserData();
      showAppScreen();
    }
    
  } catch (error) {
    console.error('メールログインエラー:', error);
    alert('ログインに失敗しました。メールアドレスとパスワードを確認してください。');
  }
}

// サインアップ処理
async function handleSignup() {
  if (!supabaseClient) return;
  
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const username = document.getElementById('username').value;
  
  if (!email || !password || !username) {
    alert('すべての項目を入力してください');
    return;
  }
  
  // パスワード強度チェック
  const minLength = CONFIG?.emailAuth?.passwordMinLength || 8;
  if (password.length < minLength) {
    alert(`パスワードは${minLength}文字以上で設定してください`);
    return;
  }
  
  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: username
        },
        emailRedirectTo: CONFIG?.emailAuth?.emailRedirectTo || window.location.origin
      }
    });
    
    if (error) throw error;
    
    if (data.user) {
      if (data.session) {
        // 確認なしですぐにログイン
        userData.id = data.user.id;
        await loadUserData();
        showAppScreen();
      } else {
        // メール確認が必要
        alert('アカウントが作成されました！メールを確認してください。');
        signupForm.classList.remove('active');
        loginForm.classList.add('active');
      }
    }
    
  } catch (error) {
    console.error('サインアップエラー:', error);
    alert('アカウント作成に失敗しました。もう一度お試しください。');
  }
}

// ログアウト処理
async function handleLogout() {
  if (!supabaseClient) return;
  
  try {
    const { error } = await supabaseClient.auth.signOut();
    
    if (error) throw error;
    
    userData = {
      id: null,
      name: 'ユーザー',
      coins: 0,
      todos: [],
      moods: [],
      items: [],
      lastVisit: new Date().toISOString(),
      streakDays: 0,
      islandLevel: 1
    };
    
    showLoginScreen();
    
  } catch (error) {
    console.error('ログアウトエラー:', error);
  }
}

// タスクモーダルの表示
function showTodoModal() {
  if (todoModal) {
    todoModal.classList.add('active');
    if (todoInput) todoInput.value = '';
    if (notificationToggle) notificationToggle.checked = false;
    if (notificationTime) notificationTime.style.display = 'none';
    if (todoInput) todoInput.focus();
  }
}

// タスクモーダルの非表示
function hideTodoModal() {
  if (todoModal) {
    todoModal.classList.remove('active');
  }
}

// タスクの保存
async function saveTodo() {
  if (!supabaseClient || !userData.id) return;
  const text = todoInput?.value.trim();
  if (!text) {
    alert('タスク名を入力してください');
    return;
  }
  try {
    const hasNotification = notificationToggle?.checked || false;
    const notificationTimeValue = hasNotification ? notificationTime?.value : null;
    const { data, error } = await supabaseClient
      .from('todos')
      .insert([{
        user_id: userData.id,
        text: text,
        completed: false,
        has_notification: hasNotification,
        notification_time: notificationTimeValue,
        coin_given: false,
        created_at: new Date().toISOString()
      }])
      .select();
    if (error) throw error;
    if (data) {
      userData.todos.unshift(data[0]);
      renderTodos();
      updatePenguinState();
      hideTodoModal();
    }
  } catch (error) {
    console.error('タスク保存エラー:', error);
    alert('タスクの保存に失敗しました。もう一度お試しください。');
  }
}

// 気分の保存
async function saveMood(moodValue) {
  if (!supabaseClient || !userData.id) return;
  try {
    const today = new Date().toISOString().split('T')[0];
    // --- デバッグ: 保存前の状態 ---
    console.log('[DEBUG] saveMood前 userData.moods:', userData.moods);
    console.log('[DEBUG] saveMood前 getTodayMood:', getTodayMood());
    // 今日の気分が既に記録されているか確認
    const { data: existingMoods, error: checkError } = await supabaseClient
      .from('moods')
      .select('id')
      .eq('user_id', userData.id)
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`);
    if (checkError) throw checkError;
    let result;
    if (existingMoods && existingMoods.length > 0) {
      // 既存の気分を更新
      const { data, error } = await supabaseClient
        .from('moods')
        .update({
          mood: moodValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingMoods[0].id)
        .select();
      if (error) throw error;
      result = data;
    } else {
      // 新しい気分を記録
      const { data, error } = await supabaseClient
        .from('moods')
        .insert([{
          user_id: userData.id,
          mood: moodValue,
          created_at: new Date().toISOString()
        }])
        .select();
      if (error) throw error;
      result = data;
      // 初めて記録したときにコインを付与
      const coinAmount = CONFIG?.app?.coins?.moodRecord || 10;
      userData.coins += coinAmount;
      await saveUserData();
      updateCoinsDisplay();
    }
    if (result) {
      // 気分データを更新
      const existingIndex = userData.moods.findIndex(mood => 
        mood.created_at && mood.created_at.split('T')[0] === today
      );
      if (existingIndex >= 0) {
        userData.moods[existingIndex] = result[0];
      } else {
        userData.moods.unshift(result[0]);
      }
      updatePenguinState();
      // ペンギンのアニメーション
      if (penguinImage) {
        penguinImage.classList.add('bounce');
        setTimeout(() => {
          penguinImage.classList.remove('bounce');
        }, 1000);
      }
    }
    // --- デバッグ: 保存後の状態 ---
    setTimeout(() => {
      console.log('[DEBUG] saveMood後 userData.moods:', userData.moods);
      console.log('[DEBUG] saveMood後 getTodayMood:', getTodayMood());
    }, 1000);
  } catch (error) {
    console.error('気分保存エラー:', error);
    alert('気分の記録に失敗しました。もう一度お試しください。');
  }
}

// 今日のタスクを取得
function getTodayTodos() {
  const today = new Date().toISOString().split('T')[0];
  return userData.todos.filter(todo => {
    if (!todo.completed) {
      // 未完了タスクは日付に関係なく全て表示
      return true;
    } else {
      // 完了タスクは「今日完了（updated_atが今日）」のものは作成日を問わず表示
      const updated = todo.updated_at && todo.updated_at.split('T')[0];
      return updated === today;
    }
  });
}

// 今日の気分を取得
function getTodayMood() {
  const today = new Date().toISOString().split('T')[0];
  return userData.moods.find(mood => 
    mood.created_at && mood.created_at.split('T')[0] === today
  );
}

// ペンギンの状態を更新
function updatePenguinState() {
  if (!penguinImage || !penguinSpeech) return;
  const today = new Date().toISOString().split('T')[0];
  const todayTodos = getTodayTodos();
  // 完了タスク数は「今日完了（updated_atが今日）」のもの＋削除記録
  const completedToday = userData.todos.filter(todo => todo.completed && todo.updated_at && todo.updated_at.split('T')[0] === today);
  // 重複削除（同じIDがuserData.todosに残っていれば除外）
  const deletedCount = completedTodayDeleted.filter(d => !userData.todos.some(t => t.id === d.id)).length;
  const completedCount = completedToday.length + deletedCount;
  const lastMood = getTodayMood();
  let penguinState = 'normal';
  let message = '';
  // --- 気分優先で画像を決定 ---
  if (lastMood) {
    if (lastMood.mood === 'happy') {
      penguinState = 'happy';
    } else if (lastMood.mood === 'sad') {
      penguinState = 'sad';
    } else if (lastMood.mood === 'tired') {
      penguinState = 'normal'; // tired用画像がなければnormal
    } else {
      penguinState = 'normal';
    }
  } else {
    penguinState = 'normal';
  }
  // --- メッセージはタスク状況も反映 ---
  if (todayTodos.length === 0) {
    if (penguinState === 'happy') {
      message = '今日はうれしい気分！どんな一日にしようか〜？';
    } else if (penguinState === 'sad') {
      message = '今日はちょっと悲しい気分かも。無理せずゆっくり過ごそうね。';
    } else if (lastMood && lastMood.mood === 'tired') {
      message = 'つかれてるんだね〜、ムリしないでね。今日はゆっくりしよう！';
    } else {
      message = 'おはよう〜！今日はどんな一日にしようかな〜？';
    }
  } else if (todayTodos.length > 0 && todayTodos.every(t => t.completed)) {
    if (penguinState === 'happy') {
      message = 'うれしい気分で全部できたね！すごいよ〜！';
    } else if (penguinState === 'sad') {
      message = '全部できたけど、今日はちょっと悲しい気分かな。よくがんばったね。';
    } else if (lastMood && lastMood.mood === 'tired') {
      message = 'つかれてる中、全部できたね！本当におつかれさま！';
    } else {
      message = 'わ〜い！全部できたんだね、すごいよ〜！';
    }
  } else {
    if (penguinState === 'happy') {
      message = `${completedCount}個のタスクができたよ！うれしい気分で残りもがんばろう〜！`;
    } else if (penguinState === 'sad') {
      message = `${completedCount}個できたけど、今日はちょっと悲しい気分。無理せずいこうね。`;
    } else if (lastMood && lastMood.mood === 'tired') {
      message = `${completedCount}個できたね！つかれてる時は休み休みでOK！`;
    } else {
      message = `${completedCount}個のタスクができたね！残りもゆっくり一緒にがんばろ〜！`;
    }
  }
  // --- 画像切り替え ---
  if (penguinState === 'happy') {
    penguinImage.src = 'images/Whisk_happy_home.jpg';
  } else if (penguinState === 'sad') {
    penguinImage.src = 'images/Whisk_sad_1.png';
  } else {
    penguinImage.src = 'images/Whisk_normal_1.jpg';
  }
  penguinSpeech.textContent = message;
  // --- デバッグログ ---
  console.log('[DEBUG] 気分優先 updatePenguinState:', {penguinState, message, todayTodos, completedCount, lastMood});
}

// コイン表示の更新
function updateCoinsDisplay() {
  if (coinAmount) {
    coinAmount.textContent = userData.coins;
  }
}

// 島レベルの更新
function updateIslandLevel() {
  if (islandLevel) {
    islandLevel.textContent = userData.islandLevel;
  }
}

// 前回の訪問からの日数をチェック
async function checkLastVisit() {
  const now = new Date();
  const lastVisit = new Date(userData.lastVisit);
  
  // 日付の部分だけを比較
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastDay = new Date(lastVisit.getFullYear(), lastVisit.getMonth(), lastVisit.getDate());
  
  const diffTime = today - lastDay;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) {
    // 連続ログインの場合
    userData.streakDays += 1;
    
    // デイリーログインボーナス
    const dailyBonus = CONFIG?.app?.coins?.dailyLogin || 10;
    userData.coins += dailyBonus;
    
    // 7日達成で追加ボーナス
    if (userData.streakDays % 7 === 0) {
      const streakBonus = CONFIG?.app?.coins?.streakBonus || 50;
      userData.coins += streakBonus;
      alert(`${userData.streakDays}日連続ログイン達成！特別ボーナスとして${streakBonus}コインプレゼント！`);
    } else {
      alert(`今日も来てくれてありがとう〜！${dailyBonus}コインプレゼント！`);
    }
    
    // レベルアップチェック
    checkLevelUp();
    
  } else if (diffDays > 1) {
    // 連続ログインが途切れた場合
    userData.streakDays = 1;
    
    // デイリーログインボーナス
    const dailyBonus = CONFIG?.app?.coins?.dailyLogin || 10;
    userData.coins += dailyBonus;
    
    if (diffDays >= 3) {
      // 3日以上空いた場合の特別メッセージ
      alert(`おひさしぶり〜！会えて嬉しいよ〜！${dailyBonus}コインプレゼント！`);
    } else {
      alert(`今日も来てくれてありがとう〜！${dailyBonus}コインプレゼント！`);
    }
  }
  
  // 最終訪問日時を更新
  userData.lastVisit = now.toISOString();
  await saveUserData();
  updateCoinsDisplay();
}

// レベルアップチェック
function checkLevelUp() {
  // レベル計算
  const coinsPerLevel = CONFIG?.app?.levelUp?.coinsPerLevel || 100;
  const newLevel = Math.floor(userData.coins / coinsPerLevel) + 1;
  
  if (newLevel > userData.islandLevel) {
    userData.islandLevel = newLevel;
    alert(`おめでとう！ペンペンの島がレベル${newLevel}にアップしたよ！`);
    updateIslandLevel();
  }
}

// 通知許可の要求
function requestNotificationPermission() {
  if ('Notification' in window) {
    Notification.requestPermission();
  }
}

// タブ切り替え機能
function setupTabSwitching() {
  const tabTask = document.getElementById('tabTask');
  const tabMood = document.getElementById('tabMood');
  const todoSection = document.querySelector('.todo-section');
  const moodSection = document.querySelector('.mood-section');
  if (!tabTask || !tabMood || !todoSection || !moodSection) return;

  tabTask.addEventListener('click', () => {
    tabTask.classList.add('active');
    tabMood.classList.remove('active');
    todoSection.style.display = '';
    moodSection.style.display = 'none';
  });
  tabMood.addEventListener('click', () => {
    tabMood.classList.add('active');
    tabTask.classList.remove('active');
    todoSection.style.display = 'none';
    moodSection.style.display = '';
  });
}

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded - Starting app initialization');
  try {
    initApp();
    requestNotificationPermission();
    setupTabSwitching();
  } catch (error) {
    console.error('Error during DOMContentLoaded initialization:', error);
    // 緊急フォールバック: 直接ログイン画面を表示
    const loginScreen = document.getElementById('loginScreen');
    const appScreen = document.getElementById('appScreen');
    if (loginScreen) {
      loginScreen.style.display = 'block';
      console.log('Emergency fallback: Login screen displayed');
    }
    if (appScreen) {
      appScreen.style.display = 'none';
    }
  }

  // 設定ボタン・モーダルのイベント登録
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const logoutModalBtn = document.getElementById('logoutModalBtn');
  const closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');

  if (settingsBtn && settingsModal) {
    settingsBtn.addEventListener('click', () => {
      settingsModal.classList.add('active');
    });
  }
  if (logoutModalBtn && settingsModal) {
    logoutModalBtn.addEventListener('click', async () => {
      settingsModal.classList.remove('active');
      await handleLogout();
    });
  }
  if (closeSettingsModalBtn && settingsModal) {
    closeSettingsModalBtn.addEventListener('click', () => {
      settingsModal.classList.remove('active');
    });
  }

  // --- 編集モーダルの保存・キャンセルボタンのイベント登録 ---
  if (saveEditTodoBtn) saveEditTodoBtn.addEventListener('click', saveEditTodo);
  if (cancelEditTodoBtn) cancelEditTodoBtn.addEventListener('click', hideEditTodoModal);

  // --- 編集モーダル外クリックで閉じる ---
  if (editTodoModal) {
    editTodoModal.addEventListener('mousedown', (e) => {
      if (e.target === editTodoModal) {
        hideEditTodoModal();
      }
    });
  }

  // 柔らかい進捗確認通知
  setTimeout(checkTaskProgress, 2000);
});

// ウィンドウ読み込み完了時のフォールバック
window.addEventListener('load', () => {
  console.log('Window loaded - Checking if app is initialized');
  const loginScreen = document.getElementById('loginScreen');
  const appScreen = document.getElementById('appScreen');
  
  // もしどちらの画面も表示されていない場合、ログイン画面を表示
  if (loginScreen && appScreen) {
    const loginVisible = loginScreen.style.display !== 'none';
    const appVisible = appScreen.style.display !== 'none';
    
    if (!loginVisible && !appVisible) {
      console.log('No screen visible - showing login screen as fallback');
      loginScreen.style.display = 'block';
    }
  }
});

// 編集用モーダルの表示
function showEditTodoModal(todo) {
  if (editTodoModal && editTodoInput) {
    editTodoInput.value = todo.text;
    editTodoModal.classList.add('active');
    editingTodo = todo;
    setTimeout(() => editTodoInput.focus(), 100);
  }
}

// 編集用モーダルの非表示
function hideEditTodoModal() {
  if (editTodoModal) {
    editTodoModal.classList.remove('active');
    editingTodo = null;
  }
}

// 編集保存処理
async function saveEditTodo() {
  if (!supabaseClient || !userData.id || !editingTodo) return;
  const newText = editTodoInput?.value.trim();
  if (!newText) {
    alert('タスク名を入力してください');
    return;
  }
  try {
    const { data, error } = await supabaseClient
      .from('todos')
      .update({ text: newText, updated_at: new Date().toISOString() })
      .eq('id', editingTodo.id)
      .select();
    if (error) throw error;
    if (data && data[0]) {
      // ローカルデータも更新
      const idx = userData.todos.findIndex(t => t.id === editingTodo.id);
      if (idx >= 0) userData.todos[idx].text = newText;
      renderTodos();
      updatePenguinState();
      hideEditTodoModal();
    }
  } catch (error) {
    console.error('タスク編集エラー:', error);
    alert('タスクの編集に失敗しました。もう一度お試しください。');
  }
}

// --- 進捗確認通知 ---
function checkTaskProgress() {
  const todayTodos = getTodayTodos();
  if (todayTodos.length > 0 && todayTodos.every(t => !t.completed)) {
    showSoftNotification('タスクの進み具合はどう？無理せずいこうね〜', 'warning');
  }
}

// renderTodosの中身を編集：タスク項目に編集・ドラッグ＆ドロップ機能を追加
function renderTodos() {
  if (!todoList) return;
  todoList.innerHTML = '';
  const todayTodos = getTodayTodos();
  if (todayTodos.length === 0) {
    todoList.innerHTML = '<div class="todo-item">今日のタスクはまだないよ〜</div>';
    return;
  }
  // ドロップインジケーターを管理
  let dropIndicator = null;
  let dropIndicatorIndex = null;
  let dropIndicatorParent = null;
  function removeDropIndicator() {
    if (dropIndicator && dropIndicator.parentNode) {
      dropIndicator.parentNode.removeChild(dropIndicator);
      dropIndicator = null;
      dropIndicatorIndex = null;
      dropIndicatorParent = null;
    }
  }
  todayTodos.forEach((todo, idx) => {
    const todoItem = document.createElement('div');
    todoItem.className = `todo-item ${todo.completed ? 'completed' : ''}`;
    todoItem.setAttribute('draggable', 'true');
    todoItem.dataset.todoId = todo.id;
    todoItem.dataset.idx = idx;
    todoItem.innerHTML = `
      <input type="checkbox" class="todo-check" ${todo.completed ? 'checked' : ''}>
      <span class="todo-text">${todo.text}</span>
      <button class="todo-edit-btn" title="編集">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 21v-3.75a2 2 0 0 1 .586-1.414l11.314-11.314a2 2 0 0 1 2.828 0l1.336 1.336a2 2 0 0 1 0 2.828L7.75 20.414A2 2 0 0 1 6.336 21H3z"/>
        </svg>
      </button>
      <button class="todo-delete-btn" title="削除">×</button>
    `;
    // 編集ボタンで編集モーダルを開く
    const editBtn = todoItem.querySelector('.todo-edit-btn');
    editBtn.addEventListener('touchend', (e) => {
      e.stopPropagation();
      e.preventDefault();
      ignoreNextEditClick = true;
      showEditTodoModal(todo);
    });
    editBtn.addEventListener('click', (e) => {
      if (ignoreNextEditClick) {
        ignoreNextEditClick = false;
        return;
      }
      e.stopPropagation();
      showEditTodoModal(todo);
    });
    const checkbox = todoItem.querySelector('.todo-check');
    const deleteBtn = todoItem.querySelector('.todo-delete-btn');
    // 念のため既存リスナーをクリア
    deleteBtn.replaceWith(deleteBtn.cloneNode(true));
    const newDeleteBtn = todoItem.querySelector('.todo-delete-btn');
    newDeleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteTodo(todo, todoItem);
    });
    checkbox.addEventListener('change', async () => {
      todo.completed = checkbox.checked;
      todoItem.classList.toggle('completed', todo.completed);
      try {
        const { error } = await supabaseClient
          .from('todos')
          .update({ 
            completed: todo.completed,
            updated_at: new Date().toISOString()
          })
          .eq('id', todo.id);
        if (error) throw error;
        if (todo.completed && !todo.coin_given) {
          const coinAmount = CONFIG?.app?.coins?.taskComplete || 20;
          userData.coins += coinAmount;
          await supabaseClient
            .from('todos')
            .update({ coin_given: true })
            .eq('id', todo.id);
          todo.coin_given = true;
          await saveUserData();
          updatePenguinState();
        }
        updatePenguinState();
      } catch (error) {
        console.error('タスク更新エラー:', error);
        todo.completed = !todo.completed;
        checkbox.checked = todo.completed;
        todoItem.classList.toggle('completed', todo.completed);
      }
    });
    // ドラッグ＆ドロップイベント
    todoItem.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', idx);
      todoItem.classList.add('dragging');
      // クローンを作成して縮小
      const dragClone = todoItem.cloneNode(true);
      const rect = todoItem.getBoundingClientRect();
      dragClone.style.width = rect.width + 'px';
      dragClone.style.height = rect.height + 'px';
      dragClone.style.transform = 'scale(0.66)';
      dragClone.style.transformOrigin = 'left top';
      dragClone.style.position = 'absolute';
      dragClone.style.top = '-9999px';
      dragClone.style.left = '-9999px';
      dragClone.style.pointerEvents = 'none';
      document.body.appendChild(dragClone);
      // drag imageの基準点も0,高さの1/3に
      e.dataTransfer.setDragImage(dragClone, 0, rect.height * 0.33);
      todoItem.addEventListener('dragend', () => {
        if (dragClone && dragClone.parentNode) dragClone.parentNode.removeChild(dragClone);
      }, { once: true });
    });
    todoItem.addEventListener('dragover', (e) => {
      e.preventDefault();
      // すでに同じ親・同じ位置にインジケーターがある場合は何もしない
      if (dropIndicatorIndex === idx && dropIndicatorParent === todoItem.parentNode) return;
      removeDropIndicator();
      dropIndicator = document.createElement('div');
      dropIndicator.className = 'drop-indicator';
      todoItem.parentNode.insertBefore(dropIndicator, todoItem);
      dropIndicatorIndex = idx;
      dropIndicatorParent = todoItem.parentNode;
    });
    todoItem.addEventListener('dragleave', (e) => {
      removeDropIndicator();
    });
    todoItem.addEventListener('drop', async (e) => {
      e.preventDefault();
      removeDropIndicator();
      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const toIdx = idx;
      if (fromIdx !== toIdx) {
        // 並べ替え
        const moved = todayTodos.splice(fromIdx, 1)[0];
        todayTodos.splice(toIdx, 0, moved);
        // userData.todosの順序も更新
        const todayIds = todayTodos.map(t => t.id);
        userData.todos = userData.todos.filter(t => !todayIds.includes(t.id)).concat(todayTodos);
        renderTodos();
        // 並び順をSupabaseに保存（orderカラムがある場合）
        for (let i = 0; i < todayTodos.length; i++) {
          await supabaseClient.from('todos').update({ order: i }).eq('id', todayTodos[i].id);
        }
      }
    });
    todoList.appendChild(todoItem);
  });
}

function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// タスク削除処理
async function deleteTodo(todo, todoItem) {
  if (!supabaseClient || !userData.id) return;
  console.log('削除対象タスク', todo);
  try {
    // Supabaseから削除（user_id条件も追加）
    const { error } = await supabaseClient
      .from('todos')
      .delete()
      .eq('id', todo.id)
      .eq('user_id', userData.id);
    if (error) throw error;

    // 今日完了したタスクなら記録
    const today = new Date().toISOString().split('T')[0];
    if (todo.completed && todo.updated_at && todo.updated_at.split('T')[0] === today) {
      completedTodayDeleted.push({ id: todo.id, updated_at: todo.updated_at });
    }

    // ローカル配列から削除
    userData.todos = userData.todos.filter(t => t.id !== todo.id);

    // UI更新
    renderTodos();
    updatePenguinState();
  } catch (error) {
    console.error('タスク削除エラー:', error);
    alert('タスクの削除に失敗しました: ' + (error.message || error));
  }
}