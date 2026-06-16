// Jalsa - Taboo (قول بس لا تقول) Game Logic
const TabooGame = (() => {
  let playersList = [];
  let teamA = { name: "فريق ألف 🔴", players: [], score: 0 };
  let teamB = { name: "فريق باء 🔵", players: [], score: 0 };
  
  let currentRound = 1;
  const maxRounds = 3; // each team plays 3 rounds
  let currentTeam = null; // teamA or teamB
  let describerPlayer = null;
  let wordList = [];
  let currentWordIndex = 0;
  let roundScore = 0;
  let timeLeft = 60;
  let timerInterval = null;
  let selectedCategory = "عشوائي"; // default
  
  let roundWordsLog = []; // list of { word, status: 'correct' / 'skipped' }
  let containerEl = null;
  let onExitCallback = null;

  const init = (players, container, onExit) => {
    playersList = players;
    containerEl = container;
    onExitCallback = onExit;

    // Reset scores
    teamA.score = 0;
    teamB.score = 0;
    currentRound = 1;
    selectedCategory = "عشوائي";
    
    distributeTeams();
    setupCategorySelection();
  };

  const distributeTeams = () => {
    teamA.players = [];
    teamB.players = [];
    
    playersList.forEach((p, index) => {
      if (index % 2 === 0) {
        teamA.players.push(p);
      } else {
        teamB.players.push(p);
      }
    });

    currentTeam = teamA;
  };

  const setupCategorySelection = () => {
    containerEl.innerHTML = `
      <div class="game-card animate-fade-in">
        <div class="game-header">
          <span class="game-badge">قول بس لا تقول</span>
          <h2>إعدادات اللعبة 🗣️</h2>
        </div>

        <div class="teams-division-card">
          <div class="team-column col-red">
            <h3>${teamA.name}</h3>
            <ul>
              ${teamA.players.map(p => `<li style="color: ${p.color}">${p.emoji} ${p.name}</li>`).join('')}
            </ul>
          </div>
          <div class="team-column col-blue">
            <h3>${teamB.name}</h3>
            <ul>
              ${teamB.players.map(p => `<li style="color: ${p.color}">${p.emoji} ${p.name}</li>`).join('')}
            </ul>
          </div>
        </div>

        <div class="category-selection-box">
          <h4>اختر تصنيف الكلمات:</h4>
          <div class="category-buttons-grid">
            <button class="cat-select-btn active" data-cat="عشوائي">🎲 عشوائي</button>
            ${Object.keys(WordBank.taboo).map(cat => {
              const icons = { "أشياء عامة": "📦", "أجهزة وتكنولوجيا": "💻", "في المنزل": "🏠", "طعام وشراب": "🍔" };
              return `<button class="cat-select-btn" data-cat="${cat}">${icons[cat] || "🏷️"} ${cat}</button>`;
            }).join('')}
          </div>
        </div>

        <div class="game-controls">
          <button class="btn btn-primary btn-large" id="btn-start-taboo-setup">
            <span>تأكيد والذهاب للجولة الأولى 🎬</span>
          </button>
        </div>
      </div>
    `;

    const catButtons = containerEl.querySelectorAll('.cat-select-btn');
    catButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        Sounds.playClick();
        catButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedCategory = btn.getAttribute('data-cat');
      });
    });

    document.getElementById('btn-start-taboo-setup').addEventListener('click', () => {
      Sounds.playClick();
      prepareWords();
      startNewRound();
    });
  };

  const prepareWords = () => {
    let sourceWords = [];
    if (selectedCategory === "عشوائي") {
      Object.keys(WordBank.taboo).forEach(key => {
        sourceWords = sourceWords.concat(WordBank.taboo[key]);
      });
    } else {
      const catWords = WordBank.taboo[selectedCategory];
      if (catWords) sourceWords = catWords;
    }
    
    wordList = [...sourceWords].sort(() => Math.random() - 0.5);
    currentWordIndex = 0;
  };

  const startNewRound = () => {
    const teamPlayers = currentTeam.players;
    const describerIndex = (currentRound - 1) % teamPlayers.length;
    describerPlayer = teamPlayers[describerIndex];

    roundScore = 0;
    roundWordsLog = [];
    timeLeft = 60;

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">الجولة ${currentRound} من ${maxRounds}</span>
          <h2>دور: ${currentTeam.name}</h2>
        </div>

        <div class="charades-prep-box" style="border: 2px solid ${currentTeam.name.includes('ألف') ? '#ff3e00' : '#00adb5'}">
          <span class="actor-tag">اللاعب الشارح الحالي:</span>
          <div class="actor-avatar" style="background: ${describerPlayer.color}">
            <span>${describerPlayer.emoji}</span>
          </div>
          <h3>${describerPlayer.name}</h3>
          
          <div class="prep-instruction">
            <p>1. قم بإعطاء الهاتف لـ <strong>${describerPlayer.name}</strong>.</p>
            <p>2. يقوم بقراءة الكلمة والكلمات المحظورة، ومحاولة شرحها لفريقه دون نطق أي كلمة محظورة.</p>
            <p>3. يقوم لاعب من الفريق الآخر بالنظر للشاشة للتحقق من عدم استخدام أي كلمة محظورة 🕵️‍♂️.</p>
          </div>
        </div>

        <div class="game-controls">
          <button class="btn btn-primary btn-large" id="btn-start-taboo-timer">
            <span>ابدأ اللعب ⏱️</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-start-taboo-timer').addEventListener('click', () => {
      Sounds.playClick();
      startGameplayTimer();
    });
  };

  const startGameplayTimer = () => {
    renderGameplay();
    
    timerInterval = setInterval(() => {
      timeLeft--;
      const timerLabel = document.getElementById('taboo-timer-label');
      if (timerLabel) {
        timerLabel.textContent = `${timeLeft} ث`;
        if (timeLeft <= 10) {
          timerLabel.classList.add('timer-danger');
          Sounds.playTick(1.2);
        }
      }

      if (timeLeft <= 0) {
        endRound();
      }
    }, 1000);
  };

  const renderGameplay = () => {
    if (currentWordIndex >= wordList.length) {
      prepareWords();
    }
    const currentWordItem = wordList[currentWordIndex];

    containerEl.innerHTML = `
      <div class="game-card game-card-charades animate-fade-in text-center">
        <div class="charades-game-header">
          <div class="c-header-item text-right">
            <span class="c-lbl">النقاط:</span>
            <strong class="c-val text-accent" id="taboo-points-val">${roundScore}</strong>
          </div>
          <div class="c-header-item text-center">
            <div class="charades-timer" id="taboo-timer-label">${timeLeft} ث</div>
          </div>
          <div class="c-header-item text-left">
            <span class="c-lbl">الشارح:</span>
            <strong class="c-val" style="color: ${describerPlayer.color}">${describerPlayer.emoji}</strong>
          </div>
        </div>

        <div class="taboo-word-display-box" style="margin-bottom: 20px;">
          <span class="c-lbl" style="font-size: 0.85rem; margin-bottom: 8px;">الكلمة المطلوبة:</span>
          <div class="taboo-main-word animate-zoom-in" style="font-size: 2.2rem; font-weight: 800; color: var(--primary); text-shadow: 0 0 15px var(--primary-glow);">${currentWordItem.word}</div>
        </div>

        <div class="taboo-forbidden-box" style="background: rgba(255, 23, 68, 0.03); border: 1px solid rgba(255, 23, 68, 0.1); border-radius: 18px; padding: 15px; margin-bottom: 25px;">
          <span style="color: var(--danger); font-weight: bold; font-size: 0.85rem; display: block; margin-bottom: 10px;">❌ الكلمات المحظورة (ممنوع نطقها):</span>
          <div class="forbidden-words-pills" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px;">
            ${currentWordItem.forbidden.map(word => `
              <span class="forbidden-pill" style="background: rgba(255,23,68,0.1); border: 1px solid rgba(255,23,68,0.2); color: #fff; padding: 6px 14px; border-radius: 50px; font-size: 0.9rem; font-weight: 600;">
                ${word}
              </span>
            `).join('')}
          </div>
        </div>

        <div class="charades-actions-buttons">
          <button class="btn-charades btn-correct" id="btn-taboo-correct">
            <span class="c-btn-icon">👍</span>
            <span class="c-btn-lbl">صح (أجابه فريقه)</span>
          </button>
          <button class="btn-charades btn-skip" id="btn-taboo-fail" style="background: rgba(255, 23, 68, 0.1); border: 1px solid rgba(255, 23, 68, 0.2); color: var(--danger);">
            <span class="c-btn-icon">❌</span>
            <span class="c-btn-lbl">خطأ / تخطي</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-taboo-correct').addEventListener('click', () => {
      answerWord(true);
    });

    document.getElementById('btn-taboo-fail').addEventListener('click', () => {
      answerWord(false);
    });
  };

  const answerWord = (isCorrect) => {
    const wordItem = wordList[currentWordIndex];
    if (isCorrect) {
      Sounds.playSuccess();
      roundScore++;
      roundWordsLog.push({ word: wordItem.word, status: 'correct' });
    } else {
      Sounds.playFail();
      roundWordsLog.push({ word: wordItem.word, status: 'skipped' });
    }
    
    currentWordIndex++;
    renderGameplay();
  };

  const endRound = () => {
    clearInterval(timerInterval);
    Sounds.playFail();

    currentTeam.score += roundScore;

    let nextStepButtonHtml = "";
    if (currentTeam === teamA) {
      currentTeam = teamB;
      nextStepButtonHtml = `
        <button class="btn btn-primary btn-large" id="btn-next-team-turn">
          <span>انتقال الدور لـ ${teamB.name} 🔵</span>
        </button>
      `;
    } else {
      if (currentRound < maxRounds) {
        currentRound++;
        currentTeam = teamA;
        nextStepButtonHtml = `
          <button class="btn btn-primary btn-large" id="btn-next-team-turn">
            <span>الذهاب للجولة ${currentRound} 🎬</span>
          </button>
        `;
      } else {
        nextStepButtonHtml = `
          <button class="btn btn-primary btn-large" id="btn-go-taboo-winner">
            <span>عرض النتيجة النهائية 🏆</span>
          </button>
        `;
      }
    }

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in">
        <div class="game-header text-center">
          <span class="game-badge">انتهى الوقت! ⏰</span>
          <h2>نتائج الجولة</h2>
        </div>

        <div class="round-summary-points">
          <div class="points-earned">
            <span class="points-sub">النقاط المحققة هذه الجولة:</span>
            <span class="points-num">+${roundScore}</span>
          </div>
        </div>

        <div class="scoreboard-comparison">
          <div class="scoreboard-col team-a-glow">
            <h4>${teamA.name}</h4>
            <div class="score-display">${teamA.score}</div>
          </div>
          <div class="scoreboard-col team-b-glow">
            <h4>${teamB.name}</h4>
            <div class="score-display">${teamB.score}</div>
          </div>
        </div>

        <div class="words-log-list">
          <h4>تفاصيل الكلمات في هذه الجولة:</h4>
          <div class="log-items">
            ${roundWordsLog.map(item => `
              <div class="log-item ${item.status}">
                <span>${item.status === 'correct' ? '✅ صح' : '❌ خطأ/تخطي'}</span>
                <strong>${item.word}</strong>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="game-controls">
          ${nextStepButtonHtml}
        </div>
      </div>
    `;

    const nextBtn = document.getElementById('btn-next-team-turn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        Sounds.playClick();
        startNewRound();
      });
    }

    const winnerBtn = document.getElementById('btn-go-taboo-winner');
    if (winnerBtn) {
      winnerBtn.addEventListener('click', () => {
        Sounds.playClick();
        showWinnerScreen();
      });
    }
  };

  const showWinnerScreen = () => {
    let winnerName = "";
    let alertClass = "";
    let isDraw = false;

    if (teamA.score > teamB.score) {
      winnerName = teamA.name;
      alertClass = "victory-team-a";
      Sounds.playSuccess();
    } else if (teamB.score > teamA.score) {
      winnerName = teamB.name;
      alertClass = "victory-team-b";
      Sounds.playSuccess();
    } else {
      isDraw = true;
      winnerName = "تعادل الفريقين!";
      alertClass = "victory-draw";
      Sounds.playSuccess();
    }

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">النتيجة النهائية</span>
        </div>

        <div class="victory-box ${alertClass}">
          <span class="victory-icon">🏆</span>
          <h2>${isDraw ? winnerName : `الفائز: ${winnerName}`}</h2>
          <p>${isDraw ? 'أداء متكافئ رائع من الفريقين!' : 'تهانينا! لقد أثبتم مهارة عالية في الوصف السريع وتجنب المحظورات!'}</p>
        </div>

        <div class="final-scoreboard-display">
          <div class="final-score-row row-red">
            <span class="f-team-name">${teamA.name}</span>
            <span class="f-team-score">${teamA.score} نقطة</span>
          </div>
          <div class="final-score-row row-blue">
            <span class="f-team-name">${teamB.name}</span>
            <span class="f-team-score">${teamB.score} نقطة</span>
          </div>
        </div>

        <div class="game-controls-stacked">
          <button class="btn btn-primary" id="btn-replay-taboo">لعب من جديد 🔄</button>
          <button class="btn btn-outline" id="btn-exit-taboo">خروج للقائمة الرئيسية 🚪</button>
        </div>
      </div>
    `;

    document.getElementById('btn-replay-taboo').addEventListener('click', () => {
      Sounds.playClick();
      init(playersList, containerEl, onExitCallback);
    });

    document.getElementById('btn-exit-taboo').addEventListener('click', () => {
      Sounds.playClick();
      onExitCallback();
    });
  };

  const cleanup = () => {
    clearInterval(timerInterval);
  };

  return {
    init,
    cleanup
  };
})();
