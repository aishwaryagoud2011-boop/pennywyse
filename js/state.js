(function (global) {
  const PW = (global.PW = global.PW || {});

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getNavPath(name) {
    if (name === 'home') {
      return '<path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z"/>';
    }
    if (name === 'receipt') {
      return '<path d="M4 3h16v18l-2.5-1.5L15 21l-3-1.5L9 21l-2.5-1.5L4 21V3z"/><path d="M8 8h8M8 12h8M8 16h5"/>';
    }
    if (name === 'chart') {
      return '<path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="7" rx="0.5"/><rect x="12" y="6" width="3" height="11" rx="0.5"/><rect x="17" y="13" width="3" height="4" rx="0.5"/>';
    }
    return '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6"/>';
  }

  function renderBottomNav(activeScreen) {
    const items = [
      { screen: 'home', label: 'Home', icon: 'home' },
      { screen: 'transactions', label: 'Transactions', icon: 'receipt' },
      { screen: 'analytics', label: 'Analytics', icon: 'chart' },
      { screen: 'profile', label: 'Profile', icon: 'user' },
    ];
    return `
      <nav aria-label="Primary navigation" class="bottom-nav">
        <div class="bottom-nav-grid">
          ${items
            .map((item) => {
              const isActive =
                activeScreen === item.screen || (item.screen === 'analytics' && activeScreen === 'ai');
              const stroke = isActive ? 2.5 : 2;
              return `
                <button
                  type="button"
                  data-nav="${item.screen}"
                  aria-label="${item.label}"
                  ${isActive ? 'aria-current="page"' : ''}
                  class="nav-item ${isActive ? 'active' : ''}"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${getNavPath(item.icon)}</svg>
                  <span class="nav-label">${item.label}</span>
                </button>
              `;
            })
            .join('')}
        </div>
      </nav>
    `;
  }

  PW.escapeHtml = escapeHtml;
  PW.renderBottomNav = renderBottomNav;
})(window);
