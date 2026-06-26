// Jalsa - 5 Second Rule (تحدي الـ 5 ثواني) Game Logic
const FiveSecondsGame = (() => {
  let playersList = [];
  let playerScores = {}; // playerId -> score
  let challenges = [];
  let currentChallengeIndex = 0;
  
  let currentPlayerIndex = 0;
  let roundNum = 1;
  const maxRounds = 2; // each player gets 2 turns
  let timeLeft = 5;
  let timerInterval = null;
  let containerEl = null;
  let onExitCallback = null;

  const init = (players, container, onExit) => {
    playersList = [...players].sort(() => Math.random() - 0.5); // shuffle order
    containerEl = container;
    onExitCallback = onExit;

    // Reset scores
    playerScores = {};
    playersList.forEach(p => {
      playerScores[p.id] = 0;
    });

    currentPlayerIndex = 0;
    roundNum = 1;
    currentChallengeIndex = 0;

    prepareChallenges();
    renderTurnIntro();
  };

  const prepareChallenges = () => {
    const allChallenges = WordBank.five_seconds || [];
    const unplayed = WordHistoryManager.getUnplayedItems('five_seconds', 'default', allChallenges);
    challenges = [...unplayed].sort(() => Math.random() - 0.5);
  };

  const renderTurnIntro = () => {
    const activePlayer = playersList[currentPlayerIndex];

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">تحدي الـ 5 ثواني ⏱️</span>
          <h2>دور اللاعب التالي</h2>
        </div>

        <div class="charades-prep-box" style="border: 2px solid ${activePlayer.color}; margin: 40px 0;">
          <span class="actor-tag">مرر الهاتف إلى:</span>
          <div class="actor-avatar" style="background: ${activePlayer.color}33; color: ${activePlayer.color}; border: 3px solid ${activePlayer.color};">
            <span>${activePlayer.emoji}</span>
          </div>
          <h2 style="color: #fff; font-size: 1.8rem; margin-top: 10px;">${activePlayer.name}</h2>
          
          <div class="prep-instruction" style="text-align: center; margin-top: 20px;">
            <p>سيظهر لك سؤال سريع جداً.</p>
            <p>يجب عليك ذكر <strong>3 أشياء</strong> مطلوبة منك قبل انتهاء الـ 5 ثواني! ⏳</p>
          </div>
        </div>

        <div class="game-controls">
          <button class="btn btn-primary btn-large" id="btn-start-5s-ready">
            <span>استعد وابدأ التحدي ⚡</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-start-5s-ready').addEventListener('click', () => {
      Sounds.playClick();
      renderGameplayScreen();
    });
  };

  const renderGameplayScreen = () => {
    const activePlayer = playersList[currentPlayerIndex];
    const challengeText = challenges[currentChallengeIndex % challenges.length];
    WordHistoryManager.markAsPlayed('five_seconds', 'default', challengeText);
    currentChallengeIndex++;
    
    timeLeft = 5;

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center" style="min-height: 480px; display: flex; flex-direction: column;">
        <div class="charades-game-header" style="margin-bottom: 25px;">
          <div class="c-header-item text-right" style="width: 50%;">
            <span class="c-lbl">اللاعب:</span>
            <strong class="c-val" style="color: ${activePlayer.color}">${activePlayer.emoji} ${activePlayer.name}</strong>
          </div>
          <div class="c-header-item text-left" style="width: 50%;">
            <span class="c-lbl">النقاط:</span>
            <strong class="c-val text-accent">${playerScores[activePlayer.id]} ن</strong>
          </div>
        </div>

        <div class=" wyr-options-container" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <span style="color: var(--danger); font-weight: 800; font-size: 0.95rem; margin-bottom: 10px; letter-spacing: 1px;">التحدي السريع 🔥</span>
          <p class="animate-zoom-in" style="font-size: 1.6rem; font-weight: 800; line-height: 1.5; color: #fff; margin-bottom: 25px;">
            ${challengeText}
          </p>

          <!-- 5 Seconds Visual Timer -->
          <div class="timer-5s-container" style="width: 100%; height: 24px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 50px; overflow: hidden; margin-bottom: 10px; position: relative;">
            <div id="bar-5s" style="height: 100%; width: 100%; background: linear-gradient(90deg, #ff3366, #ff5e62); transition: width 0.1s linear; border-radius: 50px;"></div>
          </div>
          <div id="timer-5s-label" style="font-size: 2rem; font-weight: 900; color: #fff;">5.0</div>
        </div>

        <div class="charades-actions-buttons" id="actions-5s" style="margin-top: 30px; display: none;">
          <button class="btn-charades btn-correct" id="btn-5s-success">
            <span class="c-btn-icon">✅</span>
            <span class="c-btn-lbl">أجاب بنجاح (+10ن)</span>
          </button>
          <button class="btn-charades btn-skip" id="btn-5s-fail" style="background: rgba(255, 23, 68, 0.1); border: 1px solid rgba(255, 23, 68, 0.2); color: var(--danger);">
            <span class="c-btn-icon">❌</span>
            <span class="c-btn-lbl">انتهى الوقت / فشل</span>
          </button>
        </div>

        <div class="game-controls" id="btn-trigger-timer-container">
          <button class="btn btn-accent btn-large" id="btn-trigger-timer" style="box-shadow: 0 0 15px var(--accent-glow);">
            <span>ابدأ عد الـ 5 ثواني ⏰</span>
          </button>
        </div>
      </div>
    `;

    const triggerBtn = document.getElementById('btn-trigger-timer');
    triggerBtn.addEventListener('click', () => {
      triggerBtn.disabled = true;
      document.getElementById('btn-trigger-timer-container').style.display = 'none';
      start5sTimer();
    });
  };

  const start5sTimer = () => {
    const bar = document.getElementById('bar-5s');
    const label = document.getElementById('timer-5s-label');
    
    let milliseconds = 5000;
    const interval = 100; // 100ms interval for smooth progress

    Sounds.playTick(1.0);

    timerInterval = setInterval(() => {
      milliseconds -= interval;
      const secondsLeft = (milliseconds / 1000).toFixed(1);
      
      if (label) label.textContent = secondsLeft;
      if (bar) bar.style.width = `${(milliseconds / 5000) * 100}%`;

      // Play ticking sounds faster as time runs out
      if (milliseconds % 1000 === 0 && milliseconds > 0) {
        const pitchFactor = 1.0 + (5000 - milliseconds) / 5000; // pitch goes up
        Sounds.playTick(pitchFactor);
      }

      if (milliseconds <= 0) {
        clearInterval(timerInterval);
        Sounds.playFail();
        if (label) {
          label.textContent = "انتهى الوقت! 💥";
          label.style.color = "var(--danger)";
        }
        
        // Show outcome buttons
        document.getElementById('actions-5s').style.display = 'flex';
      }
    }, interval);

    // Attach actions
    document.getElementById('btn-5s-success').addEventListener('click', () => {
      resolveTurn(true);
    });

    document.getElementById('btn-5s-fail').addEventListener('click', () => {
      resolveTurn(false);
    });
  };

  const resolveTurn = (isSuccess) => {
    const activePlayer = playersList[currentPlayerIndex];

    if (isSuccess) {
      Sounds.playSuccess();
      playerScores[activePlayer.id] += 10;
    } else {
      Sounds.playFail();
    }

    currentPlayerIndex++;
    if (currentPlayerIndex >= playersList.length) {
      currentPlayerIndex = 0;
      roundNum++;
    }

    if (roundNum > maxRounds) {
      renderLeaderboardScreen();
    } else {
      renderTurnIntro();
    }
  };

  const renderLeaderboardScreen = () => {
    Sounds.playSuccess();

    // Sort players by scores
    const sortedPlayers = [...playersList].sort((a, b) => playerScores[b.id] - playerScores[a.id]);
    const topScore = playerScores[sortedPlayers[0].id];
    
    // Check if multiple players tied for top score
    const winners = sortedPlayers.filter(p => playerScores[p.id] === topScore);
    const isDraw = winners.length > 1;

    let winnerText = "";
    if (isDraw) {
      winnerText = `تعادل بالمركز الأول! 🏆`;
    } else {
      winnerText = `الفائز: ${sortedPlayers[0].name} 👑`;
    }

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">النتيجة النهائية</span>
          <h2>لائحة الصدارة 🏆</h2>
        </div>

        <div class="victory-box victory-team-a" style="margin: 20px 0; background: linear-gradient(135deg, rgba(0, 242, 254, 0.2) 0%, rgba(0, 230, 118, 0.1) 100%); border: 1px solid rgba(0, 242, 254, 0.3);">
          <span class="victory-icon" style="font-size: 3.5rem;">⏱️</span>
          <h2 style="font-size: 1.7rem; color: #fff; font-weight: 800;">${winnerText}</h2>
          <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 5px;">سرعة بديهة خيالية وحماس بلا حدود!</p>
        </div>

        <div class="final-scoreboard-display" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 25px;">
          ${sortedPlayers.map((p, index) => `
            <div class="final-score-row" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; border-radius: 14px; border-right: 4px solid ${p.color};">
              <span class="f-team-name" style="font-weight: 700; color: #fff;">
                <span style="color: var(--text-muted); font-size: 0.85rem; margin-left: 8px;">#${index + 1}</span>
                ${p.emoji} ${p.name}
              </span>
              <span class="f-team-score" style="font-weight: 800; color: var(--accent);">${playerScores[p.id]} نقطة</span>
            </div>
          `).join('')}
        </div>

        <div class="game-controls-stacked">
          <button class="btn btn-primary" id="btn-replay-5s">لعب من جديد 🔄</button>
          <button class="btn btn-outline" id="btn-exit-5s">خروج للقائمة الرئيسية 🚪</button>
        </div>
      </div>
    `;

    document.getElementById('btn-replay-5s').addEventListener('click', () => {
      Sounds.playClick();
      init(playersList, containerEl, onExitCallback);
    });

    document.getElementById('btn-exit-5s').addEventListener('click', () => {
      Sounds.playClick();
      onExitCallback();
    });
  };

  const cleanup = () => {
    clearInterval(timerInterval);
  };

  const restart = () => {
    cleanup();
    playersList = [...playersList].sort(() => Math.random() - 0.5);
    playerScores = {};
    playersList.forEach(p => {
      playerScores[p.id] = 0;
    });

    currentPlayerIndex = 0;
    roundNum = 1;
    currentChallengeIndex = 0;

    prepareChallenges();
    renderTurnIntro();
  };

  return {
    init,
    cleanup,
    restart
  };
})();
// Register globally
window.FiveSecondsGame = FiveSecondsGame;
