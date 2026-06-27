// Jalsa - Would You Rather (لو خيروك) Game Logic
const WouldYouRatherGame = (() => {
  let playersList = [];
  let questionsList = [];
  let currentQuestionIndex = 0;
  let currentPlayerIndex = 0;
  let roundNum = 1;
  let maxRounds = 2; // each player gets 2 prompts
  let containerEl = null;
  let onExitCallback = null;
  let playMode = 'default'; // 'default' or 'custom'
  
  let selectedOption = null; // 'a' or 'b'
  let simulatedPercentageA = 50;
  let simulatedPercentageB = 50;

  const init = (players, container, onExit) => {
    playersList = [...players].sort(() => Math.random() - 0.5); // shuffle player turn order
    containerEl = container;
    onExitCallback = onExit;

    const settings = window.GameSettings.get('would_you_rather');
    maxRounds = settings.rounds;

    currentQuestionIndex = 0;
    currentPlayerIndex = 0;
    roundNum = 1;
    selectedOption = null;
    playMode = 'default';

    renderLobbyScreen();
  };

  const renderLobbyScreen = () => {
    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">لو خيروك؟ 🤔</span>
          <h2>إعداد اللعبة ⚙️</h2>
        </div>

        <div class="bomb-intro-box">
          <span class="bomb-large-emoji">🤔</span>
          <p class="intro-text">سيعرض لك التطبيق خيارات صعبة ومحيرة لتختار منها وتناقش أصدقاءك!</p>
        </div>

        <div class="category-selection-box" style="margin-bottom: 20px;">
          <h4>اختر الأسئلة:</h4>
          <div style="display: flex; gap: 15px; justify-content: center; margin-top: 15px;">
            <button class="btn btn-outline mode-btn ${playMode === 'default' ? 'active' : ''}" id="btn-wyr-mode-default" style="flex: 1; padding: 15px 10px;">
              <span style="font-size: 1.5rem; display: block; margin-bottom: 5px;">🌍</span>
              <span>أسئلة عامة</span>
            </button>
            <button class="btn btn-outline mode-btn ${playMode === 'custom' ? 'active' : ''}" id="btn-wyr-mode-custom" style="flex: 1; padding: 15px 10px;">
              <span style="font-size: 1.5rem; display: block; margin-bottom: 5px;">📝</span>
              <span>أسئلة مخصصة</span>
            </button>
          </div>
        </div>

        <!-- Settings Box -->
        ${(() => {
          const settings = window.GameSettings ? window.GameSettings.get('would_you_rather') : { rounds: 2 };
          return `
            <div class="settings-box" style="margin-top: 20px; margin-bottom: 20px; background: rgba(255,255,255,0.02); padding: 15px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); text-align: right;">
              <h4 style="margin-bottom: 12px; color: var(--accent);">⚙️ إعدادات اللعبة:</h4>
              <div style="display: flex; gap: 15px; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.9rem; color: #fff;">عدد الجولات لكل لاعب:</span>
                <div style="display: flex; gap: 5px; align-items: center;">
                  <button class="btn btn-outline" id="btn-wyr-rounds-dec" style="padding: 2px 10px; font-size: 0.8rem;">-</button>
                  <span id="lbl-wyr-rounds" style="font-weight: 700; min-width: 20px; text-align: center;">${settings.rounds}</span>
                  <button class="btn btn-outline" id="btn-wyr-rounds-inc" style="padding: 2px 10px; font-size: 0.8rem;">+</button>
                </div>
              </div>
            </div>
          `;
        })()}

        <div class="game-controls">
          <button class="btn btn-primary btn-large" id="btn-wyr-start-lobby" style="width: 100%;">
            <span>ابدأ اللعب ➡️</span>
          </button>
        </div>
      </div>
    `;

    const btnDefault = document.getElementById('btn-wyr-mode-default');
    const btnCustom = document.getElementById('btn-wyr-mode-custom');

    btnDefault.addEventListener('click', () => {
      Sounds.playClick();
      playMode = 'default';
      btnDefault.classList.add('active');
      btnCustom.classList.remove('active');
    });

    btnCustom.addEventListener('click', () => {
      Sounds.playClick();
      if (CustomCreator.getWyrQuestions().length === 0) {
        showCustomAlert("لم تقم بإضافة أسئلة مخصصة بعد! يمكنك إضافتها من شاشة 'كروتي الخاصة'.");
        return;
      }
      playMode = 'custom';
      btnCustom.classList.add('active');
      btnDefault.classList.remove('active');
    });

    document.getElementById('btn-wyr-start-lobby').addEventListener('click', () => {
      Sounds.playClick();
      prepareQuestions();
      renderTurnIntro();
    });

    // WYR settings adjustments
    document.getElementById('btn-wyr-rounds-dec').addEventListener('click', () => {
      Sounds.playClick();
      const s = window.GameSettings.get('would_you_rather');
      if (s.rounds > 1) {
        s.rounds--;
        window.GameSettings.set('would_you_rather', s);
        renderLobbyScreen();
      }
    });

    document.getElementById('btn-wyr-rounds-inc').addEventListener('click', () => {
      Sounds.playClick();
      const s = window.GameSettings.get('would_you_rather');
      if (s.rounds < 5) {
        s.rounds++;
        window.GameSettings.set('would_you_rather', s);
        renderLobbyScreen();
      }
    });
  };

  const prepareQuestions = () => {
    let allQuestions = [];
    if (playMode === 'custom') {
      allQuestions = CustomCreator.getWyrQuestions();
    } else {
      allQuestions = WordBank.would_you_rather || [];
    }

    if (allQuestions.length === 0) {
      allQuestions = WordBank.would_you_rather || [];
    }

    const unplayed = WordHistoryManager.getUnplayedItems('would_you_rather', playMode, allQuestions);
    questionsList = [...unplayed].sort(() => Math.random() - 0.5);
  };

  const renderTurnIntro = () => {
    const activePlayer = playersList[currentPlayerIndex];
    selectedOption = null;

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">لو خيروك؟ 🤔</span>
          <h2>دور اللاعب التالي</h2>
        </div>

        <div class="charades-prep-box" style="border: 2px solid ${activePlayer.color}; margin: 40px 0;">
          <span class="actor-tag">مرر الهاتف إلى:</span>
          <div class="actor-avatar" style="background: ${activePlayer.color}33; color: ${activePlayer.color}; border: 3px solid ${activePlayer.color};">
            <span>${activePlayer.emoji}</span>
          </div>
          <h2 style="color: #fff; font-size: 1.8rem; margin-top: 10px;">${activePlayer.name}</h2>
          
          <div class="prep-instruction" style="text-align: center; margin-top: 20px;">
            <p>سيعرض لك التطبيق خيارين صعبين.</p>
            <p>اختر أحدهما وناقش أصدقاءك في سبب اختيارك! 💬</p>
          </div>
        </div>

        <div class="game-controls">
          <button class="btn btn-primary btn-large" id="btn-start-wyr-prompt">
            <span>عرض الخيارات 👀</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-start-wyr-prompt').addEventListener('click', () => {
      Sounds.playClick();
      renderPromptScreen();
    });
  };

  const renderPromptScreen = () => {
    const activePlayer = playersList[currentPlayerIndex];
    const question = questionsList[currentQuestionIndex % questionsList.length];
    WordHistoryManager.markAsPlayed('would_you_rather', 'default', question);

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center" style="display: flex; flex-direction: column; min-height: 480px;">
        <div class="charades-game-header" style="margin-bottom: 20px;">
          <div class="c-header-item text-right" style="width: 50%;">
            <span class="c-lbl">اللاعب الحالي:</span>
            <strong class="c-val" style="color: ${activePlayer.color}">${activePlayer.emoji} ${activePlayer.name}</strong>
          </div>
          <div class="c-header-item text-left" style="width: 50%;">
            <span class="c-lbl">الجولة:</span>
            <strong class="c-val text-accent">${roundNum} / ${maxRounds}</strong>
          </div>
        </div>

        <h3 style="margin-bottom: 20px; font-size: 1.2rem; color: var(--text-muted);">لو خيروك، ماذا تختار؟ 🤔</h3>

        <div class="wyr-options-container" style="display: flex; flex-direction: column; gap: 15px; flex: 1; justify-content: center;">
          <!-- Option A (Red/Orange Theme) -->
          <div class="wyr-card option-a" id="wyr-opt-a" style="background: rgba(255, 94, 98, 0.05); border: 2px solid rgba(255, 94, 98, 0.2); border-radius: 20px; padding: 20px; cursor: pointer; transition: all 0.3s ease; position: relative; overflow: hidden;">
            <div class="wyr-percentage-bar" id="bar-a" style="position: absolute; right: 0; top: 0; bottom: 0; background: rgba(255, 94, 98, 0.15); width: 0%; transition: width 0.8s cubic-bezier(0.1, 0.8, 0.3, 1);"></div>
            <div class="wyr-card-content" style="position: relative; z-index: 2; display: flex; justify-content: space-between; align-items: center; direction: rtl;">
              <span class="wyr-text" style="font-size: 1.05rem; font-weight: 700; color: #fff; text-align: right;">${question.a}</span>
              <span class="wyr-pct" id="pct-a" style="font-size: 1.3rem; font-weight: 800; color: #ff5e62; display: none;">0%</span>
            </div>
          </div>

          <!-- Option B (Blue/Cyan Theme) -->
          <div class="wyr-card option-b" id="wyr-opt-b" style="background: rgba(0, 242, 254, 0.05); border: 2px solid rgba(0, 242, 254, 0.2); border-radius: 20px; padding: 20px; cursor: pointer; transition: all 0.3s ease; position: relative; overflow: hidden;">
            <div class="wyr-percentage-bar" id="bar-b" style="position: absolute; right: 0; top: 0; bottom: 0; background: rgba(0, 242, 254, 0.15); width: 0%; transition: width 0.8s cubic-bezier(0.1, 0.8, 0.3, 1);"></div>
            <div class="wyr-card-content" style="position: relative; z-index: 2; display: flex; justify-content: space-between; align-items: center; direction: rtl;">
              <span class="wyr-text" style="font-size: 1.05rem; font-weight: 700; color: #fff; text-align: right;">${question.b}</span>
              <span class="wyr-pct" id="pct-b" style="font-size: 1.3rem; font-weight: 800; color: #00f2fe; display: none;">0%</span>
            </div>
          </div>
        </div>

        <div class="game-controls" id="wyr-next-control" style="margin-top: 25px; display: none;">
          <button class="btn btn-primary btn-large" id="btn-next-wyr">
            <span>التالي ➡️</span>
          </button>
        </div>
      </div>
    `;

    const optA = document.getElementById('wyr-opt-a');
    const optB = document.getElementById('wyr-opt-b');

    const handleSelect = (choice) => {
      if (selectedOption !== null) return; // prevent double clicks
      selectedOption = choice;
      Sounds.playSuccess();

      // Generate funny simulated percentages (complementary)
      simulatedPercentageA = Math.floor(Math.random() * 51) + 25; // 25% to 75%
      simulatedPercentageB = 100 - simulatedPercentageA;

      // Update styling to show selected and show results
      if (choice === 'a') {
        optA.style.borderColor = '#ff5e62';
        optA.style.boxShadow = '0 0 15px rgba(255, 94, 98, 0.3)';
        optB.style.opacity = '0.4';
      } else {
        optB.style.borderColor = '#00f2fe';
        optB.style.boxShadow = '0 0 15px rgba(0, 242, 254, 0.3)';
        optA.style.opacity = '0.4';
      }

      // Display percentages with animations
      document.getElementById('pct-a').style.display = 'block';
      document.getElementById('pct-b').style.display = 'block';
      document.getElementById('pct-a').textContent = `${simulatedPercentageA}%`;
      document.getElementById('pct-b').textContent = `${simulatedPercentageB}%`;

      document.getElementById('bar-a').style.width = `${simulatedPercentageA}%`;
      document.getElementById('bar-b').style.width = `${simulatedPercentageB}%`;

      // Show next control button
      document.getElementById('wyr-next-control').style.display = 'block';
    };

    optA.addEventListener('click', () => handleSelect('a'));
    optB.addEventListener('click', () => handleSelect('b'));

    document.getElementById('btn-next-wyr').addEventListener('click', () => {
      Sounds.playClick();
      progressGame();
    });
  };

  const progressGame = () => {
    currentQuestionIndex++;
    currentPlayerIndex++;

    if (currentPlayerIndex >= playersList.length) {
      currentPlayerIndex = 0;
      roundNum++;
    }

    if (roundNum > maxRounds) {
      renderGameOverScreen();
    } else {
      renderTurnIntro();
    }
  };

  const renderGameOverScreen = () => {
    Sounds.playSuccess();

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">انتهت الأسئلة! 💬</span>
        </div>

        <div class="victory-box victory-draw" style="margin: 30px 0;">
          <span class="victory-icon">💬</span>
          <h2>انتهت الجلسة الحوارية!</h2>
          <p>لقد أجبتم على جميع التساؤلات الصعبة. هل تفاجأتم بخيارات أصدقائكم؟ ناقشوا خياراتكم الآن!</p>
        </div>

        <div class="game-controls-stacked">
          <button class="btn btn-primary" id="btn-replay-wyr">لعب من جديد 🔄</button>
          <button class="btn btn-outline" id="btn-exit-wyr">خروج للقائمة الرئيسية 🚪</button>
        </div>
      </div>
    `;

    document.getElementById('btn-replay-wyr').addEventListener('click', () => {
      Sounds.playClick();
      init(playersList, containerEl, onExitCallback);
    });

    document.getElementById('btn-exit-wyr').addEventListener('click', () => {
      Sounds.playClick();
      onExitCallback();
    });
  };

  const cleanup = () => {
    // No timers to clean up in this game
  };

  const restart = () => {
    playersList = [...playersList].sort(() => Math.random() - 0.5);
    
    const settings = window.GameSettings.get('would_you_rather');
    maxRounds = settings.rounds;

    currentQuestionIndex = 0;
    currentPlayerIndex = 0;
    roundNum = 1;
    selectedOption = null;

    prepareQuestions();
    renderTurnIntro();
  };

  return {
    init,
    cleanup,
    restart
  };
})();
