// Jalsa - Wolvesville (ذئاب قروية) Game Logic
const WolvesvilleGame = (() => {
  let playersList = [];
  let gamePlayers = []; // { id, name, emoji, color, role, active: true }
  
  // Game phases: 'lobby', 'reveal', 'night_intro', 'night_action', 'day_announce', 'day_discuss', 'day_vote', 'game_over'
  let currentPhase = 'lobby';
  let revealIndex = 0;
  let nightPlayerIndex = 0;
  let activeNightPlayers = [];
  
  // Distribution settings
  let distributionMode = 'random'; // 'random' or 'manual'
  let manualRoleCounts = {
    villager: 0,
    werewolf: 0,
    seer: 0,
    doctor: 0,
    fool: 0,
    serial_killer: 0
  };

  // Night choices
  let werewolfTarget = null;
  let killerTarget = null;
  let doctorTarget = null;
  let seerTarget = null;
  
  // Timers
  let timerVal = 0;
  let timerInterval = null;
  let pretendTimeout = null;
  
  let containerEl = null;
  let onExitCallback = null;

  const init = (players, container, onExit) => {
    playersList = players;
    containerEl = container;
    onExitCallback = onExit;
    
    setupGame();
  };

  const setupGame = () => {
    currentPhase = 'lobby';
    revealIndex = 0;
    nightPlayerIndex = 0;
    activeNightPlayers = [];
    distributionMode = 'random';
    
    initManualRoleCounts();
    resetNightChoices();
    renderLobbyScreen();
  };

  const resetNightChoices = () => {
    werewolfTarget = null;
    killerTarget = null;
    doctorTarget = null;
    seerTarget = null;
  };

  const getRandomRolesForCount = (count, isPro) => {
    let roles = [];
    if (isPro) {
      if (count === 4) {
        roles = ['werewolf', 'seer', 'fool', 'villager'];
      } else if (count === 5) {
        roles = ['werewolf', 'seer', 'doctor', 'fool', 'villager'];
      } else if (count === 6) {
        roles = ['werewolf', 'seer', 'doctor', 'fool', 'serial_killer', 'villager'];
      } else if (count === 7) {
        roles = ['werewolf', 'werewolf', 'seer', 'doctor', 'fool', 'serial_killer', 'villager'];
      } else {
        roles = ['werewolf', 'werewolf', 'seer', 'doctor', 'fool', 'serial_killer'];
        while (roles.length < count) {
          roles.push('villager');
        }
      }
    } else {
      // Free mode: strictly free roles only!
      if (count === 4) {
        roles = ['werewolf', 'seer', 'villager', 'villager'];
      } else if (count === 5) {
        roles = ['werewolf', 'seer', 'doctor', 'villager', 'villager'];
      } else if (count === 6) {
        roles = ['werewolf', 'seer', 'doctor', 'villager', 'villager', 'villager'];
      } else if (count === 7) {
        roles = ['werewolf', 'werewolf', 'seer', 'doctor', 'villager', 'villager', 'villager'];
      } else {
        roles = ['werewolf', 'werewolf', 'seer', 'doctor'];
        while (roles.length < count) {
          roles.push('villager');
        }
      }
    }
    return roles;
  };

  const initManualRoleCounts = () => {
    const isPro = window.isProUser();
    const count = playersList.length;
    const defaultRoles = getRandomRolesForCount(count, isPro);
    
    // Reset manual counts
    manualRoleCounts = {
      villager: 0,
      werewolf: 0,
      seer: 0,
      doctor: 0,
      fool: 0,
      serial_killer: 0
    };
    
    defaultRoles.forEach(r => {
      manualRoleCounts[r]++;
    });
  };

  const getRoleArabicName = (role) => {
    const names = {
      villager: "قروي 🧑‍🌾",
      werewolf: "ذئب مستذئب 🐺",
      seer: "عراف 🔮",
      doctor: "طبيب 👨‍⚕️",
      fool: "الأحمق 🃏",
      serial_killer: "القاتل المتسلسل 🔪"
    };
    return names[role] || role;
  };

  const getRoleGoal = (role) => {
    const goals = {
      villager: "ابحث عن الذئاب والقاتل المتسلسل واقنع الجميع بشنقهم نهاراً لحماية قريتك. 🔵",
      werewolf: "اتفق مع الذئاب الأخرى ليلاً واقضوا على القرويين دون أن تنكشف هويتكم. 🔴",
      seer: "استيقظ ليلاً واكشف هالات اللاعبين لمعرفة ولائهم ووجه القرويين بشكل غير مباشر. 🔵",
      doctor: "اختر لاعباً كل ليلة لحمايته من هجمات المخالب والسكاكين (يمكنك حماية نفسك). 🔵",
      fool: "تظاهر بالشك والريبة! هدفك الوحيد هو جعل القرويين يشكون بك ويشنقونك نهاراً لتفوز بمفردك! 🟣",
      serial_killer: "أنت عدو الجميع. استيقظ ليلاً واقضِ على ضحية واحدة. يجب أن تكون الناجي الوحيد لتفوز. 🟣"
    };
    return goals[role] || "";
  };

  const assignRoles = () => {
    const numPlayers = playersList.length;
    let roles = [];

    if (distributionMode === 'random') {
      const isPro = window.isProUser();
      roles = getRandomRolesForCount(numPlayers, isPro);
    } else {
      // Manual distribution
      Object.keys(manualRoleCounts).forEach(role => {
        for (let i = 0; i < manualRoleCounts[role]; i++) {
          roles.push(role);
        }
      });
    }

    // Shuffle roles (Fisher-Yates)
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    // Assign to active players
    gamePlayers = playersList.map((p, idx) => ({
      ...p,
      role: roles[idx],
      active: true
    }));
  };

  const renderLobbyScreen = () => {
    const isPro = window.isProUser();
    const numPlayers = playersList.length;

    // Calculate current selected total in manual mode
    const manualTotal = Object.values(manualRoleCounts).reduce((a, b) => a + b, 0);
    const isMatching = manualTotal === numPlayers;

    // Preview roles for random mode
    let randomRoles = getRandomRolesForCount(numPlayers, isPro);
    let randomCounts = { villager: 0, werewolf: 0, seer: 0, doctor: 0, fool: 0, serial_killer: 0 };
    randomRoles.forEach(r => randomCounts[r]++);

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">ذئاب قروية (Wolvesville) 🐺</span>
          <h2>إعداد القرية الغامضة</h2>
        </div>

        <div class="modes-toggle" style="display: flex; gap: 10px; margin-bottom: 20px; justify-content: center;">
          <button class="btn ${distributionMode === 'random' ? 'btn-primary' : 'btn-outline'}" id="btn-mode-random" style="flex: 1; padding: 10px;">توزيع عشوائي 🎲</button>
          <button class="btn ${distributionMode === 'manual' ? 'btn-primary' : 'btn-outline'}" id="btn-mode-manual" style="flex: 1; padding: 10px;">تحديد يدوي ⚙️</button>
        </div>

        <div class="wolves-roles-container" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 15px; border-radius: 16px; margin: 15px 0; text-align: right;">
          <h4 style="margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px;">
            ${distributionMode === 'random' ? 'معاينة توزيع الأدوار التلقائي:' : 'حدد عدد اللاعبين لكل دور:'}
          </h4>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${Object.keys(manualRoleCounts).map(role => {
              const isPremiumRole = role === 'fool' || role === 'serial_killer';
              const showLock = isPremiumRole && !isPro;
              const currentCount = distributionMode === 'random' ? (randomCounts[role] || 0) : manualRoleCounts[role];

              let controlHtml = "";
              if (distributionMode === 'random') {
                if (showLock) {
                  controlHtml = `<span style="font-size: 0.85rem; color: #ffd700; font-weight: 700;">🔒 مغلق (برو)</span>`;
                } else {
                  controlHtml = `<span class="player-mini-badge" style="background: #222; border: 1px solid #333; margin: 0; min-width: 60px; text-align: center;">${currentCount} لاعب</span>`;
                }
              } else {
                // Manual Mode Selector Controls
                if (showLock) {
                  controlHtml = `
                    <div style="display: flex; align-items: center; gap: 5px;">
                      <span style="font-size: 0.85rem; color: #ffd700; font-weight: 700;">🔒 مغلق (برو)</span>
                    </div>
                  `;
                } else {
                  controlHtml = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <button class="btn role-adjust-btn" data-role="${role}" data-action="minus" style="padding: 2px 10px; font-size: 1rem; border-radius: 6px; background: #222; border: 1px solid #444; color: #fff;">-</button>
                      <strong style="font-size: 1.1rem; min-width: 20px; text-align: center; color: #fff;">${currentCount}</strong>
                      <button class="btn role-adjust-btn" data-role="${role}" data-action="plus" style="padding: 2px 10px; font-size: 1rem; border-radius: 6px; background: #222; border: 1px solid #444; color: #fff;">+</button>
                    </div>
                  `;
                }
              }

              return `
                <div class="${showLock ? 'wolves-role-row-locked' : ''}" 
                  style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px dashed rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 4px; transition: all 0.3s ease; cursor: ${showLock ? 'pointer' : 'default'};"
                  ${showLock ? `data-role-lock="${role}"` : ''}>
                  <div style="display: flex; flex-direction: column;">
                    <strong style="color: ${showLock ? '#ccc' : '#fff'};">${getRoleArabicName(role)}</strong>
                    <span style="font-size: 0.75rem; color: ${showLock ? '#777' : 'var(--text-muted)'}; max-width: 220px; margin-top: 2px; line-height: 1.3;">
                      ${isPremiumRole && !isPro ? `دور ممتع ومتقدم (${role === 'fool' ? 'الأحمق يسعى لشنقه للفوز بمفرده' : 'القاتل المتسلسل يقضي على الجميع'}). اضغط للفتح 💎` : getRoleGoal(role).split('.')[0]}
                    </span>
                  </div>
                  <div>
                    ${controlHtml}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          ${distributionMode === 'manual' ? `
            <div style="margin-top: 15px; padding: 12px; border-radius: 10px; text-align: center; font-size: 0.9rem; font-weight: 700;
              background: ${isMatching ? 'rgba(0, 230, 118, 0.05)' : 'rgba(255, 23, 68, 0.05)'};
              border: 1px solid ${isMatching ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255, 23, 68, 0.2)'};
              color: ${isMatching ? '#00e676' : 'var(--danger)'};">
              ${isMatching ? `الأدوار متطابقة وجاهزة! (${manualTotal} من ${numPlayers} لاعبين) ✔️` : `يجب تحديد ${numPlayers} أدوار بالضبط! (محدد حالياً: ${manualTotal}) ⚠️`}
            </div>
          ` : ''}

          ${!isPro ? `
            <div style="margin-top: 12px; background: rgba(0, 242, 254, 0.05); border: 1px dashed rgba(0, 242, 254, 0.2); padding: 10px; border-radius: 8px; font-size: 0.8rem; text-align: center; color: #00f2fe; cursor: pointer;" id="btn-unlock-pro-roles">
              💎 الأدوار المقفلة (الأحمق والقاتل) تتطلب النسخة البرو. اضغط للفتح!
            </div>
          ` : ''}
        </div>

        <div class="active-players-list-simple">
          <h4>القرويون المشاركون (${numPlayers}):</h4>
          <div class="players-badges-container">
            ${playersList.map(p => `
              <span class="player-mini-badge" style="background: ${p.color}">
                <span>${p.emoji}</span> ${p.name}
              </span>
            `).join('')}
          </div>
        </div>

        <div class="game-controls">
          <button class="btn btn-primary btn-large" id="btn-start-wolves-reveal" ${distributionMode === 'manual' && !isMatching ? 'disabled' : ''}>
            <span>ابدأ كشف الهويات السرية 👁️</span>
          </button>
        </div>
      </div>
    `;

    // Attach mode switch event listeners
    document.getElementById('btn-mode-random').addEventListener('click', () => {
      Sounds.playClick();
      distributionMode = 'random';
      renderLobbyScreen();
    });

    document.getElementById('btn-mode-manual').addEventListener('click', () => {
      Sounds.playClick();
      distributionMode = 'manual';
      initManualRoleCounts();
      renderLobbyScreen();
    });

    // Attach premium upgrade modal trigger
    if (!isPro) {
      const unlockBtn = document.getElementById('btn-unlock-pro-roles');
      if (unlockBtn) {
        unlockBtn.addEventListener('click', () => {
          window.showProUpgradeModal(() => {
            setupGame();
          });
        });
      }

      containerEl.querySelectorAll('[data-role-lock]').forEach(el => {
        el.addEventListener('click', () => {
          window.showProUpgradeModal(() => {
            setupGame();
          });
        });
      });
    }

    // Attach plus/minus adjustment listeners for manual mode
    if (distributionMode === 'manual') {
      containerEl.querySelectorAll('.role-adjust-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          Sounds.playClick();
          const role = btn.getAttribute('data-role');
          const action = btn.getAttribute('data-action');

          if (action === 'plus') {
            // Cap total count to not exceed player count
            if (manualTotal < numPlayers) {
              manualRoleCounts[role]++;
            } else {
              showCustomAlert(`لا يمكنك إضافة أدوار أكثر من عدد اللاعبين (${numPlayers} لاعبين)!`);
            }
          } else if (action === 'minus') {
            if (manualRoleCounts[role] > 0) {
              manualRoleCounts[role]--;
            }
          }
          renderLobbyScreen();
        });
      });
    }

    // Start reveal phase
    document.getElementById('btn-start-wolves-reveal').addEventListener('click', () => {
      Sounds.playClick();
      assignRoles();
      startRevealPhase();
    });
  };

  const startRevealPhase = () => {
    currentPhase = 'reveal';
    revealIndex = 0;
    renderRevealPassScreen();
  };

  const renderRevealPassScreen = () => {
    const player = gamePlayers[revealIndex];
    
    containerEl.innerHTML = `
      <div class="game-card wolves-night-view text-center" style="background: #0d0d0d; border: 1px solid #1a1a1a; min-height: 480px; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #fff;">
        <span style="font-size: 3rem; margin-bottom: 20px;">📲</span>
        <h3 style="font-size: 1.6rem; font-weight: 700; color: #e0e0e0; margin-bottom: 10px;">دور اللاعب التالي</h3>
        <p style="color: #888; font-size: 0.95rem; margin-bottom: 30px; padding: 0 20px;">
          مرر الهاتف إلى <strong style="color: ${player.color}; font-size: 1.15rem;">${player.name}</strong> سراً للتأكد من عدم رؤية الآخرين لدوره.
        </p>

        <button class="btn btn-accent btn-large animate-pulse" id="btn-show-my-role" style="box-shadow: 0 0 10px rgba(0, 242, 254, 0.15); background: #1a1a1a; border: 1px solid #333; color: #fff;">
          <span>أنا ${player.name}، اعرض دوري 👁️</span>
        </button>
      </div>
    `;

    document.getElementById('btn-show-my-role').addEventListener('click', () => {
      Sounds.playClick();
      renderRoleCardScreen();
    });
  };

  const renderRoleCardScreen = () => {
    const player = gamePlayers[revealIndex];
    const roleName = getRoleArabicName(player.role);
    const roleGoal = getRoleGoal(player.role);
    
    let wolfPartners = [];
    if (player.role === 'werewolf') {
      wolfPartners = gamePlayers.filter(p => p.role === 'werewolf' && p.id !== player.id).map(p => p.name);
    }

    containerEl.innerHTML = `
      <div class="game-card wolves-night-view text-center" style="background: #050505; border: 2px solid #111; min-height: 480px; display: flex; flex-direction: column; justify-content: space-between; padding: 30px; color: #e0e0e0;">
        <div>
          <span style="font-size: 0.85rem; color: #555; letter-spacing: 1px; display: block; margin-bottom: 30px;">بطاقة الهوية السرية 🤫</span>
          
          <h2 style="font-size: 2rem; font-weight: 900; color: #fff; margin-bottom: 15px;">${player.name}</h2>
          
          <div style="background: #0c0c0c; border: 1px solid #222; padding: 25px; border-radius: 20px; display: inline-block; min-width: 200px; margin-bottom: 25px;">
            <span style="font-size: 1.1rem; font-weight: 800; color: #e0e0e0; display: block;">دورك السري هو:</span>
            <strong style="font-size: 1.7rem; font-weight: 900; color: #fff; display: block; margin-top: 10px;">${roleName}</strong>
          </div>

          <p style="font-size: 0.95rem; line-height: 1.6; color: #999; max-width: 320px; margin: 0 auto;">
            ${roleGoal}
          </p>

          ${wolfPartners.length > 0 ? `
            <div style="margin-top: 20px; background: rgba(255,255,255,0.02); border: 1px solid #1e1e1e; padding: 10px; border-radius: 12px; font-size: 0.85rem; color: #aaa;">
              🐺 شركاؤك الذئاب في البلدة: <strong style="color:#ff5e62;">${wolfPartners.join(', ')}</strong>
            </div>
          ` : ''}
        </div>

        <div>
          <button class="btn btn-outline" id="btn-hide-role-reveal" style="border-color: #333; color: #999; background: #0c0c0c; width: 100%; max-width: 250px;">
            <span>إخفاء الدور وتمرير 🔒</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-hide-role-reveal').addEventListener('click', () => {
      Sounds.playClick();
      revealIndex++;
      if (revealIndex < gamePlayers.length) {
        renderRevealPassScreen();
      } else {
        startNightPhase();
      }
    });
  };

  const startNightPhase = () => {
    currentPhase = 'night_intro';
    resetNightChoices();
    renderNightIntroScreen();
  };

  const renderNightIntroScreen = () => {
    Sounds.playFail();

    containerEl.innerHTML = `
      <div class="game-card wolves-night-view text-center" style="background: #000; border: 1px solid #111; min-height: 480px; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #fff; padding: 20px;">
        <span style="font-size: 4rem; margin-bottom: 25px; filter: grayscale(1);">🌙</span>
        <h2 style="font-size: 2rem; font-weight: 900; color: #fff; margin-bottom: 15px;">البلدة نائمة.. 🌃</h2>
        <p style="font-size: 1.1rem; color: #777; line-height: 1.6; max-width: 320px; margin-bottom: 40px; direction: rtl;">
          أغلقوا أعينكم جميعاً الآن! الليل قد خيّم على القرية ولا يمكن لأي قروي النظر للشاشة.
        </p>

        <button class="btn btn-accent btn-large" id="btn-start-night-loops" style="background: #111; border: 1px solid #222; color: #fff; box-shadow: 0 0 10px rgba(255,255,255,0.02);">
          <span>مستعد، ابدأ جولة التمرير ➡️</span>
        </button>
      </div>
    `;

    document.getElementById('btn-start-night-loops').addEventListener('click', () => {
      Sounds.playClick();
      nightPlayerIndex = 0;
      activeNightPlayers = gamePlayers.filter(p => p.active);
      renderNextNightPassScreen();
    });
  };

  const renderNextNightPassScreen = () => {
    const player = activeNightPlayers[nightPlayerIndex];

    containerEl.innerHTML = `
      <div class="game-card wolves-night-view text-center" style="background: #080808; border: 1px solid #1a1a1a; min-height: 480px; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #fff;">
        <span style="font-size: 2.5rem; margin-bottom: 15px;">🔒</span>
        <h3 style="font-size: 1.4rem; font-weight: 700; color: #bbb; margin-bottom: 10px;">دور اللاعب التالي سراً</h3>
        <p style="color: #666; font-size: 0.9rem; margin-bottom: 25px;">
          مرر الهاتف إلى <strong style="color: ${player.color}; font-size: 1.1rem;">${player.name}</strong> سراً ليؤدي دوره.
        </p>

        <button class="btn btn-primary btn-large" id="btn-start-player-night" style="background: #151515; border: 1px solid #333; color: #fff;">
          <span>أنا ${player.name}، ابدأ 👁️</span>
        </button>
      </div>
    `;

    document.getElementById('btn-start-player-night').addEventListener('click', () => {
      Sounds.playClick();
      renderPlayerNightActionScreen();
    });
  };

  const renderPlayerNightActionScreen = () => {
    const player = activeNightPlayers[nightPlayerIndex];
    const hasNightAction = ['werewolf', 'serial_killer', 'doctor', 'seer'].includes(player.role);

    if (!hasNightAction) {
      renderPretendThinkingScreen(player);
    } else {
      renderRealNightActionScreen(player);
    }
  };

  const renderPretendThinkingScreen = (player) => {
    containerEl.innerHTML = `
      <div class="game-card wolves-night-view text-center" style="background: #050505; border: 2px solid #111; min-height: 480px; display: flex; flex-direction: column; justify-content: space-between; padding: 30px; color: #bbb;">
        <div>
          <span style="font-size: 0.8rem; color: #444; display: block; margin-bottom: 20px;">ليلة هادئة في القرية 🌌</span>
          
          <h3 style="font-size: 1.5rem; font-weight: 800; color: #fff; margin-bottom: 15px;">${player.name}</h3>
          
          <div style="background: #0c0c0c; border: 1px solid #1a1a1a; padding: 15px; border-radius: 14px; margin-bottom: 20px; font-size: 0.9rem; color: #888;">
            أنت تؤدي دورك السري الآن. تظاهر بأنك تفكر بتركيز لتشتيت انتباه الآخرين! 🕵️‍♂️
          </div>

          <div style="width: 100%; max-width: 250px; height: 8px; background: #111; border-radius: 10px; margin: 30px auto 10px; overflow: hidden; border: 1px solid #222;">
            <div id="pretend-progress-bar" style="height: 100%; width: 0%; background: #444; transition: width 0.1s linear;"></div>
          </div>
          <div id="pretend-label" style="font-size: 0.85rem; color: #555;">جاري اتخاذ القرار...</div>
        </div>

        <div>
          <button class="btn btn-outline" id="btn-confirm-pretend" disabled style="border-color: #222; color: #444; background: #080808; width: 100%; max-width: 250px;">
            <span>تأكيد الاختيار 🔒</span>
          </button>
        </div>
      </div>
    `;

    const bar = document.getElementById('pretend-progress-bar');
    const label = document.getElementById('pretend-label');
    const confirmBtn = document.getElementById('btn-confirm-pretend');
    
    let duration = 5000; 
    let intervalTime = 100;
    let elapsed = 0;

    pretendTimeout = setInterval(() => {
      elapsed += intervalTime;
      const pct = (elapsed / duration) * 100;
      if (bar) bar.style.width = `${pct}%`;

      if (elapsed >= duration) {
        clearInterval(pretendTimeout);
        if (label) label.textContent = "تم اتخاذ القرار بنجاح! ✔️";
        if (confirmBtn) {
          confirmBtn.disabled = false;
          confirmBtn.style.borderColor = "#444";
          confirmBtn.style.color = "#999";
        }
      }
    }, intervalTime);

    confirmBtn.addEventListener('click', () => {
      Sounds.playClick();
      goToNextNightPlayer();
    });
  };

  const renderRealNightActionScreen = (player) => {
    const possibleTargets = gamePlayers.filter(p => p.active && p.id !== player.id);
    const selfTarget = gamePlayers.find(p => p.id === player.id);

    let instructionText = "";
    let targetsListHtml = "";

    if (player.role === 'werewolf') {
      instructionText = "اختر ضحية لالتهامها مع بقية المستذئبين الليلة 🐺:";
      targetsListHtml = possibleTargets.map(t => `
        <button class="btn btn-outline target-select-btn" data-tid="${t.id}" style="border-color: #222; background: #0c0c0c; color: #e0e0e0; margin-bottom: 8px; width: 100%; justify-content: center; display: inline-flex;">
          <span>${t.name}</span>
        </button>
      `).join('');
    } else if (player.role === 'serial_killer') {
      instructionText = "اختر ضحية لتصفيتها وقتلها بالسكين الليلة 🔪:";
      targetsListHtml = possibleTargets.map(t => `
        <button class="btn btn-outline target-select-btn" data-tid="${t.id}" style="border-color: #222; background: #0c0c0c; color: #e0e0e0; margin-bottom: 8px; width: 100%; justify-content: center; display: inline-flex;">
          <span>${t.name}</span>
        </button>
      `).join('');
    } else if (player.role === 'doctor') {
      instructionText = "اختر لاعباً لحمايته من الهجمات الليلة (يمكنك اختيار نفسك) 👨‍⚕️:";
      const doctorTargets = [selfTarget, ...possibleTargets].filter(Boolean);
      targetsListHtml = doctorTargets.map(t => `
        <button class="btn btn-outline target-select-btn" data-tid="${t.id}" style="border-color: #222; background: #0c0c0c; color: #e0e0e0; margin-bottom: 8px; width: 100%; justify-content: center; display: inline-flex;">
          <span>${t.name} ${t.id === player.id ? '(أنت)' : ''}</span>
        </button>
      `).join('');
    } else if (player.role === 'seer') {
      instructionText = "اختر لاعباً لكشف ولائه وفريقه 🔮:";
      targetsListHtml = possibleTargets.map(t => `
        <button class="btn btn-outline target-select-btn" data-tid="${t.id}" style="border-color: #222; background: #0c0c0c; color: #e0e0e0; margin-bottom: 8px; width: 100%; justify-content: center; display: inline-flex;">
          <span>${t.name}</span>
        </button>
      `).join('');
    }

    containerEl.innerHTML = `
      <div class="game-card wolves-night-view text-center" style="background: #050505; border: 2px solid #111; min-height: 480px; display: flex; flex-direction: column; justify-content: space-between; padding: 25px; color: #e0e0e0;">
        <div>
          <span style="font-size: 0.85rem; color: #555; display: block; margin-bottom: 15px;">اتخذ قرارك السري 🕵️‍♂️</span>
          <h3 style="font-size: 1.4rem; font-weight: 800; color: #fff; margin-bottom: 5px;">${player.name} (${getRoleArabicName(player.role)})</h3>
          <p style="font-size: 0.9rem; color: #888; margin-bottom: 20px; line-height: 1.4;">${instructionText}</p>
          
          <div class="targets-list-grid" style="display: flex; flex-direction: column; gap: 8px; max-height: 250px; overflow-y: auto; padding: 5px;">
            ${targetsListHtml}
          </div>

          <div id="seer-result-box" style="margin-top: 15px; padding: 12px; background: #0c0c0c; border: 1px dashed #333; border-radius: 12px; font-size: 0.95rem; color: #fff; display: none;">
            جاري فحص هالة اللاعب... ⏳
          </div>
        </div>

        <div>
          <button class="btn btn-outline" id="btn-confirm-action" disabled style="border-color: #222; color: #444; background: #080808; width: 100%; max-width: 250px;">
            <span>تأكيد وتمرير 🔒</span>
          </button>
        </div>
      </div>
    `;

    const confirmBtn = document.getElementById('btn-confirm-action');
    const targetButtons = containerEl.querySelectorAll('.target-select-btn');
    const resultBox = document.getElementById('seer-result-box');
    let selectedTid = null;

    targetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        Sounds.playClick();
        targetButtons.forEach(b => {
          b.style.borderColor = '#222';
          b.style.color = '#e0e0e0';
          b.style.boxShadow = 'none';
        });

        btn.style.borderColor = '#fff';
        btn.style.color = '#fff';
        btn.style.boxShadow = '0 0 5px rgba(255, 255, 255, 0.1)';

        selectedTid = parseInt(btn.getAttribute('data-tid'), 10);
        
        if (player.role === 'seer') {
          const targetPlayer = gamePlayers.find(p => p.id === selectedTid);
          let teamName = "القرويين 🔵";
          if (targetPlayer.role === 'werewolf') {
            teamName = "الذئاب 🔴";
          } else if (targetPlayer.role === 'fool' || targetPlayer.role === 'serial_killer') {
            teamName = "المحايدين 🟣";
          }
          
          if (resultBox) {
            resultBox.style.display = 'block';
            resultBox.innerHTML = `هالة اللاعب سرياً: <strong style="color: #fff;">${teamName}</strong>`;
          }
        }

        confirmBtn.disabled = false;
        confirmBtn.style.borderColor = '#444';
        confirmBtn.style.color = '#fff';
      });
    });

    confirmBtn.addEventListener('click', () => {
      Sounds.playClick();
      
      if (player.role === 'werewolf') {
        werewolfTarget = selectedTid;
      } else if (player.role === 'serial_killer') {
        killerTarget = selectedTid;
      } else if (player.role === 'doctor') {
        doctorTarget = selectedTid;
      } else if (player.role === 'seer') {
        seerTarget = selectedTid;
      }

      goToNextNightPlayer();
    });
  };

  const goToNextNightPlayer = () => {
    nightPlayerIndex++;
    if (nightPlayerIndex < activeNightPlayers.length) {
      renderNextNightPassScreen();
    } else {
      resolveNightActions();
    }
  };

  const resolveNightActions = () => {
    let deadPlayers = [];
    
    if (werewolfTarget !== null && werewolfTarget !== doctorTarget) {
      deadPlayers.push(werewolfTarget);
    }
    
    if (killerTarget !== null && killerTarget !== doctorTarget) {
      deadPlayers.push(killerTarget);
    }

    deadPlayers = [...new Set(deadPlayers)];

    deadPlayers.forEach(pid => {
      const victim = gamePlayers.find(p => p.id === pid);
      if (victim) {
        victim.active = false;
      }
    });

    let deathLog = [];
    deadPlayers.forEach(pid => {
      const p = gamePlayers.find(p => p.id === pid);
      deathLog.push(`${p.emoji} <strong>${p.name}</strong> (${getRoleArabicName(p.role)})`);
    });

    currentPhase = 'day_announce';
    renderDayAnnounceScreen(deathLog);
  };

  const renderDayAnnounceScreen = (deathLog) => {
    Sounds.playSuccess();

    let announcementText = "";
    if (deathLog.length === 0) {
      announcementText = `
        <div class="victory-box victory-team-a" style="margin: 30px 0; background: rgba(0, 230, 118, 0.08); border: 1px solid rgba(0, 230, 118, 0.2);">
          <span class="victory-icon" style="font-size: 3.5rem;">🛡️</span>
          <h2 style="font-size: 1.6rem; color: #00e676; font-weight: 800; margin-top: 10px;">كانت ليلة هادئة!</h2>
          <p style="font-size: 0.95rem; color: var(--text-muted); margin-top: 10px;">لم يمت أحد الليلة الماضية. نجح الطبيب في حماية المستهدفين أو لم يختر الأعداء ضحاياهم!</p>
        </div>
      `;
    } else {
      announcementText = `
        <div class="victory-box victory-draw" style="margin: 30px 0; background: rgba(255, 23, 68, 0.08); border: 1px solid rgba(255, 23, 68, 0.2);">
          <span class="victory-icon" style="font-size: 3.5rem;">☠️</span>
          <h2 style="font-size: 1.6rem; color: var(--danger); font-weight: 800; margin-top: 10px;">جرائم ليلية بشعة!</h2>
          <p style="font-size: 0.95rem; color: var(--text-muted); margin-top: 10px; margin-bottom: 20px;">استيقظت القرية لتجد جثث الضحايا التالية معلقة:</p>
          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 1.15rem; color: #fff;">
            ${deathLog.map(log => `<div>${log}</div>`).join('')}
          </div>
        </div>
      `;
    }

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">النهار قد حل ☀️</span>
          <h2>أخبار القرية الصباحية</h2>
        </div>

        ${announcementText}

        <div class="game-controls">
          <button class="btn btn-primary btn-large" id="btn-go-to-discuss">
            <span>الذهاب للنقاش والتحليل 🗣️</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-go-to-discuss').addEventListener('click', () => {
      Sounds.playClick();
      
      const winner = checkWinConditions();
      if (winner) {
        renderGameOverScreen(winner);
      } else {
        startDiscussPhase();
      }
    });
  };

  const startDiscussPhase = () => {
    currentPhase = 'day_discuss';
    timerVal = 60; 
    renderDiscussScreen();
  };

  const renderDiscussScreen = () => {
    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">النقاش اليومي 🗣️</span>
          <h2>من هو المتهم؟ 🤔</h2>
        </div>

        <div style="margin: 30px 0;">
          <p style="font-size: 1.05rem; color: var(--text-muted); line-height: 1.5;">
            تحدثوا واتهموا وحللوا من استغرق وقتاً طويلاً أو ارتبك أثناء التمرير!
          </p>

          <div style="font-size: 4rem; font-weight: 900; color: #fff; margin: 20px 0;" id="discuss-timer-val">
            60
          </div>
          <button class="btn btn-outline" id="btn-start-discuss-timer" style="margin-bottom: 20px;">
            <span>ابدأ مؤقت النقاش ⏱️</span>
          </button>
        </div>

        <div class="active-players-list-simple" style="text-align: right;">
          <h4>الأعضاء الأحياء حالياً (${gamePlayers.filter(p => p.active).length}):</h4>
          <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;">
            ${gamePlayers.map(p => `
              <span class="player-mini-badge" style="background: ${p.color}; opacity: ${p.active ? 1 : 0.2}; text-decoration: ${p.active ? 'none' : 'line-through'};">
                <span>${p.emoji}</span> ${p.name}
              </span>
            `).join('')}
          </div>
        </div>

        <div class="game-controls" style="margin-top: 30px;">
          <button class="btn btn-primary btn-large" id="btn-go-to-vote">
            <span>انتقل للتصويت والإعدام 🗳️</span>
          </button>
        </div>
      </div>
    `;

    const timerLabel = document.getElementById('discuss-timer-val');
    const startTimerBtn = document.getElementById('btn-start-discuss-timer');
    
    startTimerBtn.addEventListener('click', () => {
      startTimerBtn.disabled = true;
      Sounds.playClick();

      timerInterval = setInterval(() => {
        timerVal--;
        if (timerLabel) timerLabel.textContent = timerVal;
        
        if (timerVal <= 10 && timerVal > 0) {
          Sounds.playTick(1.0);
        }

        if (timerVal <= 0) {
          clearInterval(timerInterval);
          Sounds.playFail();
          if (timerLabel) timerLabel.textContent = "انتهى الوقت! 🗳️";
        }
      }, 1000);
    });

    document.getElementById('btn-go-to-vote').addEventListener('click', () => {
      clearInterval(timerInterval);
      Sounds.playClick();
      startVotePhase();
    });
  };

  const startVotePhase = () => {
    currentPhase = 'day_vote';
    renderVoteScreen();
  };

  const renderVoteScreen = () => {
    const activePlayers = gamePlayers.filter(p => p.active);

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">التصويت والإعدام 🗳️</span>
          <h2>من هو الذئب أو القاتل؟</h2>
        </div>

        <p style="font-size: 0.95rem; color: var(--text-muted); margin-bottom: 20px;">
          اختاروا اللاعب الذي حصل على أغلبية الأصوات لشنقه، أو اختاروا تخطي الجولة إذا اتفقتم على ذلك:
        </p>

        <div class="targets-list-grid" style="display: flex; flex-direction: column; gap: 8px; max-height: 250px; overflow-y: auto; padding: 5px; margin-bottom: 20px;">
          ${activePlayers.map(p => `
            <button class="btn btn-outline vote-target-btn" data-pid="${p.id}" style="border-color: rgba(255,255,255,0.08); background: rgba(255,255,255,0.01); color: #fff; width: 100%; justify-content: center; display: inline-flex; border-right: 4px solid ${p.color};">
              <span>${p.emoji} ${p.name}</span>
            </button>
          `).join('')}

          <button class="btn btn-outline vote-target-btn" data-pid="skip" style="border-color: #333; background: rgba(255,255,255,0.03); color: var(--text-muted); width: 100%; justify-content: center; display: inline-flex;">
            <span>🚫 تخطي التصويت (لا أحد)</span>
          </button>
        </div>

        <div class="game-controls">
          <button class="btn btn-accent btn-large" id="btn-confirm-vote" disabled>
            <span>تأكيد الحكم والشنق ⚖️</span>
          </button>
        </div>
      </div>
    `;

    const confirmBtn = document.getElementById('btn-confirm-vote');
    const voteButtons = containerEl.querySelectorAll('.vote-target-btn');
    let selectedVotePid = null;

    voteButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        Sounds.playClick();
        voteButtons.forEach(b => {
          b.style.borderColor = 'rgba(255,255,255,0.08)';
          b.style.boxShadow = 'none';
        });

        btn.style.borderColor = 'var(--accent)';
        btn.style.boxShadow = '0 0 10px var(--accent-glow)';

        selectedVotePid = btn.getAttribute('data-pid');
        confirmBtn.disabled = false;
      });
    });

    confirmBtn.addEventListener('click', () => {
      Sounds.playClick();
      executeVotedPlayer(selectedVotePid);
    });
  };

  const executeVotedPlayer = (pid) => {
    if (pid === 'skip') {
      showExecutionRevealScreen(null);
      return;
    }

    const targetId = parseInt(pid, 10);
    const victim = gamePlayers.find(p => p.id === targetId);
    
    victim.active = false;

    if (victim.role === 'fool') {
      renderGameOverScreen('fool', victim);
    } else {
      showExecutionRevealScreen(victim);
    }
  };

  const showExecutionRevealScreen = (victim) => {
    Sounds.playFail();
    let messageHtml = "";

    if (victim === null) {
      messageHtml = `
        <div class="victory-box victory-draw" style="margin: 30px 0;">
          <span class="victory-icon">🚫</span>
          <h2>اتفق القرويون على تخطي التصويت!</h2>
          <p>لم يتم شنق أحد في هذا النهار. القاتل والذئاب ما زالوا طلقاء يخططون للّيل القادم!</p>
        </div>
      `;
    } else {
      messageHtml = `
        <div class="victory-box victory-draw" style="margin: 30px 0; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);">
          <span class="victory-icon">⚖️</span>
          <h2>تم شنق ${victim.name}!</h2>
          <p style="margin-top: 10px; font-size: 0.95rem; color: var(--text-muted);">بعد ربط المشنقة وإعدامه، كشفت البلدة عن هويته الحقيقية وكان:</p>
          <strong style="font-size: 1.6rem; color: #fff; display: block; margin-top: 12px;">${getRoleArabicName(victim.role)}</strong>
        </div>
      `;
    }

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">نتيجة المحكمة ⚖️</span>
          <h2>تأكيد الإعدام</h2>
        </div>

        ${messageHtml}

        <div class="game-controls">
          <button class="btn btn-primary btn-large" id="btn-end-day-phase">
            <span>الذهاب للمرحلة التالية ➡️</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-end-day-phase').addEventListener('click', () => {
      Sounds.playClick();
      
      const winner = checkWinConditions();
      if (winner) {
        renderGameOverScreen(winner);
      } else {
        startNightPhase();
      }
    });
  };

  const checkWinConditions = () => {
    const activeSK = gamePlayers.filter(p => p.role === 'serial_killer' && p.active).length;
    const activeWolves = gamePlayers.filter(p => p.role === 'werewolf' && p.active).length;
    const totalActive = gamePlayers.filter(p => p.active).length;

    if (activeSK > 0 && totalActive <= 2) {
      if (totalActive === 1 || (totalActive === 2 && activeWolves === 0)) {
        return 'serial_killer';
      }
    }

    if (activeWolves > 0 && activeSK === 0 && activeWolves >= (totalActive - activeWolves)) {
      return 'werewolves';
    }

    if (activeWolves === 0 && activeSK === 0) {
      return 'villagers';
    }

    return null;
  };

  const renderGameOverScreen = (winner, specialVictim = null) => {
    currentPhase = 'game_over';
    Sounds.playSuccess();

    let winTitle = "";
    let winDescription = "";
    let winThemeClass = "victory-team-a"; 
    let winIcon = "🏆";

    if (winner === 'villagers') {
      winTitle = "انتصر القرويون! 🔵";
      winDescription = "لقد تم تطهير القرية من الذئاب المتعطشة للدماء ومن القاتل المتسلسل بنجاح! عادت السكينة إلى الديار.";
      winThemeClass = "victory-team-b"; 
      winIcon = "🧑‍🌾";
    } else if (winner === 'werewolves') {
      winTitle = "انتصرت الذئاب! 🔴";
      winDescription = "لقد التهمت الذئاب قرويي البلدة واحداً تلو الآخر حتى تمت السيطرة على القرية بالكامل! عواء النصر يدوي في الليل.";
      winThemeClass = "victory-draw"; 
      winIcon = "🐺";
    } else if (winner === 'serial_killer') {
      winTitle = "فاز القاتل المتسلسل! 🔪";
      winDescription = "لقد تمكن القاتل المتسلسل من تصفية الجميع والوقوف بمفرده كناجٍ وحيد بدم بارد! لعبة عبقرية وهادئة.";
      winThemeClass = "victory-team-a"; 
      winIcon = "🔪";
    } else if (winner === 'fool') {
      winTitle = "فاز الأحمق! 🃏";
      winDescription = `لقد نجح <strong>${specialVictim ? specialVictim.name : 'الأحمق'}</strong> في خداعكم بالكامل وجعلكم تصوتون لشنقه! لقد فاز باللعبة بمفرده بينما خسر الجميع!`;
      winThemeClass = "victory-team-a";
      winIcon = "🃏";
    }

    containerEl.innerHTML = `
      <div class="game-card animate-fade-in text-center">
        <div class="game-header">
          <span class="game-badge">انتهت اللعبة! 🏁</span>
          <h2>النتيجة النهائية</h2>
        </div>

        <div class="victory-box ${winThemeClass}" style="margin: 25px 0;">
          <span class="victory-icon" style="font-size: 3.5rem;">${winIcon}</span>
          <h2 style="font-size: 1.7rem; color: #fff; font-weight: 800;">${winTitle}</h2>
          <p style="font-size: 0.95rem; color: var(--text-muted); margin-top: 8px; line-height: 1.5;">${winDescription}</p>
        </div>

        <h4 style="text-align: right; margin-bottom: 8px;">أدوار وحالات اللاعبين:</h4>
        <div class="scoreboard-scroll" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 25px; max-height: 200px; overflow-y: auto; padding: 5px;">
          ${gamePlayers.map(p => `
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; border-radius: 12px; border-right: 4px solid ${p.color};">
              <span style="font-weight: 700; color: #fff; text-decoration: ${p.active ? 'none' : 'line-through'}; opacity: ${p.active ? 1 : 0.5};">
                ${p.emoji} ${p.name}
              </span>
              <span style="font-size: 0.85rem; font-weight: 600; color: ${p.active ? 'var(--accent)' : 'var(--danger)'};">
                ${getRoleArabicName(p.role)} (${p.active ? 'حي' : 'ميت 💀'})
              </span>
            </div>
          `).join('')}
        </div>

        <div class="game-controls-stacked">
          <button class="btn btn-primary" id="btn-replay-wolves">لعب من جديد 🔄</button>
          <button class="btn btn-outline" id="btn-exit-wolves">خروج للقائمة الرئيسية 🚪</button>
        </div>
      </div>
    `;

    document.getElementById('btn-replay-wolves').addEventListener('click', () => {
      Sounds.playClick();
      setupGame();
    });

    document.getElementById('btn-exit-wolves').addEventListener('click', () => {
      Sounds.playClick();
      onExitCallback();
    });
  };

  const restart = () => {
    cleanup();
    setupGame();
  };

  const cleanup = () => {
    clearInterval(timerInterval);
    clearInterval(pretendTimeout);
  };

  return {
    init,
    cleanup,
    restart
  };
})();

// Register globally
window.WolvesvilleGame = WolvesvilleGame;
