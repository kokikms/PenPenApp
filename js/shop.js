/* Copy from main shop.js *//**
 * ペンペンアプリのショップ機能
 * アイテムの購入・装備を管理するスクリプト
 */

// ショップ管理オブジェクト
const ShopManager = {
    // 商品データ
    shopItems: [],
    
    // ユーザーのアイテム
    userItems: [],
    
    // DOMエレメント
    elements: {
      shopContainer: null,
      shopItems: null,
      coinDisplay: null,
      islandPenguin: null
    },
    
    // 初期化
    init: function() {
      // DOM要素の取得
      this.elements.shopContainer = document.querySelector('.island-shop');
      this.elements.coinDisplay = document.getElementById('coinAmount');
      this.elements.islandPenguin = document.getElementById('islandPenguin');
      
      if (!this.elements.shopContainer) return;
      
      // ショップデータの読み込み
      this.loadShopData();
      
      // 島表示切替イベントリスナー
      document.querySelector('.island-status')?.addEventListener('click', () => {
        const islandContainer = document.getElementById('islandContainer');
        if (islandContainer) {
          const isActive = islandContainer.classList.toggle('active');
          
          // アクティブになった場合のみデータを更新
          if (isActive) {
            this.refreshShopItems();
          }
        }
      });
    },
    
    // ショップデータの読み込み
    loadShopData: async function() {
      if (!supabaseClient) return;
      
      try {
        // アイテムデータを取得
        const { data: items, error: itemsError } = await supabaseClient
          .from('items')
          .select('*')
          .eq('is_available', true)
          .order('price', { ascending: true });
        
        if (itemsError) throw itemsError;
        
        if (items) {
          this.shopItems = items;
        }
        
        // ユーザーのアイテムを取得
        if (userData.id) {
          this.loadUserItems();
        }
        
      } catch (error) {
        console.error('ショップデータの読み込みエラー:', error);
      }
    },
    
    // ユーザーのアイテムを読み込む
    loadUserItems: async function() {
      if (!supabaseClient || !userData.id) return;
      
      try {
        const { data: userItems, error: userItemsError } = await supabaseClient
          .from('user_items')
          .select('*, items(*)')
          .eq('user_id', userData.id);
        
        if (userItemsError) throw userItemsError;
        
        if (userItems) {
          this.userItems = userItems;
          userData.items = userItems;
          
          // ショップ表示を更新
          this.renderShopItems();
          
          // 装備中のアイテムを適用
          this.applyEquippedItems();
        }
        
      } catch (error) {
        console.error('ユーザーアイテムの読み込みエラー:', error);
      }
    },
    
    // ショップアイテムを表示
    renderShopItems: function() {
      if (!this.elements.shopContainer) return;
      
      // 既存のアイテムをクリア
      this.elements.shopContainer.innerHTML = '';
      
      // アイテムを表示
      this.shopItems.forEach(item => {
        const isOwned = this.userItems.some(userItem => 
          userItem.item_id === item.id
        );
        
        const isEquipped = this.userItems.some(userItem => 
          userItem.item_id === item.id && userItem.is_equipped
        );
        
        const canAfford = userData.coins >= item.price;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'shop-item';
        
        itemElement.innerHTML = `
          <img src="${item.image_url || 'images/Whisk_normal_1.jpg'}" 
               alt="${item.name}" class="shop-item-img">
          <div class="shop-item-name">${item.name}</div>
          <div class="shop-item-price">${item.price}コイン</div>
          <button class="shop-item-btn ${isOwned ? 'owned' : ''} ${!isOwned && !canAfford ? 'insufficient' : ''}">
            ${isEquipped ? '着用中' : isOwned ? '着用する' : 'コインが足りません'}
          </button>
        `;
        
        // ボタンにイベントリスナーを追加
        const button = itemElement.querySelector('.shop-item-btn');
        
        if (isOwned) {
          // 既に所持している場合は装備切り替え
          button.textContent = isEquipped ? '着用中' : '着用する';
          button.addEventListener('click', () => {
            if (!isEquipped) {
              this.equipItem(item.id);
            }
          });
        } else if (canAfford) {
          // 購入可能な場合
          button.textContent = '購入する';
          button.classList.remove('insufficient');
          button.addEventListener('click', () => {
            this.purchaseItem(item.id, item.price);
          });
        }
        
        this.elements.shopContainer.appendChild(itemElement);
      });
    },
    
    // アイテムの購入
    purchaseItem: async function(itemId, price) {
      if (!supabaseClient || !userData.id) return;
      
      // コインが足りるか確認
      if (userData.coins < price) {
        alert('コインが足りません！もっとタスクをこなしてコインを集めよう！');
        return;
      }
      
      try {
        // トランザクション的な処理のため、順番に実行
        
        // 1. コインを減らす
        userData.coins -= price;
        
        // 2. user_itemsテーブルに追加
        const { data: newItem, error: insertError } = await supabaseClient
          .from('user_items')
          .insert([{
            user_id: userData.id,
            item_id: itemId,
            is_equipped: false,
            purchased_at: new Date().toISOString()
          }])
          .select();
        
        if (insertError) throw insertError;
        
        // 3. プロフィールのコイン数を更新
        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update({ 
            coins: userData.coins,
            updated_at: new Date().toISOString()
          })
          .eq('id', userData.id);
        
        if (updateError) throw updateError;
        
        // 成功時の処理
        alert('アイテムを購入しました！');
        
        // ユーザーアイテムを更新
        if (newItem) {
          this.userItems.push(newItem[0]);
          userData.items.push(newItem[0]);
        }
        
        // コイン表示を更新
        if (this.elements.coinDisplay) {
          this.elements.coinDisplay.textContent = userData.coins;
        }
        
        // ショップを再描画
        this.loadUserItems();
        
      } catch (error) {
        console.error('アイテム購入エラー:', error);
        alert('購入に失敗しました。もう一度お試しください。');
        
        // エラー時は元に戻す
        userData.coins += price;
        if (this.elements.coinDisplay) {
          this.elements.coinDisplay.textContent = userData.coins;
        }
      }
    },
    
    // アイテムの装備
    equipItem: async function(itemId) {
      if (!supabaseClient || !userData.id) return;
      
      try {
        // まず、同じカテゴリのアイテムをすべて非装備にする
        const targetItem = this.userItems.find(item => item.item_id === itemId);
        if (!targetItem || !targetItem.items) return;
        
        const category = targetItem.items.category;
        
        // カテゴリが同じアイテムのIDを取得
        const sameCategory = this.userItems
          .filter(item => item.items && item.items.category === category)
          .map(item => item.id);
        
        // 一度すべて非装備にする
        if (sameCategory.length > 0) {
          const { error: unequipError } = await supabaseClient
            .from('user_items')
            .update({ is_equipped: false })
            .in('id', sameCategory);
          
          if (unequipError) throw unequipError;
        }
        
        // 選択したアイテムを装備状態にする
        const { error: equipError } = await supabaseClient
          .from('user_items')
          .update({ is_equipped: true })
          .eq('id', targetItem.id);
        
        if (equipError) throw equipError;
        
        // 成功メッセージ
        alert(`${targetItem.items.name}を装備しました！`);
        
        // 装備状態を更新
        this.userItems.forEach(item => {
          if (sameCategory.includes(item.id)) {
            item.is_equipped = false;
          }
          if (item.id === targetItem.id) {
            item.is_equipped = true;
          }
        });
        
        // 見た目を更新
        this.applyEquippedItems();
        
        // ショップを再描画
        this.renderShopItems();
        
      } catch (error) {
        console.error('アイテム装備エラー:', error);
        alert('装備の変更に失敗しました。もう一度お試しください。');
      }
    },
    
    // 装備中のアイテムを適用
    applyEquippedItems: function() {
      if (!this.elements.islandPenguin) return;
      
      // 装備中のアイテムを取得
      const equippedItems = this.userItems.filter(item => item.is_equipped);
      
      // 最優先のアイテムを特定
      let priorityItem = null;
      
      // アクセサリーカテゴリを優先
      const accessory = equippedItems.find(item => 
        item.items && item.items.category === 'accessory'
      );
      
      if (accessory) {
        priorityItem = accessory;
      }
      
      // 装備中アイテムがある場合、ペンギンの見た目を変更
      if (priorityItem && priorityItem.items) {
        this.elements.islandPenguin.src = priorityItem.items.image_url || 'images/Whisk_normal_1.jpg';
      } else {
        // デフォルトの姿に戻す
        this.elements.islandPenguin.src = 'images/Whisk_normal_1.jpg';
      }
    },
    
    // ショップ表示を更新
    refreshShopItems: function() {
      this.loadUserItems();
    }
  };
  
  // 島の機能を改善する関数
  function enhanceIslandFeature() {
    const islandContainer = document.getElementById('islandContainer');
    const islandScene = document.querySelector('.island-scene');
    
    if (!islandContainer || !islandScene) return;
    
    // 島の背景画像をレベルに応じて変更
    function updateIslandBackground() {
      const level = userData.islandLevel || 1;
      
      // レベルに応じた背景
      let backgroundStyle = '';
      
      switch(true) {
        case (level >= 5):
          backgroundStyle = 'background-color: #e8f4ff; background-image: linear-gradient(to bottom, #b2d8ff 0%, #e8f4ff 100%);';
          break;
        case (level >= 4):
          backgroundStyle = 'background-color: #e8f4ff; background-image: linear-gradient(to bottom, #c2e0ff 0%, #e8f4ff 100%);';
          break;
        case (level >= 3):
          backgroundStyle = 'background-color: #e8f4ff; background-image: linear-gradient(to bottom, #d2e9ff 0%, #e8f4ff 100%);';
          break;
        case (level >= 2):
          backgroundStyle = 'background-color: #e8f4ff; background-image: linear-gradient(to bottom, #e2f2ff 0%, #e8f4ff 100%);';
          break;
        default:
          backgroundStyle = 'background-color: #e8f4ff;';
      }
      
      islandScene.setAttribute('style', backgroundStyle);
      
      // レベルに応じた装飾要素を追加
      islandScene.innerHTML = '';
      
      // ペンギンを配置
      const penguin = document.createElement('img');
      penguin.id = 'islandPenguin';
      penguin.className = 'island-penguin walking';
      penguin.src = 'images/Whisk_normal_1.jpg';
      penguin.alt = 'ペンペン';
      islandScene.appendChild(penguin);
      
      // レベル2以上: 小さな植物
      if (level >= 2) {
        addIslandElement('🌱', '10%', '80%', 0.8);
        addIslandElement('🌱', '30%', '85%', 0.7);
        addIslandElement('🌱', '70%', '82%', 0.9);
      }
      
      // レベル3以上: 木が育つ
      if (level >= 3) {
        addIslandElement('🌳', '15%', '70%', 1);
        addIslandElement('🌳', '85%', '75%', 1.2);
        addIslandElement('⛱️', '60%', '80%', 0.8);
      }
      
      // レベル4以上: 家が建つ
      if (level >= 4) {
        addIslandElement('🏠', '75%', '70%', 1.5);
        addIslandElement('🪑', '45%', '80%', 0.7);
      }
      
      // レベル5以上: 仲間登場
      if (level >= 5) {
        addIslandElement('🦭', '25%', '80%', 1);
        addIslandElement('🐦', '55%', '65%', 0.7);
        addIslandElement('🚩', '5%', '75%', 1.2);
      }
    }
    
    // 島に要素を追加する関数
    function addIslandElement(emoji, left, bottom, scale) {
      const element = document.createElement('div');
      element.className = 'island-element';
      element.textContent = emoji;
      element.style.position = 'absolute';
      element.style.left = left;
      element.style.bottom = bottom;
      element.style.fontSize = `${scale * 2}rem`;
      element.style.zIndex = Math.floor(parseFloat(bottom) / 10);
      islandScene.appendChild(element);
    }
    
    // タブ切り替え時に島の表示を更新
    document.querySelector('.island-status')?.addEventListener('click', () => {
      updateIslandBackground();
    });
    
    // 初期状態でも一度更新
    updateIslandBackground();
    
    // スタイルを追加
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      /* 島の要素のアニメーション */
      .island-element {
        transition: transform 0.5s ease;
      }
      
      .island-element:hover {
        transform: translateY(-5px);
      }
      
      /* レベルに応じた島の見た目 */
      .island-scene {
        transition: background-color 1s ease;
        overflow: hidden;
      }
    `;
    
    document.head.appendChild(styleElement);
  }
  
  // ページ読み込み後に初期化
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      enhanceIslandFeature();
      ShopManager.init();
      // 島アイコンで島画面遷移
      const islandNavBtn = document.getElementById('islandNavBtn');
      const islandContainer = document.getElementById('islandContainer');
      const tabContentArea = document.getElementById('tabContentArea');
      const penguinContainer = document.querySelector('.penguin-container');
      const tabNav = document.querySelector('.tab-nav');
      const islandStatus = document.querySelector('.island-status');
      const headerTitle = document.querySelector('header h1');
      if (headerTitle) headerTitle.style.fontSize = '1.1rem';
      if (islandNavBtn && islandContainer) {
        function switchToIsland() {
          islandContainer.style.display = 'block';
          if (tabContentArea) tabContentArea.style.display = 'none';
          if (penguinContainer) penguinContainer.style.display = 'none';
          if (tabNav) tabNav.style.display = 'none';
          if (islandStatus) islandStatus.style.display = 'none';
          // アイコンをホームに切り替え
          islandNavBtn.id = 'homeNavBtn';
          islandNavBtn.title = 'ホームに戻る';
          islandNavBtn.innerHTML = '<span class="tab-icon">🏠</span>';
          islandNavBtn.removeEventListener('click', switchToIsland);
          islandNavBtn.addEventListener('click', switchToHome);
        }
        function switchToHome() {
          islandContainer.style.display = 'none';
          if (tabContentArea) tabContentArea.style.display = '';
          if (penguinContainer) penguinContainer.style.display = '';
          if (tabNav) tabNav.style.display = '';
          if (islandStatus) islandStatus.style.display = '';
          // アイコンを島に戻す
          const homeBtn = document.getElementById('homeNavBtn');
          if (homeBtn) {
            homeBtn.id = 'islandNavBtn';
            homeBtn.title = '島を見る';
            homeBtn.innerHTML = '<span class="tab-icon">🏝️</span>';
            homeBtn.removeEventListener('click', switchToHome);
            homeBtn.addEventListener('click', switchToIsland);
          }
        }
        islandNavBtn.addEventListener('click', switchToIsland);
      }
    }, 500);
  });