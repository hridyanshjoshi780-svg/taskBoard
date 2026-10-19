/**
 * TaskBoard - Shared API Client & Frontend Utilities
 */

const api = {
  TOKEN_KEY: 'taskboard_token',
  USER_KEY: 'taskboard_user',

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  getUser() {
    try {
      const user = localStorage.getItem(this.USER_KEY);
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  setAuth(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  clearAuth() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },

  requireAuth() {
    const token = this.getToken();
    if (!token) {
      location.replace('/login.html');
      return false;
    }
    return true;
  },

  redirectIfAuth() {
    const token = this.getToken();
    if (token) {
      location.replace('/dashboard.html');
      return true;
    }
    return false;
  },

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers
      });

      if (response.status === 401) {
        this.clearAuth();
        // Redirect to login if on protected page
        if (!location.pathname.endsWith('/login.html') && !location.pathname.endsWith('/register.html')) {
          location.replace('/login.html');
        }
        throw new Error('Your session has expired. Please sign in again.');
      }

      const contentType = response.headers.get('content-type') || '';
      let data = {};
      if (contentType.includes('application/json')) {
        data = await response.json();
      }

      if (!response.ok) {
        const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
        const err = new Error(errorMsg);
        err.status = response.status;
        err.data = data;
        throw err;
      }

      return data;
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection to the server.');
      }
      throw err;
    }
  },

  // Auth Endpoints
  async register(name, email, password) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
  },

  async login(email, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  async getMe() {
    return this.request('/api/me');
  },

  // Boards Endpoints
  async getBoards() {
    return this.request('/api/boards');
  },

  async createBoard(name, description = '') {
    return this.request('/api/boards', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    });
  },

  async getBoard(id) {
    return this.request(`/api/boards/${encodeURIComponent(id)}`);
  },

  async updateBoard(id, name, description = '') {
    return this.request(`/api/boards/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ name, description })
    });
  },

  async deleteBoard(id) {
    return this.request(`/api/boards/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  },

  // Board Members Endpoints
  async addMember(boardId, email) {
    return this.request(`/api/boards/${encodeURIComponent(boardId)}/members`, {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async removeMember(boardId, userId) {
    return this.request(`/api/boards/${encodeURIComponent(boardId)}/members/${encodeURIComponent(userId)}`, {
      method: 'DELETE'
    });
  },

  // Columns Endpoints
  async createColumn(boardId, name) {
    return this.request(`/api/boards/${encodeURIComponent(boardId)}/columns`, {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  },

  async updateColumn(columnId, data) {
    return this.request(`/api/columns/${encodeURIComponent(columnId)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteColumn(columnId) {
    return this.request(`/api/columns/${encodeURIComponent(columnId)}`, {
      method: 'DELETE'
    });
  },

  // Tasks Endpoints (Checking backend endpoint support & reporting pending status)
  async createTask(boardId, taskData) {
    try {
      return await this.request(`/api/boards/${encodeURIComponent(boardId)}/tasks`, {
        method: 'POST',
        body: JSON.stringify(taskData)
      });
    } catch (err) {
      if (err.status === 404) {
        throw new Error('Task creation endpoint is pending backend implementation in the upcoming milestone.');
      }
      throw err;
    }
  },

  async updateTask(taskId, taskData) {
    try {
      return await this.request(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: 'PUT',
        body: JSON.stringify(taskData)
      });
    } catch (err) {
      if (err.status === 404) {
        throw new Error('Task update endpoint is pending backend implementation in the upcoming milestone.');
      }
      throw err;
    }
  },

  async deleteTask(taskId) {
    try {
      return await this.request(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: 'DELETE'
      });
    } catch (err) {
      if (err.status === 404) {
        throw new Error('Task deletion endpoint is pending backend implementation in the upcoming milestone.');
      }
      throw err;
    }
  }
};

/**
 * Global helper utilities
 */
const utils = {
  escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  formatDate(dateString) {
    if (!dateString) return null;
    try {
      const date = new Date(dateString.replace(' ', 'T'));
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  },

  getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  },

  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>';
    } else {
      iconSvg = '<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>';
    }

    toast.innerHTML = `
      ${iconSvg}
      <span class="toast-message">${this.escapeHtml(message)}</span>
      <button type="button" class="toast-close" aria-label="Close notification">&times;</button>
    `;

    container.appendChild(toast);

    const closeBtn = toast.querySelector('.toast-close');
    const dismiss = () => {
      toast.classList.add('toast-fadeout');
      setTimeout(() => toast.remove(), 200);
    };

    closeBtn.addEventListener('click', dismiss);
    setTimeout(dismiss, 4500);
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    const firstInput = modal.querySelector('input:not([type="hidden"]), textarea, select, button:not(.modal-close)');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 50);
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    const errorEl = modal.querySelector('.form-error');
    if (errorEl) errorEl.textContent = '';
  }
};
