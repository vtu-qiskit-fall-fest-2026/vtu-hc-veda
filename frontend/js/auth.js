/*
 * auth.js — login/signup form behaviour and session management.
 * Requires: state.js (Auth), main.js (enterApp, toast).
 */
(function (global) {
  'use strict';

  function $(id) { return document.getElementById(id); }

  function showAuthError(msg) {
    var el = $('authError');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
  }
  function clearAuthError() {
    var el = $('authError');
    if (el) el.classList.add('hidden');
  }

  function showLogin() {
    $('loginForm').classList.remove('hidden');
    $('signupForm').classList.add('hidden');
    clearAuthError();
  }
  function showSignup() {
    $('signupForm').classList.remove('hidden');
    $('loginForm').classList.add('hidden');
    clearAuthError();
  }

  function bindPasswordToggles() {
    document.querySelectorAll('[data-toggle-pw]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = $(btn.getAttribute('data-toggle-pw'));
        if (!input) return;
        var isPw = input.type === 'password';
        input.type = isPw ? 'text' : 'password';
        btn.textContent = isPw ? '\u26D3' : '\uD83D\uDC65';
      });
    });
  }

  function setBtnLoading(btn, loading, label) {
    if (!btn) return;
    if (loading) {
      btn.setAttribute('data-orig-label', btn.textContent);
      btn.textContent = label || 'Working\u2026';
      btn.disabled = true;
      btn.classList.add('btn-loading');
    } else {
      btn.textContent = btn.getAttribute('data-orig-label') || btn.textContent;
      btn.disabled = false;
      btn.classList.remove('btn-loading');
    }
  }

  function doLogin() {
    var email = $('loginEmail').value.trim();
    var pw = $('loginPassword').value;
    if (!email || !pw) { showAuthError('Please enter both email and password.'); return; }
    var btn = $('loginBtn');
    clearAuthError();
    setBtnLoading(btn, true, 'Signing in\u2026');
    global.Auth.login(email, pw).then(function (res) {
      setBtnLoading(btn, false);
      if (res.error) { showAuthError(res.error); return; }
      clearAuthError();
      if ($('rememberMe') && $('rememberMe').checked) {
        try { localStorage.setItem('gq_remember_email', email); } catch (e) {}
      }
      if (typeof global.completeLogin === 'function') global.completeLogin();
      else if (typeof global.enterApp === 'function') global.enterApp();
    });
  }

  function doSignup() {
    var name = $('suName').value.trim();
    var email = $('suEmail').value.trim();
    var pw = $('suPassword').value;
    var confirm = $('suConfirm').value;
    clearAuthError();

    if (!name) { showAuthError('Please enter your full name.'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { showAuthError('Please enter a valid email address.'); return; }
    if (pw.length < 6) { showAuthError('Password must be at least 6 characters.'); return; }
    if (pw !== confirm) { showAuthError('Passwords do not match.'); return; }

    var btn = $('signupBtn');
    setBtnLoading(btn, true, 'Creating account\u2026');
    global.Auth.signup(name, email, pw).then(function (res) {
      setBtnLoading(btn, false);
      if (res.error) { showAuthError(res.error); return; }
      clearAuthError();
      if (typeof global.completeLogin === 'function') global.completeLogin();
      else if (typeof global.enterApp === 'function') global.enterApp();
    });
  }

  function doGoogle() {
    var btn = $('googleBtn');
    setBtnLoading(btn, true, 'Connecting\u2026');
    global.Auth.google().then(function (res) {
      setBtnLoading(btn, false);
      if (res.error) { showAuthError(res.error); return; }
      clearAuthError();
      if (typeof global.completeLogin === 'function') global.completeLogin();
      else if (typeof global.enterApp === 'function') global.enterApp();
    });
  }

  function initAuth() {
    bindPasswordToggles();

    $('toSignup').addEventListener('click', function (e) { e.preventDefault(); showSignup(); });
    $('toLogin').addEventListener('click', function (e) { e.preventDefault(); showLogin(); });
    $('loginBtn').addEventListener('click', doLogin);
    $('signupBtn').addEventListener('click', doSignup);
    $('googleBtn').addEventListener('click', doGoogle);

    // Enter key submits the active form.
    ['loginEmail', 'loginPassword'].forEach(function (id) {
      $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); });
    });
    ['suName', 'suEmail', 'suPassword', 'suConfirm'].forEach(function (id) {
      $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') doSignup(); });
    });

    $('forgotLink').addEventListener('click', function (e) {
      e.preventDefault();
      if (typeof global.toast === 'function') global.toast('Password reset is a demo — use any password for your account.', 'info');
    });

    // Pre-fill remembered email.
    var rem = null;
    try { rem = localStorage.getItem('gq_remember_email'); } catch (e) {}
    if (rem) $('loginEmail').value = rem;
    // NOTE: session restore (which may be async in live mode) is driven by
    // main.js init() after routing is ready, to avoid running it twice.
  }

  global.showLogin = showLogin;
  global.initAuth = initAuth;
})(window);
