// ペンペンアプリのJavaScript - Supabase連携版（デバッグ・改善版）

// Supabaseクライアントの初期化
let supabaseClient;

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

// アプリの状態管理
let appState = {
  isInitializing: true,
  isLoading: false,
  authStateProcessed: false,
  retryCount: 0,
  maxRetries: 3
};

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

// デバッグ用ログ
console.log('DOM elements loaded:');
console.log('emailLoginToggleBtn:', emailLoginToggleBtn);
console.log('loginForm:', loginForm);
console.log('signupForm:', signupForm);
const toggleSignupBtn = document.getElementById('toggleSignupBtn');
const toggleLoginBtn = document.getElementById('toggleLoginBtn');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');

// ローディング状態の表示
function showLoading(message = 'Loading...') {
  console.log(`[LOADING] ${message}`);
  appState.isLoading = true;
  // 必要に応じてローディングUIを表示
}

// ローディング状態の非表示
function hideLoading() {
  console.log('[LOADING] Hide loading');
  appState.isLoading = false;
  // ローディングUIを非表示
}

// エラーハンドリング
function handleError(error, context = 'Unknown') {
  console.error(`[ERROR] ${context}:`, error);
  hideLoading();
  
  // ユーザーフレンドリーなエラーメッセージ
  let userMessage = 'エラーが発生しました。';
  
  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    userMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
  } else if (error.message?.includes('auth')) {
    userMessage = '認証エラーが発生しました。再度ログインしてください。';
  }
  
  // リトライ可能なエラーの場合
  if (appState.retryCount < appState.maxRetries && context.includes('loadUserData')) {
    appState.retryCount++;
    console.log(`[RETRY] Attempting retry ${appState.retryCount}/${appState.maxRetries}`);
    setTimeout(() => {
      loadUserData();
    }, 1000 * appState.retryCount); // 指数バックオフ
    return;
  }
  
  alert(userMessage);
}

// Supabaseクライアントを初期化
function initSupabase() {
  try {
    console.log('[INIT] Initializing Supabase client...');
    supabaseClient = supabase.createClient(
      CONFIG?.supabase?.url || 'https://hzofzvlhptgwcusbnavp.supabase.co',
      CONFIG?.supabase?.anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6b2Z6dmxocHRnd2N1c2JuYXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNzYzNjQsImV4cCI6MjA2NTc1MjM2NH0.NVfUTUJE9QK13jzi6mQQI3eTYy7z_dsrbiju86_L6tQ'
    );
    console.log('[INIT] Supabase client initialized successfully');
    return true;
  } catch (error) {
    console.error('[INIT] Failed to initialize Supabase client:', error);
    return false;
  }
}

