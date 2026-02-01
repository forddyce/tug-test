import { DataSource } from 'typeorm';
import { Organization } from './modules/organizations/entities/organization.entity';
import { Card } from './modules/cards/entities/card.entity';
import { Transaction } from './modules/transactions/entities/transaction.entity';

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'tug_dev',
    entities: [Organization, Card, Transaction],
    synchronize: false,
});

async function seed() {
    await AppDataSource.initialize();

    const orgRepo = AppDataSource.getRepository(Organization);
    const cardRepo = AppDataSource.getRepository(Card);

    const org1 = orgRepo.create({
        name: 'Acme Corporation',
        balance: 10000.0,
    });
    await orgRepo.save(org1);

    const org2 = orgRepo.create({
        name: 'Tech Solutions Ltd',
        balance: 5000.0,
    });
    await orgRepo.save(org2);

    const card1 = cardRepo.create({
        cardNumber: '1234-5678-9012-3456',
        organizationId: org1.id,
        dailyLimit: 500.0,
        monthlyLimit: 10000.0,
        dailyUsage: 0,
        monthlyUsage: 0,
        lastResetDate: new Date(),
    });
    await cardRepo.save(card1);

    const card2 = cardRepo.create({
        cardNumber: '9876-5432-1098-7654',
        organizationId: org1.id,
        dailyLimit: 300.0,
        monthlyLimit: 5000.0,
        dailyUsage: 0,
        monthlyUsage: 0,
        lastResetDate: new Date(),
    });
    await cardRepo.save(card2);

    const card3 = cardRepo.create({
        cardNumber: '1111-2222-3333-4444',
        organizationId: org2.id,
        dailyLimit: 200.0,
        monthlyLimit: 3000.0,
        dailyUsage: 0,
        monthlyUsage: 0,
        lastResetDate: new Date(),
    });
    await cardRepo.save(card3);

    console.log('Seed data inserted successfully!');
    console.log('\nTest Cards:');
    console.log(
        '1. Card: 1234-5678-9012-3456 (Org: Acme, Balance: 10000, Daily: 500, Monthly: 10000)',
    );
    console.log(
        '2. Card: 9876-5432-1098-7654 (Org: Acme, Balance: 10000, Daily: 300, Monthly: 5000)',
    );
    console.log(
        '3. Card: 1111-2222-3333-4444 (Org: Tech Solutions, Balance: 5000, Daily: 200, Monthly: 3000)',
    );

    await AppDataSource.destroy();
}

seed().catch((error) => {
    console.error('Error seeding database:', error);
    process.exit(1);
});
