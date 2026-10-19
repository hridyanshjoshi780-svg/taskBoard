require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const configuredJwtSecret = process.env.JWT_SECRET;
const usesTemporaryJwtSecret = !configuredJwtSecret || configuredJwtSecret === 'replace_this_with_a_long_random_secret';
const JWT_SECRET = usesTemporaryJwtSecret ? crypto.randomBytes(32).toString('hex') : configuredJwtSecret;
if (usesTemporaryJwtSecret) {
  console.warn('WARNING: JWT_SECRET is missing or still set to the template value. Using a temporary random secret; sessions will be invalidated after restart. Set a strong JWT_SECRET in .env.');
}

app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return sendError(res, 401, 'Authentication required.');
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return sendError(res, 401, 'Invalid or expired token.');
  }
}
function membership(boardId, userId) {
  return db.prepare(`
    SELECT bm.role, b.owner_id FROM board_members bm
    JOIN boards b ON b.id = bm.board_id
    WHERE bm.board_id = ? AND bm.user_id = ?
  `).get(boardId, userId);
}
function requireMember(req, res, next) {
  const boardId = Number(req.params.id || req.params.boardId);
  const member = membership(boardId, req.user.id);
  if (!member) return sendError(res, 403, 'You do not have access to this board.');
  req.boardId = boardId;
  req.memberRole = member.role;
  next();
}
function requireOwner(req, res, next) {
  if (req.memberRole !== 'owner') return sendError(res, 403, 'Board owner permission required.');
  next();
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'TaskBoard' }));

app.post('/api/auth/register', (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (name.length < 2) return sendError(res, 400, 'Name must contain at least 2 characters.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendError(res, 400, 'Enter a valid email address.');
  if (password.length < 8) return sendError(res, 400, 'Password must be at least 8 characters.');
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) return sendError(res, 409, 'An account with this email already exists.');
  const passwordHash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(name, email, passwordHash);
  const userId = Number(info.lastInsertRowid);
  const token = jwt.sign({ id: userId, name, email }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });
  res.status(201).json({ token, user: { id: userId, name, email } });
});

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = db.prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return sendError(res, 401, 'Incorrect email or password.');
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.get('/api/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return sendError(res, 404, 'User not found.');
  res.json({ user });
});

app.get('/api/boards', auth, (req, res) => {
  const boards = db.prepare(`
    SELECT b.id, b.name, b.description, b.owner_id, b.created_at, bm.role,
      (SELECT COUNT(*) FROM tasks t WHERE t.board_id = b.id) AS task_count
    FROM boards b JOIN board_members bm ON bm.board_id = b.id
    WHERE bm.user_id = ? ORDER BY b.created_at DESC
  `).all(req.user.id);
  res.json({ boards });
});

app.post('/api/boards', auth, (req, res) => {
  const name = String(req.body.name || '').trim();
  const description = String(req.body.description || '').trim();
  if (!name || name.length > 100) return sendError(res, 400, 'Board name is required and must be at most 100 characters.');
  const createBoard = db.transaction(() => {
    const boardId = Number(db.prepare('INSERT INTO boards (name, description, owner_id) VALUES (?, ?, ?)').run(name, description, req.user.id).lastInsertRowid);
    db.prepare('INSERT INTO board_members (board_id, user_id, role) VALUES (?, ?, ?)').run(boardId, req.user.id, 'owner');
    const insertColumn = db.prepare('INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)');
    ['To Do', 'In Progress', 'Done'].forEach((column, index) => insertColumn.run(boardId, column, index));
    return boardId;
  });
  const boardId = createBoard();
  res.status(201).json({ board: db.prepare('SELECT * FROM boards WHERE id = ?').get(boardId) });
});

app.get('/api/boards/:id', auth, requireMember, (req, res) => {
  const board = db.prepare('SELECT id, name, description, owner_id, created_at FROM boards WHERE id = ?').get(req.boardId);
  const columns = db.prepare('SELECT id, board_id, name, position FROM columns WHERE board_id = ? ORDER BY position, id').all(req.boardId);
  const tasks = db.prepare(`
    SELECT t.*, u.name AS assignee_name,
      (SELECT COUNT(*) FROM comments c WHERE c.task_id = t.id) AS comment_count
    FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id
    WHERE t.board_id = ? ORDER BY t.column_id, t.position, t.id
  `).all(req.boardId);
  const members = db.prepare(`
    SELECT u.id, u.name, u.email, bm.role FROM board_members bm
    JOIN users u ON u.id = bm.user_id WHERE bm.board_id = ? ORDER BY bm.role DESC, u.name
  `).all(req.boardId);
  res.json({ board, columns, tasks, members, currentRole: req.memberRole });
});

