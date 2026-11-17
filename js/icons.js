(function (global) {
  const PW = (global.PW = global.PW || {});

  function pennywyseLogoSvg(size = 'sm') {
    const dim = size === 'lg' ? 116 : size === 'md' ? 48 : 34;
    return `
      <svg width="${dim}" height="${dim}" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;" aria-label="Pennywyse logo">
        <defs>
          <linearGradient id="pwCrimson_${size}" x1="20" y1="10" x2="96" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#DC1E1E" />
            <stop offset="55%" stop-color="#9E0909" />
            <stop offset="100%" stop-color="#650404" />
          </linearGradient>
          <linearGradient id="pwGold_${size}" x1="16" y1="84" x2="104" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#C27803" />
            <stop offset="50%" stop-color="#F59E0B" />
            <stop offset="100%" stop-color="#FDE68A" />
          </linearGradient>
        </defs>
        <path d="M28 18C28 13.5817 31.5817 10 36 10H72C88.5685 10 102 23.4315 102 40V46C102 62.5685 88.5685 76 72 76H48V104C48 108.418 44.4183 112 40 112H36C31.5817 112 28 108.418 28 104V18Z" fill="url(#pwCrimson_${size})" />
        <rect x="36" y="16" width="38" height="4.5" rx="2.25" fill="#FFFFFF" opacity="0.92" />
        <path d="M48 30H70C77.732 30 84 36.268 84 44C84 51.732 77.732 58 70 58H48V30Z" fill="#FFFFFF" />
        <path d="M17 81.5L96 30.5C98.2 29.1 101.1 29.7 102.5 31.9C103.9 34.1 103.3 37 101.1 38.4L22.1 89.4C19.9 90.8 17 90.2 15.6 88C14.2 85.8 14.8 82.9 17 81.5Z" fill="url(#pwGold_${size})" />
      </svg>
    `;
  }

  function welcomeIllustrationSvg() {
    return `
      <div class="welcome-illus">
        <svg viewBox="0 0 280 210" fill="none" style="width:100%;height:100%;">
          <path d="M52 158L118 134L178 164L112 188L52 158Z" stroke="#C28B7D" stroke-width="1.2" stroke-linejoin="round" opacity="0.55" />
          <ellipse cx="182" cy="144" rx="14" ry="7" stroke="#C28B7D" stroke-width="1.2" opacity="0.55" />
          <path d="M168 144V152C168 155.8 174.3 159 182 159C189.7 159 196 155.8 196 152V144" stroke="#C28B7D" stroke-width="1.2" opacity="0.55" />
          <ellipse cx="204" cy="156" rx="12" ry="6" stroke="#C28B7D" stroke-width="1.2" opacity="0.5" />
          <g transform="translate(30, 32) rotate(-22)">
            <rect x="0" y="28" width="136" height="84" rx="10" fill="#FFFDFB" stroke="#B68B7E" stroke-width="1.4" />
            <rect x="0" y="42" width="136" height="12" fill="#E8CFC7" opacity="0.45" />
            <rect x="14" y="64" width="22" height="15" rx="3" fill="#FDE68A" stroke="#D97706" stroke-width="1" />
            <text x="14" y="96" fill="#7C2D12" font-size="9.5" font-weight="600" font-family="Plus Jakarta Sans, sans-serif">$401.50 | balance</text>
          </g>
          <g>
            <rect x="136" y="106" width="14" height="32" rx="2" fill="#D91B1B" />
            <polygon points="150,106 157,102 157,134 150,138" fill="#8C0707" />
            <rect x="161" y="88" width="14" height="50" rx="2" fill="#D91B1B" />
            <polygon points="175,88 182,84 182,134 175,138" fill="#8C0707" />
            <rect x="186" y="70" width="14" height="68" rx="2" fill="#D91B1B" />
            <polygon points="200,70 207,66 207,134 200,138" fill="#8C0707" />
            <rect x="211" y="50" width="14" height="88" rx="2" fill="#D91B1B" />
            <polygon points="225,50 232,46 232,134 225,138" fill="#8C0707" />
            <path d="M128 96L196 46L212 36" stroke="#B45309" stroke-width="2.5" stroke-linecap="round" />
            <polygon points="218,32 206,33 213,43" fill="#B45309" />
          </g>
        </svg>
      </div>
    `;
  }

  function googleLogoSvg(size = 16) {
    return `
      <svg viewBox="0 0 24 24" width="${size}" height="${size}">
        <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z" />
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z" />
        <path fill="#FBBC05" d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.1-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.8z" />
        <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 21.3 7.4 24 12 24z" />
      </svg>
    `;
  }

  const SVG_PATHS = {
    home: '<path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z"/>',
    receipt: '<path d="M4 3h16v18l-2.5-1.5L15 21l-3-1.5L9 21l-2.5-1.5L4 21V3z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    chart: '<path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="7" rx="0.5"/><rect x="12" y="6" width="3" height="11" rx="0.5"/><rect x="17" y="13" width="3" height="4" rx="0.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    bellRing: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M2 8c0-2.2.7-4.3 2-6M22 8a10 10 0 0 0-2-6"/>',
    arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    arrowDown: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    shieldCheck: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="2" y1="14" x2="6" y2="14"/><line x1="10" y1="8" x2="14" y2="8"/><line x1="18" y1="16" x2="22" y2="16"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    bot: '<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8.01" y2="16"/><line x1="16" y1="16" x2="16.01" y2="16"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    rotateCcw: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    sparkles: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    spreadsheet: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8M10 9H8"/>',
    fileText: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    smartphone: '<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
    wifiOff: '<line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.58 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>',
    calculator: '<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="11" x2="8.01" y2="11"/><line x1="12" y1="11" x2="12.01" y2="11"/><line x1="16" y1="11" x2="16.01" y2="11"/><line x1="8" y1="15" x2="8.01" y2="15"/><line x1="12" y1="15" x2="12.01" y2="15"/><line x1="16" y1="15" x2="16.01" y2="15"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    food: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    transport: '<path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/>',
    salary: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
    shopping: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    entertainment: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20M7 4v6M17 4v6"/>',
    investment: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    premiums: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/>',
    utilities: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    health: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/>',
    wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    graduation: '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  };

  function iconSvg(name, size = 18, strokeWidth = 2, extraAttrs = '') {
    const path = SVG_PATHS[name] || SVG_PATHS.wallet;
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" ${extraAttrs}>${path}</svg>`;
  }

  function transactionIconSvg(icon, size = 18) {
    return iconSvg(SVG_PATHS[icon] ? icon : 'wallet', size, 2);
  }

  function goalIconSvg(icon, size = 16) {
    if (icon === 'shield') return iconSvg('shieldCheck', size, 2);
    if (icon === 'car') return iconSvg('transport', size, 2);
    if (icon === 'heart') return iconSvg('health', size, 2);
    return iconSvg(SVG_PATHS[icon] ? icon : 'sparkles', size, 2);
  }

  PW.pennywyseLogoSvg = pennywyseLogoSvg;
  PW.welcomeIllustrationSvg = welcomeIllustrationSvg;
  PW.googleLogoSvg = googleLogoSvg;
  PW.iconSvg = iconSvg;
  PW.transactionIconSvg = transactionIconSvg;
  PW.goalIconSvg = goalIconSvg;
})(window);
