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

  const init = () => {
    // Cache elements
    elements = {
      appContainer: document.getElementById('app-container'),
      screens: {
        home: document.getElementById('screen-home'),
        players: document.getElementById('screen-players'),
        games: document.getElementById('screen-games'),
        gameplay: document.getElementById('screen-gameplay')
      },
      btnStart: document.getElementById('btn-start-app'),
      btnGoToGames: document.getElementById('btn-go-games'),
      btnBackToPlayers: document.getElementById('btn-back-players'),
      btnBackToHome: document.getElementById('btn-back-home'),
      
      // Top Navigation during gameplay
      btnGameplayBack: document.getElementById('btn-gameplay-back'),
      btnGameplayExit: document.getElementById('btn-gameplay-exit'),
      
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
      
      // Gameplay container
      gameplayContainer: document.getElementById('gameplay-container')
    };

    loadPlayers();
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

    if (pushState) {
      window.history.pushState({ screen: screenId }, '');
    }
  };

  const setupEventListeners = () => {
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

    // Top Navigation during gameplay
    elements.btnGameplayBack.addEventListener('click', () => {
      showCustomConfirm("هل تريد الرجوع إلى قائمة اختيار الألعاب؟ سيتم إلغاء جولة اللعب الحالية.", () => {
        exitGameplay('screen-games');
      });
    });

    elements.btnGameplayExit.addEventListener('click', () => {
      showCustomConfirm("هل تريد إنهاء اللعب بالكامل والعودة لقائمة اللاعبين؟", () => {
        exitGameplay('screen-players');
      });
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

  const deletePlayer = (id) => {
    players = players.filter(p => p.id !== id);
    savePlayers();
    Sounds.playFail();
    renderPlayersList();
  };

  const movePlayer = (id, direction) => {
    const index = players.findIndex(p => p.id === id);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const temp = players[index];
      players[index] = players[index - 1];
      players[index - 1] = temp;
    } else if (direction === 'down' && index < players.length - 1) {
      const temp = players[index];
      players[index] = players[index + 1];
      players[index + 1] = temp;
    } else {
      return;
    }

    savePlayers();
    Sounds.playClick();
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

    elements.playersListContainer.innerHTML = players.map((p, index) => `
      <div class="player-row" style="border-right: 4px solid ${p.color}">
        <div class="player-row-avatar" style="background: ${p.color}22">
          <span>${p.emoji}</span>
        </div>
        <span class="player-row-name">${p.name}</span>
        <div class="player-row-actions">
          <button class="btn-move-player btn-move-up" data-id="${p.id}" ${index === 0 ? 'disabled' : ''}>⬆️</button>
          <button class="btn-move-player btn-move-down" data-id="${p.id}" ${index === players.length - 1 ? 'disabled' : ''}>⬇️</button>
          <button class="btn-delete-player" data-id="${p.id}">❌</button>
        </div>
      </div>
    `).join('');

    // Attach move listeners
    elements.playersListContainer.querySelectorAll('.btn-move-up').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        movePlayer(id, 'up');
      });
    });

    elements.playersListContainer.querySelectorAll('.btn-move-down').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        movePlayer(id, 'down');
      });
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
    exitGameplay
  };
})();

// Launch application on DOM Load
window.addEventListener('DOMContentLoaded', () => {
  App.init();

  // Register Service Worker for Jalsa PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registered successfully!', reg))
      .catch(err => console.error('Service Worker registration failed:', err));
  }
});
