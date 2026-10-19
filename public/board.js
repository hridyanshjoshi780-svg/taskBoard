/**
 * TaskBoard - Kanban Board Page Script
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!api.requireAuth()) return;

  const urlParams = new URLSearchParams(location.search);
  const boardId = urlParams.get('id');

  if (!boardId) {
    location.replace('/dashboard.html');
    return;
  }

  // Topbar Elements
  const userAvatar = document.getElementById('user-avatar');
  const userName = document.getElementById('user-name');
  const userEmail = document.getElementById('user-email');
  const logoutBtn = document.getElementById('logout-button');

  // Board Header Elements
  const boardNameDisplay = document.getElementById('board-name');
  const boardDescDisplay = document.getElementById('board-desc');
  const boardRoleBadge = document.getElementById('board-role-badge');
  const memberStack = document.getElementById('member-stack');
  const manageMembersBtn = document.getElementById('manage-members-btn');
  const addColumnTopBtn = document.getElementById('add-column-top-btn');
  const addTaskTopBtn = document.getElementById('add-task-top-btn');
  const boardAlert = document.getElementById('board-alert');
  const boardAlertMsg = document.getElementById('board-alert-message');

  // Canvas
  const columnsCanvas = document.getElementById('columns-canvas');

  // Filters Elements
  const searchInput = document.getElementById('search-input');
  const searchClearBtn = document.getElementById('search-clear-btn');
  const priorityFilter = document.getElementById('priority-filter');
  const assigneeFilter = document.getElementById('assignee-filter');
  const resetFiltersBtn = document.getElementById('reset-filters-btn');

  // Task Modal Elements
  const taskModal = document.getElementById('task-modal');
  const taskModalTitle = document.getElementById('task-modal-title');
  const taskForm = document.getElementById('task-form');
  const taskIdInput = document.getElementById('task-id');
  const taskTitleInput = document.getElementById('task-title');
  const taskColumnSelect = document.getElementById('task-column');
  const taskPrioritySelect = document.getElementById('task-priority');
  const taskDescInput = document.getElementById('task-desc');
  const taskDueDateInput = document.getElementById('task-due-date');
  const taskAssigneeSelect = document.getElementById('task-assignee');
  const taskFormAlert = document.getElementById('task-form-alert');
  const taskFormAlertMsg = document.getElementById('task-form-alert-message');
  const saveTaskBtn = document.getElementById('save-task-btn');
  const deleteTaskBtn = document.getElementById('delete-task-btn');
  const cancelTaskBtn = document.getElementById('cancel-task-btn');
  const closeTaskModalBtn = document.getElementById('close-task-modal');

  // Add Column Modal Elements
  const addColModal = document.getElementById('add-column-modal');
  const addColForm = document.getElementById('add-column-form');
  const addColInput = document.getElementById('column-name-input');
  const addColErrorAlert = document.getElementById('add-col-error');
  const addColErrorMsg = document.getElementById('add-col-error-msg');
  const cancelAddColBtn = document.getElementById('cancel-add-col-btn');
  const closeAddColModalBtn = document.getElementById('close-add-col-modal');
  const submitAddColBtn = document.getElementById('submit-add-col-btn');

  // Rename Column Modal Elements
  const renameColModal = document.getElementById('rename-column-modal');
  const renameColForm = document.getElementById('rename-column-form');
  const renameColIdInput = document.getElementById('rename-col-id');
  const renameColInput = document.getElementById('rename-column-input');
  const renameColErrorAlert = document.getElementById('rename-col-error');
  const renameColErrorMsg = document.getElementById('rename-col-error-msg');
  const cancelRenameColBtn = document.getElementById('cancel-rename-col-btn');
  const closeRenameColModalBtn = document.getElementById('close-rename-col-modal');
  const submitRenameColBtn = document.getElementById('submit-rename-col-btn');

  // Delete Column Modal Elements
  const deleteColModal = document.getElementById('delete-column-modal');
  const deleteColNameDisplay = document.getElementById('delete-col-name-display');
  const deleteColErrorAlert = document.getElementById('delete-col-error');
  const deleteColErrorMsg = document.getElementById('delete-col-error-msg');
  const cancelDeleteColBtn = document.getElementById('cancel-delete-col-btn');
  const closeDeleteColModalBtn = document.getElementById('close-delete-col-modal');
  const confirmDeleteColBtn = document.getElementById('confirm-delete-col-btn');

  // Manage Members Modal Elements
  const membersModal = document.getElementById('members-modal');
  const closeMembersModalBtn = document.getElementById('close-members-modal');
  const closeMembersDialogBtn = document.getElementById('close-members-dialog-btn');
  const addMemberForm = document.getElementById('add-member-form');
  const memberEmailInput = document.getElementById('member-email-input');
  const membersList = document.getElementById('members-list');
  const membersAlert = document.getElementById('members-alert');
  const membersAlertMsg = document.getElementById('members-alert-msg');
  const addMemberSubmitBtn = document.getElementById('add-member-submit-btn');

  // App State
  let boardData = null;
  let columnToDelete = null;
  const activeFilters = {
    search: '',
    priority: 'ALL',
    assignee: 'ALL'
  };

  // Sign out handler
  logoutBtn.addEventListener('click', () => {
    api.clearAuth();
    location.href = '/login.html';
  });

  // Modal Backdrop and Escape handling
  const allModals = [
    { el: taskModal, id: 'task-modal' },
    { el: addColModal, id: 'add-column-modal' },
    { el: renameColModal, id: 'rename-column-modal' },
    { el: deleteColModal, id: 'delete-column-modal' },
    { el: membersModal, id: 'members-modal' }
  ];

  window.addEventListener('click', (e) => {
    allModals.forEach(m => {
      if (e.target === m.el) utils.closeModal(m.id);
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      allModals.forEach(m => {
        if (!m.el.classList.contains('hidden')) utils.closeModal(m.id);
      });
    }
  });

  // Load Current User
  async function loadUser() {
    try {
      const me = await api.getMe();
      if (me && me.user) {
        userName.textContent = me.user.name;
        userEmail.textContent = me.user.email;
        userAvatar.textContent = utils.getInitials(me.user.name);
      }
    } catch (err) {
      console.warn('Could not load current user:', err.message);
    }
  }

  // Load Board Data
  async function loadBoard() {
    boardAlert.classList.add('hidden');
    boardAlertMsg.textContent = '';

    try {
      const data = await api.getBoard(boardId);
      boardData = data;

      // Update board header
      boardNameDisplay.textContent = data.board.name;
      boardDescDisplay.textContent = data.board.description || 'No description provided.';
      document.title = `TaskBoard · ${data.board.name}`;

      const isOwner = data.currentRole === 'owner';
      boardRoleBadge.className = `badge-role ${isOwner ? 'badge-role-owner' : 'badge-role-member'}`;
      boardRoleBadge.textContent = isOwner ? 'Owner' : 'Member';

      // Update members stack
      renderMembersStack();

      // Populate column options in task modal
      populateTaskColumnSelect();

      // Populate assignee options in filters & task modal
      populateAssigneeOptions();

      // Render columns & task cards
      renderColumns();

    } catch (err) {
      columnsCanvas.innerHTML = '';
      boardAlertMsg.textContent = err.message || 'Failed to load board details.';
      boardAlert.classList.remove('hidden');
    }
  }

  // Render Member Avatars in Header
  function renderMembersStack() {
    if (!boardData || !boardData.members) return;
    const members = boardData.members;

    memberStack.innerHTML = members.map(m => {
      const initials = utils.getInitials(m.name);
      return `<div class="member-avatar-chip" title="${utils.escapeHtml(m.name)} (${utils.escapeHtml(m.role)}) · ${utils.escapeHtml(m.email)}">${initials}</div>`;
    }).join('');
  }

  // Populate Selects
  function populateTaskColumnSelect() {
    if (!boardData || !boardData.columns) return;
    taskColumnSelect.innerHTML = boardData.columns.map(col => `
      <option value="${col.id}">${utils.escapeHtml(col.name)}</option>
    `).join('');
  }

  function populateAssigneeOptions() {
    if (!boardData || !boardData.members) return;

    // Filter select
    const currentAssigneeVal = assigneeFilter.value;
    assigneeFilter.innerHTML = `
      <option value="ALL">All Assignees</option>
      <option value="UNASSIGNED">Unassigned</option>
      ${boardData.members.map(m => `
        <option value="${m.id}">${utils.escapeHtml(m.name)}</option>
      `).join('')}
    `;
    assigneeFilter.value = currentAssigneeVal;

    // Task modal assignee select
    taskAssigneeSelect.innerHTML = `
      <option value="">Unassigned</option>
      ${boardData.members.map(m => `
        <option value="${m.id}">${utils.escapeHtml(m.name)} (${utils.escapeHtml(m.email)})</option>
      `).join('')}
    `;
  }

  // Render Kanban Columns & Tasks
  function renderColumns() {
    if (!boardData) return;

    const { columns, tasks, currentRole } = boardData;
    const isOwner = currentRole === 'owner';

    // Apply active filters to tasks
    const query = activeFilters.search.toLowerCase().trim();
    const priorityVal = activeFilters.priority;
    const assigneeVal = activeFilters.assignee;

    const filteredTasks = tasks.filter(t => {
      // Search filter (title or description)
      if (query) {
        const titleMatch = (t.title || '').toLowerCase().includes(query);
        const descMatch = (t.description || '').toLowerCase().includes(query);
        if (!titleMatch && !descMatch) return false;
      }

      // Priority filter
      if (priorityVal !== 'ALL') {
        if (t.priority !== priorityVal) return false;
      }

      // Assignee filter
      if (assigneeVal === 'UNASSIGNED') {
        if (t.assignee_id) return false;
      } else if (assigneeVal !== 'ALL') {
        if (t.assignee_id !== Number(assigneeVal)) return false;
      }

      return true;
    });

    // Check if any filter is active
    const hasActiveFilters = Boolean(query || priorityVal !== 'ALL' || assigneeVal !== 'ALL');
    resetFiltersBtn.classList.toggle('hidden', !hasActiveFilters);

    if (columns.length === 0) {
      columnsCanvas.innerHTML = `
        <div class="empty-state" style="flex: 1; margin: 20px 0;">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
          </div>
          <h2 class="empty-title">No columns on this board</h2>
          <p class="empty-desc">Create your first column like "To Do", "In Progress", or "Done" to start tracking tasks.</p>
          <button type="button" class="btn btn-primary" id="empty-add-col-btn">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
            <span>Add Column</span>
          </button>
        </div>
      `;
      document.getElementById('empty-add-col-btn')?.addEventListener('click', showAddColumnModal);
      return;
    }

    // Render columns
    columnsCanvas.innerHTML = columns.map(column => {
      const colTasks = filteredTasks.filter(t => t.column_id === column.id);
      const totalColTasks = tasks.filter(t => t.column_id === column.id).length;

      let tasksHtml = '';
      if (colTasks.length > 0) {
        tasksHtml = colTasks.map(task => {
          const priority = task.priority || 'Medium';
          let priorityClass = 'badge-priority-medium';
          if (priority === 'High') priorityClass = 'badge-priority-high';
          if (priority === 'Low') priorityClass = 'badge-priority-low';

          const formattedDueDate = utils.formatDate(task.due_date);
          const assigneeName = task.assignee_name || 'Unassigned';
          const assigneeInitials = task.assignee_name ? utils.getInitials(task.assignee_name) : '?';

          return `
            <div class="task-card" data-task-id="${task.id}" tabindex="0" role="button" aria-label="Task: ${utils.escapeHtml(task.title)}">
              <div class="task-card-top">
                <span class="badge ${priorityClass}">
                  <span class="badge-dot"></span>
                  ${utils.escapeHtml(priority)}
                </span>
                ${task.comment_count > 0 ? `
                  <span class="task-meta-item" title="${task.comment_count} comments">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zm-5 0H8v2h2V9z" clip-rule="evenodd" />
                    </svg>
                    <span>${task.comment_count}</span>
                  </span>
                ` : ''}
              </div>

              <h3 class="task-card-title">${utils.escapeHtml(task.title)}</h3>

              ${task.description ? `
                <p class="task-card-desc">${utils.escapeHtml(task.description)}</p>
              ` : ''}

              <div class="task-card-footer">
                <div class="task-card-meta">
                  ${formattedDueDate ? `
                    <span class="task-meta-item" title="Due date: ${formattedDueDate}">
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
                      </svg>
                      <span>${formattedDueDate}</span>
                    </span>
                  ` : `
                    <span class="task-meta-item" style="color: var(--slate-400);">No due date</span>
                  `}
                </div>

                <div class="task-assignee-badge" title="Assignee: ${utils.escapeHtml(assigneeName)}">
                  ${task.assignee_id ? `
                    <span class="task-assignee-avatar">${assigneeInitials}</span>
                    <span>${utils.escapeHtml(assigneeName)}</span>
                  ` : `
                    <span style="color: var(--slate-400); font-size: 0.75rem;">Unassigned</span>
                  `}
                </div>
              </div>
            </div>
          `;
        }).join('');
      } else if (totalColTasks === 0) {
        tasksHtml = `
          <div class="empty-column">
            <span>No tasks in this column</span>
            <button type="button" class="btn-subtle empty-column-btn quick-add-task-btn" data-column-id="${column.id}">
              + Add task
            </button>
          </div>
        `;
      } else {
        tasksHtml = `
          <div class="empty-column">
            <span>No tasks match filters</span>
          </div>
        `;
      }

      return `
        <section class="kanban-column" data-column-id="${column.id}">
          <header class="column-header">
            <div class="column-title-group">
              <h2 class="column-name">${utils.escapeHtml(column.name)}</h2>
              <span class="column-count-badge">${colTasks.length}</span>
            </div>

            <div class="column-actions">
              <button type="button" class="btn-icon quick-add-task-btn" title="Add task to ${utils.escapeHtml(column.name)}" data-column-id="${column.id}">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                </svg>
              </button>

              <button type="button" class="btn-icon rename-col-btn" title="Rename column" data-id="${column.id}" data-name="${utils.escapeHtml(column.name)}">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>

              ${isOwner ? `
                <button type="button" class="btn-icon delete-col-btn" title="Delete column" data-id="${column.id}" data-name="${utils.escapeHtml(column.name)}" data-task-count="${totalColTasks}">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                </button>
              ` : ''}
            </div>
          </header>

          <div class="column-task-list">
            ${tasksHtml}
          </div>
        </section>
      `;
    }).join('');

    // Attach Task card click listeners
    document.querySelectorAll('.task-card').forEach(card => {
      const openCard = () => {
        const taskId = Number(card.getAttribute('data-task-id'));
        const task = tasks.find(t => t.id === taskId);
        if (task) showTaskModal(task);
      };

      card.addEventListener('click', openCard);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openCard();
        }
      });
    });

    // Attach quick add task listeners
    document.querySelectorAll('.quick-add-task-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const colId = Number(btn.getAttribute('data-column-id'));
        showTaskModal(null, colId);
      });
    });

    // Attach rename column listeners
    document.querySelectorAll('.rename-col-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = Number(btn.getAttribute('data-id'));
        const name = btn.getAttribute('data-name');
        showRenameColumnModal(id, name);
      });
    });

    // Attach delete column listeners
    document.querySelectorAll('.delete-col-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = Number(btn.getAttribute('data-id'));
        const name = btn.getAttribute('data-name');
        const taskCount = Number(btn.getAttribute('data-task-count'));
        showDeleteColumnModal(id, name, taskCount);
      });
    });
  }

  // Filters Event Listeners
  searchInput.addEventListener('input', (e) => {
    activeFilters.search = e.target.value;
    searchClearBtn.classList.toggle('hidden', !e.target.value);
    renderColumns();
  });

  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    activeFilters.search = '';
    searchClearBtn.classList.add('hidden');
    searchInput.focus();
    renderColumns();
  });

  priorityFilter.addEventListener('change', (e) => {
    activeFilters.priority = e.target.value;
    renderColumns();
  });

  assigneeFilter.addEventListener('change', (e) => {
    activeFilters.assignee = e.target.value;
    renderColumns();
  });

  resetFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    activeFilters.search = '';
    searchClearBtn.classList.add('hidden');

    priorityFilter.value = 'ALL';
    activeFilters.priority = 'ALL';

    assigneeFilter.value = 'ALL';
    activeFilters.assignee = 'ALL';

    renderColumns();
  });

  // Task Modal Handlers
  function showTaskModal(task = null, preferredColumnId = null) {
    taskForm.reset();
    taskFormAlert.classList.add('hidden');
    taskFormAlertMsg.textContent = '';
    saveTaskBtn.disabled = false;

    if (task) {
      // Edit mode
      taskModalTitle.textContent = 'Edit Task';
      taskIdInput.value = task.id;
      taskTitleInput.value = task.title || '';
      taskColumnSelect.value = task.column_id;
      taskPrioritySelect.value = task.priority || 'Medium';
      taskDescInput.value = task.description || '';
      taskDueDateInput.value = task.due_date ? task.due_date.split(' ')[0] : '';
      taskAssigneeSelect.value = task.assignee_id || '';
      saveTaskBtn.textContent = 'Save Changes';
      deleteTaskBtn.classList.remove('hidden');
    } else {
      // Create mode
      taskModalTitle.textContent = 'Create Task';
      taskIdInput.value = '';
      if (preferredColumnId) {
        taskColumnSelect.value = preferredColumnId;
      } else if (boardData && boardData.columns && boardData.columns[0]) {
        taskColumnSelect.value = boardData.columns[0].id;
      }
      taskPrioritySelect.value = 'Medium';
      saveTaskBtn.textContent = 'Create Task';
      deleteTaskBtn.classList.add('hidden');
    }

    utils.openModal('task-modal');
  }

  function hideTaskModal() {
    utils.closeModal('task-modal');
  }

  addTaskTopBtn.addEventListener('click', () => showTaskModal());
  cancelTaskBtn.addEventListener('click', hideTaskModal);
  closeTaskModalBtn.addEventListener('click', hideTaskModal);

  // Task Form Submit
  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    taskFormAlert.classList.add('hidden');

    const title = taskTitleInput.value.trim();
    const columnId = Number(taskColumnSelect.value);
    const priority = taskPrioritySelect.value;
    const description = taskDescInput.value.trim();
    const dueDate = taskDueDateInput.value || null;
    const assigneeId = taskAssigneeSelect.value ? Number(taskAssigneeSelect.value) : null;
    const existingTaskId = taskIdInput.value;

    // Client-side validation
    if (!title) {
      taskFormAlertMsg.textContent = 'Please enter a task title.';
      taskFormAlert.classList.remove('hidden');
      taskTitleInput.focus();
      return;
    }

    if (!columnId) {
      taskFormAlertMsg.textContent = 'Please select a column.';
      taskFormAlert.classList.remove('hidden');
      return;
    }

    saveTaskBtn.disabled = true;
    saveTaskBtn.textContent = 'Saving…';

    const payload = {
      title,
      column_id: columnId,
      priority,
      description,
      due_date: dueDate,
      assignee_id: assigneeId
    };

    try {
      if (existingTaskId) {
        await api.updateTask(existingTaskId, payload);
      } else {
        await api.createTask(boardId, payload);
      }
      utils.showToast('Task saved successfully!', 'success');
      hideTaskModal();
      loadBoard();
    } catch (err) {
      // Backend does not have task create/update yet - clear & informative message
      taskFormAlertMsg.textContent = err.message;
      taskFormAlert.classList.remove('hidden');
      saveTaskBtn.disabled = false;
      saveTaskBtn.textContent = existingTaskId ? 'Save Changes' : 'Create Task';
    }
  });

  // Task Delete Button
  deleteTaskBtn.addEventListener('click', async () => {
    const taskId = taskIdInput.value;
    if (!taskId) return;

    deleteTaskBtn.disabled = true;
    deleteTaskBtn.textContent = 'Deleting…';

    try {
      await api.deleteTask(taskId);
      utils.showToast('Task deleted.', 'info');
      hideTaskModal();
      loadBoard();
    } catch (err) {
      taskFormAlertMsg.textContent = err.message;
      taskFormAlert.classList.remove('hidden');
      deleteTaskBtn.disabled = false;
      deleteTaskBtn.textContent = 'Delete Task';
    }
  });

  // Add Column Handlers
  function showAddColumnModal() {
    addColForm.reset();
    addColErrorAlert.classList.add('hidden');
    submitAddColBtn.disabled = false;
    submitAddColBtn.textContent = 'Add Column';
    utils.openModal('add-column-modal');
  }

  function hideAddColumnModal() {
    utils.closeModal('add-column-modal');
  }

  addColumnTopBtn.addEventListener('click', showAddColumnModal);
  cancelAddColBtn.addEventListener('click', hideAddColumnModal);
  closeAddColModalBtn.addEventListener('click', hideAddColumnModal);

  addColForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    addColErrorAlert.classList.add('hidden');

    const name = addColInput.value.trim();
    if (!name) {
      addColErrorMsg.textContent = 'Column name is required.';
      addColErrorAlert.classList.remove('hidden');
      addColInput.focus();
      return;
    }

    if (name.length > 60) {
      addColErrorMsg.textContent = 'Column name must be at most 60 characters.';
      addColErrorAlert.classList.remove('hidden');
      addColInput.focus();
      return;
    }

    submitAddColBtn.disabled = true;
    submitAddColBtn.textContent = 'Adding…';

    try {
      await api.createColumn(boardId, name);
      utils.showToast(`Column "${name}" added!`, 'success');
      hideAddColumnModal();
      loadBoard();
    } catch (err) {
      addColErrorMsg.textContent = err.message || 'Failed to add column.';
      addColErrorAlert.classList.remove('hidden');
      submitAddColBtn.disabled = false;
      submitAddColBtn.textContent = 'Add Column';
    }
  });

  // Rename Column Handlers
  function showRenameColumnModal(columnId, currentName) {
    renameColForm.reset();
    renameColIdInput.value = columnId;
    renameColInput.value = currentName;
    renameColErrorAlert.classList.add('hidden');
    submitRenameColBtn.disabled = false;
    submitRenameColBtn.textContent = 'Save Changes';
    utils.openModal('rename-column-modal');
  }

  function hideRenameColumnModal() {
    utils.closeModal('rename-column-modal');
  }

  cancelRenameColBtn.addEventListener('click', hideRenameColumnModal);
  closeRenameColModalBtn.addEventListener('click', hideRenameColumnModal);

  renameColForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    renameColErrorAlert.classList.add('hidden');

    const colId = Number(renameColIdInput.value);
    const name = renameColInput.value.trim();

    if (!name) {
      renameColErrorMsg.textContent = 'Column name cannot be blank.';
      renameColErrorAlert.classList.remove('hidden');
      renameColInput.focus();
      return;
    }

    if (name.length > 60) {
      renameColErrorMsg.textContent = 'Column name must be at most 60 characters.';
      renameColErrorAlert.classList.remove('hidden');
      renameColInput.focus();
      return;
    }

    submitRenameColBtn.disabled = true;
    submitRenameColBtn.textContent = 'Saving…';

    try {
      await api.updateColumn(colId, { name });
      utils.showToast('Column renamed successfully!', 'success');
      hideRenameColumnModal();
      loadBoard();
    } catch (err) {
      renameColErrorMsg.textContent = err.message || 'Failed to rename column.';
      renameColErrorAlert.classList.remove('hidden');
      submitRenameColBtn.disabled = false;
      submitRenameColBtn.textContent = 'Save Changes';
    }
  });

  // Delete Column Handlers
  function showDeleteColumnModal(columnId, name, taskCount) {
    columnToDelete = { id: columnId, name, taskCount };
    deleteColNameDisplay.textContent = `"${name}"`;
    deleteColErrorAlert.classList.add('hidden');

    if (taskCount > 0) {
      deleteColErrorMsg.textContent = `This column contains ${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}. You must move or delete all tasks before deleting this column.`;
      deleteColErrorAlert.classList.remove('hidden');
      confirmDeleteColBtn.disabled = true;
    } else {
      confirmDeleteColBtn.disabled = false;
      confirmDeleteColBtn.textContent = 'Delete Column';
    }

    utils.openModal('delete-column-modal');
  }

  function hideDeleteColumnModal() {
    columnToDelete = null;
    utils.closeModal('delete-column-modal');
  }

  cancelDeleteColBtn.addEventListener('click', hideDeleteColumnModal);
  closeDeleteColModalBtn.addEventListener('click', hideDeleteColumnModal);

  confirmDeleteColBtn.addEventListener('click', async () => {
    if (!columnToDelete) return;

    confirmDeleteColBtn.disabled = true;
    confirmDeleteColBtn.textContent = 'Deleting…';

    try {
      await api.deleteColumn(columnToDelete.id);
      utils.showToast(`Column "${columnToDelete.name}" deleted.`, 'info');
      hideDeleteColumnModal();
      loadBoard();
    } catch (err) {
      deleteColErrorMsg.textContent = err.message || 'Failed to delete column.';
      deleteColErrorAlert.classList.remove('hidden');
      confirmDeleteColBtn.disabled = false;
      confirmDeleteColBtn.textContent = 'Delete Column';
    }
  });

  // Manage Members Handlers
  function showMembersModal() {
    if (!boardData) return;
    renderMembersDialogList();
    membersAlert.classList.add('hidden');
    addMemberForm.reset();

    // Only owner can invite members
    const isOwner = boardData.currentRole === 'owner';
    addMemberForm.classList.toggle('hidden', !isOwner);

    utils.openModal('members-modal');
  }

  function hideMembersModal() {
    utils.closeModal('members-modal');
  }

  function renderMembersDialogList() {
    if (!boardData || !boardData.members) return;
    const isOwner = boardData.currentRole === 'owner';

    membersList.innerHTML = boardData.members.map(m => {
      const isMemberOwner = m.role === 'owner';
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: var(--slate-50); border: 1px solid var(--slate-200); border-radius: var(--radius-md);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="user-avatar" style="width: 28px; height: 28px; font-size: 0.75rem;">${utils.getInitials(m.name)}</div>
            <div>
              <div style="font-weight: 600; font-size: 0.85rem; color: var(--slate-900);">${utils.escapeHtml(m.name)}</div>
              <div style="font-size: 0.75rem; color: var(--slate-500);">${utils.escapeHtml(m.email)}</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="badge-role ${isMemberOwner ? 'badge-role-owner' : 'badge-role-member'}">${isMemberOwner ? 'Owner' : 'Member'}</span>
            ${isOwner && !isMemberOwner ? `
              <button type="button" class="btn-subtle remove-member-btn" title="Remove member" data-user-id="${m.id}" data-name="${utils.escapeHtml(m.name)}" style="padding: 4px 8px; font-size: 0.75rem; color: var(--danger-text);">
                Remove
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Attach remove member listeners
    membersList.querySelectorAll('.remove-member-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId = Number(btn.getAttribute('data-user-id'));
        const name = btn.getAttribute('data-name');
        if (!confirm(`Are you sure you want to remove ${name} from this board?`)) return;

        try {
          await api.removeMember(boardId, userId);
          utils.showToast(`Removed ${name} from board.`, 'info');
          await loadBoard();
          renderMembersDialogList();
        } catch (err) {
          membersAlertMsg.textContent = err.message || 'Could not remove member.';
          membersAlert.classList.remove('hidden');
        }
      });
    });
  }

  manageMembersBtn.addEventListener('click', showMembersModal);
  closeMembersModalBtn.addEventListener('click', hideMembersModal);
  closeMembersDialogBtn.addEventListener('click', hideMembersModal);

  addMemberForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    membersAlert.classList.add('hidden');

    const email = memberEmailInput.value.trim().toLowerCase();
    if (!email) return;

    addMemberSubmitBtn.disabled = true;
    addMemberSubmitBtn.textContent = 'Inviting…';

    try {
      await api.addMember(boardId, email);
      utils.showToast(`User ${email} added to board!`, 'success');
      memberEmailInput.value = '';
      await loadBoard();
      renderMembersDialogList();
    } catch (err) {
      membersAlertMsg.textContent = err.message || 'Could not add member.';
      membersAlert.classList.remove('hidden');
    } finally {
      addMemberSubmitBtn.disabled = false;
      addMemberSubmitBtn.textContent = 'Invite';
    }
  });

  // Initial Load
  loadUser();
  loadBoard();
});
