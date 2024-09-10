-- Drop the table if it exists
DROP TABLE IF EXISTS users;

-- Create the users table with all required fields
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) -- can be admin or vendor
);

INSERT INTO users (username, password, role) VALUES ('admin', '$2a$10$vneFdNWRG2Tcekula.xKxuhnvXpuNI7CnbCnfyaaoLYmV7Y4meGli', 'admin'); -- 'admin' hashed
