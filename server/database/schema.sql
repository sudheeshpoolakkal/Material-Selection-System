-- database/schema.sql
-- Run this script to initialize the tables for the Material Optimization DBMS

CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'developer', 'viewer') DEFAULT 'viewer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Projects (
    project_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE Collaborators (
    project_id INT NOT NULL,
    user_id INT NOT NULL,
    permission_level ENUM('read', 'write', 'admin') DEFAULT 'read',
    PRIMARY KEY (project_id, user_id),
    FOREIGN KEY (project_id) REFERENCES Projects(project_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE Material_Specs (
    spec_id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    max_weight DECIMAL(10, 2) NOT NULL,
    target_cost DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES Projects(project_id) ON DELETE CASCADE
);
