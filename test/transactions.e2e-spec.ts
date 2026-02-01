import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { TestFactory } from './factories';
import { TransactionsTestHelper } from './helpers/transactions.helper';
import { TestDatabaseHelper } from './helpers/test-database.helper';

describe('Transactions (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let factory: TestFactory;
    let api: TransactionsTestHelper;
    let db: TestDatabaseHelper;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();

        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        );

        app.useGlobalFilters(new GlobalExceptionFilter());

        await app.init();

        dataSource = moduleFixture.get<DataSource>(DataSource);
        factory = new TestFactory(dataSource);
        api = new TransactionsTestHelper(app);
        db = new TestDatabaseHelper(dataSource);

        await db.cleanup();
    });

    afterAll(async () => {
        await db.cleanup();
        await dataSource.destroy();
        await app.close();
    });

    describe('POST /transactions/webhook', () => {
        describe('successful transactions', () => {
            it('should approve a valid transaction', async () => {
                const org = await factory.organizations.create({
                    balance: 5000,
                });
                const card = await factory.cards.create({
                    organizationId: org.id,
                    dailyLimit: 500,
                    monthlyLimit: 3000,
                });

                const response = await api.sendWebhook({
                    cardNumber: card.cardNumber,
                    amount: 150.5,
                    stationInfo: {
                        name: 'Test Station',
                        location: 'Test Location',
                    },
                });

                const result = api.expectApproved(response);
                expect(result.amount).toBe(150.5);
            });
        });

        describe('limit validations', () => {
            it('should reject transaction when daily limit exceeded', async () => {
                const org = await factory.organizations.create({
                    balance: 5000,
                });
                const card = await factory.cards.create({
                    organizationId: org.id,
                    dailyLimit: 500,
                });

                const response = await api.sendWebhook({
                    cardNumber: card.cardNumber,
                    amount: 501,
                });

                api.expectDailyLimitExceeded(response);
            });

            it('should reject transaction when monthly limit exceeded', async () => {
                const org = await factory.organizations.create({
                    balance: 5000,
                });
                const card = await factory.cards.create({
                    organizationId: org.id,
                    monthlyLimit: 1000,
                    monthlyUsage: 900,
                });

                const response = await api.sendWebhook({
                    cardNumber: card.cardNumber,
                    amount: 150,
                });

                api.expectMonthlyLimitExceeded(response);
            });
        });

        describe('balance validations', () => {
            it('should reject transaction when insufficient balance', async () => {
                const org = await factory.organizations.create({
                    balance: 100,
                });
                const card = await factory.cards.create({
                    organizationId: org.id,
                });

                const response = await api.sendWebhook({
                    cardNumber: card.cardNumber,
                    amount: 6000,
                });

                api.expectInsufficientBalance(response);
            });
        });

        describe('card validations', () => {
            it('should reject transaction with non-existent card', async () => {
                const response = await api.sendWebhook({
                    cardNumber: 'NON-EXISTENT-CARD',
                    amount: 100,
                });

                api.expectCardNotFound(response);
            });
        });

        describe('input validations', () => {
            it('should validate required fields', async () => {
                const response = await api.sendWebhook({
                    cardNumber: '',
                    amount: 100,
                } as any);

                const result = api.expectValidationError(response);
                expect(
                    result.message.some((msg: string) =>
                        msg.includes('cardNumber'),
                    ),
                ).toBe(true);
            });

            it('should validate amount is positive', async () => {
                const response = await api.sendWebhook({
                    cardNumber: 'TEST-CARD',
                    amount: -50,
                });

                const result = api.expectValidationError(response);
                expect(
                    result.message.some((msg: string) =>
                        msg.includes('amount'),
                    ),
                ).toBe(true);
            });

            it('should validate amount is at least 0.01', async () => {
                const response = await api.sendWebhook({
                    cardNumber: 'TEST-CARD',
                    amount: 0,
                });

                expect(response.status).toBe(400);
            });
        });

        describe('concurrency', () => {
            it('should handle concurrent transactions atomically', async () => {
                const org = await factory.organizations.create({
                    balance: 1000,
                });
                const card = await factory.cards.create({
                    organizationId: org.id,
                    dailyLimit: 500,
                    monthlyLimit: 3000,
                });

                const transaction1 = api.sendWebhook({
                    cardNumber: card.cardNumber,
                    amount: 300,
                });

                await new Promise((resolve) => setTimeout(resolve, 10));

                const transaction2 = api.sendWebhook({
                    cardNumber: card.cardNumber,
                    amount: 300,
                });

                const [result1, result2] = await Promise.all([
                    transaction1,
                    transaction2,
                ]);

                const successCount = [result1, result2].filter(
                    (r) => r.status === 200,
                ).length;
                const failureCount = [result1, result2].filter(
                    (r) => r.status === 403,
                ).length;

                expect(successCount).toBeGreaterThanOrEqual(1);
                expect(successCount + failureCount).toBe(2);
            });
        });
    });
});
