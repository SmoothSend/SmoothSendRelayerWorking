import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('transactions', (table) => {
    table.uuid('id').primary();
    table.string('hash').unique().index();
    table.string('from_address').notNullable().index();
    table.string('to_address').notNullable();
    table.string('amount').notNullable();
    table.string('coin_type').notNullable();
    table.string('gas_units').notNullable();
    table.string('gas_price').notNullable();
    table.string('total_gas_fee').notNullable();
    table.string('apt_price').notNullable();
    table.string('usdc_fee').notNullable();
    table.string('relayer_fee').notNullable();
    table.string('treasury_fee').notNullable();
    table.enum('status', ['pending', 'success', 'failed']).defaultTo('pending');
    table.text('error_message').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('transactions');
} 