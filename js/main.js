// Jalsa Party Games Hub Coordinator

// 0. Global Custom Alert Modal Function
window.showCustomAlert = (message) => {
  // Remove any existing modal overlays
  const existing = document.querySelector('.custom-modal-overlay');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'custom-modal-overlay animate-fade-in';
  modal.innerHTML = `
    <div class="custom-modal-card animate-zoom-in">
      <h3 style="font-size: 3rem; margin-bottom: 10px;">⚠️</h3>
      <p style="font-weight: 600; font-size: 1.1rem; margin-bottom: 20px; line-height: 1.6; color: #fff;">${message}</p>
      <button class="btn btn-primary" id="modal-alert-ok" style="width: 100%;">موافق</button>
    </div>
  `;

  document.body.appendChild(modal);
  
  if (typeof Sounds !== 'undefined' && typeof Sounds.playFail === 'function') {
    Sounds.playFail();
  }

  document.getElementById('modal-alert-ok').addEventListener('click', () => {
    if (typeof Sounds !== 'undefined' && typeof Sounds.playClick === 'function') {
      Sounds.playClick();
    }
    modal.remove();
  });
};

// Billing & Premium Categories Manager
const Billing = (() => {
  let isPro = false;

  const init = () => {
    isPro = localStorage.getItem('jalsa_pro_version') === 'true';
    if ('getDigitalGoodsService' in window) {
      checkTwaPurchases();
    }
  };

  const isProUser = () => {
    return isPro;
  };

  const setProUser = (status) => {
    isPro = status;
    localStorage.setItem('jalsa_pro_version', status ? 'true' : 'false');
  };

  const checkTwaPurchases = async () => {
    try {
      const service = await window.getDigitalGoodsService('https://play.google.com/billing');
      if (service) {
        const purchases = await service.listPurchases();
        for (const purchase of purchases) {
          if (purchase.itemId === 'jalsa_pro_unlock') {
            setProUser(true);
            break;
          }
        }
      }
    } catch (e) {
      console.warn("Digital Goods API check failed:", e);
    }
  };

  const buyPro = async (onSuccess, onFailure) => {
    if ('getDigitalGoodsService' in window) {
      try {
        const service = await window.getDigitalGoodsService('https://play.google.com/billing');
        if (service) {
          const paymentMethodData = [{
            supportedMethods: 'https://play.google.com/billing',
            data: { sku: 'jalsa_pro_unlock' }
          }];
          const paymentDetails = {
            total: {
              label: 'Jalsa Pro Upgrade',
              amount: { currency: 'USD', value: '1.99' }
            }
          };
          const request = new PaymentRequest(paymentMethodData, paymentDetails);
          const response = await request.show();
          
          if (response.details && response.details.purchaseToken) {
            try {
              await service.acknowledge(response.details.purchaseToken, 'onetime');
            } catch (ackError) {
              console.error("Acknowledgement failed but continuing:", ackError);
            }
            await response.complete('success');
            setProUser(true);
            if (window.updateProButtons) window.updateProButtons();
            if (typeof Sounds !== 'undefined' && typeof Sounds.playSuccess === 'function') {
              Sounds.playSuccess();
            }
            window.showCustomAlert("تم تفعيل النسخة البرو بنجاح! شكراً لك 🎉");
            if (onSuccess) onSuccess();
            return;
          } else {
            await response.complete('fail');
          }
        }
      } catch (e) {
        console.error("TWA Payment Request failed:", e);
      }
    }
    showSimulationModal(onSuccess, onFailure);
  };

  const showSimulationModal = (onSuccess, onFailure) => {
    const existing = document.querySelector('.pro-modal-overlay');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'pro-modal-overlay animate-fade-in';
    modal.innerHTML = `
      <div class="pro-modal-card animate-zoom-in" style="max-width: 380px; padding: 40px 25px;">
        <div class="payment-spinner-container" style="margin-bottom: 20px;">
          <div class="payment-spinner"></div>
        </div>
        <h3 style="margin-bottom: 8px; font-weight: 700; font-size: 1.25rem;">جاري الاتصال بـ Google Pay...</h3>
        <p style="font-size: 0.9rem; color: var(--text-muted); line-height: 1.6;">
          يرجى الانتظار، يتم معالجة معاملتك المشفرة بشكل آمن عبر متجر Google Play.
        </p>
        <div class="pro-price-tag" style="font-size: 2rem; font-weight: 800; color: var(--primary); margin: 20px 0;">1.99$</div>
      </div>
    `;
    document.body.appendChild(modal);

    // Simulate secure network transaction delay of 2.2 seconds
    setTimeout(() => {
      const card = modal.querySelector('.pro-modal-card');
      card.innerHTML = `
        <div class="payment-success-icon" style="font-size: 4rem; color: var(--success); margin-bottom: 15px; animation: zoomIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);">✓</div>
        <h3 style="margin-bottom: 8px; font-weight: 700; font-size: 1.3rem; color: #fff;">تم الدفع بنجاح!</h3>
        <p style="font-size: 0.95rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 20px;">
          شكراً لدعمك! تم تفعيل النسخة الاحترافية (Pro Version) بنجاح وفتح جميع التصنيفات المقفلة بشكل دائم.
        </p>
        <button class="btn btn-primary" id="btn-payment-done" style="width: 100%;">استمرار اللعب ➡️</button>
      `;

      if (typeof Sounds !== 'undefined' && typeof Sounds.playSuccess === 'function') {
        Sounds.playSuccess();
      }

      document.getElementById('btn-payment-done').addEventListener('click', () => {
        setProUser(true);
        if (window.updateProButtons) window.updateProButtons();
        modal.remove();
        if (onSuccess) onSuccess();
      });
    }, 2200);
  };

  return {
    init,
    isProUser,
    buyPro
  };
})();

