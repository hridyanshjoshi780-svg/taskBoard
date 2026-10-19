/**
 * TaskBoard - Dashboard Script
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!api.requireAuth()) return;

  const userAvatar = document.getElementById('user-avatar');
  const userName = document.getElementById('user-name');
  const userEmail = document.getElementById('user-email');
  const logoutBtn = document.getElementById('logout-button');
  const boardGrid = document.getElementById('board-grid');
  const pageAlert = document.getElementById('page-alert');
  const pageAlertMsg = document.getElementById('page-alert-message');

  // Create Modal Elements
  const openCreateBtn = document.getElementById('open-create-board-btn');
  const createModal = document.getElementById('create-board-modal');
  const createForm = document.getElementById('create-board-form');
  const boardNameInput = document.getElementById('board-name');
  const boardDescInput = document.getElementById('board-desc');
  const closeCreateBtn = document.getElementById('close-create-modal');
  const cancelCreateBtn = document.getElementById('cancel-create-board');
  const submitCreateBtn = document.getElementById('submit-create-board');
  const createErrorAlert = document.getElementById('create-error-alert');
  const createErrorMsg = document.getElementById('create-error-message');

  // Delete Modal Elements
  const deleteModal = document.getElementById('delete-board-modal');
  const deleteBoardNameDisplay = document.getElementById('delete-board-name-display');
  const closeDeleteBtn = document.getElementById('close-delete-modal');
  const cancelDeleteBtn = document.getElementById('cancel-delete-board');
  const confirmDeleteBtn = document.getElementById('confirm-delete-board');
  const deleteErrorAlert = document.getElementById('delete-board-error');
  const deleteErrorMsg = document.getElementById('delete-board-error-message');

  let boardToDelete = null;

  // Sign out handler
  logoutBtn.addEventListener('click', () => {
    api.clearAuth();
    location.href = '/login.html';
  });

  // Modal open/close handlers
  function showCreateModal() {
    createForm.reset();
    createErrorAlert.classList.add('hidden');
    createErrorMsg.textContent = '';
    submitCreateBtn.disabled = false;
    submitCreateBtn.textContent = 'Create Board';
    utils.openModal('create-board-modal');
  }

  function hideCreateModal() {
    utils.closeModal('create-board-modal');
  }

  openCreateBtn.addEventListener('click', showCreateModal);
  closeCreateBtn.addEventListener('click', hideCreateModal);
  cancelCreateBtn.addEventListener('click', hideCreateModal);

  function showDeleteModal(board) {
    boardToDelete = board;
    deleteBoardNameDisplay.textContent = `"${board.name}"`;
    deleteErrorAlert.classList.add('hidden');
    deleteErrorMsg.textContent = '';
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = 'Delete Board';
    utils.openModal('delete-board-modal');
  }

  function hideDeleteModal() {
    boardToDelete = null;
    utils.closeModal('delete-board-modal');
  }

  closeDeleteBtn.addEventListener('click', hideDeleteModal);
  cancelDeleteBtn.addEventListener('click', hideDeleteModal);

  // Close modals on backdrop click or ESC key
  window.addEventListener('click', (e) => {
    if (e.target === createModal) hideCreateModal();
    if (e.target === deleteModal) hideDeleteModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!createModal.classList.contains('hidden')) hideCreateModal();
      if (!deleteModal.classList.contains('hidden')) hideDeleteModal();
    }
  });

  function showPageError(message) {
    pageAlertMsg.textContent = message;
    pageAlert.classList.remove('hidden');
  }

  function hidePageError() {
    pageAlert.classList.add('hidden');
    pageAlertMsg.textContent = '';
  }

  // Load user info and boards
  async function loadDashboard() {
    hidePageError();

    try {
      // 1. Fetch current user
      const meData = await api.getMe();
      if (meData && meData.user) {
        userName.textContent = meData.user.name;
        userEmail.textContent = meData.user.email;
        userAvatar.textContent = utils.getInitials(meData.user.name);
      }
    } catch (err) {
      console.warn('Failed to load user info:', err.message);
    }

    try {
      // 2. Fetch boards
      const data = await api.getBoards();
      const boards = data.boards || [];

      if (boards.length === 0) {
        boardGrid.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
            </div>
            <h2 class="empty-title">No boards found</h2>
            <p class="empty-desc">Create your first Kanban board to start organizing your team's workflow and tasks.</p>
            <button type="button" class="btn btn-primary" id="empty-create-btn">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
              </svg>
              <span>Create Board</span>
            </button>
          </div>
        `;
        document.getElementById('empty-create-btn')?.addEventListener('click', showCreateModal);
        return;
      }

      boardGrid.innerHTML = boards.map(board => {
        const isOwner = board.role === 'owner';
        const roleClass = isOwner ? 'badge-role-owner' : 'badge-role-member';
        const roleLabel = isOwner ? 'Owner' : 'Member';
        const formattedDate = utils.formatDate(board.created_at) || 'Recently';

        return `
          <div class="board-card" data-board-id="${board.id}">
            <div class="board-card-header">
              <div class="board-card-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18" />
                  <path d="M9 21V9" />
                </svg>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="badge-role ${roleClass}">${roleLabel}</span>
                ${isOwner ? `
                  <button type="button" class="btn-icon delete-board-btn" title="Delete board" data-id="${board.id}" data-name="${utils.escapeHtml(board.name)}">
                    <svg viewBox="0 0 20 20" fill="currentColor" style="width: 15px; height: 15px; color: var(--slate-400);">
                      <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                  </button>
                ` : ''}
              </div>
            </div>

            <a href="/board.html?id=${board.id}" style="text-decoration: none; color: inherit; display: flex; flex-direction: column; flex-grow: 1;">
              <h2 class="board-card-title">${utils.escapeHtml(board.name)}</h2>
              <p class="board-card-desc">${utils.escapeHtml(board.description || 'No description provided.')}</p>
            </a>

            <div class="board-card-footer">
              <span>${board.task_count || 0} ${(board.task_count === 1 ? 'task' : 'tasks')} · ${formattedDate}</span>
              <a href="/board.html?id=${board.id}" class="board-card-action">
                <span>Open board</span>
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        `;
      }).join('');

      // Attach delete listeners
      document.querySelectorAll('.delete-board-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = Number(btn.getAttribute('data-id'));
          const name = btn.getAttribute('data-name');
          showDeleteModal({ id, name });
        });
      });

    } catch (err) {
      boardGrid.innerHTML = '';
      showPageError(err.message || 'Could not load your boards. Please try again later.');
    }
  }

  // Create board form handler
  createForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    createErrorAlert.classList.add('hidden');
    createErrorMsg.textContent = '';

    const name = boardNameInput.value.trim();
    const description = boardDescInput.value.trim();

    if (!name) {
      createErrorMsg.textContent = 'Board name is required.';
      createErrorAlert.classList.remove('hidden');
      boardNameInput.focus();
      return;
    }

    if (name.length > 100) {
      createErrorMsg.textContent = 'Board name must be at most 100 characters.';
      createErrorAlert.classList.remove('hidden');
      boardNameInput.focus();
      return;
    }

    submitCreateBtn.disabled = true;
    submitCreateBtn.textContent = 'Creating…';

    try {
      const result = await api.createBoard(name, description);
      utils.showToast('Board created successfully!', 'success');
      hideCreateModal();
      location.href = `/board.html?id=${result.board.id}`;
    } catch (err) {
      createErrorMsg.textContent = err.message || 'Failed to create board.';
      createErrorAlert.classList.remove('hidden');
      submitCreateBtn.disabled = false;
      submitCreateBtn.textContent = 'Create Board';
    }
  });

  // Confirm delete board handler
  confirmDeleteBtn.addEventListener('click', async () => {
    if (!boardToDelete) return;

    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.textContent = 'Deleting…';
    deleteErrorAlert.classList.add('hidden');

    try {
      await api.deleteBoard(boardToDelete.id);
      utils.showToast(`Board "${boardToDelete.name}" was deleted.`, 'info');
      hideDeleteModal();
      loadDashboard();
    } catch (err) {
      deleteErrorMsg.textContent = err.message || 'Failed to delete board.';
      deleteErrorAlert.classList.remove('hidden');
      confirmDeleteBtn.disabled = false;
      confirmDeleteBtn.textContent = 'Delete Board';
    }
  });

  // Initial load
  loadDashboard();
});
