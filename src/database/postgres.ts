import knex from 'knex';
import { config } from '../config';

export const db = knex({
  client: 'postgresql',
  connection: config.databaseUrl,
  pool: {
    min: 2,
    max: 10
  },
  migrations: {
    directory: './migrations'
  }
}); 