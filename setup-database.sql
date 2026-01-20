-- Script SQL para criar banco de dados e usuario
-- Execute este script no MySQL (phpMyAdmin, MySQL Workbench, ou linha de comando)

CREATE DATABASE IF NOT EXISTS gestor_consulta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'gestor_user'@'localhost' IDENTIFIED BY 'gestor_password';

GRANT ALL PRIVILEGES ON gestor_consulta.* TO 'gestor_user'@'localhost';

FLUSH PRIVILEGES;

-- Verificar se foi criado
SHOW DATABASES LIKE 'gestor_consulta';
SELECT User, Host FROM mysql.user WHERE User = 'gestor_user';
