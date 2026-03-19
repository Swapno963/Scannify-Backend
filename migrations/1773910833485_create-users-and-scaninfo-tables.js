/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
    pgm.createTable('users', {
    id: 'id',
    email: { type: 'varchar(255)', notNull: true, unique: true },
    password_hash: { type: 'varchar(255)', notNull: true },
    full_name: { type: 'varchar(255)' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  pgm.createTable('scan_info', {
    id: 'id',
    user_id: { type: 'integer', notNull: true, references: 'users(id)', onDelete: 'cascade' },
    value: { type: 'text', notNull: true },
    barcode_type: { type: 'varchar(50)' },
    timestamp: { type: 'timestamp', default: pgm.func('current_timestamp') },
    device_info: { type: 'text' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    
  pgm.dropTable('scan_info');
  pgm.dropTable('users');
};
