// Jalsa - Charades (بدون كلام) Game Logic
const CharadesGame = (() => {
  let playersList = [];
  let teamA = { name: "فريق ألف 🔴", players: [], score: 0 };
  let teamB = { name: "فريق باء 🔵", players: [], score: 0 };
  
  let currentRound = 1;
  const maxRounds = 3; // each team plays 3 rounds
  let currentTeam = null; // teamA or teamB
  let actorPlayer = null;
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

  const swapPlayerTeam = (playerId) => {
    const idxA = teamA.players.findIndex(p => p.id === playerId);
    if (idxA !== -1) {
      const [player] = teamA.players.splice(idxA, 1);
      teamB.players.push(player);
    } else {
      const idxB = teamB.players.findIndex(p => p.id === playerId);
      if (idxB !== -1) {
        const [player] = teamB.players.splice(idxB, 1);
        teamA.players.push(player);
      }
    }
    Sounds.playClick();
    setupCategorySelection();
  };

  const setupCategorySelection = () => {
    containerEl.innerHTML = `
      <div class="game-card animate-fade-in">
        <div class="game-header">
          <span class="game-badge">بدون كلام</span>
          <h2>إعدادات اللعبة 🎭</h2>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span class="selector-label" style="margin-bottom: 0;">تقسيم الفرق يدوياً:</span>
          <button class="btn btn-outline" id="btn-shuffle-teams" style="padding: 4px 10px; font-size: 0.8rem; border-radius: 8px;">🔀 عشوائي</button>
        </div>

        <div class="teams-division-card">
          <div class="team-column col-red">
            <h3>${teamA.name}</h3>
            <div class="team-list">
              ${teamA.players.map(p => `
                <div class="team-player-row-card color-red" data-id="${p.id}">
                  <span>${p.emoji} ${p.name}</span>
                  <span>⬅️</span>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="team-column col-blue">
            <h3>${teamB.name}</h3>
            <div class="team-list">
              ${teamB.players.map(p => `
                <div class="team-player-row-card color-blue" data-id="${p.id}">
                  <span>➡️</span>
                  <span>${p.emoji} ${p.name}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="category-selection-box">
          <h4>اختر تصنيف الكلمات:</h4>
          <div class="category-buttons-grid">
            <button class="cat-select-btn active" data-cat="عشوائي">🎲 عشوائي</button>
            ${Object.keys(WordBank.charades).map(cat => {
              const icons = { "فواكه وخضروات": "🍎", "وظائف ومهن": "👨‍⚕️", "نوادي ومنتخبات": "🏆", "حيوانات وأشياء": "🦁", "أفعال وحركات": "🏃‍♂️", "كرتون وأفلام": "🎬", "ألعاب وتكنولوجيا": "🎮", "أمثال وتعبيرات": "💬" };
              const isLocked = window.isCategoryLocked('charades', cat);
              return `<button class="cat-select-btn ${isLocked ? 'premium-locked' : ''}" data-cat="${cat}">
                ${isLocked ? '🔒 ' : ''}${icons[cat] || "🏷️"} ${cat}
              </button>`;
            }).join('')}
          </div>
        </div>

        <div class="game-controls">
          <button class="btn btn-primary btn-large" id="btn-start-charades-setup">
            <span>تأكيد والذهاب للجولة الأولى 🎬</span>
          </button>
        </div>
      </div>
    `;

    // Attach team swap listeners
    containerEl.querySelectorAll('.team-player-row-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = parseInt(card.getAttribute('data-id'), 10);
        swapPlayerTeam(id);
      });
    });

    // Attach shuffle listener
    const shuffleBtn = containerEl.querySelector('#btn-shuffle-teams');
    if (shuffleBtn) {
      shuffleBtn.addEventListener('click', () => {
        playersList.sort(() => Math.random() - 0.5);
        distributeTeams();
        Sounds.playClick();
        setupCategorySelection();
      });
    }

    const catButtons = containerEl.querySelectorAll('.cat-select-btn');
    catButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        Sounds.playClick();
        const cat = btn.getAttribute('data-cat');
        if (window.isCategoryLocked('charades', cat)) {
          window.showProUpgradeModal(() => {
            setupCategorySelection();
            const updatedButtons = containerEl.querySelectorAll('.cat-select-btn');
            updatedButtons.forEach(b => {
              if (b.getAttribute('data-cat') === cat) {
                b.click();
              }
            });
          });
          return;
        }
        catButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedCategory = cat;
      });
    });

    document.getElementById('btn-start-charades-setup').addEventListener('click', () => {
      Sounds.playClick();
      
      if (teamA.players.length === 0 || teamB.players.length === 0) {
        showCustomAlert("يجب أن يحتوي كل فريق على لاعب واحد على الأقل للعب!");
        return;
      }

      prepareWords();
      startNewRound();
    });
  };

  const prepareWords = () => {
    let sourceWords = [];
    if (selectedCategory === "عشوائي") {
      let keys = Object.keys(WordBank.charades);
      if (!window.isProUser()) {
        keys = keys.filter(k => !window.isCategoryLocked('charades', k));
      }
      keys.forEach(key => {
        sourceWords = sourceWords.concat(WordBank.charades[key].words);
      });
    } else {
      const cat = WordBank.charades[selectedCategory];
      if (cat) sourceWords = cat.words;
    }
    
    wordList = [...sourceWords].sort(() => Math.random() - 0.5);
    currentWordIndex = 0;
  };

  const startNewRound = () => {
    const teamPlayers = currentTeam.players;
    const actorIndex = (currentRound - 1) % teamPlayers.length;
    actorPlayer = teamPlayers[actorIndex];

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
          <span class="actor-tag">اللاعب الممثل الحالي:</span>
          <div class="actor-avatar" style="background: ${actorPlayer.color}">
            <span>${actorPlayer.emoji}</span>
          </div>
          <h3>${actorPlayer.name}</h3>
          
          <div class="prep-instruction">
            <p>1. قم بإعطاء الهاتف لـ <strong>${actorPlayer.name}</strong>.</p>
            <p>2. يقوم بوضعه على جبهته موجهاً الشاشة للفريق (بحيث لا يرى الكلمة ويرونها هم).</p>
            <p>3. اضغط على الزر أدناه لبدء العد التنازلي وتخمين الكلمات!</p>
          </div>
        </div>

        <div class="game-controls">
          <button class="btn btn-primary btn-large" id="btn-start-timer">
            <span>ابدأ اللعب ⏱️</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-start-timer').addEventListener('click', () => {
      Sounds.playClick();
      startGameplayTimer();
    });
  };

  const startGameplayTimer = () => {
    renderGameplay();
    
    timerInterval = setInterval(() => {
      timeLeft--;
      const timerLabel = document.getElementById('charades-timer-label');
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
    const currentWord = wordList[currentWordIndex];

    containerEl.innerHTML = `
      <div class="game-card game-card-charades animate-fade-in text-center">
        <div class="charades-game-header">
          <div class="c-header-item text-right">
            <span class="c-lbl">النقاط:</span>
            <strong class="c-val text-accent" id="charades-points-val">${roundScore}</strong>
          </div>
          <div class="c-header-item text-center">
            <div class="charades-timer" id="charades-timer-label">${timeLeft} ث</div>
          </div>
          <div class="c-header-item text-left">
            <span class="c-lbl">الممثل:</span>
            <strong class="c-val" style="color: ${actorPlayer.color}">${actorPlayer.emoji}</strong>
          </div>
        </div>

        <div class="word-card-charades-display">
          <div class="charades-word-text animate-zoom-in">${currentWord}</div>
        </div>

        <div class="charades-actions-buttons">
          <button class="btn-charades btn-correct" id="btn-charades-correct">
            <span class="c-btn-icon">👍</span>
            <span class="c-btn-lbl">صح (إجابة صحيحة)</span>
          </button>
          <button class="btn-charades btn-skip" id="btn-charades-skip">
            <span class="c-btn-icon">⏭️</span>
            <span class="c-btn-lbl">تخطي (تجاوز)</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-charades-correct').addEventListener('click', () => {
      answerWord(true);
    });

    document.getElementById('btn-charades-skip').addEventListener('click', () => {
      answerWord(false);
    });
  };

  const answerWord = (isCorrect) => {
    const word = wordList[currentWordIndex];
    if (isCorrect) {
      Sounds.playSuccess();
      roundScore++;
      roundWordsLog.push({ word, status: 'correct' });
    } else {
      Sounds.playFail();
      roundWordsLog.push({ word, status: 'skipped' });
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
          <button class="btn btn-primary btn-large" id="btn-go-charades-winner">
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
                <span>${item.status === 'correct' ? '✅ صح' : '⏭️ تخطي'}</span>
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

    const winnerBtn = document.getElementById('btn-go-charades-winner');
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
          <p>${isDraw ? 'أداء متكافئ رائع من الفريقين!' : 'تهانينا! لقد أثبتم مهارة عالية في لغة الجسد والتمثيل!'}</p>
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
          <button class="btn btn-primary" id="btn-replay-charades">لعب من جديد 🔄</button>
          <button class="btn btn-outline" id="btn-exit-charades">خروج للقائمة الرئيسية 🚪</button>
        </div>
      </div>
    `;

    document.getElementById('btn-replay-charades').addEventListener('click', () => {
      Sounds.playClick();
      init(playersList, containerEl, onExitCallback);
    });

    document.getElementById('btn-exit-charades').addEventListener('click', () => {
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
