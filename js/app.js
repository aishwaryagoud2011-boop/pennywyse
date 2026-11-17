(function (global) {
  const PW = (global.PW = global.PW || {});

  const {
    apiRequest,
    getStoredToken,
    setStoredToken,
    iconSvg,
    mountTransactionModal,
    getPWAStatus,
    initPWA,
    subscribePWA,
    renderAiScreen,
    renderAnalyticsScreen,
    renderHomeScreen,
    renderProfileScreen,
    renderSignUpScreen,
    renderSplashScreen,
    renderTransactionsScreen,
    renderWelcomeScreen,
  } = PW;

  const rootEl = document.getElementById('app');

  rootEl.innerHTML = `
    <div class="app-outer">
      <div class="app-shell">
        <div id="offlineBannerHost"></div>
        <div id="screenRoot" style="flex:1;display:flex;flex-direction:column;"></div>
        <div id="modalRoot"></div>
      </div>
    </div>
  `;

  const offlineBannerHost = document.getElementById('offlineBannerHost');
  const screenRoot = document.getElementById('screenRoot');
  const modalRoot = document.getElementById('modalRoot');

  const state = {
    booting: true,
    screen: 'splash',
    user: null,
    transactions: [],
    savingGoals: [],
  };

  let unmountModal = null;

  function renderOfflineBanner() {
    const { isOnline } = getPWAStatus();
    if (isOnline || PW.isLocalFileMode()) {
      offlineBannerHost.innerHTML = '';
      return;
    }
    offlineBannerHost.innerHTML = `
      <div class="offline-banner">
        ${iconSvg('wifiOff', 14)}
        <span>Offline Mode — Reconnect to sync changes</span>
      </div>
    `;
  }

  function renderScreen() {
    if (state.booting) {
      screenRoot.innerHTML = `
        <div class="boot-loader">
          <span class="spinner" style="width:32px;height:32px;border-width:3px;color:#A80F0F;"></span>
          <p class="font-serif" style="font-size:14px;color:#525252;">Loading Pennywyse...</p>
        </div>
      `;
      return;
    }

    const ctx = {
      state,
      navigate,
      onAuthenticated,
      updateProfile,
      updateGoals,
      openTransactionModal,
      signOut,
    };

    if (state.screen === 'splash') {
      renderSplashScreen(screenRoot, ctx);
    } else if (state.screen === 'welcome') {
      renderWelcomeScreen(screenRoot, ctx);
    } else if (state.screen === 'signup') {
      renderSignUpScreen(screenRoot, ctx);
    } else if (state.screen === 'home' && state.user) {
      renderHomeScreen(screenRoot, ctx);
    } else if (state.screen === 'transactions' && state.user) {
      renderTransactionsScreen(screenRoot, ctx);
    } else if (state.screen === 'analytics' && state.user) {
      renderAnalyticsScreen(screenRoot, ctx);
    } else if (state.screen === 'ai' && state.user) {
      renderAiScreen(screenRoot, ctx);
    } else if (state.screen === 'profile' && state.user) {
      renderProfileScreen(screenRoot, ctx);
    } else {
      renderSplashScreen(screenRoot, ctx);
    }

    global.scrollTo({ top: 0 });
  }

  function navigate(nextScreen) {
    state.screen = nextScreen;
    renderScreen();
  }

  function onAuthenticated(data) {
    state.user = data.user;
    state.transactions = data.transactions || [];
    state.savingGoals = data.savingGoals || [];
    state.screen = data.user?.onboardingComplete ? 'home' : 'signup';
    renderScreen();
  }

  async function updateProfile(patch) {
    const res = await apiRequest('/api/user/profile', {
      method: 'PUT',
      body: patch,
    });
    state.user = res.user;
    state.transactions = res.transactions;
    state.savingGoals = res.savingGoals;
    renderScreen();
  }

  async function updateGoals(goals) {
    const res = await apiRequest('/api/goals', {
      method: 'PUT',
      body: { savingGoals: goals },
    });
    state.savingGoals = res.savingGoals;
    renderScreen();
  }

  async function saveTransaction(payload) {
    if (payload.id) {
      const res = await apiRequest(`/api/transactions/${payload.id}`, {
        method: 'PUT',
        body: payload,
      });
      state.transactions = res.transactions;
    } else {
      const res = await apiRequest('/api/transactions', {
        method: 'POST',
        body: payload,
      });
      state.transactions = res.transactions;
    }
    renderScreen();
  }

  async function deleteTransaction(id) {
    const res = await apiRequest(`/api/transactions/${id}`, {
      method: 'DELETE',
    });
    state.transactions = res.transactions;
    renderScreen();
  }

  function openTransactionModal(initial = null, defaultType = 'expense') {
    if (unmountModal) unmountModal();
    unmountModal = mountTransactionModal(modalRoot, {
      initial,
      defaultType: initial?.type || defaultType,
      onSave: saveTransaction,
      onDelete: initial ? deleteTransaction : undefined,
      onClose: () => {
        if (unmountModal) {
          unmountModal();
          unmountModal = null;
        }
      },
    });
  }

  function signOut() {
    if (unmountModal) {
      unmountModal();
      unmountModal = null;
    }
    setStoredToken(null);
    state.user = null;
    state.transactions = [];
    state.savingGoals = [];
    state.screen = 'welcome';
    renderScreen();
  }

  async function boot() {
    initPWA();
    renderOfflineBanner();
    subscribePWA(renderOfflineBanner);
    renderScreen();

    const token = getStoredToken();
    if (!token) {
      state.booting = false;
      renderScreen();
      return;
    }

    try {
      const data = await apiRequest('/api/auth/me');
      state.user = data.user;
      state.transactions = data.transactions || [];
      state.savingGoals = data.savingGoals || [];
      state.screen = data.user?.onboardingComplete ? 'home' : 'signup';
    } catch {
      setStoredToken(null);
    } finally {
      state.booting = false;
      renderScreen();
    }
  }

  PW.boot = boot;
  boot();
})(window);
