import knex from 'knex';
import { config } from '../config';
import { logger } from '../utils/logger';

// Make database truly optional - only create connection if URL provided
export const db = config.databaseUrl ? knex({
  client: 'postgresql',
  connection: config.databaseUrl,
  pool: {
    min: 2,
    max: 10
  },
  migrations: {
    directory: './migrations'
  }
}) : null;

// Export a safe database wrapper that handles null db
export const safeDb = {
  isConnected: () => !!db,
  
  async query(tableName: string) {
    if (!db) {
      logger.debug('Database not configured - skipping query');
      return null;
    }
    return db(tableName);
  },
  
  async insert(tableName: string, data: any) {
    if (!db) {
      logger.debug('Database not configured - skipping insert');
      return null;
    }
    return db(tableName).insert(data);
  },
  
  async update(tableName: string, condition: any, data: any) {
    if (!db) {
      logger.debug('Database not configured - skipping update');
      return null;
    }
    return db(tableName).where(condition).update(data);
  },
  
  async select(tableName: string, condition?: any) {
    if (!db) {
      logger.debug('Database not configured - skipping select');
      return null;
    }
    return condition ? db(tableName).where(condition) : db(tableName);
  },
  
  async raw(query: string) {
    if (!db) {
      logger.debug('Database not configured - skipping raw query');
      return null;
    }
    return db.raw(query);
  },
  
  async migrate() {
    if (!db) {
      logger.debug('Database not configured - skipping migrations');
      return null;
    }
    return db.migrate.latest();
  },
  
  async destroy() {
    if (!db) {
      return null;
    }
    return db.destroy();
  }
}; 