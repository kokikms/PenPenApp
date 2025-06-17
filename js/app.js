// ペンペンアプリのJavaScript

// ユーザーデータ
let userData = {
  name: 'ユーザー',
  coins: 0,
  todos: [],
  moods: [],
  items: [],
  lastVisit: new Date().toISOString(),
  streakDays: 0
};

// DOM要素の取得
const penguinImage = document.getElementById('penguinImage');
const penguinSpeech = document.getElementById('penguinSpeech');
const todoList = document.getElementById('todoList');
const addTodoBtn = document.getElementById('addTodoBtn');
const todoModal = document.getElementById('todoModal');
const todoInput = document.getElementById('todoInput');
const saveTodoBtn = document.getElementById('saveTodoBtn');
const cancelTodoBtn = document.getElementById('cancelTodoBtn');
const coinAmount = document.getElementById('coinAmount');

// アプリの初期化
function initApp() {
  // ローカルストレージからデータを読み込み
  loadUserData();
  
  // データの表示
  updatePenguinState();
  renderTodos();
  updateCoinsDisplay();
  checkLastVisit();
  
  // イベントリスナーの設定
  setupEventListeners();
}

// ユーザーデータの読み込み
function loadUserData() {
  const saved = localStorage.getItem('penpenUserData');
  if (saved) {
    userData = JSON.parse(saved);
  }
}

// ユーザーデータの保存
function saveUserData() {
  localStorage.setItem('penpenUserData', JSON.stringify(userData));
}

// イベントリスナーの設定
function setupEventListeners() {
  // タスク関連
  addTodoBtn.addEventListener('click', showTodoModal);
  cancelTodoBtn.addEventListener('click', hideTodoModal);
  saveTodoBtn.addEventListener('click', saveTodo);
  
  // 気分選択
  const moodButtons = document.querySelectorAll('.mood-btn');
  moodButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mood = btn.getAttribute('data-mood');
      
      // 以前の選択を解除
      moodButtons.forEach(b => b.classList.remove('selected'));
      
      // 新しい選択を適用
      btn.classList.add('selected');
      
      // 気分データを保存
      saveMood(mood);
    });
  });
}

// タスクモーダルの表示
function showTodoModal() {
  todoModal.classList.add('active');
  todoInput.value = '';
  todoInput.focus();
}

// タスクモーダルの非表示
function hideTodoModal() {
  todoModal.classList.remove('active');
}

// タスクの保存
function saveTodo() {
  const text = todoInput.value.trim();
  
  if (!text) {
    alert('タスク名を入力してください');
    return;
  }
  
  // 新しいタスクを作成
  const newTodo = {
    id: Date.now(),
    text: text,
    completed: false,
    coinGiven: false,
    createdAt: new Date().toISOString()
  };
  
  // タスクリストに追加
  userData.todos.unshift(newTodo);
  
  // ユーザーデータを保存
  saveUserData();
  
  // タスクリストを再描画
  renderTodos();
  
  // ペンギンの状態を更新
  updatePenguinState();
  
  // モーダルを閉じる
  hideTodoModal();
}

// タスクの表示更新
function renderTodos() {
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
    checkbox.addEventListener('change', () => {
      todo.completed = checkbox.checked;
      todoItem.classList.toggle('completed', todo.completed);
      
      // タスク完了時にコインを付与
      if (todo.completed && !todo.coinGiven) {
        userData.coins += 20;
        todo.coinGiven = true;
        updateCoinsDisplay();
        
        // ペンギンのアニメーション
        penguinImage.classList.add('bounce');
        setTimeout(() => {
          penguinImage.classList.remove('bounce');
        }, 1000);
      }
      
      // ユーザーデータを保存
      saveUserData();
      
      // ペンギンの状態を更新
      updatePenguinState();
    });
    
    todoList.appendChild(todoItem);
  });
}

// 気分の保存
function saveMood(moodValue) {
  const today = new Date().toISOString().split('T')[0];
  
  // 今日の気分が既に記録されているか確認
  const existingIndex = userData.moods.findIndex(mood => 
    mood.createdAt && mood.createdAt.split('T')[0] === today
  );
  
  if (existingIndex >= 0) {
    // 既存の気分を更新
    userData.moods[existingIndex].mood = moodValue;
  } else {
    // 新しい気分を記録
    userData.moods.unshift({
      id: Date.now(),
      mood: moodValue,
      createdAt: new Date().toISOString()
    });
    
    // 初めて記録したときにコインを付与
    userData.coins += 10;
    updateCoinsDisplay();
  }
  
  // ユーザーデータを保存
  saveUserData();
  
  // ペンギンの状態を更新
  updatePenguinState();
  
  // ペンギンのアニメーション
  penguinImage.classList.add('bounce');
  setTimeout(() => {
    penguinImage.classList.remove('bounce');
  }, 1000);
}

// 今日のタスクを取得
function getTodayTodos() {
  const today = new Date().toISOString().split('T')[0];
  return userData.todos.filter(todo => 
    todo.createdAt && todo.createdAt.split('T')[0] === today
  );
}

// 今日の気分を取得
function getTodayMood() {
  const today = new Date().toISOString().split('T')[0];
  return userData.moods.find(mood => 
    mood.createdAt && mood.createdAt.split('T')[0] === today
  );
}

// ペンギンの状態を更新
function updatePenguinState() {
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
  coinAmount.textContent = userData.coins;
}

// 前回の訪問からの日数をチェック
function checkLastVisit() {
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
    userData.coins += 10; // デイリーログインボーナス
    
    // 7日達成で追加ボーナス
    if (userData.streakDays % 7 === 0) {
      userData.coins += 50;
      alert(`${userData.streakDays}日連続ログイン達成！特別ボーナスとして50コインプレゼント！`);
    } else {
      alert('今日も来てくれてありがとう〜！10コインプレゼント！');
    }
    
  } else if (diffDays > 1) {
    // 連続ログインが途切れた場合
    userData.streakDays = 1;
    userData.coins += 10; // デイリーログインボーナス
    
    if (diffDays >= 3) {
      // 3日以上空いた場合の特別メッセージ
      alert('おひさしぶり〜！会えて嬉しいよ〜！10コインプレゼント！');
    } else {
      alert('今日も来てくれてありがとう〜！10コインプレゼント！');
    }
  }
  
  // 最終訪問日時を更新
  userData.lastVisit = now.toISOString();
  saveUserData();
  updateCoinsDisplay();
}

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', initApp);