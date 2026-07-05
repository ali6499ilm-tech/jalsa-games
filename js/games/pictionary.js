// Jalsa - Pictionary Game Logic
const PictionaryGame = (() => {
  let playersList = [];
  let gamePlayers = [];
  let containerEl = null;
  let exitCallback = null;

  // Game Settings & State
  let selectedCategories = ["عشوائي"];
  let playMode = 'default'; // 'default' or 'custom'
  let currentRound = 1;
  let maxRounds = 3;
  let roundDuration = 60; // in seconds
  let simplifyWords = true;
  let currentPlayerIndex = 0;
  let timerInterval = null;
  let timerVal = 0;
  let currentWord = "";
  
  // Drawing Canvas State
  let canvas = null;
  let ctx = null;
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let strokeColor = "#00f2fe"; // default color
  let strokeWidth = 5; // default size

  const init = (players, container, onExit) => {
    playersList = players;
    containerEl = container;
    exitCallback = onExit;

    // Reset scores & state
    gamePlayers = players.map(p => ({
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      color: p.color,
      score: 0
    }));

    currentRound = 1;
    currentPlayerIndex = 0;
    playMode = 'default';
    selectedCategories = ["عشوائي"];

    // Load saved settings if any
    const savedSettings = window.GameSettings ? window.GameSettings.get('pictionary') : { time: 60, rounds: 3, simplifyWords: true };
    roundDuration = savedSettings ? savedSettings.time : 60;
    maxRounds = savedSettings ? savedSettings.rounds : 3;
    simplifyWords = savedSettings && savedSettings.simplifyWords !== undefined ? savedSettings.simplifyWords : true;

    // Inject styles dynamically if not already injected
    if (!document.getElementById('pictionary-styles')) {
      const styles = document.createElement('style');
      styles.id = 'pictionary-styles';
      styles.innerHTML = `
        .pictionary-canvas-container {
          position: relative;
          width: 100%;
          height: 48vh;
          min-height: 350px;
          background: #110e20;
          border: 2px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          overflow: hidden;
          margin-bottom: 8px;
          touch-action: none;
          box-shadow: inset 0 0 20px rgba(0,0,0,0.5);
        }
        .pictionary-canvas {
          width: 100%;
          height: 100%;
          display: block;
          cursor: crosshair;
        }
        .pictionary-tools {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          background: rgba(255, 255, 255, 0.02);
          padding: 8px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .pictionary-colors {
          display: flex;
          gap: 8px;
        }
        .pictionary-color-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.15);
          cursor: pointer;
          transition: transform 0.2s, border-color 0.2s;
        }
        .pictionary-color-btn.active {
          transform: scale(1.25);
          border-color: #fff;
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.4);
        }
        .pictionary-sizes {
          display: flex;
          gap: 6px;
        }
        .pictionary-size-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          width: 34px;
          height: 34px;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          transition: background-color 0.2s;
        }
        .pictionary-size-btn.active {
          background: var(--primary);
          color: #000;
          border-color: var(--primary);
          font-weight: 700;
        }
        .pictionary-btn-action {
          padding: 8px 14px;
          font-size: 0.85rem;
          border-radius: 10px;
        }
        .artist-card-box {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          padding: 20px;
          border-radius: 20px;
          margin-bottom: 20px;
        }
        .word-reveal-box {
          background: rgba(0, 242, 254, 0.08);
          border: 2px dashed var(--primary);
          padding: 25px;
          border-radius: 20px;
          margin: 25px 0;
          font-size: 2.2rem;
          font-weight: 800;
          color: var(--primary);
          letter-spacing: 1px;
          animation: pulse 2s infinite;
        }
      `;
      document.head.appendChild(styles);
    }

    renderLobbyScreen();
  };

  const renderLobbyScreen = () => {
    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">لعبة الرسم 🎨</span>
          <h2>إعداد اللعبة ⚙️</h2>
        </div>

        <div class="bomb-intro-box">
          <span class="bomb-large-emoji">🎨</span>
          <p class="intro-text">شخبط وارسم! يظهر التطبيق كلمة سرية للاعب الحالي، ويقوم برسمها بإصبعه على الشاشة، بينما يحاول بقية اللاعبين تخمينها قبل انتهاء الوقت.</p>
        </div>

        <div class="category-selection-box">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h4 style="margin: 0;">اختر تصنيف الكلمات:</h4>
            <button class="btn btn-outline" id="btn-quick-add-pictionary" style="font-size: 0.8rem; padding: 6px 12px; border-radius: 8px; display: flex; align-items: center; gap: 4px; border-color: var(--primary); color: #fff;">
              <span>➕ إضافة كروت</span>
            </button>
          </div>
          <div class="category-buttons-grid">
            <button class="cat-select-btn ${selectedCategories.includes("عشوائي") ? 'active' : ''}" data-cat="عشوائي">🎲 عشوائي</button>
            ${CustomCreator.getCustomWords().length > 0 ? `
              <button class="cat-select-btn ${selectedCategories.includes("📝 كروتي المخصصة") ? 'active' : ''}" data-cat="📝 كروتي المخصصة">📝 كروتي المخصصة</button>
            ` : ''}
            ${Object.keys(WordBank.charades).map(cat => {
              const icons = { "فواكه وخضروات": "🍎", "وظائف ومهن": "👨‍⚕️", "نوادي ومنتخبات": "🏆", "حيوانات وأشياء": "🦁", "أفعال وحركات": "🏃‍♂️", "كرتون وأفلام": "🎬", "ألعاب وتكنولوجيا": "🎮", "أمثال وتعبيرات": "💬", "ماركات وشركات": "🏷️", "أماكن ومعالم": "🏛️" };
              const isLocked = window.isCategoryLocked('charades', cat);
              const isActive = selectedCategories.includes(cat);
              return `<button class="cat-select-btn ${isLocked ? 'premium-locked' : ''} ${isActive ? 'active' : ''}" data-cat="${cat}">
                ${isLocked ? '🔒 ' : ''}${icons[cat] || "🏷️"} ${cat}
              </button>`;
            }).join('')}
          </div>
        </div>

        <!-- Settings Box -->
        <div class="settings-box" style="margin-top: 20px; margin-bottom: 20px; background: rgba(255,255,255,0.02); padding: 15px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); text-align: right;">
          <h4 style="margin-bottom: 12px; color: var(--accent);">⚙️ إعدادات اللعبة:</h4>
          <div style="display: flex; gap: 15px; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-size: 0.9rem; color: #fff;">وقت الرسم لكل لاعب:</span>
            <div style="display: flex; gap: 5px; align-items: center;">
              <button class="btn btn-outline" id="btn-pic-time-dec" style="padding: 2px 10px; font-size: 0.8rem;">-</button>
              <span id="lbl-pic-time" style="font-weight: 700; min-width: 30px; text-align: center;">${roundDuration}ث</span>
              <button class="btn btn-outline" id="btn-pic-time-inc" style="padding: 2px 10px; font-size: 0.8rem;">+</button>
            </div>
          </div>
          <div style="display: flex; gap: 15px; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-size: 0.9rem; color: #fff;">عدد الجولات:</span>
            <div style="display: flex; gap: 5px; align-items: center;">
              <button class="btn btn-outline" id="btn-pic-rounds-dec" style="padding: 2px 10px; font-size: 0.8rem;">-</button>
              <span id="lbl-pic-rounds" style="font-weight: 700; min-width: 20px; text-align: center;">${maxRounds}</span>
              <button class="btn btn-outline" id="btn-pic-rounds-inc" style="padding: 2px 10px; font-size: 0.8rem;">+</button>
            </div>
          </div>
          <div style="display: flex; gap: 15px; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.9rem; color: #fff;">نمط الكلمة الواحدة 📝:</span>
            <label class="switch-container" style="display: inline-flex; position: relative; width: 44px; height: 24px; cursor: pointer; align-items: center;">
              <input type="checkbox" id="chk-pictionary-simplify" ${simplifyWords !== false ? 'checked' : ''} style="opacity: 0; width: 0; height: 0; position: absolute;">
              <span class="switch-slider" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: ${simplifyWords !== false ? 'var(--primary)' : 'rgba(255,255,255,0.15)'}; transition: .3s; border-radius: 34px; border: 1px solid rgba(255,255,255,0.25);">
                <span class="switch-knob" style="position: absolute; content: ''; height: 16px; width: 16px; left: ${simplifyWords !== false ? '22px' : '4px'}; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></span>
              </span>
            </label>
          </div>
        </div>

        <div class="active-players-list-simple">
          <h4>اللاعبون المشاركون (${gamePlayers.length}):</h4>
          <div class="players-badges-container">
            ${gamePlayers.map(p => `
              <span class="player-mini-badge" style="background: ${p.color}">
                <span>${p.emoji}</span> ${p.name}
              </span>
            `).join('')}
          </div>
        </div>

        <div class="game-controls">
          <button class="btn btn-primary btn-large" id="btn-start-pictionary-setup" style="width: 100%;">
            <span>ابدأ اللعب 🎨🚀</span>
          </button>
        </div>
      </div>
    `;

    // Category button selection toggle
    const catButtons = containerEl.querySelectorAll('.cat-select-btn');
    const updateCategoryButtonsUI = () => {
      catButtons.forEach(b => {
        const bCat = b.getAttribute('data-cat');
        if (selectedCategories.includes(bCat)) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
    };

    catButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        Sounds.playClick();
        const cat = btn.getAttribute('data-cat');
        if (window.isCategoryLocked('charades', cat)) {
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
        updateCategoryButtonsUI();
      });
    });

    // Quick Add Cards Event Listener
    const quickAddBtn = containerEl.querySelector('#btn-quick-add-pictionary');
    if (quickAddBtn) {
      quickAddBtn.addEventListener('click', () => {
        Sounds.playClick();
        window.openQuickAddModal('pictionary', () => {
          if (CustomCreator.getCustomWords().length > 0) {
            selectedCategories = ["📝 كروتي المخصصة"];
          }
          renderLobbyScreen();
        });
      });
    }

    // Settings adjustments event listeners
    document.getElementById('btn-pic-time-dec').addEventListener('click', () => {
      Sounds.playClick();
      if (roundDuration > 15) {
        roundDuration -= 15;
        saveSettings();
        document.getElementById('lbl-pic-time').innerText = roundDuration + "ث";
      }
    });

    document.getElementById('btn-pic-time-inc').addEventListener('click', () => {
      Sounds.playClick();
      if (roundDuration < 180) {
        roundDuration += 15;
        saveSettings();
        document.getElementById('lbl-pic-time').innerText = roundDuration + "ث";
      }
    });

    document.getElementById('btn-pic-rounds-dec').addEventListener('click', () => {
      Sounds.playClick();
      if (maxRounds > 1) {
        maxRounds--;
        saveSettings();
        document.getElementById('lbl-pic-rounds').innerText = maxRounds;
      }
    });

    document.getElementById('btn-pic-rounds-inc').addEventListener('click', () => {
      Sounds.playClick();
      if (maxRounds < 5) {
        maxRounds++;
        saveSettings();
        document.getElementById('lbl-pic-rounds').innerText = maxRounds;
      }
    });

    document.getElementById('btn-start-pictionary-setup').addEventListener('click', () => {
      Sounds.playClick();
      startNewTurn();
    });

    const chkSimplify = containerEl.querySelector('#chk-pictionary-simplify');
    if (chkSimplify) {
      chkSimplify.addEventListener('change', () => {
        Sounds.playClick();
        simplifyWords = chkSimplify.checked;
        saveSettings();
        
        const slider = chkSimplify.nextElementSibling;
        const knob = slider.querySelector('.switch-knob');
        if (chkSimplify.checked) {
          slider.style.backgroundColor = 'var(--primary)';
          knob.style.left = '22px';
        } else {
          slider.style.backgroundColor = 'rgba(255,255,255,0.15)';
          knob.style.left = '4px';
        }
      });
    }
  };

  const saveSettings = () => {
    if (window.GameSettings) {
      window.GameSettings.set('pictionary', { time: roundDuration, rounds: maxRounds, simplifyWords: simplifyWords });
    }
  };

  const startNewTurn = () => {
    const artist = gamePlayers[currentPlayerIndex];
    
    // Choose random word from selected categories
    let chosenCats = [];
    if (selectedCategories.includes("عشوائي") || selectedCategories.length === 0) {
      let keys = Object.keys(WordBank.charades);
      if (!window.isProUser()) {
        keys = keys.filter(k => !window.isCategoryLocked('charades', k));
      }
      chosenCats = keys;
    } else {
      chosenCats = selectedCategories;
    }

    let wordList = [];
    chosenCats.forEach(cat => {
      if (cat === "📝 كروتي المخصصة") {
        wordList = wordList.concat(CustomCreator.getCustomWords());
      } else if (WordBank.charades[cat] && WordBank.charades[cat].words) {
        wordList = wordList.concat(WordBank.charades[cat].words);
      }
    });

    if (wordList.length === 0) {
      wordList = WordBank.charades["حيوانات وأشياء"].words;
    }

    const shouldSimplify = simplifyWords !== false;

    const processedWords = Array.from(new Set(wordList.map(w => {
      return shouldSimplify ? window.simplifyWord(w) : window.cleanWord(w);
    })));

    const unplayedWords = WordHistoryManager.getUnplayedItems('pictionary', 'all_words', processedWords);
    currentWord = unplayedWords[Math.floor(Math.random() * unplayedWords.length)];
    if (!currentWord && processedWords.length > 0) {
      currentWord = processedWords[Math.floor(Math.random() * processedWords.length)];
    }
    WordHistoryManager.markAsPlayed('pictionary', 'all_words', currentWord);

    // Show ready screen
    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">الجولة ${currentRound} من ${maxRounds}</span>
          <h2>دور الرسام 🎨</h2>
        </div>

        <div class="artist-card-box" style="border-right: 5px solid ${artist.color}">
          <span style="font-size: 3rem; display: block; margin-bottom: 10px;">${artist.emoji}</span>
          <h3 style="font-size: 1.5rem;">الرسام الحالي: <strong style="color: ${artist.color}">${artist.name}</strong></h3>
          <p style="color: var(--text-muted); font-size: 0.95rem; margin-top: 5px;">يجب على الرسام مسك الهاتف بمفرده وتأكيد الاستعداد لعرض الكلمة السرية.</p>
        </div>

        <div class="game-controls">
          <button class="btn btn-primary btn-large" id="btn-show-secret-word" style="width: 100%;">
            <span>أنا جاهز لعرض الكلمة السرية 👁️</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-show-secret-word').addEventListener('click', () => {
      Sounds.playClick();
      renderWordRevealScreen();
    });
  };

  const renderWordRevealScreen = () => {
    const artist = gamePlayers[currentPlayerIndex];

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">سري 🤫</span>
          <h2>الكلمة السرية للرسام 👁️</h2>
        </div>

        <p style="font-size: 1.1rem; color: #ff5e62; font-weight: 700; margin-bottom: 15px;">⚠️ لا تدع اللاعبين الآخرين يرون الشاشة!</p>

        <div class="word-reveal-box">
          ${currentWord}
        </div>

        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 30px;">اضغط على الزر أدناه لبدء الرسم وتشغيل العداد.</p>

        <div class="game-controls">
          <button class="btn btn-primary btn-large" id="btn-start-drawing-canvas" style="width: 100%;">
            <span>ابدأ الرسم الآن 🎨⏱️</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-start-drawing-canvas').addEventListener('click', () => {
      Sounds.playClick();
      renderDrawingCanvasScreen();
    });
  };

  const renderDrawingCanvasScreen = () => {
    const artist = gamePlayers[currentPlayerIndex];

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in" style="padding: 10px; max-width: 550px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; direction: rtl;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.5rem;">🎨</span>
            <span style="font-size: 1rem; font-weight: 700;">الرسام: <strong style="color: ${artist.color}">${artist.name}</strong></span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span id="pictionary-timer" style="font-weight: 800; font-size: 1.3rem; color: var(--primary); background: rgba(0, 242, 254, 0.1); padding: 5px 12px; border-radius: 12px;">${roundDuration}ث</span>
          </div>
        </div>

        <div style="text-align: center; margin-bottom: 10px; background: rgba(255,255,255,0.02); padding: 8px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);">
          <span style="font-size: 0.85rem; color: var(--text-muted);">الكلمة المطلوب رسمها: </span>
          <strong style="color: var(--primary); font-size: 1.1rem; filter: blur(5px); cursor: pointer; transition: filter 0.3s;" id="pic-blur-word" title="انقر لعرض الكلمة مؤقتاً">${currentWord}</strong>
          <span style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-top: 2px;">(انقر فوق الكلمة أعلاه لكشفها مؤقتاً)</span>
        </div>

        <!-- Canvas Drawing Area -->
        <div class="pictionary-canvas-container">
          <canvas id="pictionary-drawing-board" class="pictionary-canvas"></canvas>
        </div>

        <!-- Canvas Tools & Controls -->
        <div class="pictionary-tools" style="direction: rtl;">
          <div class="pictionary-colors">
            <div class="pictionary-color-btn active" data-color="#00f2fe" style="background: #00f2fe;"></div>
            <div class="pictionary-color-btn" data-color="#ff5e62" style="background: #ff5e62;"></div>
            <div class="pictionary-color-btn" data-color="#00e676" style="background: #00e676;"></div>
            <div class="pictionary-color-btn" data-color="#ffd54f" style="background: #ffd54f;"></div>
            <div class="pictionary-color-btn" data-color="#bd00ff" style="background: #bd00ff;"></div>
            <div class="pictionary-color-btn" data-color="#ffffff" style="background: #ffffff;"></div>
            <div class="pictionary-color-btn" data-color="#110e20" style="background: #110e20; border: 1px dashed rgba(255,255,255,0.5);" title="ممحاة">🧹</div>
          </div>

          <div class="pictionary-sizes">
            <button class="pictionary-size-btn active" data-size="4">✏️</button>
            <button class="pictionary-size-btn" data-size="8">🖌️</button>
            <button class="pictionary-size-btn" data-size="16">🪥</button>
          </div>

          <button class="btn btn-outline pictionary-btn-action" id="btn-clear-canvas" style="border-color: var(--danger); color: var(--danger);">🗑️ مسح</button>
        </div>

        <div style="display: flex; gap: 12px; direction: rtl; margin-top: 15px;">
          <button class="btn btn-primary" id="btn-pic-guessed" style="flex: 2; padding: 14px;">
            <span>✅ تم التخمين بنجاح!</span>
          </button>
          <button class="btn btn-outline" id="btn-pic-failed" style="flex: 1; padding: 14px; border-color: rgba(255,255,255,0.2);">
            <span>❌ تخطي / فشل</span>
          </button>
        </div>
      </div>
    `;

    // Hook up canvas element
    canvas = document.getElementById('pictionary-drawing-board');
    ctx = canvas.getContext('2d');

    // Make canvas buffer size match its client bounding box
    const resizeCanvas = () => {
      const rect = canvas.parentNode.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      // Canvas drawing configurations
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
    };
    
    // Initial size setup
    resizeCanvas();

    // Event listeners for drawing (Mouse and Touch support)
    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      if (e.touches && e.touches.length > 0) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top
        };
      }
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    const startDraw = (e) => {
      isDrawing = true;
      const pos = getPos(e);
      lastX = pos.x;
      lastY = pos.y;
      
      // Draw a small dot on initial touch
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(lastX, lastY);
      ctx.stroke();
    };

    const draw = (e) => {
      if (!isDrawing) return;
      if (e.cancelable) e.preventDefault(); // prevent scrolling
      
      const pos = getPos(e);
      
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      
      lastX = pos.x;
      lastY = pos.y;
    };

    const stopDraw = () => {
      isDrawing = false;
    };

    // Touch Support
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDraw);
    canvas.addEventListener('touchcancel', stopDraw);

    // Mouse Support
    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseout', stopDraw);

    // Tools UI logic
    const colorBtns = containerEl.querySelectorAll('.pictionary-color-btn');
    colorBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        Sounds.playClick();
        colorBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        strokeColor = btn.getAttribute('data-color');
        ctx.strokeStyle = strokeColor;
      });
    });

    const sizeBtns = containerEl.querySelectorAll('.pictionary-size-btn');
    sizeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        Sounds.playClick();
        sizeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        strokeWidth = parseInt(btn.getAttribute('data-size'), 10);
        ctx.lineWidth = strokeWidth;
      });
    });

    document.getElementById('btn-clear-canvas').addEventListener('click', () => {
      Sounds.playFail();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    // Blur / reveal word feature
    const wordLabel = document.getElementById('pic-blur-word');
    const onReveal = () => { wordLabel.style.filter = 'none'; };
    const onHide = () => { wordLabel.style.filter = 'blur(5px)'; };
    
    wordLabel.addEventListener('mousedown', onReveal);
    wordLabel.addEventListener('mouseup', onHide);
    wordLabel.addEventListener('touchstart', onReveal);
    wordLabel.addEventListener('touchend', onHide);

    // Start timer countdown
    timerVal = roundDuration;
    const timerLabel = document.getElementById('pictionary-timer');
    
    timerInterval = setInterval(() => {
      timerVal--;
      if (timerLabel) {
        timerLabel.innerText = timerVal + "ث";
        
        // Critical countdown feedback
        if (timerVal <= 10) {
          timerLabel.style.color = '#ff5e62';
          timerLabel.style.background = 'rgba(255, 94, 98, 0.1)';
          if (Sounds.playTick) Sounds.playTick(1.5);
        } else {
          if (Sounds.playTick) Sounds.playTick(1.0);
        }
      }

      if (timerVal <= 0) {
        handleTurnEnd(false);
      }
    }, 1000);

    // Hook game completion events
    document.getElementById('btn-pic-guessed').addEventListener('click', () => {
      handleTurnEnd(true);
    });

    document.getElementById('btn-pic-failed').addEventListener('click', () => {
      handleTurnEnd(false);
    });
  };

  const handleTurnEnd = (success) => {
    // Clear timer
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    const artist = gamePlayers[currentPlayerIndex];
    let earnedPoints = 0;

    if (success) {
      Sounds.playSuccess();
      earnedPoints = 10;
      artist.score += earnedPoints;
    } else {
      Sounds.playFail();
    }

    // Display intermediate score reveal screen
    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">النتيجة</span>
          <h2>حالة التخمين 👁️</h2>
        </div>

        <div class="victory-box ${success ? 'victory-civilians' : 'victory-spies'}" style="margin: 25px 0; padding: 25px;">
          <span class="victory-icon" style="font-size: 3.5rem;">${success ? '🎉' : '⏱️'}</span>
          <h2>${success ? 'تم التخمين بنجاح!' : 'انتهى الوقت / تم التخطي'}</h2>
          <p>${success ? `حصل الرسام ${artist.name} على <strong>+10</strong> نقاط!` : 'لم يحصل الرسام على أي نقاط هذه الجولة.'}</p>
        </div>

        <div class="final-roles-table">
          <h3>الكلمة كانت: <strong style="color: var(--primary);">${currentWord}</strong></h3>
          <h3 style="margin-top: 25px; margin-bottom: 12px; font-size: 1.05rem;">نقاط سهرة الرسم:</h3>
          <div class="roles-list">
            ${[...gamePlayers].sort((a,b) => b.score - a.score).map((p, idx) => `
              <div class="role-list-row" style="border-right: 3px solid ${p.color}">
                <div class="row-user">
                  <span>${p.emoji}</span>
                  <strong>${p.name}</strong>
                </div>
                <div class="row-role">
                  <span>المركز #${idx + 1}</span>
                </div>
                <div class="row-word">
                  <strong style="color: var(--primary);">${p.score} نقطة</strong>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="game-controls">
          <button class="btn btn-primary btn-large" id="btn-pic-next-turn" style="width: 100%;">
            <span>التالي ➡️</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-pic-next-turn').addEventListener('click', () => {
      Sounds.playClick();
      
      // Advance player turn
      currentPlayerIndex++;
      if (currentPlayerIndex >= gamePlayers.length) {
        currentPlayerIndex = 0;
        currentRound++;
      }

      // Check if game is completely finished
      if (currentRound > maxRounds) {
        renderGameOverScreen();
      } else {
        startNewTurn();
      }
    });
  };

  const renderGameOverScreen = () => {
    // Sort players to find the champion
    const sorted = [...gamePlayers].sort((a,b) => b.score - a.score);
    const champion = sorted[0];

    Sounds.playSuccess();

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">الملك الرسام 👑</span>
          <h2>نهاية سهرة الرسم 🏆</h2>
        </div>

        <div class="victory-box victory-civilians" style="margin: 25px 0;">
          <span class="victory-icon" style="font-size: 4rem;">👑</span>
          <h2>الفائز هو: ${champion.name}!</h2>
          <p>أبدع في الرسم وحصل على مجموع <strong>${champion.score}</strong> نقطة!</p>
        </div>

        <div class="final-roles-table">
          <h3>النقاط النهائية للرسامين:</h3>
          <div class="roles-list">
            ${sorted.map((p, idx) => `
              <div class="role-list-row" style="border-right: 3px solid ${p.color}">
                <div class="row-user">
                  <span>${p.emoji}</span>
                  <strong>${p.name}</strong>
                </div>
                <div class="row-role">
                  <span>الترتيب #${idx + 1}</span>
                </div>
                <div class="row-word">
                  <strong>${p.score} نقطة</strong>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="game-controls-stacked">
          <button class="btn btn-primary" id="btn-replay-pictionary" style="width: 100%;">العب مرة أخرى 🔄</button>
          <button class="btn btn-outline" id="btn-exit-pictionary" style="width: 100%; border-color: rgba(255,255,255,0.15);">العودة للقائمة الرئيسية 🚪</button>
        </div>
      </div>
    `;

    document.getElementById('btn-replay-pictionary').addEventListener('click', () => {
      Sounds.playClick();
      init(playersList, containerEl, exitCallback);
    });

    document.getElementById('btn-exit-pictionary').addEventListener('click', () => {
      Sounds.playClick();
      if (exitCallback) exitCallback();
    });
  };

  const cleanup = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  };

  return {
    init,
    cleanup
  };
})();

// Register globally
window.PictionaryGame = PictionaryGame;
