(function (global) {
  const PW = (global.PW = global.PW || {});

  let deferredPrompt = null;
  let installed = false;
  let online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const listeners = new Set();

  function isIOSDevice() {
    return /iphone|ipad|ipod/.test(global.navigator.userAgent.toLowerCase());
  }

  function getPWAStatus() {
    return {
      isInstallable: Boolean(deferredPrompt),
      isInstalled: installed,
      isIOS: isIOSDevice(),
      isOnline: online,
    };
  }

  function subscribePWA(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  function notify() {
    for (const cb of listeners) cb(getPWAStatus());
  }

  async function triggerPWAInstall() {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      installed = true;
      deferredPrompt = null;
      notify();
      return true;
    }
    return false;
  }

  function initPWA() {
    installed =
      (global.matchMedia && global.matchMedia('(display-mode: standalone)').matches) ||
      global.navigator.standalone === true;

    global.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      notify();
    });

    global.addEventListener('appinstalled', () => {
      installed = true;
      deferredPrompt = null;
      notify();
    });

    global.addEventListener('online', () => {
      online = true;
      notify();
    });

    global.addEventListener('offline', () => {
      online = false;
      notify();
    });

    if (global.location?.protocol !== 'file:' && 'serviceWorker' in global.navigator) {
      global.navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  PW.isIOSDevice = isIOSDevice;
  PW.getPWAStatus = getPWAStatus;
  PW.subscribePWA = subscribePWA;
  PW.triggerPWAInstall = triggerPWAInstall;
  PW.initPWA = initPWA;
})(window);
