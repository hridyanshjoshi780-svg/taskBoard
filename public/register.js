/**
 * TaskBoard - Register Script
 */

document.addEventListener('DOMContentLoaded', () => {
  if (api.redirectIfAuth()) return;

  const form = document.getElementById('register-form');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const submitBtn = document.getElementById('register-submit');
  const alertEl = document.getElementById('form-alert');
  const alertMsg = document.getElementById('form-alert-message');

  function showError(msg) {
    alertMsg.textContent = msg;
    alertEl.classList.remove('hidden');
  }

  function hideError() {
    alertEl.classList.add('hidden');
    alertMsg.textContent = '';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    // Validation
    if (!name || name.length < 2) {
      showError('Please enter your name (at least 2 characters).');
      nameInput.focus();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      showError('Please enter a valid email address.');
      emailInput.focus();
      return;
    }

    if (!password || password.length < 8) {
      showError('Password must contain at least 8 characters.');
      passwordInput.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account…';

    try {
      const result = await api.register(name, email, password);
      api.setAuth(result.token, result.user);
      location.href = '/dashboard.html';
    } catch (err) {
      showError(err.message || 'Could not create account. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  });
});
