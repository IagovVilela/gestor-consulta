CREATE USER IF NOT EXISTS 'gestor_user'@'localhost' IDENTIFIED BY 'gestor_password';
GRANT ALL PRIVILEGES ON gestor_consulta.* TO 'gestor_user'@'localhost';
FLUSH PRIVILEGES;
