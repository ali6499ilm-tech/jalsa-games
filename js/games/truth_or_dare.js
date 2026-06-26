// Jalsa - Truth or Dare (صراحة أو تحدي) Game Logic
const TruthOrDareGame = (() => {
  let playersList = [];
  let playerScores = {}; // playerId -> score
  let truthQuestions = [];
  let dareChallenges = [];
  let currentTruthIndex = 0;
  let currentDareIndex = 0;
  
  let currentPlayerIndex = 0;
  let roundNum = 1;
  const maxRounds = 2; // each player gets 2 turns
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
    currentTruthIndex = 0;
    currentDareIndex = 0;

    preparePrompts();
    renderTurnIntro();
  };

  const preparePrompts = () => {
    const allTruths = WordBank.truth_or_dare.truth || [];
    const allDares = WordBank.truth_or_dare.dare || [];
    const unplayedTruths = WordHistoryManager.getUnplayedItems('truth_or_dare', 'truth', allTruths);
    const unplayedDares = WordHistoryManager.getUnplayedItems('truth_or_dare', 'dare', allDares);

    truthQuestions = [...unplayedTruths].sort(() => Math.random() - 0.5);
    dareChallenges = [...unplayedDares].sort(() => Math.random() - 0.5);
  };

  const renderTurnIntro = () => {
    const activePlayer = playersList[currentPlayerIndex];

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">حقيقة أم جرأة 🍾</span>
          <h2>دور اللاعب التالي</h2>
        </div>

        <div class="charades-prep-box" style="border: 2px solid ${activePlayer.color}; margin: 40px 0;">
          <span class="actor-tag">مرر الهاتف إلى:</span>
          <div class="actor-avatar" style="background: ${activePlayer.color}33; color: ${activePlayer.color}; border: 3px solid ${activePlayer.color};">
            <span>${activePlayer.emoji}</span>
          </div>
          <h2 style="color: #fff; font-size: 1.8rem; margin-top: 10px;">${activePlayer.name}</h2>
          
          <div class="prep-instruction" style="text-align: center; margin-top: 20px;">
            <p>اختر ما تفضله: الإجابة على سؤال بصراحة مطلقة 💬</p>
            <p>أو تنفيذ تحدي طريف وجريء أمام الجميع 🔥!</p>
          </div>
        </div>

        <div class="game-controls">
          <button class="btn btn-primary btn-large" id="btn-start-tod-choice">
            <span>اختر حقيقة أو جرأة 🤔</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-start-tod-choice').addEventListener('click', () => {
      Sounds.playClick();
      renderChoiceScreen();
    });
  };

  const renderChoiceScreen = () => {
    const activePlayer = playersList[currentPlayerIndex];

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center" style="min-height: 480px; display: flex; flex-direction: column;">
        <div class="charades-game-header" style="margin-bottom: 20px;">
          <div class="c-header-item text-right" style="width: 50%;">
            <span class="c-lbl">اللاعب الحالي:</span>
            <strong class="c-val" style="color: ${activePlayer.color}">${activePlayer.emoji} ${activePlayer.name}</strong>
          </div>
          <div class="c-header-item text-left" style="width: 50%;">
            <span class="c-lbl">النقاط الحالية:</span>
            <strong class="c-val text-accent">${playerScores[activePlayer.id]} ن</strong>
          </div>
        </div>

        <h3 style="margin-bottom: 30px; font-size: 1.3rem; color: #fff;">ماذا تختار يا ${activePlayer.name}؟</h3>

        <div class="tod-buttons-container" style="display: flex; gap: 15px; flex: 1; align-items: center; justify-content: center;">
          <button class="btn-charades btn-correct" id="btn-tod-truth" style="background: rgba(0, 242, 254, 0.08); border: 2px solid rgba(0, 242, 254, 0.2); padding: 30px 20px; font-size: 1.25rem; font-weight: 800; color: #00f2fe; border-radius: 24px;">
            <span style="font-size: 3rem; margin-bottom: 10px;">💬</span>
            <span>صراحة (حقيقة)</span>
          </button>
          
          <button class="btn-charades btn-skip" id="btn-tod-dare" style="background: rgba(255, 94, 98, 0.08); border: 2px solid rgba(255, 94, 98, 0.2); padding: 30px 20px; font-size: 1.25rem; font-weight: 800; color: #ff5e62; border-radius: 24px;">
            <span style="font-size: 3rem; margin-bottom: 10px;">🔥</span>
            <span>تحدي (جرأة)</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-tod-truth').addEventListener('click', () => {
      Sounds.playClick();
      renderPromptScreen('truth');
    });

    document.getElementById('btn-tod-dare').addEventListener('click', () => {
      Sounds.playClick();
      renderPromptScreen('dare');
    });
  };

  const renderPromptScreen = (type) => {
    const activePlayer = playersList[currentPlayerIndex];
    let promptText = "";

    if (type === 'truth') {
      promptText = truthQuestions[currentTruthIndex % truthQuestions.length];
      WordHistoryManager.markAsPlayed('truth_or_dare', 'truth', promptText);
      currentTruthIndex++;
    } else {
      promptText = dareChallenges[currentDareIndex % dareChallenges.length];
      WordHistoryManager.markAsPlayed('truth_or_dare', 'dare', promptText);
      currentDareIndex++;
    }

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center" style="min-height: 480px; display: flex; flex-direction: column;">
        <div class="charades-game-header" style="margin-bottom: 25px;">
          <div class="c-header-item text-right" style="width: 50%;">
            <span class="c-lbl">اللاعب:</span>
            <strong class="c-val" style="color: ${activePlayer.color}">${activePlayer.emoji} ${activePlayer.name}</strong>
          </div>
          <div class="c-header-item text-left" style="width: 50%;">
            <span class="c-lbl">النوع:</span>
            <strong class="c-val" style="color: ${type === 'truth' ? '#00f2fe' : '#ff5e62'}">
              ${type === 'truth' ? '💬 صراحة' : '🔥 تحدي'}
            </strong>
          </div>
        </div>

        <div class="wyr-options-container" style="flex: 1; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; padding: 25px; margin-bottom: 30px; box-shadow: inset 0 0 20px rgba(0,0,0,0.3);">
          <p class="animate-zoom-in" style="font-size: 1.4rem; font-weight: 700; line-height: 1.6; color: #fff;">
            ${promptText}
          </p>
        </div>

        <div class="charades-actions-buttons">
          <button class="btn-charades btn-correct" id="btn-tod-success">
            <span class="c-btn-icon">✅</span>
            <span class="c-btn-lbl">تم التنفيذ (+10ن)</span>
          </button>
          <button class="btn-charades btn-skip" id="btn-tod-fail" style="background: rgba(255, 23, 68, 0.1); border: 1px solid rgba(255, 23, 68, 0.2); color: var(--danger);">
            <span class="c-btn-icon">❌</span>
            <span class="c-btn-lbl">فشل / انسحب</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-tod-success').addEventListener('click', () => {
      resolveTurn(true);
    });

    document.getElementById('btn-tod-fail').addEventListener('click', () => {
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

        <div class="victory-box victory-team-a" style="margin: 20px 0; background: linear-gradient(135deg, rgba(189, 0, 255, 0.2) 0%, rgba(0, 242, 254, 0.1) 100%); border: 1px solid rgba(189, 0, 255, 0.3);">
          <span class="victory-icon" style="font-size: 3.5rem;">🏆</span>
          <h2 style="font-size: 1.7rem; color: #fff; font-weight: 800;">${winnerText}</h2>
          <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 5px;">أداء حماسي وشجاع من جميع اللاعبين!</p>
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
          <button class="btn btn-primary" id="btn-replay-tod">لعب من جديد 🔄</button>
          <button class="btn btn-outline" id="btn-exit-tod">خروج للقائمة الرئيسية 🚪</button>
        </div>
      </div>
    `;

    document.getElementById('btn-replay-tod').addEventListener('click', () => {
      Sounds.playClick();
      init(playersList, containerEl, onExitCallback);
    });

    document.getElementById('btn-exit-tod').addEventListener('click', () => {
      Sounds.playClick();
      onExitCallback();
    });
  };

  const cleanup = () => {
    // No timers to clean up in this game
  };

  const restart = () => {
    playersList = [...playersList].sort(() => Math.random() - 0.5);
    playerScores = {};
    playersList.forEach(p => {
      playerScores[p.id] = 0;
    });

    currentPlayerIndex = 0;
    roundNum = 1;
    currentTruthIndex = 0;
    currentDareIndex = 0;

    preparePrompts();
    renderTurnIntro();
  };

  return {
    init,
    cleanup,
    restart
  };
})();
// Register globally
window.TruthOrDareGame = TruthOrDareGame;
