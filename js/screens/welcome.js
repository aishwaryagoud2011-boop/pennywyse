(function (global) {
  const PW = (global.PW = global.PW || {});

  function renderWelcomeScreen(container, ctx) {
    const { apiRequest, setStoredToken, googleLogoSvg, iconSvg, pennywyseLogoSvg, welcomeIllustrationSvg, escapeHtml } = PW;

    const local = {
      modalMode: 'none', // 'none' | 'google' | 'email'
      googleName: '',
      googleEmail: '',
      emailStep: 'enter', // 'enter' | 'verify'
      emailInput: '',
      emailPassword: '',
      usePasswordLogin: false,
      verificationCode: '',
      serverPreviewCode: null,
      existingAccount: false,
      loading: false,
      error: null,
    };

    function resetModal() {
      local.modalMode = 'none';
      local.error = null;
      local.loading = false;
      local.emailStep = 'enter';
      local.verificationCode = '';
      local.serverPreviewCode = null;
      renderModal();
    }

    function renderMain() {
      container.innerHTML = `
        <div class="welcome-screen">
          <div class="top-bar-plain">
            <button type="button" id="welcomeLogoBackBtn" aria-label="Back to splash screen" class="back-btn">
              ${pennywyseLogoSvg('sm')}
            </button>
            <button type="button" id="welcomeTextBackBtn" class="back-btn">
              ${iconSvg('arrowLeft', 14)}
              <span>Back</span>
            </button>
          </div>

          <div class="welcome-hero">
            ${welcomeIllustrationSvg()}
            <h1 class="welcome-heading">
              Welcome to <span class="brand-red">pennywyse</span>
            </h1>
            <p class="welcome-sub">Your money deserves a little more attention!</p>

            <div class="welcome-actions">
              <button type="button" id="openGoogleAuthBtn" class="btn-primary">
                <span class="google-pill-icon">${googleLogoSvg(16)}</span>
                <span>Continue with Google</span>
              </button>

              <div class="or-divider">OR</div>

              <button type="button" id="openEmailAuthBtn" class="btn-secondary blush-btn">
                <span style="color:#991B1B;display:inline-flex;">${iconSvg('mail', 20)}</span>
                <span>Continue with Email</span>
              </button>
            </div>

            <button type="button" id="goToSignUpBtn" class="signup-link-btn">
              Don't have an account? <strong style="font-weight:700;">Sign up</strong>
            </button>
          </div>

          <div style="height:8px;" aria-hidden="true"></div>
          <div id="welcomeModalHost"></div>
        </div>
      `;

      container.querySelector('#welcomeLogoBackBtn')?.addEventListener('click', () => ctx.navigate('splash'));
      container.querySelector('#welcomeTextBackBtn')?.addEventListener('click', () => ctx.navigate('splash'));
      container.querySelector('#goToSignUpBtn')?.addEventListener('click', () => ctx.navigate('signup'));
      container.querySelector('#openGoogleAuthBtn')?.addEventListener('click', () => {
        local.error = null;
        local.modalMode = 'google';
        renderModal();
      });
      container.querySelector('#openEmailAuthBtn')?.addEventListener('click', () => {
        local.error = null;
        local.emailStep = 'enter';
        local.modalMode = 'email';
        renderModal();
      });
    }

    function renderModal() {
      const host = container.querySelector('#welcomeModalHost');
      if (!host) return;

      if (local.modalMode === 'none') {
        host.innerHTML = '';
        return;
      }

      if (local.modalMode === 'google') {
        host.innerHTML = `
          <div class="modal-backdrop" id="welcomeModalBackdrop">
            <div class="modal-card" role="dialog" aria-modal="true" aria-label="Sign in with Google">
              <div class="row-between">
                <div class="row-center">
                  <span class="google-pill-icon" style="width:32px;height:32px;border:1px solid #e5e5e5;">
                    ${googleLogoSvg(16)}
                  </span>
                  <div>
                    <h2 style="font-size:16px;font-weight:700;color:#171717;">Sign in with Google</h2>
                    <p style="font-size:12px;color:#737373;">Verify your account to continue to Pennywyse</p>
                  </div>
                </div>
                <button type="button" id="welcomeModalCloseBtn" aria-label="Close" class="icon-btn-circle">
                  ${iconSvg('x', 20)}
                </button>
              </div>

              <form id="googleAuthForm" class="stack-md" style="margin-top:20px;">
                <div>
                  <label class="field-label" for="googleNameInput">Full Name</label>
                  <input id="googleNameInput" type="text" required value="${escapeHtml(local.googleName)}" placeholder="Enter your name" class="input" />
                </div>
                <div>
                  <label class="field-label" for="googleEmailInput">Google Email</label>
                  <input id="googleEmailInput" type="email" required value="${escapeHtml(local.googleEmail)}" placeholder="you@gmail.com" class="input" />
                </div>

                ${local.error ? `<p class="error-text">${escapeHtml(local.error)}</p>` : ''}

                <button type="submit" ${local.loading ? 'disabled' : ''} class="btn-primary">
                  ${local.loading ? '<span class="spinner"></span>' : iconSvg('checkCircle', 16)}
                  <span>${local.loading ? 'Verifying...' : 'Verify & Continue'}</span>
                </button>
              </form>
            </div>
          </div>
        `;

        host.querySelector('#welcomeModalCloseBtn')?.addEventListener('click', resetModal);
        host.querySelector('#welcomeModalBackdrop')?.addEventListener('click', (e) => {
          if (e.target.id === 'welcomeModalBackdrop') resetModal();
        });
        host.querySelector('#googleNameInput')?.addEventListener('input', (e) => {
          local.googleName = e.target.value;
        });
        host.querySelector('#googleEmailInput')?.addEventListener('input', (e) => {
          local.googleEmail = e.target.value;
        });
        host.querySelector('#googleAuthForm')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          local.error = null;
          if (!local.googleName.trim() || !local.googleEmail.includes('@')) {
            local.error = 'Please enter your Google account name and email.';
            renderModal();
            return;
          }
          local.loading = true;
          renderModal();
          try {
            const res = await apiRequest('/api/auth/google', {
              method: 'POST',
              body: { name: local.googleName.trim(), email: local.googleEmail.trim() },
            });
            setStoredToken(res.token);
            ctx.onAuthenticated({
              user: res.user,
              transactions: res.transactions,
              savingGoals: res.savingGoals,
            });
          } catch (err) {
            local.loading = false;
            local.error = err instanceof Error ? err.message : 'Google sign-in failed';
            renderModal();
          }
        });
        return;
      }

      host.innerHTML = `
        <div class="modal-backdrop" id="welcomeModalBackdrop">
          <div class="modal-card" role="dialog" aria-modal="true" aria-label="Continue with Email">
            <div class="row-between">
              <div class="row-center">
                <div style="width:36px;height:36px;border-radius:9999px;background:#fef2f2;color:#A80F0F;display:flex;align-items:center;justify-content:center;">
                  ${iconSvg('mail', 16)}
                </div>
                <div>
                  <h2 style="font-size:16px;font-weight:700;color:#171717;">Continue with Email</h2>
                  <p style="font-size:12px;color:#737373;">
                    ${
                      local.emailStep === 'enter'
                        ? 'Verify with a 6-digit code or password'
                        : `Enter the code sent to ${escapeHtml(local.emailInput)}`
                    }
                  </p>
                </div>
              </div>
              <button type="button" id="welcomeModalCloseBtn" aria-label="Close" class="icon-btn-circle">
                ${iconSvg('x', 20)}
              </button>
            </div>

            ${
              local.emailStep === 'enter'
                ? `
                  <form id="emailEnterForm" class="stack-md" style="margin-top:20px;">
                    <div>
                      <label class="field-label" for="emailLoginInput">Email Address</label>
                      <input id="emailLoginInput" type="email" required value="${escapeHtml(local.emailInput)}" placeholder="name@example.com" class="input" />
                    </div>

                    ${
                      local.usePasswordLogin
                        ? `
                          <div>
                            <label class="field-label" for="emailPasswordInput">Password</label>
                            <input id="emailPasswordInput" type="password" required value="${escapeHtml(local.emailPassword)}" placeholder="Enter your password" class="input" />
                          </div>
                        `
                        : ''
                    }

                    <div>
                      <button type="button" id="togglePasswordModeBtn" style="font-size:12px;font-weight:600;color:#A80F0F;">
                        ${local.usePasswordLogin ? 'Verify with 6-digit email code instead' : 'Sign in with existing password'}
                      </button>
                    </div>

                    ${local.error ? `<p class="error-text">${escapeHtml(local.error)}</p>` : ''}

                    <button type="submit" ${local.loading ? 'disabled' : ''} class="btn-primary">
                      ${local.loading ? '<span class="spinner"></span>' : iconSvg('shieldCheck', 16)}
                      <span>${
                        local.loading
                          ? 'Please wait...'
                          : local.usePasswordLogin
                            ? 'Sign In'
                            : 'Send Verification Code'
                      }</span>
                    </button>
                  </form>
                `
                : `
                  <form id="emailVerifyForm" class="stack-md" style="margin-top:20px;">
                    ${
                      local.serverPreviewCode
                        ? `
                          <div style="border-radius:12px;border:1px solid #fde68a;background:#fffbeb;padding:12px;font-size:12px;color:#78350f;">
                            <p style="font-weight:700;">Verification Code: ${escapeHtml(local.serverPreviewCode)}</p>
                            <p style="margin-top:2px;color:#92400e;">
                              ${
                                local.existingAccount
                                  ? 'Account found! Enter this code to sign in.'
                                  : 'Enter this 6-digit code to verify your email and set up your account.'
                              }
                            </p>
                          </div>
                        `
                        : ''
                    }

                    <div>
                      <label class="field-label" for="otpCodeInput">6-Digit Code</label>
                      <input id="otpCodeInput" type="text" inputmode="numeric" maxlength="6" required value="${escapeHtml(local.verificationCode)}" placeholder="123456" class="input input-otp tabular-nums" />
                    </div>

                    ${local.error ? `<p class="error-text">${escapeHtml(local.error)}</p>` : ''}

                    <div class="row-center">
                      <button type="button" id="changeEmailBtn" class="btn-secondary" style="flex:1;">
                        Change Email
                      </button>
                      <button type="submit" ${local.loading ? 'disabled' : ''} class="btn-primary" style="flex:2;">
                        ${local.loading ? '<span class="spinner"></span>' : 'Verify & Enter'}
                      </button>
                    </div>
                  </form>
                `
            }
          </div>
        </div>
      `;

      host.querySelector('#welcomeModalCloseBtn')?.addEventListener('click', resetModal);
      host.querySelector('#welcomeModalBackdrop')?.addEventListener('click', (e) => {
        if (e.target.id === 'welcomeModalBackdrop') resetModal();
      });

      if (local.emailStep === 'enter') {
        host.querySelector('#emailLoginInput')?.addEventListener('input', (e) => {
          local.emailInput = e.target.value;
        });
        host.querySelector('#emailPasswordInput')?.addEventListener('input', (e) => {
          local.emailPassword = e.target.value;
        });
        host.querySelector('#togglePasswordModeBtn')?.addEventListener('click', () => {
          local.usePasswordLogin = !local.usePasswordLogin;
          local.error = null;
          renderModal();
        });
        host.querySelector('#emailEnterForm')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          local.error = null;
          if (!local.emailInput.includes('@')) {
            local.error = 'Please enter a valid email address.';
            renderModal();
            return;
          }
          if (local.usePasswordLogin) {
            if (!local.emailPassword) {
              local.error = 'Please enter your password.';
              renderModal();
              return;
            }
            local.loading = true;
            renderModal();
            try {
              const res = await apiRequest('/api/auth/verify-email', {
                method: 'POST',
                body: { email: local.emailInput.trim(), password: local.emailPassword },
              });
              setStoredToken(res.token);
              ctx.onAuthenticated({
                user: res.user,
                transactions: res.transactions,
                savingGoals: res.savingGoals,
              });
            } catch (err) {
              local.loading = false;
              local.error = err instanceof Error ? err.message : 'Sign-in failed';
              renderModal();
            }
            return;
          }

          local.loading = true;
          renderModal();
          try {
            const res = await apiRequest('/api/auth/send-code', {
              method: 'POST',
              body: { email: local.emailInput.trim() },
            });
            local.existingAccount = Boolean(res.existingAccount);
            local.serverPreviewCode = res.verificationCodePreview || null;
            local.emailStep = 'verify';
            local.loading = false;
            renderModal();
          } catch (err) {
            local.loading = false;
            local.error = err instanceof Error ? err.message : 'Could not send verification code';
            renderModal();
          }
        });
      } else {
        host.querySelector('#otpCodeInput')?.addEventListener('input', (e) => {
          const cleaned = e.target.value.replace(/\D/g, '');
          e.target.value = cleaned;
          local.verificationCode = cleaned;
        });
        host.querySelector('#changeEmailBtn')?.addEventListener('click', () => {
          local.emailStep = 'enter';
          local.error = null;
          renderModal();
        });
        host.querySelector('#emailVerifyForm')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          local.error = null;
          if (local.verificationCode.trim().length !== 6) {
            local.error = 'Enter the 6-digit verification code.';
            renderModal();
            return;
          }
          local.loading = true;
          renderModal();
          try {
            const res = await apiRequest('/api/auth/verify-email', {
              method: 'POST',
              body: {
                email: local.emailInput.trim(),
                code: local.verificationCode.trim(),
              },
            });
            setStoredToken(res.token);
            ctx.onAuthenticated({
              user: res.user,
              transactions: res.transactions,
              savingGoals: res.savingGoals,
            });
          } catch (err) {
            local.loading = false;
            local.error = err instanceof Error ? err.message : 'Verification failed';
            renderModal();
          }
        });
      }
    }

    renderMain();
  }

  PW.renderWelcomeScreen = renderWelcomeScreen;
})(window);
