// Jalsa - Undercover Game Logic
const UndercoverGame = (() => {
  let playersList = [];
  let gamePlayers = []; // elements: { id, name, emoji, color, role, word, active: true }
  let currentWordPair = null;
  let revealIndex = 0;
  let isWordVisible = false;
  let containerEl = null;
  let onExitCallback = null;
  let selectedCategories = ["عشوائي"];
  let currentRoundStarterId = null;

  const init = (players, container, onExit) => {
    playersList = players;
    containerEl = container;
    onExitCallback = onExit;
    setupGame();
  };

  const setupGame = () => {
    revealIndex = 0;
    isWordVisible = false;
    selectedCategories = ["عشوائي"];
    currentRoundStarterId = null;
    renderLobbyScreen();
  };

  const renderLobbyScreen = () => {
    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">لعبة الجاسوس</span>
          <h2>إعداد اللعبة 🕵️‍♂️</h2>
        </div>

        <div class="bomb-intro-box">
          <span class="bomb-large-emoji">🕵️‍♂️</span>
          <p class="intro-text">
            سيتلقى كل لاعب كلمة سرية، باستثناء الجاسوس الذي لن يحصل على شيء. ستقومون بالتناوب لوصف كلماتكم بكلمة واحدة، ثم التصويت لطرد الجاسوس والعميل!
          </p>
        </div>

        <div class="category-selection-box">
          <h4>اختر تصنيف الكلمات:</h4>
          <div class="category-buttons-grid">
            <button class="cat-select-btn ${selectedCategories.includes("عشوائي") ? 'active' : ''}" data-cat="عشوائي">🎲 عشوائي</button>
            ${Object.keys(WordBank.undercover).map(cat => {
              const icons = { "فواكه وخضروات": "🍎", "وظائف ومهن": "👨‍⚕️", "نوادي ومنتخبات": "🏆", "أشياء عامة": "📦", "حيوانات وطيور": "🦁", "بلدان وعواصم": "🗺️", "ألعاب وتكنولوجيا": "🎮", "أطعمة ومشروبات": "🍔", "ماركات وشركات": "🏷️", "أماكن ومعالم": "🏛️" };
              const isLocked = window.isCategoryLocked('undercover', cat);
              const isActive = selectedCategories.includes(cat);
              return `<button class="cat-select-btn ${isLocked ? 'premium-locked' : ''} ${isActive ? 'active' : ''}" data-cat="${cat}">
                ${isLocked ? '🔒 ' : ''}${icons[cat] || "🏷️"} ${cat}
              </button>`;
            }).join('')}
          </div>
        </div>

        <div class="active-players-list-simple">
          <h4>اللاعبون المضافون (${playersList.length}):</h4>
          <div class="players-badges-container">
            ${playersList.map(p => `
              <span class="player-mini-badge" style="background: ${p.color}">
                <span>${p.emoji}</span> ${p.name}
              </span>
            `).join('')}
          </div>
        </div>

        <div class="game-controls">
          <button class="btn btn-primary btn-large" id="btn-start-undercover-reveal">
            <span>ابدأ توزيع الكلمات ➡️</span>
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
        if (window.isCategoryLocked('undercover', cat)) {
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

    document.getElementById('btn-start-undercover-reveal').addEventListener('click', () => {
      Sounds.playClick();
      startGamePlay();
    });
  };

  const startGamePlay = () => {
    // 1. Collect all candidate categories
    let chosenCats = [];
    if (selectedCategories.includes("عشوائي") || selectedCategories.length === 0) {
      let keys = Object.keys(WordBank.undercover);
      if (!window.isProUser()) {
        keys = keys.filter(k => !window.isCategoryLocked('undercover', k));
      }
      chosenCats = keys;
    } else {
      chosenCats = selectedCategories;
    }

    // 2. Gather all pairs from chosen categories
    let allPairs = [];
    chosenCats.forEach(cat => {
      if (WordBank.undercover[cat]) {
        allPairs = allPairs.concat(WordBank.undercover[cat]);
      }
    });

    if (allPairs.length === 0) {
      allPairs = WordBank.undercover["فواكه وخضروات"];
    }

    // 3. Get unplayed pairs using WordHistoryManager
    const unplayedPairs = WordHistoryManager.getUnplayedItems('undercover', 'all_cats', allPairs);
    currentWordPair = unplayedPairs[Math.floor(Math.random() * unplayedPairs.length)];
    WordHistoryManager.markAsPlayed('undercover', 'all_cats', currentWordPair);

    // 4. Assign roles
    const numPlayers = playersList.length;
    let roles = [];
    
    if (numPlayers === 3) {
      roles = ['spy', 'civilian', 'civilian'];
    } else {
      roles = ['spy', 'undercover'];
      while (roles.length < numPlayers) {
        roles.push('civilian');
      }
    }

    // Shuffle roles using Fisher-Yates for unbiased randomness
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    // Create game players list
    gamePlayers = playersList.map((p, index) => {
      const role = roles[index];
      let word = "";
      if (role === 'civilian') {
        word = currentWordPair.civilian;
      } else if (role === 'undercover') {
        word = currentWordPair.undercover;
      } else {
        word = "🕵️‍♂️ أنت الجاسوس! لا كلمة لديك. حاول معرفة الكلمة وتظاهر بالمعرفة!";
      }

      return {
        id: p.id,
        name: p.name,
        emoji: p.emoji,
        color: p.color,
        role: role,
        word: word,
        active: true
      };
    });

    // 5. Select starting player once for this game (random and non-repeating)
    const lastStarterId = localStorage.getItem('jalsa_undercover_last_starter_id');
    const activePlayers = gamePlayers.filter(p => p.active);
    const starterCandidates = activePlayers.filter(p => String(p.id) !== String(lastStarterId));
    const finalCandidates = starterCandidates.length > 0 ? starterCandidates : activePlayers;
    const starter = finalCandidates[Math.floor(Math.random() * finalCandidates.length)];
    currentRoundStarterId = starter.id;
    localStorage.setItem('jalsa_undercover_last_starter_id', starter.id);

    revealIndex = 0;
    isWordVisible = false;
    renderRevealScreen();
  };

  const renderRevealScreen = () => {
    if (revealIndex < gamePlayers.length) {
      const currentPlayer = gamePlayers[revealIndex];
      
      containerEl.innerHTML = `
        <div class="game-card animate-fade-in">
          <div class="game-header">
            <span class="game-badge">لعبة الجاسوس</span>
            <h2>دور اللاعب التالي</h2>
          </div>
          
          <div class="player-reveal-box">
            <div class="reveal-avatar" style="background: ${currentPlayer.color}">
              <span class="emoji-large">${currentPlayer.emoji}</span>
            </div>
            <h3 class="reveal-player-name">${currentPlayer.name}</h3>
            <p class="reveal-instruction">خذ الهاتف بيدك واضغط على الزر أدناه لمعرفة كلمتك السرية بسرية تامة دون أن يراها أحد.</p>
          </div>

          <div class="reveal-word-container ${isWordVisible ? 'revealed' : ''}">
            ${isWordVisible ? `
              <div class="word-card animate-zoom-in">
                <span class="word-label">كلمتك السرية هي:</span>
                <span class="word-text ${currentPlayer.role === 'spy' ? 'spy-text' : ''}">${currentPlayer.word}</span>
              </div>
            ` : `
              <div class="word-placeholder">
                <span>👁️ الكلمة مخفية حالياً</span>
              </div>
            `}
          </div>

          <div class="game-controls">
            ${!isWordVisible ? `
              <button class="btn btn-primary btn-large" id="btn-reveal-word">
                <span>كشف الكلمة</span>
              </button>
            ` : `
              <button class="btn btn-accent btn-large" id="btn-next-player">
                <span>فهمت، إخفاء وتمرير الهاتف ↩️</span>
              </button>
            `}
          </div>
        </div>
      `;

      // Event Listeners
      const revealBtn = document.getElementById('btn-reveal-word');
      if (revealBtn) {
        revealBtn.addEventListener('click', () => {
          Sounds.playClick();
          isWordVisible = true;
          renderRevealScreen();
        });
      }

      const nextBtn = document.getElementById('btn-next-player');
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          Sounds.playClick();
          isWordVisible = false;
          revealIndex++;
          renderRevealScreen();
        });
      }
    } else {
      renderDiscussionScreen();
    }
  };

  const renderDiscussionScreen = () => {
    let starter = gamePlayers.find(p => p.id === currentRoundStarterId && p.active);
    if (!starter) {
      let idx = gamePlayers.findIndex(p => p.id === currentRoundStarterId);
      if (idx === -1) idx = 0;
      let nextIdx = (idx + 1) % gamePlayers.length;
      let count = 0;
      while (!gamePlayers[nextIdx].active && count < gamePlayers.length) {
        nextIdx = (nextIdx + 1) % gamePlayers.length;
        count++;
      }
      starter = gamePlayers[nextIdx];
      currentRoundStarterId = starter.id;
    }

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in">
        <div class="game-header">
          <span class="game-badge">جولة المناقشة</span>
          <h2>صف كلمتك!</h2>
        </div>

        <div class="info-alert">
          <p>يبدأ اللاعب <strong style="color: ${starter.color}">${starter.name}</strong> بالوصف بكلمة واحدة أو جملة قصيرة، ثم يستمر الدور مع بقية اللاعبين في اتجاه عقارب الساعة.</p>
        </div>

        <div class="players-status-grid">
          ${gamePlayers.map(p => `
            <div class="player-status-card ${p.active ? 'active' : 'kicked'}" style="border-right: 4px solid ${p.color}">
              <span class="p-emoji">${p.emoji}</span>
              <span class="p-name">${p.name}</span>
              <span class="p-status">${p.active ? '🟢 يلعب' : '🔴 مستبعد'}</span>
            </div>
          `).join('')}
        </div>

        <div class="game-rules-tip">
          💡 <strong>قاعدة اللعبة:</strong> لا تقل كلمتك السرية صراحة، صفها بذكاء بحيث يفهمك "المواطن" ولكن لا يفهمك "الجاسوس".
        </div>

        <div class="game-controls">
          <button class="btn btn-primary btn-large" id="btn-start-voting">
            <span>الانتقال إلى التصويت 🗳️</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-start-voting').addEventListener('click', () => {
      Sounds.playClick();
      renderVotingScreen();
    });
  };

  const renderVotingScreen = () => {
    const activePlayers = gamePlayers.filter(p => p.active);

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in">
        <div class="game-header">
          <span class="game-badge">التصويت</span>
          <h2>من هو الجاسوس؟</h2>
        </div>

        <p class="vote-instruction">تناقشوا معاً واختاروا الشخص المشتبه به بالضغط على اسمه لطرده:</p>

        <div class="vote-players-list">
          ${activePlayers.map(p => `
            <button class="vote-player-btn" data-id="${p.id}" style="background: rgba(255,255,255,0.05); border-left: 5px solid ${p.color}">
              <div class="vote-player-info">
                <span class="vote-emoji">${p.emoji}</span>
                <span class="vote-name">${p.name}</span>
              </div>
              <span class="vote-action">طرد ❌</span>
            </button>
          `).join('')}
        </div>

        <div class="game-controls" style="margin-top: 20px;">
          <button class="btn btn-outline" id="btn-back-discussion">
            <span>العودة للمناقشة</span>
          </button>
        </div>
      </div>
    `;

    document.querySelectorAll('.vote-player-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(btn.getAttribute('data-id'));
        const target = gamePlayers.find(p => p.id === id);
        showConfirmKickModal(target);
      });
    });

    document.getElementById('btn-back-discussion').addEventListener('click', () => {
      Sounds.playClick();
      renderDiscussionScreen();
    });
  };

  const showConfirmKickModal = (target) => {
    Sounds.playClick();
    
    const modal = document.createElement('div');
    modal.className = 'custom-modal-overlay animate-fade-in';
    modal.innerHTML = `
      <div class="custom-modal-card animate-zoom-in">
        <h3>تأكيد الاستبعاد 🗳️</h3>
        <p>هل اتفقتم على طرد اللاعب <strong style="color: ${target.color}">${target.name}</strong>؟</p>
        <div class="modal-buttons">
          <button class="btn btn-primary" id="modal-confirm-kick">نعم، متأكدين</button>
          <button class="btn btn-outline" id="modal-cancel-kick">إلغاء</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('modal-cancel-kick').addEventListener('click', () => {
      Sounds.playClick();
      modal.remove();
    });

    document.getElementById('modal-confirm-kick').addEventListener('click', () => {
      modal.remove();
      kickPlayer(target);
    });
  };

  const kickPlayer = (target) => {
    target.active = false;
    
    let roleName = "";
    let alertClass = "";
    
    if (target.role === 'spy') {
      roleName = "🕵️‍♂️ الجاسوس!";
      alertClass = "role-spy";
      Sounds.playSuccess();
    } else if (target.role === 'undercover') {
      roleName = "👤 العميل!";
      alertClass = "role-undercover";
      Sounds.playSuccess();
    } else {
      roleName = "🟢 مواطن بريء";
      alertClass = "role-civilian";
      Sounds.playFail();
    }

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="reveal-kick-header">
          <h2>كشف الهوية 👁️</h2>
        </div>

        <div class="kicked-reveal-box ${alertClass}">
          <span class="kicked-emoji-large">${target.emoji}</span>
          <h3>تم طرد: ${target.name}</h3>
          <p class="role-reveal-text">هويته الحقيقية هي:</p>
          <div class="role-badge">${roleName}</div>
          ${target.role !== 'spy' ? `<p class="word-reveal-text">كانت كلمته: <strong>${target.word}</strong></p>` : ''}
        </div>

        <div class="game-controls">
          <button class="btn btn-primary btn-large" id="btn-continue-after-kick">
            <span>متابعة اللعب ➡️</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-continue-after-kick').addEventListener('click', () => {
      Sounds.playClick();
      checkGameOver();
    });
  };

  const checkGameOver = () => {
    const activePlayers = gamePlayers.filter(p => p.active);
    const activeSpies = activePlayers.filter(p => p.role === 'spy').length;
    const activeUndercovers = activePlayers.filter(p => p.role === 'undercover').length;

    if (activeSpies === 0 && activeUndercovers === 0) {
      renderGameOverScreen(true);
    } 
    else if (activePlayers.length <= 2) {
      renderGameOverScreen(false);
    } 
    else {
      renderDiscussionScreen();
    }
  };

  const renderGameOverScreen = (civiliansWin) => {
    if (civiliansWin) {
      Sounds.playSuccess();
    } else {
      Sounds.playFail();
    }

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">نهاية اللعبة</span>
        </div>

        <div class="victory-box ${civiliansWin ? 'victory-civilians' : 'victory-spies'}">
          <span class="victory-icon">${civiliansWin ? '🎉' : '🕵️‍♂️'}</span>
          <h2>${civiliansWin ? 'فاز المواطنون!' : 'فاز الجاسوس والعميل!'}</h2>
          <p>${civiliansWin ? 'نجحتم في كشف الجواسيس وتطهير الجلسة!' : 'نجح الجاسوس والعميل في التخفي وخداع الجميع!'}</p>
        </div>

        <div class="final-roles-table">
          <h3>هويات اللاعبين الكاملة:</h3>
          <div class="roles-list">
            ${gamePlayers.map(p => `
              <div class="role-list-row" style="border-right: 3px solid ${p.color}">
                <div class="row-user">
                  <span>${p.emoji}</span>
                  <strong>${p.name}</strong>
                </div>
                <div class="row-role">
                  <span class="badge-${p.role}">${p.role === 'spy' ? '🕵️‍♂️ جاسوس' : p.role === 'undercover' ? '👤 عميل' : '🟢 مواطن'}</span>
                </div>
                <div class="row-word">
                  <span>${p.role === 'spy' ? 'بلا كلمة' : p.word}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="game-controls-stacked">
          <button class="btn btn-primary" id="btn-replay-undercover">عب مرة أخرى 🔄</button>
          <button class="btn btn-outline" id="btn-exit-undercover">خروج للقائمة الرئيسية 🚪</button>
        </div>
      </div>
    `;

    document.getElementById('btn-replay-undercover').addEventListener('click', () => {
      Sounds.playClick();
      setupGame();
    });

    document.getElementById('btn-exit-undercover').addEventListener('click', () => {
      Sounds.playClick();
      onExitCallback();
    });
  };

  const cleanup = () => {
    // Undercover doesn't run background intervals, but we supply it for completeness
  };

  const restart = () => {
    revealIndex = 0;
    isWordVisible = false;
    startGamePlay();
  };

  return {
    init,
    cleanup,
    restart
  };
})();
