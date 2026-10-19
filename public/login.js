/**
 * TaskBoard - Login Script
 */

document.addEventListener('DOMContentLoaded', () => {
  // Redirect to dashboard if already signed in
  if (api.redirectIfAuth()) return;

  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const submitBtn = document.getElementById('login-submit');
  const alertEl = document.getElementById('form-alert');
  const alertMsg = document.getElementById('form-alert-message');
  const fillDemoBtn = document.getElementById('fill-demo-btn');
  const fillTeammateBtn = document.getElementById('fill-teammate-btn');

  function showError(msg) {
    alertMsg.textContent = msg;
    alertEl.classList.remove('hidden');
  }

  function hideError() {
    alertEl.classList.add('hidden');
    alertMsg.textContent = '';
  }

  // Quick fill demo credentials
  if (fillDemoBtn) {
    fillDemoBtn.addEventListener('click', () => {
      emailInput.value = 'demo@taskboard.local';
      passwordInput.value = 'DemoPass123!';
      hideError();
    });
  }

  if (fillTeammateBtn) {
    fillTeammateBtn.addEventListener('click', () => {
      emailInput.value = 'teammate@taskboard.local';
      passwordInput.value = 'DemoPass123!';
      hideError();
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    // Client-side validation
    if (!email) {
      showError('Please enter your email address.');
      emailInput.focus();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError('Please enter a valid email address.');
      emailInput.focus();
      return;
    }

    if (!password) {
      showError('Please enter your password.');
      passwordInput.focus();
      return;
    }

    if (password.length < 8) {
      showError('Password must be at least 8 characters long.');
      passwordInput.focus();
      return;
    }

    // Submit
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in…';

    try {
      const result = await api.login(email, password);
      api.setAuth(result.token, result.user);
      location.href = '/dashboard.html';
    } catch (err) {
      showError(err.message || 'Could not sign in. Please verify your credentials.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  });
});