// アプリの初期化
async function initApp() {
  console.log('[INIT] Starting app initialization...');
  showLoading('アプリを初期化中...');
  
  // Supabaseクライアントを初期化
  const supabaseInitialized = initSupabase();
  
  if (!supabaseInitialized || !supabaseClient) {
    console.error('[INIT] Supabase client is not available');
    handleError(new Error('Supabase initialization failed'), 'initApp');
    showLoginScreen();
    hideLoading();
    return;
  }
  
  try {
    // 認証状態の変化を監視
    console.log('[AUTH] Setting up auth state listener...');
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AUTH] Auth state changed: ${event}`, {
        session: session ? 'exists' : 'null',
        user: session?.user ? session.user.id : 'null',
        processed: appState.authStateProcessed
      });
      
      // 初期化中の重複処理を防ぐ
      if (appState.isInitializing && event === 'INITIAL_SESSION') {
        console.log('[AUTH] Skipping INITIAL_SESSION during initialization');
        return;
      }
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('[AUTH] Processing SIGNED_IN event');
        appState.authStateProcessed = true;
        userData.id = session.user.id;
        
        try {
          showLoading('ユーザーデータを読み込み中...');
          await loadUserData();
          console.log('[AUTH] User data loaded, showing app screen');
          showAppScreen();
        } catch (error) {
          handleError(error, 'SIGNED_IN loadUserData');
        } finally {
          hideLoading();
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('[AUTH] Processing SIGNED_OUT event');
        resetUserData();
        showLoginScreen();
        hideLoading();
      }
    });
    
    // 現在のセッション状態をチェック
    console.log('[AUTH] Checking current session...');
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    console.log('[AUTH] Session check results:', {
      session: session ? 'exists' : 'null',
      user: user ? 'exists' : 'null',
      sessionError,
      userError
    });
    
    // セッションまたはユーザー情報が存在する場合
    if ((session && session.user) || user) {
      const currentUser = session?.user || user;
      console.log('[AUTH] User is logged in:', currentUser.id);
      userData.id = currentUser.id;
      
      try {
        showLoading('ユーザーデータを読み込み中...');
        await loadUserData();
        console.log('[AUTH] User data loaded successfully, showing app screen');
        showAppScreen();
      } catch (error) {
        console.error('[AUTH] Failed to load user data:', error);
        handleError(error, 'initApp loadUserData');
        // データ読み込みに失敗した場合でもアプリ画面を表示
        showAppScreen();
      }
    } else {
      console.log('[AUTH] User is not logged in, showing login screen');
      showLoginScreen();
    }
    
  } catch (error) {
    console.error('[INIT] App initialization failed:', error);
    handleError(error, 'initApp');
    showLoginScreen();
  } finally {
    appState.isInitializing = false;
    hideLoading();
    console.log('[INIT] App initialization completed');
  }
  
  // イベントリスナーの設定
  setupEventListeners();
}

// ユーザーデータのリセット
function resetUserData() {
  console.log('[DATA] Resetting user data');
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
  appState.authStateProcessed = false;
  appState.retryCount = 0;
}

// ログイン画面の表示
function showLoginScreen() {
  console.log('[UI] Showing login screen');
  if (loginScreen) loginScreen.style.display = 'block';
  if (appScreen) appScreen.style.display = 'none';
  
  // メールログインボタンを再表示
  if (emailLoginToggleBtn) {
    emailLoginToggleBtn.style.display = 'block';
  }
  
  // ログインフォームを非表示
  if (loginForm) {
    loginForm.classList.remove('active');
  }
  
  // サインアップフォームを非表示
  if (signupForm) {
    signupForm.classList.remove('active');
  }
}

// アプリ画面の表示
function showAppScreen() {
  console.log('[UI] Showing app screen');
  if (loginScreen) loginScreen.style.display = 'none';
  if (appScreen) appScreen.style.display = 'block';
  
  // データの表示
  updatePenguinState();
  renderTodos();
  updateCoinsDisplay();
  updateIslandLevel();
  
  // 最終訪問チェック（非同期で実行）
  checkLastVisit().catch(error => {
    console.error('[UI] Error in checkLastVisit:', error);
  });
}

// ユーザーデータの読み込み（改善版）
async function loadUserData() {
  if (!supabaseClient || !userData.id) {
    console.warn('[DATA] Cannot load user data: missing client or user ID');
    return;
  }
  
  console.log('[DATA] Loading user data for user:', userData.id);
  
  try {
    // プロフィール情報を取得
    console.log('[DATA] Fetching profile...');
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userData.id)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('[DATA] Profile fetch error:', profileError);
      throw profileError;
    }
    
    if (profile) {
      console.log('[DATA] Profile loaded:', profile);
      userData.name = profile.display_name || 'ユーザー';
      userData.coins = profile.coins || 0;
      userData.streakDays = profile.streak_days || 0;
      userData.lastVisit = profile.last_visit || new Date().toISOString();
      userData.islandLevel = profile.level || 1;
    } else {
      console.log('[DATA] No profile found, using defaults');
    }
    
    // ToDosを取得
    console.log('[DATA] Fetching todos...');
    const { data: todos, error: todosError } = await supabaseClient
      .from('todos')
      .select('*')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false });
    
    if (todosError) {
      console.error('[DATA] Todos fetch error:', todosError);
      throw todosError;
    }
    
    userData.todos = todos || [];
    console.log('[DATA] Todos loaded:', userData.todos.length);
    
    // Moodsを取得
    console.log('[DATA] Fetching moods...');
    const { data: moods, error: moodsError } = await supabaseClient
      .from('moods')
      .select('*')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false });
    
    if (moodsError) {
      console.error('[DATA] Moods fetch error:', moodsError);
      throw moodsError;
    }
    
    userData.moods = moods || [];
    console.log('[DATA] Moods loaded:', userData.moods.length);
    
    // アイテムを取得
    console.log('[DATA] Fetching items...');
    const { data: items, error: itemsError } = await supabaseClient
      .from('user_items')
      .select('*, items(*)')
      .eq('user_id', userData.id);
    
    if (itemsError) {
      console.error('[DATA] Items fetch error:', itemsError);
      throw itemsError;
    }
    
    userData.items = items || [];
    console.log('[DATA] Items loaded:', userData.items.length);
    
    console.log('[DATA] All user data loaded successfully');
    appState.retryCount = 0; // 成功時はリトライカウントをリセット
    
  } catch (error) {
    console.error('[DATA] Error loading user data:', error);
    
    // エラー時はローカルストレージのデータがあれば使用
    const saved = localStorage.getItem('penpenUserData');
    if (saved) {
      try {
        const localData = JSON.parse(saved);
        userData = { ...userData, ...localData, id: userData.id };
        console.log('[DATA] Fallback to local storage data');
      } catch (parseError) {
        console.error('[DATA] Failed to parse local storage data:', parseError);
      }
    }
    
    throw error; // エラーを再スローして上位でハンドリング
  }
}

// ユーザーデータの保存
async function saveUserData() {
  if (!supabaseClient || !userData.id) {
    console.warn('[DATA] Cannot save user data: missing client or user ID');
    return;
  }
  
  console.log('[DATA] Saving user data...');
  
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
    
    if (profileError) {
      console.error('[DATA] Profile save error:', profileError);
      throw profileError;
    }
    
    // バックアップとしてローカルストレージにも保存
    localStorage.setItem('penpenUserData', JSON.stringify({
      name: userData.name,
      coins: userData.coins,
      streakDays: userData.streakDays,
      lastVisit: userData.lastVisit,
      islandLevel: userData.islandLevel
    }));
    
    console.log('[DATA] User data saved successfully');
    
  } catch (error) {
    console.error('[DATA] Error saving user data:', error);
    handleError(error, 'saveUserData');
  }
}

// イベントリスナーの設定（重複防止フラグ）
let eventListenersSetup = false;

function setupEventListeners() {
  // 既にセットアップ済みの場合は何もしない
  if (eventListenersSetup) {
    console.log('[EVENT] Event listeners already setup, skipping...');
    return;
  }
  
  console.log('[EVENT] Setting up event listeners...');
  eventListenersSetup = true;
  
  // 認証関連
  googleLoginBtn?.addEventListener('click', handleGoogleLogin);
  emailLoginToggleBtn?.addEventListener('click', () => {
    console.log('[EVENT] Email login button clicked');
    console.log('loginForm element:', loginForm);
    console.log('emailLoginToggleBtn element:', emailLoginToggleBtn);
    
    if (loginForm) {
      loginForm.classList.add('active');
      console.log('[EVENT] Added active class to loginForm');
    } else {
      console.error('[EVENT] loginForm element not found');
    }
    
    if (emailLoginToggleBtn) {
      emailLoginToggleBtn.style.display = 'none';
      console.log('[EVENT] Hidden emailLoginToggleBtn');
    } else {
      console.error('[EVENT] emailLoginToggleBtn element not found');
    }
  });
  
  toggleSignupBtn?.addEventListener('click', () => {
    loginForm.classList.remove('active');
    signupForm.classList.add('active');
  });
  
  toggleLoginBtn?.addEventListener('click', () => {
    signupForm.classList.remove('active');
    loginForm.classList.add('active');
  });
  
  loginBtn?.addEventListener('click', handleEmailLogin);
  signupBtn?.addEventListener('click', handleSignup);
  logoutMenuItem?.addEventListener('click', handleLogout);
  
  // 設定メニュー
  settingsBtn?.addEventListener('click', () => {
    userMenu.classList.toggle('active');
  });
  
  // 島の表示切替
  document.querySelector('.island-status')?.addEventListener('click', () => {
    islandContainer.classList.toggle('active');
  });
  
  // タスク関連
  addTodoBtn?.addEventListener('click', showTodoModal);
  cancelTodoBtn?.addEventListener('click', hideTodoModal);
  saveTodoBtn?.addEventListener('click', saveTodo);
  
  notificationToggle?.addEventListener('change', () => {
    if (notificationTime) {
      notificationTime.style.display = notificationToggle.checked ? 'inline-block' : 'none';
    }
  });
  
  // 気分選択
  const moodButtons = document.querySelectorAll('.mood-btn');
  moodButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const mood = btn.getAttribute('data-mood');
      
      // 以前の選択を解除
      moodButtons.forEach(b => b.classList.remove('selected'));
      
      // 新しい選択を適用
      btn.classList.add('selected');
      
      // 気分データを保存
      await saveMood(mood);
    });
  });
  
  // 画面クリック時にメニューを閉じる
  document.addEventListener('click', (e) => {
    if (settingsBtn && userMenu && e.target !== settingsBtn && !userMenu.contains(e.target)) {
      userMenu.classList.remove('active');
    }
  });
  
  console.log('[EVENT] Event listeners setup completed');
}

// Googleログイン処理
async function handleGoogleLogin() {
  if (!supabaseClient) {
    console.error('[AUTH] Supabase client not available for Google login');
    return;
  }
  
  console.log('[AUTH] Starting Google login...');
  showLoading('Googleでログイン中...');
  
  try {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: CONFIG?.supabase?.redirectUrl || window.location.origin
      }
    });
    
    if (error) throw error;
    
    console.log('[AUTH] Google login initiated');
    
  } catch (error) {
    console.error('[AUTH] Google login error:', error);
    handleError(error, 'handleGoogleLogin');
  } finally {
    hideLoading();
  }
}

// メールログイン処理
async function handleEmailLogin() {
  if (!supabaseClient) {
    console.error('[AUTH] Supabase client not available for email login');
    return;
  }
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  if (!email || !password) {
    alert('メールアドレスとパスワードを入力してください');
    return;
  }
  
  console.log('[AUTH] Starting email login for:', email);
  showLoading('ログイン中...');
  
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    console.log('[AUTH] Email login successful:', data.user?.id);
    
    if (data.user) {
      userData.id = data.user.id;
      // 認証状態変更のイベントハンドラーで処理されるため、ここでは何もしない
    }
    
  } catch (error) {
    console.error('[AUTH] Email login error:', error);
    handleError(error, 'handleEmailLogin');
    alert('ログインに失敗しました。メールアドレスとパスワードを確認してください。');
  } finally {
    hideLoading();
  }
}

// サインアップ処理
async function handleSignup() {
  if (!supabaseClient) {
    console.error('[AUTH] Supabase client not available for signup');
    return;
  }
  
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
  
  console.log('[AUTH] Starting signup for:', email);
  showLoading('アカウント作成中...');
  
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
    
    console.log('[AUTH] Signup successful:', data.user?.id);
    
    if (data.user) {
      if (data.session) {
        // 確認なしですぐにログイン
        userData.id = data.user.id;
        // 認証状態変更のイベントハンドラーで処理される
      } else {
        // メール確認が必要
        alert('アカウントが作成されました！メールを確認してください。');
        signupForm.classList.remove('active');
        loginForm.classList.add('active');
      }
    }
    
  } catch (error) {
    console.error('[AUTH] Signup error:', error);
    handleError(error, 'handleSignup');
    alert('アカウント作成に失敗しました。もう一度お試しください。');
  } finally {
    hideLoading();
  }
}

// ログアウト処理
async function handleLogout() {
  if (!supabaseClient) {
    console.error('[AUTH] Supabase client not available for logout');
    return;
  }
  
  console.log('[AUTH] Starting logout...');
  showLoading('ログアウト中...');
  
  try {
    const { error } = await supabaseClient.auth.signOut();
    
    if (error) throw error;
    
    console.log('[AUTH] Logout successful');
    resetUserData();
    showLoginScreen();
    
  } catch (error) {
    console.error('[AUTH] Logout error:', error);
    handleError(error, 'handleLogout');
  } finally {
    hideLoading();
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
    
    // Supabaseにタスクを保存
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
      // ローカルのtodosリストに追加
      userData.todos.unshift(data[0]);
      
      // 通知の設定（Web Push通知がサポートされている場合）
      if (hasNotification && notificationTimeValue && Notification.permission === 'granted') {
        scheduleNotification(text, notificationTimeValue);
      }
      
      renderTodos();
      updatePenguinState();
      hideTodoModal();
    }
    
  } catch (error) {
    console.error('タスク保存エラー:', error);
    alert('タスクの保存に失敗しました。もう一度お試しください。');
  }
}

// 通知のスケジュール
function scheduleNotification(taskText, timeString) {
  const [hours, minutes] = timeString.split(':');
  const now = new Date();
  const notificationTime = new Date();
  
  notificationTime.setHours(parseInt(hours, 10));
  notificationTime.setMinutes(parseInt(minutes, 10));
  notificationTime.setSeconds(0);
  
  // 設定時間が過ぎている場合は翌日に設定
  if (notificationTime < now) {
    notificationTime.setDate(notificationTime.getDate() + 1);
  }
  
  const timeUntilNotification = notificationTime.getTime() - now.getTime();
  
  setTimeout(() => {
    if (Notification.permission === 'granted') {
      new Notification('ペンペンからのお知らせ', {
        body: `${taskText}の時間だよ〜！いっしょにがんばろっ！`,
        icon: CONFIG?.app?.notification?.icon || 'images/55b5453a51a444569199c2ab5b5d4e4a.png'
      });
    }
  }, timeUntilNotification);
}

// タスクの表示更新
function renderTodos() {
  if (!todoList) return;
  
  todoList.innerHTML = '';
  
  // 今日のタスクのみフィルター
  const todayTodos = getTodayTodos();
  
  if (todayTodos.length === 0) {
    todoList.innerHTML = '<div class="todo-item">今日のタスクはまだないよ〜</div>';
    return;
  }
  
  todayTodos.forEach(todo => {
    const todoItem = document.createElement('div');
    todoItem.className = `todo-item ${todo.completed ? 'completed' : ''}`;
    
    todoItem.innerHTML = `
      <input type="checkbox" class="todo-check" ${todo.completed ? 'checked' : ''}>
      <span class="todo-text">${todo.text}</span>
    `;
    
    const checkbox = todoItem.querySelector('.todo-check');
    checkbox.addEventListener('change', async () => {
      todo.completed = checkbox.checked;
      todoItem.classList.toggle('completed', todo.completed);
      
      try {
        // Supabaseでタスク更新
        const { error } = await supabaseClient
          .from('todos')
          .update({ 
            completed: todo.completed,
            updated_at: new Date().toISOString()
          })
          .eq('id', todo.id);
        
        if (error) throw error;
        
        // タスク完了時にコインを付与
        if (todo.completed && !todo.coin_given) {
          const coinAmount = CONFIG?.app?.coins?.taskComplete || 20;
          userData.coins += coinAmount;
          
          // コイン付与フラグを更新
          await supabaseClient
            .from('todos')
            .update({ 
              coin_given: true
            })
            .eq('id', todo.id);
          
          todo.coin_given = true;
          
          // ユーザーデータを保存
          await saveUserData();
          updateCoinsDisplay();
          
          // ペンギンのアニメーション
          if (penguinImage) {
            penguinImage.classList.add('bounce');
            setTimeout(() => {
              penguinImage.classList.remove('bounce');
            }, 1000);
          }
        }
        
        updatePenguinState();
        
      } catch (error) {
        console.error('タスク更新エラー:', error);
        // エラー時は元に戻す
        todo.completed = !todo.completed;
        checkbox.checked = todo.completed;
        todoItem.classList.toggle('completed', todo.completed);
      }
    });
    
    todoList.appendChild(todoItem);
  });
}

// 気分の保存
async function saveMood(moodValue) {
  if (!supabaseClient || !userData.id) return;
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
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
    
  } catch (error) {
    console.error('気分保存エラー:', error);
    alert('気分の記録に失敗しました。もう一度お試しください。');
  }
}

// 今日のタスクを取得
function getTodayTodos() {
  const today = new Date().toISOString().split('T')[0];
  return userData.todos.filter(todo => 
    todo.created_at && todo.created_at.split('T')[0] === today
  );
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
  
  // 今日のToDoの完了状況を確認
  const todayTodos = getTodayTodos();
  const completedTodos = todayTodos.filter(todo => todo.completed);
  
  // 最後の気分を取得
  const lastMood = getTodayMood();
  
  let penguinState = 'normal';
  let message = '';
  
  // ペンギンの状態と発言を決定
  if (todayTodos.length === 0) {
    penguinState = 'normal';
    message = 'おはよう〜！今日はどんな一日にしようかな〜？';
  } else if (completedTodos.length === todayTodos.length && todayTodos.length > 0) {
    penguinState = 'happy';
    message = 'わ〜い！全部できたんだね、すごいよ〜！';
  } else if (completedTodos.length > 0) {
    penguinState = 'normal';
    message = `${completedTodos.length}個のタスクができたね！残りもゆっくり一緒にがんばろ〜！`;
  } else {
    if (lastMood && lastMood.mood === 'sad') {
      penguinState = 'sad';
      message = 'ちょっと大変な日かも？ゆっくり休んでもいいんだよ〜';
    } else {
      penguinState = 'normal';
      message = 'まだタスクが残ってるけど、ゆっくりいこうね〜！';
    }
  }
  
  // 気分に応じたメッセージの追加
  if (lastMood) {
    if (lastMood.mood === 'happy' && penguinState !== 'happy') {
      message = 'うれしい気分なんだね！その調子でいこう〜！';
      penguinState = 'happy';
    } else if (lastMood.mood === 'tired' && penguinState === 'normal') {
      message = 'つかれてるんだね〜、ムリしないでね。ちょっと休もうよ〜';
    }
  }
  
  // ペンギンの画像を設定
  if (penguinState === 'happy') {
    penguinImage.src = 'images/dafb7d72ab884e9fa70e2bc20ce0ff81.png';
  } else if (penguinState === 'sad') {
    penguinImage.src = 'images/ae4c6fbfd1cd4e879a84008900bc7943.png';
  } else {
    penguinImage.src = 'images/55b5453a51a444569199c2ab5b5d4e4a.png';
  }
  
  penguinSpeech.textContent = message;
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

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
  console.log('[INIT] DOM content loaded, starting initialization...');
  initApp();
  requestNotificationPermission();
});

// ページの可視性変更時の処理（デバッグ用）
document.addEventListener('visibilitychange', () => {
  console.log('[DEBUG] Page visibility changed:', document.visibilityState);
});

// ウィンドウフォーカス時の処理（デバッグ用）
window.addEventListener('focus', () => {
  console.log('[DEBUG] Window focused');
});

window.addEventListener('blur', () => {
  console.log('[DEBUG] Window blurred');
});