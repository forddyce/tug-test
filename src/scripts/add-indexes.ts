import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'tug_dev',
});

async function addIndexes() {
    console.log('🔧 Connecting to database...');
    await AppDataSource.initialize();

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    try {
        console.log('📊 Adding database indexes...\n');

        console.log('  ✓ Creating index on cards.card_number...');
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_cards_card_number" ON "cards" ("card_number")`,
        );

        console.log('  ✓ Creating index on cards.organization_id...');
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_cards_organization_id" ON "cards" ("organization_id")`,
        );

        console.log('  ✓ Creating index on transactions.card_id...');
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_transactions_card_id" ON "transactions" ("card_id")`,
        );

        console.log('  ✓ Creating index on transactions.timestamp...');
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_transactions_timestamp" ON "transactions" ("timestamp")`,
        );

        console.log('  ✓ Creating index on transactions.status...');
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_transactions_status" ON "transactions" ("status")`,
        );

        console.log(
            '  ✓ Creating composite index on transactions (card_id, timestamp)...',
        );
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_transactions_card_timestamp" ON "transactions" ("card_id", "timestamp")`,
        );

        console.log('\n✅ All indexes created successfully!');
    } catch (error) {
        console.error('❌ Error creating indexes:', error.message);
        throw error;
    } finally {
        await queryRunner.release();
        await AppDataSource.destroy();
    }
}

addIndexes()
    .then(() => {
        console.log('\n🎉 Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
