// Jalsa - Word Bomb Game Logic
const BombGame = (() => {
  let playersList = [];
  let gamePlayers = []; // elements: { id, name, emoji, color, active: true }
  let currentPlayerIndex = 0;
  let currentCategory = null;
  let timerVal = 0; // remaining seconds
  let maxDuration = 35; // random target duration
  let timerInterval = null;
  let tickTimeout = null;
  let startTime = 0;
  let containerEl = null;
  let onExitCallback = null;
  let selectedCategories = ["عشوائي"];

  const init = (players, container, onExit) => {
    playersList = players;
    containerEl = container;
    onExitCallback = onExit;
    
    // Initialize active game players
    gamePlayers = playersList.map(p => ({ ...p, active: true }));
    setupGame();
  };

  const setupGame = () => {
    // Reset players active states if all are dead or new game
    const activeCount = gamePlayers.filter(p => p.active).length;
    if (activeCount <= 1) {
      gamePlayers.forEach(p => p.active = true);
    }
    
    // Pick first active player
    const activePlayers = gamePlayers.filter(p => p.active);
    currentPlayerIndex = gamePlayers.findIndex(p => p.id === activePlayers[0].id);

    selectedCategories = ["عشوائي"];
    renderLobbyScreen();
  };

  const renderLobbyScreen = () => {
    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">قنبلة الكلمات</span>
          <h2>تحدي القنبلة الموقوتة 💣</h2>
        </div>

        <div class="bomb-intro-box">
          <span class="bomb-large-emoji">💣</span>
          <p class="intro-text">
            سيبدأ عد تنازلي سري لقنبلة موقوتة. يجب على اللاعب الحالي قول كلمة تنتمي للفئة المحددة، ثم تمرير الهاتف بسرعة لمن يليه قبل الانفجار.
          </p>
          <p class="warning-text">⚠️ اللاعب الذي تنفجر القنبلة وهو يمسك الهاتف يُستبعد!</p>
        </div>

        <div class="category-selection-box">
          <h4>اختر تصنيف الأسئلة:</h4>
          <div class="category-buttons-grid">
            <button class="cat-select-btn ${selectedCategories.includes("عشوائي") ? 'active' : ''}" data-cat="عشوائي">🎲 عشوائي</button>
            ${Object.keys(WordBank.bomb).map(cat => {
              const icons = { "فواكه وخضروات": "🍎", "وظائف ومهن": "👨‍⚕️", "نوادي ومنتخبات": "🏆", "ألعاب وتكنولوجيا": "🎮", "أطعمة ومشروبات": "🍔", "ماركات وشركات": "🏷️", "بلدان وعواصم": "🗺️", "تصنيفات أخرى": "🏷️" };
              const isLocked = window.isCategoryLocked('bomb', cat);
              const isActive = selectedCategories.includes(cat);
              return `<button class="cat-select-btn ${isLocked ? 'premium-locked' : ''} ${isActive ? 'active' : ''}" data-cat="${cat}">
                ${isLocked ? '🔒 ' : ''}${icons[cat] || "🏷️"} ${cat}
              </button>`;
            }).join('')}
          </div>
        </div>

        <div class="active-players-list-simple">
          <h4>اللاعبون المشاركون (${gamePlayers.filter(p => p.active).length}):</h4>
          <div class="players-badges-container">
            ${gamePlayers.filter(p => p.active).map(p => `
              <span class="player-mini-badge" style="background: ${p.color}">
                <span>${p.emoji}</span> ${p.name}
              </span>
            `).join('')}
          </div>
        </div>

        <div class="game-controls">
          <button class="btn btn-primary btn-large" id="btn-start-bomb">
            <span>ابدأ اللعب 💣🔥</span>
          </button>
        </div>
      </div>
    `;

    // Category button selection toggle
    const catButtons = containerEl.querySelectorAll('.cat-select-btn');
    catButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        Sounds.playClick();
        const cat = btn.getAttribute('data-cat');
        if (window.isCategoryLocked('bomb', cat)) {
          window.showProUpgradeModal(() => {
            if (!selectedCategories.includes(cat)) {
              selectedCategories = selectedCategories.filter(c => c !== "عشوائي");
              selectedCategories.push(cat);
            }
            renderLobbyScreen();
          });
          return;
        }
        
        if (cat === "عشوائي") {
          selectedCategories = ["عشوائي"];
        } else {
          selectedCategories = selectedCategories.filter(c => c !== "عشوائي");
          if (selectedCategories.includes(cat)) {
            selectedCategories = selectedCategories.filter(c => c !== cat);
          } else {
            selectedCategories.push(cat);
          }
          if (selectedCategories.length === 0) {
            selectedCategories = ["عشوائي"];
          }
        }
        renderLobbyScreen();
      });
    });

    document.getElementById('btn-start-bomb').addEventListener('click', () => {
      Sounds.playClick();
      
      // Select category item based on choice
      let chosenCats = [];
      if (selectedCategories.includes("عشوائي") || selectedCategories.length === 0) {
        let keys = Object.keys(WordBank.bomb);
        if (!window.isProUser()) {
          keys = keys.filter(k => !window.isCategoryLocked('bomb', k));
        }
        chosenCats = keys;
      } else {
        chosenCats = selectedCategories;
      }

      let allPrompts = [];
      chosenCats.forEach(cat => {
        if (WordBank.bomb[cat]) {
          allPrompts = allPrompts.concat(WordBank.bomb[cat]);
        }
      });

      if (allPrompts.length === 0) {
        allPrompts = WordBank.bomb["فواكه وخضروات"];
      }

      // Smart played history check
      const unplayedPrompts = WordHistoryManager.getUnplayedItems('bomb', 'all_prompts', allPrompts);
      currentCategory = unplayedPrompts[Math.floor(Math.random() * unplayedPrompts.length)];
      WordHistoryManager.markAsPlayed('bomb', 'all_prompts', currentCategory);

      // Set random duration (25 to 45 seconds)
      maxDuration = Math.floor(Math.random() * 20) + 25;
      timerVal = maxDuration;
      
      startCountdown();
    });
  };

  const startCountdown = () => {
    startTime = Date.now();
    renderGameplayScreen();
    scheduleNextTick();
  };

  // Schedule dynamically accelerating tick sounds and updates
  const scheduleNextTick = () => {
    if (timerVal <= 0) {
      explodeBomb();
      return;
    }

    const elapsed = (maxDuration - timerVal);
    const progress = elapsed / maxDuration; // 0 to 1

    // Speed up ticking interval as time goes by:
    let interval = 1000 - (progress * 850);
    interval = Math.max(interval, 150); // don't go faster than 150ms

    // Elevate the pitch of the tick sound as it gets faster
    const pitchFactor = 1.0 + (progress * 1.5); // 1.0 to 2.5

    tickTimeout = setTimeout(() => {
      timerVal -= (interval / 1000);
      Sounds.playTick(pitchFactor);
      
      // Update UI slightly to show bomb shaking more violently
      updateBombVisuals(progress);

      scheduleNextTick();
    }, interval);
  };

  const updateBombVisuals = (progress) => {
    const bombImg = document.querySelector('.bomb-svg-wrapper');
    if (bombImg) {
      // Add visual pulsing / vibration
      const scale = 1.0 + (progress * 0.15); // grow slightly
      bombImg.style.animation = `bombShake ${0.5 - (progress * 0.45)}s infinite ease-in-out`;
      bombImg.style.transform = `scale(${scale})`;
      
      // Update glow intensity and color
      let glowColor = 'rgba(255, 165, 0, 0.5)';
      if (progress > 0.5) glowColor = 'rgba(255, 69, 0, 0.7)';
      if (progress > 0.8) glowColor = 'rgba(255, 0, 0, 0.9)';
      bombImg.style.filter = `drop-shadow(0 0 15px ${glowColor})`;
    }
  };

  const renderGameplayScreen = () => {
    const currentPlayer = gamePlayers[currentPlayerIndex];

    containerEl.innerHTML = `
      <div class="game-card game-card-bomb animate-fade-in text-center" id="bomb-game-screen">
        <div class="game-header">
          <span class="game-badge">الفئة: ${currentCategory.name}</span>
          <span class="game-badge-icon">${currentCategory.icon}</span>
        </div>

        <div class="current-player-turn" style="background: ${currentPlayer.color}20; border-top: 4px solid ${currentPlayer.color}; border-bottom: 4px solid ${currentPlayer.color}">
          <div class="current-player-avatar" style="background: ${currentPlayer.color}">
            <span>${currentPlayer.emoji}</span>
          </div>
          <div class="current-player-details">
            <span class="turn-label">دور اللاعب الحالي:</span>
            <span class="player-turn-name">${currentPlayer.name}</span>
          </div>
        </div>

        <div class="bomb-visual-container">
          <div class="bomb-svg-wrapper">
            <svg viewBox="0 0 100 100" width="120" height="120" class="bomb-svg">
              <path d="M50,30 C66.5,30 80,43.5 80,60 C80,76.5 66.5,90 50,90 C33.5,90 20,76.5 20,60 C20,43.5 33.5,30 50,30 Z" fill="#1e1b29" stroke="#ff3e00" stroke-width="2.5" />
              <rect x="44" y="22" width="12" height="8" rx="2" fill="#5c5470" />
              <path d="M50,22 Q55,10 65,12" fill="none" stroke="#ffcc00" stroke-width="3" stroke-dasharray="2 1" class="fuse-spark" />
              <circle cx="65" cy="12" r="3" fill="#ff4500" class="spark-circle" />
            </svg>
          </div>
        </div>

        <div class="category-large-display">
          <h2>قل كلمة سريعة في:</h2>
          <div class="cat-glow-box">${currentCategory.name} ${currentCategory.icon}</div>
        </div>

        <div class="game-controls">
          <button class="btn btn-accent btn-large" id="btn-pass-bomb">
            <span>نطقت الكلمة! مرر الهاتف للآتي ➡️</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-pass-bomb').addEventListener('click', () => {
      passBomb();
    });
  };

  const passBomb = () => {
    Sounds.playClick();
    
    // Find next active player
    let nextIndex = (currentPlayerIndex + 1) % gamePlayers.length;
    while (!gamePlayers[nextIndex].active) {
      nextIndex = (nextIndex + 1) % gamePlayers.length;
    }
    
    currentPlayerIndex = nextIndex;
    renderGameplayScreen();
  };

  const explodeBomb = () => {
    clearTimeout(tickTimeout);
    Sounds.playExplosion();

    const loser = gamePlayers[currentPlayerIndex];
    loser.active = false; // eliminate

    // Check if only one player is left standing
    const activeCount = gamePlayers.filter(p => p.active).length;
    const isOneLeft = activeCount === 1;

    // Apply explosion shake effect to screen
    const screen = document.getElementById('bomb-game-screen');
    if (screen) {
      screen.classList.add('screen-shake-red');
    }

    setTimeout(() => {
      renderExplosionResult(loser, isOneLeft);
    }, 500);
  };

  const renderExplosionResult = (loser, isOneLeft) => {
    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="explosion-header">
          <span class="explosion-title-emoji">💥 Boom! 💥</span>
          <h2>انفجرت القنبلة!</h2>
        </div>

        <div class="loser-card" style="border: 2px solid #ff3366; background: rgba(255,51,102,0.05)">
          <div class="loser-avatar-frame" style="background: ${loser.color}">
            <span class="loser-emoji">${loser.emoji}</span>
          </div>
          <h3>خسر الجولة: ${loser.name}</h3>
          <p>للأسف! لم تسعفك الكلمات في الوقت المناسب وانفجرت القنبلة لديك!</p>
          <div class="eliminated-badge">❌ تم الاستبعاد</div>
        </div>

        <div class="game-controls-stacked">
          ${isOneLeft ? `
            <button class="btn btn-primary" id="btn-show-winner">عرض الفائز النهائي! 🏆</button>
          ` : `
            <button class="btn btn-primary" id="btn-next-round">بدء جولة جديدة 💣</button>
            <button class="btn btn-outline" id="btn-exit-bomb">خروج للقائمة الرئيسية 🚪</button>
          `}
        </div>
      </div>
    `;

    if (isOneLeft) {
      document.getElementById('btn-show-winner').addEventListener('click', () => {
        Sounds.playClick();
        showFinalWinner();
      });
    } else {
      document.getElementById('btn-next-round').addEventListener('click', () => {
        Sounds.playClick();
        setupGame();
      });
      document.getElementById('btn-exit-bomb').addEventListener('click', () => {
        Sounds.playClick();
        onExitCallback();
      });
    }
  };

  const showFinalWinner = () => {
    Sounds.playSuccess();
    const winner = gamePlayers.find(p => p.active);

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">بطل الجلسة</span>
        </div>

        <div class="winner-congrats-card">
          <div class="trophy-glow">🏆</div>
          <div class="winner-avatar" style="background: ${winner.color}">
            <span>${winner.emoji}</span>
          </div>
          <h2>الفائز النهائي: ${winner.name}!</h2>
          <p>تهانينا! لقد تغلبت على الجميع ونجوت من القنبلة الموقوتة بمهارة وسرعة بديهة فائقة!</p>
        </div>

        <div class="game-controls-stacked">
          <button class="btn btn-primary" id="btn-restart-bomb-full">لعب من جديد 🔄</button>
          <button class="btn btn-outline" id="btn-exit-bomb-final">خروج للقائمة الرئيسية 🚪</button>
        </div>
      </div>
    `;

    document.getElementById('btn-restart-bomb-full').addEventListener('click', () => {
      Sounds.playClick();
      // Reset all players
      gamePlayers.forEach(p => p.active = true);
      setupGame();
    });

    document.getElementById('btn-exit-bomb-final').addEventListener('click', () => {
      Sounds.playClick();
      onExitCallback();
    });
  };

  const cleanup = () => {
    clearTimeout(tickTimeout);
    clearInterval(timerInterval);
  };

  const restart = () => {
    cleanup();
    // Reset all players
    gamePlayers.forEach(p => p.active = true);
    currentPlayerIndex = gamePlayers.findIndex(p => p.active);
    
    // Choose word/prompt and start directly
    let chosenCats = [];
    if (selectedCategories.includes("عشوائي") || selectedCategories.length === 0) {
      let keys = Object.keys(WordBank.bomb);
      if (!window.isProUser()) {
        keys = keys.filter(k => !window.isCategoryLocked('bomb', k));
      }
      chosenCats = keys;
    } else {
      chosenCats = selectedCategories;
    }

    let allPrompts = [];
    chosenCats.forEach(cat => {
      if (WordBank.bomb[cat]) {
        allPrompts = allPrompts.concat(WordBank.bomb[cat]);
      }
    });

    if (allPrompts.length === 0) {
      allPrompts = WordBank.bomb["فواكه وخضروات"];
    }

    const unplayedPrompts = WordHistoryManager.getUnplayedItems('bomb', 'all_prompts', allPrompts);
    currentCategory = unplayedPrompts[Math.floor(Math.random() * unplayedPrompts.length)];
    WordHistoryManager.markAsPlayed('bomb', 'all_prompts', currentCategory);

    maxDuration = Math.floor(Math.random() * 20) + 25;
    timerVal = maxDuration;
    
    startCountdown();
  };

  return {
    init,
    cleanup,
    restart
  };
})();
