CREATE DATABASE IF NOT EXISTS app_local
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

CREATE USER IF NOT EXISTS 'app_local_runtime'@'%' IDENTIFIED BY 'app_local_runtime_dev_only';
CREATE USER IF NOT EXISTS 'app_local_migrate'@'%' IDENTIFIED BY 'app_local_migrate_dev_only';

REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'app_local_runtime'@'%';
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'app_local_migrate'@'%';

GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE
ON app_local.* TO 'app_local_runtime'@'%';

GRANT ALL PRIVILEGES
ON app_local.* TO 'app_local_migrate'@'%';

FLUSH PRIVILEGES;