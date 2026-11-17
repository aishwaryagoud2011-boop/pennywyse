(function (global) {
  const PW = (global.PW = global.PW || {});

  function renderSplashScreen(container, ctx) {
    const { pennywyseLogoSvg } = PW;
    container.innerHTML = `
      <div class="splash-screen">
        <div style="height:24px;" aria-hidden="true"></div>

        <div class="splash-center">
          ${pennywyseLogoSvg('lg')}
          <h1 class="splash-title">pennywyse</h1>
          <p class="splash-subtitle">take control of every expense</p>
        </div>

        <div class="splash-cta-wrap">
          <button type="button" id="splashExploreBtn" class="btn-primary splash-explore-btn">
            Explore
          </button>
        </div>
      </div>
    `;

    container.querySelector('#splashExploreBtn')?.addEventListener('click', () => {
      ctx.navigate(ctx.state.user ? 'home' : 'welcome');
    });
  }

  PW.renderSplashScreen = renderSplashScreen;
})(window);
