CREATE TABLE applications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id VARCHAR(191) NOT NULL,
  created_by_user_id VARCHAR(191) NOT NULL,
  applicant_type VARCHAR(64) NOT NULL,
  status VARCHAR(64) NOT NULL,
  current_step VARCHAR(100) NOT NULL,
  data_json JSON NOT NULL,
  submitted_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_applications_id_tenant_id (id, tenant_id),
  KEY idx_applications_tenant_status_created_at (tenant_id, status, created_at),
  KEY idx_applications_created_by_user_id_created_at (created_by_user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE application_uploads (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  application_id BIGINT UNSIGNED NOT NULL,
  tenant_id VARCHAR(191) NOT NULL,
  storage_provider VARCHAR(64) NOT NULL,
  storage_key VARCHAR(512) NOT NULL,
  original_file_name VARCHAR(255) NOT NULL,
  content_type VARCHAR(255) NOT NULL,
  byte_size BIGINT UNSIGNED NOT NULL,
  uploaded_by_user_id VARCHAR(191) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_application_uploads_application_id (application_id),
  KEY idx_application_uploads_tenant_created_at (tenant_id, created_at),
  CONSTRAINT fk_application_uploads_application_tenant
    FOREIGN KEY (application_id, tenant_id)
    REFERENCES applications (id, tenant_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;