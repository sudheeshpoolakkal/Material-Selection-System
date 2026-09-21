# Material Optimization DBMS

A full-stack Database Management System (DBMS) and web application designed for engineering material optimization, constraint specification, and team collaboration.

---

## 📌 Project Overview

In mechanical, aerospace, and structural engineering, selecting the ideal material requires balancing multiple conflicting objectives—primarily **minimizing weight** while **satisfying target cost boundaries**. 

This system provides a centralized platform for engineering teams to:
- Organize optimization projects.
- Define and track multi-variable material constraints (**Max Weight** and **Target Cost**).
- Collaborate securely with granular permission levels.
- Manage user profiles with encrypted authentication.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 18, React Router v6, Axios | Component-driven SPA with responsive UI, dynamic modals, and client-side routing. |
| **Backend API** | Node.js, Express 5 | RESTful API with structured routes, controllers, and middleware. |
| **Database** | MySQL 8.0 | Relational database with foreign key constraints, `ON DELETE CASCADE`, and indexing. |
| **Security** | JWT, bcrypt (10 rounds) | Token-based stateless authentication and cryptographically salted password hashing. |

---

## 🗄️ Database Schema

The database `material_optimization_db` is designed with the following relational model:

```
+------------------+         +------------------+
|      Users       |         |     Projects     |
+------------------+         +------------------+
| user_id (PK)     |<---+    | project_id (PK)  |<---+
| name             |    |    | name             |    |
| email (Unique)   |    |    | owner_id (FK)----+    |
| password_hash    |    |    | created_at       |    |
| role (enum)      |    |    +------------------+    |
| created_at       |    |             |              |
+------------------+    |             |              |
        ^               |             |              |
        |               |             v              |
+-----------------------+--+ +-----------------------+--+
|      Collaborators       | |     Material_Specs       |
+--------------------------+ +--------------------------+
| project_id (PK, FK) -----+ | spec_id (PK)             |
| user_id (PK, FK) --------+ | project_id (FK) ---------+
| permission_level (enum)  | | max_weight (DECIMAL)     |
+--------------------------+ | target_cost (DECIMAL)    |
                             | created_at               |
                             +--------------------------+
```

### Table Breakdown
1. **`Users`**: Stores user credentials, hashed passwords, roles (`admin`, `developer`, `viewer`), and display names.
2. **`Projects`**: Tracks engineering projects owned by a user.
3. **`Collaborators`**: Associative junction table mapping team members to projects with permissions (`read`, `write`, `admin`).
4. **`Material_Specs`**: Stores target optimization boundaries (`max_weight` in kg, `target_cost` in USD) linked to projects.

---

## ✅ What Has Been Implemented

### 1. Authentication & Security
- **Account Registration**: Validates email format, checks for duplicates, enforces minimum 8-character passwords, displays real-time password strength, and hashes passwords using bcrypt (10 salt rounds).
- **Secure Login**: Issues signed JSON Web Tokens (JWT) valid for 30 days.
- **Role-Based Profiles**: Assigns user roles (`Viewer`, `Developer`, `Admin`) with distinct access rights.
- **Route Protection**: Backend middleware (`authMiddleware.js`) verifies JWT Bearer tokens on all private endpoints.

### 2. Account Management
- **Profile Customization**: Users can update their display name and email address from the `/profile` page with instant feedback and synchronized state.
- **Password Updates**: Secure password modification requiring current password verification before updating to a new bcrypt-hashed password.

### 3. Interactive Project Management Dashboard
- **Live Workspace Metrics**: Real-time summary tiles showing:
  - Total Accessible Projects
  - Owned Projects
  - Shared Collaborations
  - Total Material Constraints Defined
- **Project Search & Filters**: Client-side filtering by project name, owner, and ownership status (*All*, *My Projects*, *Shared with Me*).
- **Interactive Project Cards**: Card view displaying owner indicators, spec counts, team size, and quick-action buttons.
- **Project Creation**: Modal for instantiating projects with optional immediate material specs.
- **Cascade Deletion**: Owners can permanently delete projects and their associated specs.

### 4. Material Specification Management
- Dedicated **Specs Modal** per project displaying constraint cards (`Max Weight: X kg` | `Target Cost: $Y`).
- Dynamic addition and deletion of specifications with input validation for positive numbers.

