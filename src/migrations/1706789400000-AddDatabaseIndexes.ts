import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDatabaseIndexes1706789400000 implements MigrationInterface {
    name = 'AddDatabaseIndexes1706789400000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_cards_card_number" ON "cards" ("cardNumber")`,
        );

        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_cards_organization_id" ON "cards" ("organizationId")`,
        );

        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_transactions_card_id" ON "transactions" ("cardId")`,
        );

        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_transactions_timestamp" ON "transactions" ("timestamp")`,
        );

        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_transactions_status" ON "transactions" ("status")`,
        );

        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_transactions_card_timestamp" ON "transactions" ("cardId", "timestamp")`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DROP INDEX IF EXISTS "IDX_transactions_card_timestamp"`,
        );
        await queryRunner.query(
            `DROP INDEX IF EXISTS "IDX_transactions_status"`,
        );
        await queryRunner.query(
            `DROP INDEX IF EXISTS "IDX_transactions_timestamp"`,
        );
        await queryRunner.query(
            `DROP INDEX IF EXISTS "IDX_transactions_card_id"`,
        );
        await queryRunner.query(
            `DROP INDEX IF EXISTS "IDX_cards_organization_id"`,
        );
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_cards_card_number"`);
    }
}