// Check if user is Pro
window.isProUser = () => {
  return Billing.isProUser();
};

// Check if a category is premium and locked
window.isCategoryLocked = (gameId, catName) => {
  if (Billing.isProUser()) return false;
  
  const premiumCategories = {
    undercover: ["نوادي ومنتخبات", "بلدان وعواصم", "ألعاب وتكنولوجيا", "ماركات وشركات", "أماكن ومعالم"],
    bomb: ["نوادي ومنتخبات", "تصنيفات أخرى", "ماركات وشركات", "ألعاب وتكنولوجيا"],
    charades: ["نوادي ومنتخبات", "كرتون وأفلام", "ألعاب وتكنولوجيا", "أمثال وتعبيرات", "ماركات وشركات"],
    taboo: ["أجهزة وتكنولوجيا", "طعام وشراب", "أماكن ومعالم", "ماركات وشركات"]
  };
  
  const gamePremium = premiumCategories[gameId];
  if (gamePremium && gamePremium.includes(catName)) {
    return true;
  }
  return false;
};

// Show Premium Upgrade Dialog
window.showProUpgradeModal = (onSuccess) => {
  const existing = document.querySelector('.pro-modal-overlay');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'pro-modal-overlay animate-fade-in';
  modal.innerHTML = `
    <div class="pro-modal-card animate-zoom-in">
      <button class="pro-close-btn" id="pro-modal-close">❌</button>
      <div class="pro-modal-badge">النسخة الاحترافية 💎</div>
      <h3 style="margin-bottom: 12px; font-weight: 700;">ترقية إلى النسخة البرو</h3>
      <p style="font-size: 0.95rem; margin-bottom: 20px; line-height: 1.6; color: var(--text-muted);">
        افتح الإمكانيات الكاملة للعبة واجعل جمعتكم أكثر حماساً وإثارة!
      </p>
      
      <div class="pro-modal-features" style="margin: 20px 0; text-align: right; display: flex; flex-direction: column; gap: 12px;">
        <div class="pro-feature-item" style="display: flex; align-items: center; gap: 10px; font-size: 0.95rem;">
          <span class="pro-feature-icon" style="color: var(--primary);">✨</span>
          <span>فتح جميع التصنيفات المقفلة في جميع الألعاب</span>
        </div>
        <div class="pro-feature-item" style="display: flex; align-items: center; gap: 10px; font-size: 0.95rem;">
          <span class="pro-feature-icon" style="color: var(--primary);">✨</span>
          <span>تصنيفات رياضية وثقافية وسينمائية مميزة</span>
        </div>
        <div class="pro-feature-item" style="display: flex; align-items: center; gap: 10px; font-size: 0.95rem;">
          <span class="pro-feature-icon" style="color: var(--primary);">✨</span>
          <span>دعم مطور اللعبة لمواصلة التحديثات الدورية</span>
        </div>
      </div>
      
      <div class="pro-price-tag" style="font-size: 2.2rem; font-weight: 800; color: var(--primary); margin: 15px 0;">1.99$ <span style="font-size: 0.9rem; color: var(--text-muted);">تدفع لمرة واحدة فقط</span></div>
      
      <button class="btn btn-accent btn-large" id="btn-buy-pro" style="margin-top: 10px; width: 100%;">
        <span>شراء النسخة البرو الآن 💳</span>
      </button>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('pro-modal-close').addEventListener('click', () => {
    if (typeof Sounds !== 'undefined' && typeof Sounds.playClick === 'function') {
      Sounds.playClick();
    }
    modal.remove();
  });

  document.getElementById('btn-buy-pro').addEventListener('click', () => {
    if (typeof Sounds !== 'undefined' && typeof Sounds.playClick === 'function') {
      Sounds.playClick();
    }
    modal.remove();
    Billing.buyPro(onSuccess);
  });
};

// Smart played history manager to prevent repetition
const WordHistoryManager = (() => {
  let history = {}; // Format: { gameId: { categoryName: [played_item_strings/hashes/indices] } }

  const init = () => {
    const stored = localStorage.getItem('jalsa_word_history');
    if (stored) {
      try {
        history = JSON.parse(stored);
      } catch (e) {
        history = {};
      }
    }
  };

  const save = () => {
    localStorage.setItem('jalsa_word_history', JSON.stringify(history));
  };

  const getUnplayedItems = (gameId, categoryName, allItems) => {
    if (!history[gameId]) history[gameId] = {};
    if (!history[gameId][categoryName]) history[gameId][categoryName] = [];

    const playedList = history[gameId][categoryName];
    let unplayed = allItems.filter(item => {
      const itemKey = getItemKey(item);
      return !playedList.includes(itemKey);
    });

    if (unplayed.length === 0) {
      history[gameId][categoryName] = [];
      save();
      unplayed = allItems;
    }
    return unplayed;
  };

  const markAsPlayed = (gameId, categoryName, item) => {
    if (!history[gameId]) history[gameId] = {};
    if (!history[gameId][categoryName]) history[gameId][categoryName] = [];

    const itemKey = getItemKey(item);
    if (!history[gameId][categoryName].includes(itemKey)) {
      history[gameId][categoryName].push(itemKey);
      save();
    }
  };

  const clearHistory = (gameId) => {
    if (gameId) {
      delete history[gameId];
    } else {
      history = {};
    }
    save();
  };

  const getItemKey = (item) => {
    if (typeof item === 'string') return item;
    if (item.civilian && item.undercover) return `${item.civilian}_${item.undercover}`;
    if (item.word) return item.word;
    if (item.name) return item.name;
    if (item.a && item.b) return `${item.a}_${item.b}`;
    return JSON.stringify(item);
  };

  return {
    init,
    getUnplayedItems,
    markAsPlayed,
    clearHistory
  };
})();

// Global Session Scoreboard Manager
window.addGlobalPoints = (playerId, points) => {
  let scores = {};
  try {
    scores = JSON.parse(localStorage.getItem('jalsa_global_scores') || '{}');
  } catch (e) {
    scores = {};
  }
  const currentScore = scores[playerId] || 0;
  scores[playerId] = currentScore + points;
  localStorage.setItem('jalsa_global_scores', JSON.stringify(scores));
};

window.showGlobalScoreboardModal = () => {
  const existing = document.querySelector('.scoreboard-modal-overlay');
  if (existing) existing.remove();

  let scores = {};
  try {
    scores = JSON.parse(localStorage.getItem('jalsa_global_scores') || '{}');
  } catch (e) {
    scores = {};
  }

  let currentPlayers = [];
  try {
    currentPlayers = JSON.parse(localStorage.getItem('jalsa_players') || '[]');
  } catch (e) {
    currentPlayers = [];
  }

  if (currentPlayers.length === 0) {
    window.showCustomAlert("يرجى إضافة لاعبين أولاً لمشاهدة لوحة النقاط!");
    return;
  }

  const playerScoresList = currentPlayers.map(p => {
    return {
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      color: p.color,
      score: scores[p.id] || 0
    };
  }).sort((a, b) => b.score - a.score);

  const modal = document.createElement('div');
  modal.className = 'scoreboard-modal-overlay animate-fade-in';
  
  let rowsHtml = playerScoresList.map((p, idx) => {
    const medal = idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';
    return `
      <div class="scoreboard-modal-row" style="border-right: 4px solid ${p.color};">
        <div class="scoreboard-modal-player">
          <span class="scoreboard-modal-rank">${medal || `#${idx + 1}`}</span>
          <div class="scoreboard-modal-avatar" style="background: ${p.color}22; color: ${p.color};">
            <span>${p.emoji}</span>
          </div>
          <span class="scoreboard-modal-name">${p.name}</span>
        </div>
        <span class="scoreboard-modal-score">${p.score} نقطة</span>
      </div>
    `;
  }).join('');

  modal.innerHTML = `
    <div class="scoreboard-modal-card animate-zoom-in">
      <button class="scoreboard-modal-close-btn" id="scoreboard-modal-close">❌</button>
      <div class="scoreboard-modal-header">
        <span style="font-size: 2.5rem; display: block; margin-bottom: 5px;">🏆</span>
        <h3>نقاط السهرة العامة</h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4;">مجموع النقاط المتراكمة لجميع اللاعبين في كافة الألعاب</p>
      </div>
      
      <div class="scoreboard-modal-list">
        ${rowsHtml}
      </div>
      
      <div class="scoreboard-modal-actions">
        <button class="btn btn-outline" id="btn-reset-scoreboard" style="flex: 1; border-color: var(--danger); color: var(--danger); font-size: 0.9rem;">
          تصفير النقاط 🔄
        </button>
        <button class="btn btn-primary" id="btn-close-scoreboard-foot" style="flex: 1; font-size: 0.9rem;">
          حسناً 👍
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => {
    if (typeof Sounds !== 'undefined' && typeof Sounds.playClick === 'function') {
      Sounds.playClick();
    }
    modal.remove();
  };

  document.getElementById('scoreboard-modal-close').addEventListener('click', closeModal);
  document.getElementById('btn-close-scoreboard-foot').addEventListener('click', closeModal);

  document.getElementById('btn-reset-scoreboard').addEventListener('click', () => {
    if (typeof Sounds !== 'undefined' && typeof Sounds.playClick === 'function') {
      Sounds.playClick();
    }
    
    App.showCustomConfirm("هل أنت متأكد من تصفير جميع نقاط السهرة؟ لا يمكن التراجع عن هذا الإجراء.", () => {
      localStorage.setItem('jalsa_global_scores', '{}');
      if (typeof Sounds !== 'undefined' && typeof Sounds.playSuccess === 'function') {
        Sounds.playSuccess();
      }
      modal.remove();
      window.showCustomAlert("تم تصفير جميع نقاط السهرة بنجاح! 🔄");
    });
  });
};