app.put('/api/boards/:id', auth, requireMember, requireOwner, (req, res) => {
  const name = String(req.body.name || '').trim();
  const description = String(req.body.description || '').trim();
  if (!name || name.length > 100) return sendError(res, 400, 'Board name is required and must be at most 100 characters.');
  db.prepare('UPDATE boards SET name = ?, description = ? WHERE id = ?').run(name, description, req.boardId);
  res.json({ board: db.prepare('SELECT * FROM boards WHERE id = ?').get(req.boardId) });
});

app.delete('/api/boards/:id', auth, requireMember, requireOwner, (req, res) => {
  db.prepare('DELETE FROM boards WHERE id = ?').run(req.boardId);
  res.json({ message: 'Board deleted.' });
});

app.post('/api/boards/:id/members', auth, requireMember, requireOwner, (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(email);
  if (!user) return sendError(res, 404, 'No registered user found with that email.');
  try {
    db.prepare('INSERT INTO board_members (board_id, user_id, role) VALUES (?, ?, ?)').run(req.boardId, user.id, 'member');
  } catch (err) {
    if (String(err.code).includes('SQLITE_CONSTRAINT')) return sendError(res, 409, 'This user is already a board member.');
    throw err;
  }
  res.status(201).json({ member: user });
});

app.delete('/api/boards/:id/members/:userId', auth, requireMember, requireOwner, (req, res) => {
  const userId = Number(req.params.userId);
  if (userId === req.user.id) return sendError(res, 400, 'Owner cannot remove themselves from their own board.');
  const result = db.prepare("DELETE FROM board_members WHERE board_id = ? AND user_id = ? AND role = 'member'").run(req.boardId, userId);
  if (!result.changes) return sendError(res, 404, 'Board member not found.');
  res.json({ message: 'Member removed.' });
});

app.post('/api/boards/:id/columns', auth, requireMember, (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name || name.length > 60) return sendError(res, 400, 'Column name is required and must be at most 60 characters.');
  const position = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS next FROM columns WHERE board_id = ?').get(req.boardId).next;
  const info = db.prepare('INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)').run(req.boardId, name, position);
  res.status(201).json({ column: db.prepare('SELECT * FROM columns WHERE id = ?').get(Number(info.lastInsertRowid)) });
});

app.put('/api/columns/:id', auth, (req, res) => {
  const column = db.prepare('SELECT * FROM columns WHERE id = ?').get(Number(req.params.id));
  if (!column) return sendError(res, 404, 'Column not found.');
  const member = membership(column.board_id, req.user.id);
  if (!member) return sendError(res, 403, 'You do not have access to this board.');
  const name = String(req.body.name || '').trim();
  if (name) {
    if (name.length > 60) return sendError(res, 400, 'Column name must be at most 60 characters.');
    db.prepare('UPDATE columns SET name = ? WHERE id = ?').run(name, column.id);
  }
  if (Number.isInteger(req.body.position) && req.body.position >= 0) {
    db.prepare('UPDATE columns SET position = ? WHERE id = ?').run(req.body.position, column.id);
  }
  res.json({ column: db.prepare('SELECT * FROM columns WHERE id = ?').get(column.id) });
});

app.delete('/api/columns/:id', auth, (req, res) => {
  const column = db.prepare('SELECT * FROM columns WHERE id = ?').get(Number(req.params.id));
  if (!column) return sendError(res, 404, 'Column not found.');
  const member = membership(column.board_id, req.user.id);
  if (!member) return sendError(res, 403, 'You do not have access to this board.');
  if (member.role !== 'owner') return sendError(res, 403, 'Board owner permission required.');
  const taskCount = db.prepare('SELECT COUNT(*) AS count FROM tasks WHERE column_id = ?').get(column.id).count;
  if (taskCount > 0) return sendError(res, 409, 'Move or delete tasks in this column before deleting it.');
  db.prepare('DELETE FROM columns WHERE id = ?').run(column.id);
  res.json({ message: 'Column deleted.' });
});

app.use('/api', (_req, res) => sendError(res, 404, 'API route not found.'));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`TaskBoard running at http://localhost:${PORT}`);
  console.log('Demo login: demo@taskboard.local / DemoPass123!');
});
