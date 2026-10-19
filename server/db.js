const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const dbFile = path.resolve(process.env.DATABASE_FILE || './data/taskboard.db');
fs.mkdirSync(path.dirname(dbFile), { recursive: true });
const db = new Database(dbFile);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

const schema = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
db.exec(schema);

function seed() {
  const count = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (count > 0) return;

  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
  );
  const demoId = Number(insertUser.run(
    'Demo User', 'demo@taskboard.local', bcrypt.hashSync('DemoPass123!', 10)
  ).lastInsertRowid);
  const teammateId = Number(insertUser.run(
    'Teammate', 'teammate@taskboard.local', bcrypt.hashSync('DemoPass123!', 10)
  ).lastInsertRowid);

  const boardId = Number(db.prepare(
    'INSERT INTO boards (name, description, owner_id) VALUES (?, ?, ?)'
  ).run('Welcome to TaskBoard', 'A sample board to explore the Kanban workflow.', demoId).lastInsertRowid);

  db.prepare('INSERT INTO board_members (board_id, user_id, role) VALUES (?, ?, ?)').run(boardId, demoId, 'owner');
  db.prepare('INSERT INTO board_members (board_id, user_id, role) VALUES (?, ?, ?)').run(boardId, teammateId, 'member');

  const insertColumn = db.prepare('INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)');
  const todo = Number(insertColumn.run(boardId, 'To Do', 0).lastInsertRowid);
  const doing = Number(insertColumn.run(boardId, 'In Progress', 1).lastInsertRowid);
  const done = Number(insertColumn.run(boardId, 'Done', 2).lastInsertRowid);

  const insertTask = db.prepare(`
    INSERT INTO tasks (board_id, column_id, title, description, priority, assignee_id, created_by, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tasks = [
    [todo, 'Review project scope', 'Read the scope and list all required modules.', 'High', demoId, 0],
    [todo, 'Create database schema', 'Set up tables and foreign-key relationships.', 'High', demoId, 1],
    [todo, 'Build registration page', 'Add name, email and password fields.', 'Medium', teammateId, 2],
    [doing, 'Set up Express server', 'Create the first REST API routes.', 'High', demoId, 0],
    [doing, 'Design dashboard layout', 'Create a clear board-card layout.', 'Medium', teammateId, 1],
    [done, 'Initialize repository', 'Create the project structure.', 'Low', demoId, 0],
    [done, 'Choose technology stack', 'HTML, CSS, vanilla JS, Express and SQLite.', 'Low', demoId, 1],
    [todo, 'Test API authorization', 'Check that non-members cannot access a board.', 'High', teammateId, 3]
  ];
  for (const [columnId, title, description, priority, assigneeId, position] of tasks) {
    insertTask.run(boardId, columnId, title, description, priority, assigneeId, demoId, position);
  }
}
seed();

module.exports = db;
