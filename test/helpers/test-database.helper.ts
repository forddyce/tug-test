import { DataSource } from 'typeorm';
import { Organization } from '../../src/modules/organizations/entities/organization.entity';
import { Card } from '../../src/modules/cards/entities/card.entity';

export class TestDatabaseHelper {
    constructor(private readonly dataSource: DataSource) {}

    async cleanup() {
        const transactionRepo = this.dataSource.getRepository('Transaction');
        const idempotencyRepo = this.dataSource.getRepository('IdempotencyKey');
        const cardRepo = this.dataSource.getRepository(Card);
        const orgRepo = this.dataSource.getRepository(Organization);

        await transactionRepo.query('TRUNCATE TABLE transactions CASCADE');
        await idempotencyRepo.query('TRUNCATE TABLE idempotency_keys CASCADE');
        await cardRepo.query('TRUNCATE TABLE cards CASCADE');
        await orgRepo.query('TRUNCATE TABLE organizations CASCADE');
    }

    async cleanupCard(card: Card) {
        const transactionRepo = this.dataSource.getRepository('Transaction');
        const cardRepo = this.dataSource.getRepository(Card);

        if (card?.id) {
            await transactionRepo.delete({ cardId: card.id });
            await cardRepo.remove(card);
        }
    }

    async cleanupOrganization(org: Organization) {
        const orgRepo = this.dataSource.getRepository(Organization);
        if (org?.id) {
            await orgRepo.remove(org);
        }
    }
}
