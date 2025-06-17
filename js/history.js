/* Copy from main history.js *//**
 * ペンペンアプリの履歴機能
 * 過去の気分記録とタスクを表示するためのスクリプト
 */

// 履歴管理オブジェクト
const HistoryManager = {
    // 履歴データ
    historyData: {
      moods: [],
      todos: []
    },
    
    // DOMエレメント
    elements: {
      historyContainer: null,
      historyList: null,
      historyFilter: null,
      historyEmpty: null,
      dateRangePicker: null,
    },
    
    // 初期化
    init: function() {
      // DOM要素の取得
      this.elements.historyContainer = document.getElementById('historyContainer');
      this.elements.historyList = document.getElementById('historyList');
      this.elements.historyFilter = document.getElementById('historyFilter');
      this.elements.historyEmpty = document.getElementById('historyEmpty');
      this.elements.dateRangePicker = document.getElementById('dateRangePicker');
      
      if (!this.elements.historyContainer) return;
      
      // イベントリスナーを設定
      if (this.elements.historyFilter) {
        this.elements.historyFilter.addEventListener('change', () => {
          this.renderHistory();
        });
      }
      
      if (this.elements.dateRangePicker) {
        this.elements.dateRangePicker.addEventListener('change', () => {
          this.renderHistory();
        });
      }
      
      // タブ切り替え時のイベント
      document.querySelectorAll('.tab-item').forEach(tab => {
        tab.addEventListener('click', (e) => {
          if (e.currentTarget.getAttribute('data-tab') === 'history') {
            this.loadHistoryData();
          }
        });
      });
    },
    
    // 履歴データの読み込み
    loadHistoryData: async function() {
      if (!userData.id || !supabaseClient) return;
      
      try {
        // 気分データを取得
        const { data: moods, error: moodsError } = await supabaseClient
          .from('moods')
          .select('*')
          .eq('user_id', userData.id)
          .order('created_at', { ascending: false });
        
        if (moodsError) throw moodsError;
        
        // タスクデータを取得
        const { data: todos, error: todosError } = await supabaseClient
          .from('todos')
          .select('*')
          .eq('user_id', userData.id)
          .order('created_at', { ascending: false });
        
        if (todosError) throw todosError;
        
        // データを保存
        this.historyData.moods = moods || [];
        this.historyData.todos = todos || [];
        
        // 履歴を表示
        this.renderHistory();
        
      } catch (error) {
        console.error('履歴データの読み込みエラー:', error);
      }
    },
    
    // 履歴の表示
    renderHistory: function() {
      if (!this.elements.historyList) return;
      
      // リストをクリア
      this.elements.historyList.innerHTML = '';
      
      // フィルター条件の取得
      const filterType = this.elements.historyFilter ? 
                        this.elements.historyFilter.value : 'all';
      
      // 日付範囲の取得
      let dateRange = 30; // デフォルトは30日
      if (this.elements.dateRangePicker) {
        dateRange = parseInt(this.elements.dateRangePicker.value, 10);
      }
      
      // 日付範囲の計算
      const now = new Date();
      const startDate = new Date();
      startDate.setDate(now.getDate() - dateRange);
      
      // 日付でフィルタリングされたデータ
      const filteredMoods = this.historyData.moods.filter(mood => 
        new Date(mood.created_at) >= startDate
      );
      
      const filteredTodos = this.historyData.todos.filter(todo => 
        new Date(todo.created_at) >= startDate
      );
      
      // 日付ごとにグループ化
      const groupedData = this.groupDataByDate(filteredMoods, filteredTodos);
      
      // 空の場合のメッセージ
      if (Object.keys(groupedData).length === 0) {
        if (this.elements.historyEmpty) {
          this.elements.historyEmpty.style.display = 'block';
        }
        return;
      } else if (this.elements.historyEmpty) {
        this.elements.historyEmpty.style.display = 'none';
      }
      
      // 日付ごとに表示
      Object.keys(groupedData).sort().reverse().forEach(date => {
        const dayData = groupedData[date];
        
        // フィルターに基づいて表示を決定
        let showItem = false;
        if (filterType === 'all' || 
           (filterType === 'moods' && dayData.moods.length > 0) || 
           (filterType === 'todos' && dayData.todos.length > 0)) {
          showItem = true;
        }
        
        if (!showItem) return;
        
        // 日付ヘッダーの作成
        const dateHeader = document.createElement('div');
        dateHeader.className = 'history-date';
        
        const displayDate = new Date(date);
        const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        dateHeader.textContent = displayDate.toLocaleDateString('ja-JP', dateOptions);
        
        this.elements.historyList.appendChild(dateHeader);
        
        // 気分の表示（フィルターに基づく）
        if (filterType === 'all' || filterType === 'moods') {
          dayData.moods.forEach(mood => {
            const moodItem = this.createMoodItem(mood);
            this.elements.historyList.appendChild(moodItem);
          });
        }
        
        // タスクの表示（フィルターに基づく）
        if (filterType === 'all' || filterType === 'todos') {
          dayData.todos.forEach(todo => {
            const todoItem = this.createTodoItem(todo);
            this.elements.historyList.appendChild(todoItem);
          });
        }
      });
    },
    
    // 日付ごとにデータをグループ化する
    groupDataByDate: function(moods, todos) {
      const groupedData = {};
      
      // 気分データのグループ化
      moods.forEach(mood => {
        const date = mood.created_at.split('T')[0];
        if (!groupedData[date]) {
          groupedData[date] = { moods: [], todos: [] };
        }
        groupedData[date].moods.push(mood);
      });
      
      // タスクデータのグループ化
      todos.forEach(todo => {
        const date = todo.created_at.split('T')[0];
        if (!groupedData[date]) {
          groupedData[date] = { moods: [], todos: [] };
        }
        groupedData[date].todos.push(todo);
      });
      
      return groupedData;
    },
    
    // 気分アイテムを作成
    createMoodItem: function(mood) {
      const moodItem = document.createElement('div');
      moodItem.className = 'history-item mood-history';
      
      // 気分に対応する絵文字
      let moodEmoji = '';
      let moodText = '';
      
      switch(mood.mood) {
        case 'happy':
          moodEmoji = '😊';
          moodText = 'うれしい';
          break;
        case 'normal':
          moodEmoji = '😌';
          moodText = 'ふつう';
          break;
        case 'tired':
          moodEmoji = '😓';
          moodText = 'つかれた';
          break;
        case 'sad':
          moodEmoji = '😢';
          moodText = 'かなしい';
          break;
        default:
          moodEmoji = '😐';
          moodText = '不明';
      }
      
      // 時刻のフォーマット
      const time = new Date(mood.created_at).toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      moodItem.innerHTML = `
        <div class="history-icon">${moodEmoji}</div>
        <div class="history-content">
          <div class="history-title">気分: ${moodText}</div>
          <div class="history-time">${time}</div>
          ${mood.comment ? `<div class="history-comment">${mood.comment}</div>` : ''}
        </div>
      `;
      
      return moodItem;
    },
    
    // タスクアイテムを作成
    createTodoItem: function(todo) {
      const todoItem = document.createElement('div');
      todoItem.className = `history-item todo-history ${todo.completed ? 'completed' : ''}`;
      
      // 時刻のフォーマット
      const time = new Date(todo.created_at).toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      todoItem.innerHTML = `
        <div class="history-icon">📝</div>
        <div class="history-content">
          <div class="history-title">${todo.text}</div>
          <div class="history-time">${time}</div>
          <div class="history-status">${todo.completed ? '完了' : '未完了'}</div>
        </div>
      `;
      
      return todoItem;
    }
  };
  
  // 履歴タブのHTMLを追加する関数
  function addHistoryTab() {
    // タブコンテナを取得
    const appScreen = document.getElementById('appScreen');
    if (!appScreen) return;
    
    // 履歴タブが既に存在するか確認
    if (document.getElementById('historyContainer')) return;
    
    // タブアイテムを追加
    const tabsContainer = appScreen.querySelector('.tabs-container');
    if (tabsContainer) {
      const historyTab = document.createElement('div');
      historyTab.className = 'tab-item';
      historyTab.setAttribute('data-tab', 'history');
      historyTab.innerHTML = `
        <span class="tab-icon">📊</span>
        <span class="tab-label">履歴</span>
      `;
      tabsContainer.appendChild(historyTab);
    }
    
    // 履歴コンテナを追加
    const historyContainer = document.createElement('div');
    historyContainer.id = 'historyContainer';
    historyContainer.className = 'history-container tab-content';
    
    historyContainer.innerHTML = `
      <div class="history-header">
        <h2 class="history-title">あなたの記録</h2>
        <div class="history-controls">
          <select id="historyFilter" class="history-filter">
            <option value="all">すべて</option>
            <option value="moods">気分のみ</option>
            <option value="todos">タスクのみ</option>
          </select>
          <select id="dateRangePicker" class="date-range-picker">
            <option value="7">1週間</option>
            <option value="30" selected>1ヶ月</option>
            <option value="90">3ヶ月</option>
            <option value="365">1年</option>
          </select>
        </div>
      </div>
      <div id="historyList" class="history-list"></div>
      <div id="historyEmpty" class="history-empty">
        <p>記録がありません。タスクや気分を記録してみましょう！</p>
        <img src="images/55b5453a51a444569199c2ab5b5d4e4a.png" alt="ペンペン" class="empty-penguin">
      </div>
    `;
    
    // アプリスクリーンに追加
    appScreen.appendChild(historyContainer);
    
    // スタイルを追加
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      /* 履歴画面のスタイル */
      .history-container {
        display: none;
        flex-direction: column;
        margin: 1rem 0;
      }
      
      .history-container.active {
        display: flex;
      }
      
      .history-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }
      
      .history-title {
        font-size: 1.2rem;
        color: var(--text-color);
        margin: 0;
      }
      
      .history-controls {
        display: flex;
        gap: 0.5rem;
      }
      
      .history-filter, .date-range-picker {
        padding: 0.5rem;
        border: 1px solid var(--light-gray);
        border-radius: 10px;
        background-color: var(--card-bg);
        color: var(--text-color);
        font-size: 0.9rem;
      }
      
      .history-list {
        background-color: var(--card-bg);
        border-radius: 20px;
        overflow: hidden;
        box-shadow: var(--box-shadow);
        padding: 0.5rem;
      }
      
      .history-date {
        padding: 1rem;
        font-weight: bold;
        background-color: rgba(106, 164, 217, 0.1);
        border-radius: 10px;
        margin: 0.5rem 0;
        color: var(--text-color);
      }
      
      .history-item {
        display: flex;
        padding: 0.8rem;
        border-bottom: 1px solid #f0f0f0;
        margin: 0.5rem 0;
        border-radius: 10px;
      }
      
      .history-icon {
        font-size: 1.5rem;
        margin-right: 1rem;
        display: flex;
        align-items: center;
      }
      
      .history-content {
        flex: 1;
      }
      
      .history-title {
        font-weight: bold;
        color: var(--text-color);
        margin-bottom: 0.3rem;
      }
      
      .history-time {
        font-size: 0.8rem;
        color: #888;
        margin-bottom: 0.3rem;
      }
      
      .history-comment {
        font-size: 0.9rem;
        color: var(--text-color);
        background-color: #f9f9f9;
        padding: 0.5rem;
        border-radius: 5px;
        margin-top: 0.5rem;
      }
      
      .history-status {
        font-size: 0.8rem;
        padding: 0.2rem 0.5rem;
        border-radius: 5px;
        display: inline-block;
      }
      
      .todo-history.completed .history-status {
        background-color: var(--success-color);
        color: white;
      }
      
      .todo-history:not(.completed) .history-status {
        background-color: var(--light-gray);
        color: var(--text-color);
      }
      
      .mood-history {
        background-color: rgba(240, 167, 120, 0.1);
      }
      
      .todo-history {
        background-color: rgba(106, 164, 217, 0.1);
      }
      
      .history-empty {
        text-align: center;
        padding: 2rem;
        background-color: var(--card-bg);
        border-radius: 20px;
        box-shadow: var(--box-shadow);
        margin-top: 1rem;
      }
      
      .empty-penguin {
        width: 100px;
        height: 100px;
        object-fit: contain;
        margin-top: 1rem;
      }
    `;
    
    document.head.appendChild(styleElement);
  }
  
  // ページ読み込み後に履歴タブを追加
  document.addEventListener('DOMContentLoaded', () => {
    // タブの切り替え機能が読み込まれた後に実行
    setTimeout(() => {
      addHistoryTab();
      HistoryManager.init();
    }, 500);
  });