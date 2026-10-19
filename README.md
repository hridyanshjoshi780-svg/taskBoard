# TaskBoard

**Kanban Based Task Management System**

TaskBoard is a full stack task management application that organises work through boards, workflow columns, and task cards. The project focuses on REST API development, authentication, relational database design, and interactive frontend engineering.

## Technology Stack

| Layer | Technology |
| :--- | :--- |
| Frontend | HTML5, CSS3, JavaScript |
| Backend | Node.js, Express.js |
| Database | SQLite |
| Authentication | JWT, bcrypt |
| Version Control | Git, GitHub |

## Core Features

The application is designed to support:

1. User registration and authentication.
2. Board creation and management.
3. Workflow columns such as To Do, In Progress, and Done.
4. Task creation, editing, assignment, and prioritisation.
5. Drag and drop task organisation with persistent ordering.
6. Board membership and role based access control.
7. Task comments, search, and filtering.

Feature availability depends on the current implementation.

## Architecture

TaskBoard follows a client server architecture.

```text
Frontend
   |
   | REST API
   |
Node.js and Express
   |
   | SQL Queries
   |
SQLite Database
```

The frontend handles user interaction and API communication. The backend manages application logic, authentication, authorization, and database operations.

## Project Structure

```text
taskboard/
    server/
        app.js
        db.js
    public/
        login.html
        register.html
        dashboard.html
        board.html
        styles.css
    schema.sql
    seed.sql
    .env.example
    package.json
    README.md
```

## Installation and Setup

### Prerequisites

Node.js, npm, Git, and the required native build tools for SQLite dependencies, if applicable.

### Setup

```bash
git clone <repository-url>
cd <project-directory>
npm install
cp .env.example .env
```

Configure the required environment variables in `.env`. Use a strong, unique `JWT_SECRET` and never commit secrets to version control.

Start the application:

```bash
npm start
```

Open `http://localhost:3000/login.html` if the application uses the default port and route configuration.

## Database Design

The database model includes the following entities:

| Entity | Purpose |
| :--- | :--- |
| Users | User identity and authentication |
| Boards | Task management workspaces |
| Board Members | Board access and membership |
| Columns | Workflow stages and ordering |
| Tasks | Task details and assignments |
| Comments | Task discussions |

The database schema is defined in `schema.sql`, subject to the current repository implementation.

## Security

The application is designed around the following security requirements:

1. Password hashing using bcrypt.
2. JWT based authentication for protected APIs.
3. Server side authorization for board and task operations.
4. Parameterized SQL queries.
5. Safe handling of user supplied content.
6. Environment based secret management.

## Testing

Run the available tests and validation scripts defined in `package.json`. Verify authentication, board permissions, database persistence, task operations, and error handling before considering the corresponding features complete.

## Project Scope

TaskBoard focuses on essential Kanban task management. Advanced sprint planning, real time collaboration, file attachments, third party integrations, and enterprise reporting are outside the core scope.

## Development Status

TaskBoard is under active development. Feature completion and testing status should be assessed against the current source code.

## License

No license has been specified. Usage and redistribution permissions should not be assumed until a license is added to the repository.