### 5. Team Collaboration
- Dedicated **Team Modal** per project.
- Invite existing registered users by email address.
- Configurable permission levels:
  - `Read`: Inspect specs in read-only mode.
  - `Write`: Add and remove material constraints.
  - `Admin`: Full management permissions on the project.
- Ability for project owners to remove collaborators.

### 6. System & Infrastructure Fixes
- Dual-stack dev server configuration (`HOST=::`) in `client/.env` resolving Windows IPv6 loopback issues (`[::1]` vs `127.0.0.1`).
- Clean `.gitignore` configuration preventing `node_modules/`, build outputs, and `.env` credentials from leaking into Git.
- Git commit history sanitized and optimized from 64 MB down to ~860 KB.

---

## 🔮 What Needed to Be Implemented (Future Roadmap)

The following features represent recommended future enhancements for production deployment:

### 1. Material Selection & Pareto Optimization Engine
- **Material Catalog Database**: Add a `Materials` reference table populated with standard engineering materials (e.g., Titanium Ti-6Al-4V, Aluminum 7075-T6, Carbon Fiber Epoxy, Stainless Steel 316) containing mechanical properties (density, yield strength, thermal conductivity, unit cost).
- **Optimization Algorithm**: An analytical calculation engine that evaluates defined `Material_Specs` constraints against the catalog and ranks candidate materials using Pareto frontier optimization (minimizing weight $\times$ cost).

### 2. Reporting & Data Export
- **Export to PDF / CSV**: Allow engineers to download comprehensive optimization reports, material data sheets, and project summaries.
- **Bill of Materials (BOM) Generator**: Generate cost and weight rollups for multi-component assemblies.

### 3. Real-Time Activity & Audit Logs
- **Project Audit Trail**: Track change logs showing which collaborator added, updated, or removed specific constraints with timestamps.
- **WebSocket Notifications**: Push real-time notifications to team members when collaborators are added or specs are modified.

### 4. System Administration Console
- Dedicated `/admin` dashboard for users with the `admin` role to inspect system statistics, manage registered users, and audit workspace health.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [MySQL Server](https://dev.mysql.com/downloads/installer/) (v8.0 or higher) running locally on port 3306

### 1. Database Initialization
Log in to your MySQL terminal or MySQL Workbench and run:
```sql
CREATE DATABASE IF NOT EXISTS material_optimization_db;
USE material_optimization_db;
```
Then execute the initialization script located at [server/database/schema.sql](server/database/schema.sql).

### 2. Backend Setup
1. Open a terminal in the `server` folder:
   ```bash
   cd server
   ```
2. Install backend dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables by creating a `.env` file (refer to `.env.example`):
   ```properties
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=material_optimization_db
   JWT_SECRET=your_secret_jwt_key
   ```
4. Start the server:
   ```bash
   node server.js
   ```
   *The server will start listening at `http://localhost:5000`.*

### 3. Frontend Setup
1. Open a second terminal in the `client` folder:
   ```bash
   cd client
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Start the React development application:
   ```bash
   npm start
   ```
   *The app will automatically open at `http://localhost:3000`.*

---

## 📡 API Reference Summary

### Authentication & User
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register a new user (`name`, `email`, `password`, `role`) |
| `POST` | `/api/auth/login` | Public | Authenticate user and return JWT |
| `GET` | `/api/auth/me` | Private | Get profile data of current user |
| `PUT` | `/api/auth/profile` | Private | Update user's name and email |
| `PUT` | `/api/auth/change-password` | Private | Change password with current password verification |

### Projects & Optimization
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/projects/stats` | Private | Retrieve aggregate project & spec stats |
| `GET` | `/api/projects` | Private | List all accessible projects |
| `POST` | `/api/projects` | Private | Create a project with optional initial specs |
| `GET` | `/api/projects/:id` | Private | Get single project with specs and collaborators |
| `PUT` | `/api/projects/:id` | Private | Update project name |
| `DELETE`| `/api/projects/:id` | Private | Delete project (owner only) |
| `POST` | `/api/projects/:id/specs` | Private | Add material constraint spec |
| `DELETE`| `/api/projects/:id/specs/:specId` | Private | Delete material constraint spec |
| `POST` | `/api/projects/:id/collaborators` | Private | Add collaborator by email and permission |
| `DELETE`| `/api/projects/:id/collaborators/:userId` | Private | Remove collaborator |

---

## 📄 License
This project is open-source and available under the [ISC License](LICENSE).
