This follows the official MySQL guidance that mysqldump produces logical SQL backups, --single-transaction is the right baseline for online backups of InnoDB data, --routines/--triggers include those objects, and SQL-format dumps are restored by piping them into the mysql client. MySQL also notes that for a single-database dump that does not include CREATE DATABASE / USE, the target restore database must exist first. you specified.

mysqldump --single-transaction --routines --triggers \
  -h "$DB_HOST" -u "$BACKUP_USER" -p"$BACKUP_PASSWORD" "$DB_NAME" > "$BACKUP_FILE"

  mysql -h "$DB_HOST" -u "$RESTORE_USER" -p"$RESTORE_PASSWORD" "$RESTORE_DB_NAME" < "$BACKUP_FILE"

  