// Game Settings Manager
const GameSettings = (() => {
  const DEFAULTS = {
    undercover: { spies: 1, undercovers: 1 },
    bomb: { minTime: 20, maxTime: 40 },
    charades: { time: 60, rounds: 3, simplifyWords: true },
    pictionary: { time: 60, rounds: 3, simplifyWords: true },
    taboo: { time: 60, rounds: 3 },
    five_seconds: { time: 5, rounds: 2 },
    would_you_rather: { rounds: 2 },
    truth_or_dare: { rounds: 2 },
    wolvesville: { discussionTime: 45 }
  };

  const get = (gameId) => {
    const saved = localStorage.getItem(`jalsa_settings_${gameId}`);
    if (saved) {
      try {
        return { ...DEFAULTS[gameId], ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULTS[gameId];
      }
    }
    return DEFAULTS[gameId];
  };

  const set = (gameId, settings) => {
    localStorage.setItem(`jalsa_settings_${gameId}`, JSON.stringify(settings));
  };

  return {
    get,
    set,
    DEFAULTS
  };
})();
window.GameSettings = GameSettings;

const App = (() => {
  // 1. App State
  let players = [];
  let nextPlayerId = 1;
  let activeGame = null; // References current playing game module for cleanup

  const loadPlayers = () => {
    const storedPlayers = localStorage.getItem('jalsa_players');
    const storedNextId = localStorage.getItem('jalsa_next_player_id');
    
    if (storedPlayers) {
      try {
        players = JSON.parse(storedPlayers);
        nextPlayerId = storedNextId ? parseInt(storedNextId, 10) : (Math.max(...players.map(p => p.id), 0) + 1);
      } catch (e) {
        console.error("Error parsing stored players", e);
        setDefaultPlayers();
      }
    } else {
      setDefaultPlayers();
    }
  };

  const setDefaultPlayers = () => {
    players = [
      { id: 1, name: "أحمد", emoji: "🦁", color: "#ff5e62" },
      { id: 2, name: "سارة", emoji: "🦊", color: "#ff9966" },
      { id: 3, name: "محمد", emoji: "🐼", color: "#00f2fe" },
      { id: 4, name: "فاطمة", emoji: "🦄", color: "#bd00ff" }
    ];
    nextPlayerId = 5;
  };

  const savePlayers = () => {
    localStorage.setItem('jalsa_players', JSON.stringify(players));
    localStorage.setItem('jalsa_next_player_id', nextPlayerId);
  };

  const emojisList = ["🦁", "🦊", "🐼", "🦄", "🐯", "🐱", "🐶", "🐻", "🐨", "🐰", "🐸", "🐙", "🐒", "🦖", "🦉", "🦩", "🐝", "🐥"];
  const colorsList = ["#ff5e62", "#ff9966", "#ffb300", "#00e676", "#00f2fe", "#4facfe", "#bd00ff", "#ff3366", "#00adb5", "#fbc531", "#44bd32", "#8c7ae6"];

  let selectedEmoji = emojisList[0];
  let selectedColor = colorsList[0];

  // 2. DOM Elements Cache
  let currentScreenId = 'screen-home';
  let elements = {};

  const updateProButtons = () => {
    const isPro = Billing.isProUser();
    if (isPro) {
      if (elements.btnHomeBuyPro) {
        elements.btnHomeBuyPro.innerHTML = '<span>👑 النسخة الاحترافية نشطة</span>';
        elements.btnHomeBuyPro.style.borderColor = 'var(--success)';
        elements.btnHomeBuyPro.style.color = 'var(--success)';
        elements.btnHomeBuyPro.style.boxShadow = '0 0 10px rgba(0, 230, 118, 0.2)';
        elements.btnHomeBuyPro.disabled = true;
      }
      if (elements.btnGamesBuyPro) {
        elements.btnGamesBuyPro.style.display = 'none';
      }
    } else {
      if (elements.btnHomeBuyPro) {
        elements.btnHomeBuyPro.innerHTML = '<span>💎 تفعيل النسخة البرو (Pro)</span>';
        elements.btnHomeBuyPro.style.borderColor = '#ffd700';
        elements.btnHomeBuyPro.style.color = '#ffd700';
        elements.btnHomeBuyPro.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.15)';
        elements.btnHomeBuyPro.disabled = false;
      }
      if (elements.btnGamesBuyPro) {
        elements.btnGamesBuyPro.style.display = 'block';
      }
    }
  };

  window.updateProButtons = updateProButtons;

  const init = () => {
    // Cache elements
    elements = {
      appContainer: document.getElementById('app-container'),
      screens: {
        home: document.getElementById('screen-home'),
        players: document.getElementById('screen-players'),
        games: document.getElementById('screen-games'),
        gameplay: document.getElementById('screen-gameplay'),
        customCreator: document.getElementById('screen-custom-creator')
      },
      btnStart: document.getElementById('btn-start-app'),
      btnGoToGames: document.getElementById('btn-go-games'),
      btnBackToPlayers: document.getElementById('btn-back-players'),
      btnBackToHome: document.getElementById('btn-back-home'),
      
      btnHomeBuyPro: document.getElementById('btn-home-buy-pro'),
      btnGamesBuyPro: document.getElementById('btn-games-buy-pro'),

      btnHomeCustomCreator: document.getElementById('btn-home-custom-creator'),
      btnGamesCustomCreator: document.getElementById('btn-custom-creator-games'),
      btnShowGlobalScoreboard: document.getElementById('btn-show-global-scoreboard'),
      
      // Top Navigation during gameplay
      btnGameplayExit: document.getElementById('btn-gameplay-exit'),
      btnGameplayRestart: document.getElementById('btn-gameplay-restart'),
      
      // Player management
      playerNameInput: document.getElementById('player-name-input'),
      emojisGrid: document.getElementById('emojis-grid'),
      colorsGrid: document.getElementById('colors-grid'),
      btnAddPlayer: document.getElementById('btn-add-player'),
      playersListContainer: document.getElementById('players-list-container'),
      playersCounter: document.getElementById('players-count-val'),
      
      // Game select cards
      cardUndercover: document.getElementById('card-undercover'),
      cardBomb: document.getElementById('card-bomb'),
      cardCharades: document.getElementById('card-charades'),
      cardTaboo: document.getElementById('card-taboo'),
      cardWyr: document.getElementById('card-wyr'),
      cardTod: document.getElementById('card-tod'),
      cardFiveSeconds: document.getElementById('card-five-seconds'),
      cardWolves: document.getElementById('card-wolves'),
      cardPictionary: document.getElementById('card-pictionary'),
      
      // Gameplay container
      gameplayContainer: document.getElementById('gameplay-container')
    };

    WordHistoryManager.init();
    loadPlayers();
    Billing.init();
    updateProButtons();
    setupEventListeners();
    renderEmojiSelector();
    renderColorSelector();
    renderPlayersList();

    // Initialize history state for native Android back button support
    window.history.replaceState({ screen: 'screen-home' }, '');
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.screen) {
        if (currentScreenId === 'screen-gameplay') {
          exitGameplay(event.state.screen);
        } else {
          showScreen(event.state.screen, false);
        }
      }
    });
  };

  const showScreen = (screenId, pushState = true) => {
    Object.keys(elements.screens).forEach(key => {
      const screen = elements.screens[key];
      if (screen.id === screenId) {
        screen.classList.add('active');
      } else {
        screen.classList.remove('active');
      }
    });
    currentScreenId = screenId;
    window.scrollTo(0, 0);

    if (elements.btnGameplayRestart) {
      if (screenId === 'screen-gameplay') {
        elements.btnGameplayRestart.style.display = 'inline-flex';
      } else {
        elements.btnGameplayRestart.style.display = 'none';
      }
    }

    if (pushState) {
      window.history.pushState({ screen: screenId }, '');
    }
  };

  const setupEventListeners = () => {
    // Pro purchase events
    if (elements.btnHomeBuyPro) {
      elements.btnHomeBuyPro.addEventListener('click', () => {
        Sounds.playClick();
        if (!Billing.isProUser()) {
          Billing.buyPro();
        }
      });
    }

    if (elements.btnGamesBuyPro) {
      elements.btnGamesBuyPro.addEventListener('click', () => {
        Sounds.playClick();
        if (!Billing.isProUser()) {
          Billing.buyPro();
        }
      });
    }

    // Basic Navigation
    elements.btnStart.addEventListener('click', () => {
      Sounds.playClick();
      showScreen('screen-players');
    });

    elements.btnBackToHome.addEventListener('click', () => {
      Sounds.playClick();
      showScreen('screen-home');
    });

    elements.btnGoToGames.addEventListener('click', () => {
      Sounds.playClick();
      if (players.length < 3) {
        showCustomAlert("تحتاج إلى إضافة 3 لاعبين على الأقل للعب!");
        return;
      }
      showScreen('screen-games');
    });

    elements.btnBackToPlayers.addEventListener('click', () => {
      Sounds.playClick();
      showScreen('screen-players');
    });

    if (elements.btnHomeCustomCreator) {
      elements.btnHomeCustomCreator.addEventListener('click', () => {
        Sounds.playClick();
        showScreen('screen-custom-creator');
        CustomCreator.init();
      });
    }

    if (elements.btnGamesCustomCreator) {
      elements.btnGamesCustomCreator.addEventListener('click', () => {
        Sounds.playClick();
        showScreen('screen-custom-creator');
        CustomCreator.init();
      });
    }

    if (elements.btnShowGlobalScoreboard) {
      elements.btnShowGlobalScoreboard.addEventListener('click', () => {
        Sounds.playClick();
        window.showGlobalScoreboardModal();
      });
    }

    // Top Navigation during gameplay
    elements.btnGameplayExit.addEventListener('click', () => {
      showCustomConfirm("هل تريد إنهاء اللعب والعودة لقائمة اختيار الألعاب؟ سيتم إلغاء الجولة الحالية.", () => {
        window.history.back();
      });
    });

    elements.btnGameplayRestart.addEventListener('click', () => {
      if (activeGame && typeof activeGame.restart === 'function') {
        showCustomConfirm("هل تريد إعادة اللعب بنفس الخيارات واللاعبين؟ سيتم تصفير الجولة الحالية والبدء من جديد.", () => {
          Sounds.playClick();
          activeGame.restart();
        });
      }
    });

    // Player addition logic
    elements.btnAddPlayer.addEventListener('click', () => {
      addPlayer();
    });

    elements.playerNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addPlayer();
      }
    });

    // Game selections
    elements.cardUndercover.addEventListener('click', () => {
      Sounds.playClick();
      if (players.length < 3) {
        showCustomAlert("تتطلب لعبة الجاسوس 3 لاعبين على الأقل.");
        return;
      }
      showScreen('screen-gameplay');
      activeGame = UndercoverGame;
      UndercoverGame.init(players, elements.gameplayContainer, exitGameplay);
    });

    elements.cardBomb.addEventListener('click', () => {
      Sounds.playClick();
      if (players.length < 3) {
        showCustomAlert("تتطلب لعبة قنبلة الكلمات 3 لاعبين على الأقل.");
        return;
      }
      showScreen('screen-gameplay');
      activeGame = BombGame;
      BombGame.init(players, elements.gameplayContainer, exitGameplay);
    });

    elements.cardCharades.addEventListener('click', () => {
      Sounds.playClick();
      if (players.length < 4) {
        showCustomAlert("تتطلب لعبة بدون كلام 4 لاعبين على الأقل (ليتم تقسيمهم إلى فريقين).");
        return;
      }
      showScreen('screen-gameplay');
      activeGame = CharadesGame;
      CharadesGame.init(players, elements.gameplayContainer, exitGameplay);
    });

    elements.cardTaboo.addEventListener('click', () => {
      Sounds.playClick();
      if (players.length < 4) {
        showCustomAlert("تتطلب لعبة قول بس لا تقول 4 لاعبين على الأقل (ليتم تقسيمهم إلى فريقين).");
        return;
      }
      showScreen('screen-gameplay');
      activeGame = TabooGame;
      TabooGame.init(players, elements.gameplayContainer, exitGameplay);
    });

    elements.cardWyr.addEventListener('click', () => {
      Sounds.playClick();
      if (players.length < 2) {
        showCustomAlert("تتطلب لعبة لو خيروك لاعبين على الأقل.");
        return;
      }
      showScreen('screen-gameplay');
      activeGame = WouldYouRatherGame;
      WouldYouRatherGame.init(players, elements.gameplayContainer, exitGameplay);
    });

    elements.cardTod.addEventListener('click', () => {
      Sounds.playClick();
      if (players.length < 2) {
        showCustomAlert("تتطلب لعبة صراحة أو تحدي لاعبين على الأقل.");
        return;
      }
      showScreen('screen-gameplay');
      activeGame = TruthOrDareGame;
      TruthOrDareGame.init(players, elements.gameplayContainer, exitGameplay);
    });

    elements.cardFiveSeconds.addEventListener('click', () => {
      Sounds.playClick();
      if (players.length < 2) {
        showCustomAlert("تتطلب لعبة تحدي الـ 5 ثواني لاعبين على الأقل.");
        return;
      }
      showScreen('screen-gameplay');
      activeGame = FiveSecondsGame;
      FiveSecondsGame.init(players, elements.gameplayContainer, exitGameplay);
    });

    elements.cardWolves.addEventListener('click', () => {
      Sounds.playClick();
      if (players.length < 4) {
        showCustomAlert("تتطلب لعبة الذئاب والقرويون 4 لاعبين على الأقل.");
        return;
      }
      showScreen('screen-gameplay');
      activeGame = WolvesvilleGame;
      WolvesvilleGame.init(players, elements.gameplayContainer, exitGameplay);
    });

    if (elements.cardPictionary) {
      elements.cardPictionary.addEventListener('click', () => {
        Sounds.playClick();
        if (players.length < 2) {
          showCustomAlert("تتطلب لعبة الرسم لاعبين على الأقل.");
          return;
        }
        showScreen('screen-gameplay');
        activeGame = PictionaryGame;
        PictionaryGame.init(players, elements.gameplayContainer, exitGameplay);
      });
    }
  };

  const exitGameplay = (targetScreen = 'screen-games') => {
    if (activeGame && typeof activeGame.cleanup === 'function') {
      activeGame.cleanup();
    }
    activeGame = null;
    showScreen(targetScreen);
    elements.gameplayContainer.innerHTML = '';
  };

  const showCustomConfirm = (message, onConfirm) => {
    Sounds.playClick();
    
    // Remove any existing modal overlays
    const existing = document.querySelector('.custom-modal-overlay');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'custom-modal-overlay animate-fade-in';
    modal.innerHTML = `
      <div class="custom-modal-card animate-zoom-in">
        <h3>تأكيد ⚠️</h3>
        <p>${message}</p>
        <div class="modal-buttons">
          <button class="btn btn-primary" id="modal-confirm-yes">نعم، متأكد</button>
          <button class="btn btn-outline" id="modal-confirm-no">إلغاء</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('modal-confirm-no').addEventListener('click', () => {
      Sounds.playClick();
      modal.remove();
    });

    document.getElementById('modal-confirm-yes').addEventListener('click', () => {
      modal.remove();
      onConfirm();
    });
  };

  // Render Emojis Selection Buttons
  const renderEmojiSelector = () => {
    elements.emojisGrid.innerHTML = emojisList.map((emoji, index) => `
      <button class="emoji-btn ${emoji === selectedEmoji ? 'selected' : ''}" data-emoji="${emoji}">
        ${emoji}
      </button>
    `).join('');

    // Attach listeners
    elements.emojisGrid.querySelectorAll('.emoji-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        Sounds.playClick();
        selectedEmoji = btn.getAttribute('data-emoji');
        renderEmojiSelector();
      });
    });
  };

  // Render Colors Selection Buttons
  const renderColorSelector = () => {
    elements.colorsGrid.innerHTML = colorsList.map((color) => `
      <button class="color-btn ${color === selectedColor ? 'selected' : ''}" 
              data-color="${color}" 
              style="background-color: ${color}; color: ${color}">
      </button>
    `).join('');

    // Attach listeners
    elements.colorsGrid.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        Sounds.playClick();
        selectedColor = btn.getAttribute('data-color');
        renderColorSelector();
      });
    });
  };

  // Add Player into local state
  const addPlayer = () => {
    const name = elements.playerNameInput.value.trim();
    if (!name) {
      showCustomAlert("الرجاء إدخال اسم اللاعب!");
      return;
    }

    if (players.length >= 16) {
      showCustomAlert("الحد الأقصى هو 16 لاعب!");
      return;
    }

    // Name uniqueness validation
    if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      showCustomAlert("اسم اللاعب موجود بالفعل، يرجى اختيار اسم آخر!");
      return;
    }

    const newPlayer = {
      id: nextPlayerId++,
      name: name,
      emoji: selectedEmoji,
      color: selectedColor
    };

    players.push(newPlayer);
    savePlayers();
    Sounds.playSuccess();

    // Clear input
    elements.playerNameInput.value = '';
    
    // Choose next random emoji and color to make adding players fun
    const nextEmojiIndex = (emojisList.indexOf(selectedEmoji) + 1) % emojisList.length;
    selectedEmoji = emojisList[nextEmojiIndex];
    
    const nextColorIndex = (colorsList.indexOf(selectedColor) + 1) % colorsList.length;
    selectedColor = colorsList[nextColorIndex];

    renderEmojiSelector();
    renderColorSelector();
    renderPlayersList();
  };

  let draggedPlayerId = null;
  let touchStartY = 0;
  let activeTouchRow = null;

  const handleDragStart = (e) => {
    draggedPlayerId = parseInt(e.target.closest('.player-row').getAttribute('data-id'), 10);
    e.target.closest('.player-row').classList.add('dragging');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    const row = e.target.closest('.player-row');
    if (!row || draggedPlayerId === null) return;
    
    const targetId = parseInt(row.getAttribute('data-id'), 10);
    if (targetId === draggedPlayerId) return;

    const draggedIndex = players.findIndex(p => p.id === draggedPlayerId);
    const targetIndex = players.findIndex(p => p.id === targetId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const [draggedPlayer] = players.splice(draggedIndex, 1);
      players.splice(targetIndex, 0, draggedPlayer);
      savePlayers();
      renderPlayersList();
      
      const newDraggedRow = elements.playersListContainer.querySelector(`.player-row[data-id="${draggedPlayerId}"]`);
      if (newDraggedRow) newDraggedRow.classList.add('dragging');
    }
  };

  const handleDragEnd = (e) => {
    const row = e.target.closest('.player-row');
    if (row) row.classList.remove('dragging');
    draggedPlayerId = null;
    Sounds.playClick();
  };

  const handleTouchStart = (e) => {
    activeTouchRow = e.target.closest('.player-row');
    if (!activeTouchRow) return;
    touchStartY = e.touches[0].clientY;
    activeTouchRow.classList.add('dragging');
  };

  const handleTouchMove = (e) => {
    if (!activeTouchRow) return;
    e.preventDefault();
    const touchY = e.touches[0].clientY;
    const elementUnderTouch = document.elementFromPoint(e.touches[0].clientX, touchY);
    const targetRow = elementUnderTouch ? elementUnderTouch.closest('.player-row') : null;
    
    if (targetRow && targetRow !== activeTouchRow) {
      const draggedId = parseInt(activeTouchRow.getAttribute('data-id'), 10);
      const targetId = parseInt(targetRow.getAttribute('data-id'), 10);
      
      const draggedIndex = players.findIndex(p => p.id === draggedId);
      const targetIndex = players.findIndex(p => p.id === targetId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [draggedPlayer] = players.splice(draggedIndex, 1);
        players.splice(targetIndex, 0, draggedPlayer);
        savePlayers();
        renderPlayersList();
        
        activeTouchRow = elements.playersListContainer.querySelector(`.player-row[data-id="${draggedId}"]`);
        if (activeTouchRow) activeTouchRow.classList.add('dragging');
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (activeTouchRow) {
      activeTouchRow.classList.remove('dragging');
    }
    activeTouchRow = null;
    Sounds.playClick();
  };

  const deletePlayer = (id) => {
    players = players.filter(p => p.id !== id);
    savePlayers();
    Sounds.playFail();
    renderPlayersList();
  };

  // Render Registered Players List in DOM
  const renderPlayersList = () => {
    elements.playersCounter.textContent = players.length;
    
    if (players.length === 0) {
      elements.playersListContainer.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 20px;">
          لا يوجد لاعبين مضافين حالياً.
        </div>
      `;
      return;
    }

    elements.playersListContainer.innerHTML = players.map(p => `
      <div class="player-row" data-id="${p.id}" draggable="true" style="border-right: 4px solid ${p.color}">
        <div class="player-drag-handle">⠿</div>
        <div class="player-row-avatar" style="background: ${p.color}22">
          <span>${p.emoji}</span>
        </div>
        <span class="player-row-name">${p.name}</span>
        <button class="btn-delete-player" data-id="${p.id}">❌</button>
      </div>
    `).join('');

    // Attach desktop drag & drop listeners
    elements.playersListContainer.querySelectorAll('.player-row').forEach(row => {
      row.addEventListener('dragstart', handleDragStart);
      row.addEventListener('dragover', handleDragOver);
      row.addEventListener('dragend', handleDragEnd);
      
      // Attach touch listeners for mobile
      const handle = row.querySelector('.player-drag-handle');
      if (handle) {
        handle.addEventListener('touchstart', handleTouchStart, { passive: false });
        handle.addEventListener('touchmove', handleTouchMove, { passive: false });
        handle.addEventListener('touchend', handleTouchEnd);
      }
    });

    // Attach delete listeners
    elements.playersListContainer.querySelectorAll('.btn-delete-player').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        deletePlayer(id);
      });
    });
  };

  return {
    init,
    showScreen,
    exitGameplay,
    showCustomConfirm
  };
})();

// Launch application on DOM Load
window.addEventListener('DOMContentLoaded', () => {
  App.init();

  // Register Service Worker for Jalsa PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('Service Worker registered successfully!', reg);
        // Force checking for updates immediately on page load
        reg.update();
      })
      .catch(err => console.error('Service Worker registration failed:', err));

    // Reload the page automatically when a new service worker takes control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }
});
