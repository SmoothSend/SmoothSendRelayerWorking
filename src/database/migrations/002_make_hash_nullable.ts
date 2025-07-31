import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('transactions', (table: Knex.CreateTableBuilder) => {
    // Make hash nullable since we insert before getting the transaction hash
    table.text('hash').nullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('transactions', (table: Knex.CreateTableBuilder) => {
    // Revert back to not null
    table.text('hash').notNullable().alter();
  });
}
