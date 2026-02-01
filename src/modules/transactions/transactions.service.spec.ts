import { Test, TestingModule } from '@nestjs/testing';
import { Repository, DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { TransactionsService } from './transactions.service';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { CardsService } from '../cards/cards.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { InsufficientBalanceException } from '../../common/exceptions/insufficient-balance.exception';
import { DailyLimitExceededException } from '../../common/exceptions/daily-limit-exceeded.exception';
import { MonthlyLimitExceededException } from '../../common/exceptions/monthly-limit-exceeded.exception';

describe('TransactionsService', () => {
    let service: TransactionsService;
    let transactionRepository: Repository<Transaction>;
    let cardsService: CardsService;
    let organizationsService: OrganizationsService;
    let eventEmitter: EventEmitter2;
    let cacheManager: any;

    const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
            save: jest.fn(),
        },
    };

    const mockCard = {
        id: 'card-uuid',
        cardNumber: '1234-5678-9012-3456',
        organizationId: 'org-uuid',
        dailyLimit: 500,
        monthlyLimit: 10000,
        dailyUsage: 0,
        monthlyUsage: 0,
        lastResetDate: new Date(),
        organization: {
            id: 'org-uuid',
            name: 'Acme Corporation',
            balance: 10000,
        },
    };

    const mockTransaction = {
        id: 'transaction-uuid',
        cardId: 'card-uuid',
        amount: 150.5,
        timestamp: new Date(),
        status: TransactionStatus.PENDING,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TransactionsService,
                {
                    provide: getRepositoryToken(Transaction),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                        findOne: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(IdempotencyKey),
                    useValue: {
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                        remove: jest.fn(),
                    },
                },
                {
                    provide: CardsService,
                    useValue: {
                        findByCardNumber: jest.fn(),
                        resetLimitsIfNeeded: jest.fn(),
                        updateUsage: jest.fn(),
                    },
                },
                {
                    provide: OrganizationsService,
                    useValue: {
                        findById: jest.fn(),
                        deductBalance: jest.fn(),
                    },
                },
                {
                    provide: DataSource,
                    useValue: {
                        createQueryRunner: jest
                            .fn()
                            .mockReturnValue(mockQueryRunner),
                    },
                },
                {
                    provide: EventEmitter2,
                    useValue: {
                        emit: jest.fn(),
                    },
                },
                {
                    provide: CACHE_MANAGER,
                    useValue: {
                        del: jest.fn(),
                        get: jest.fn(),
                        set: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<TransactionsService>(TransactionsService);
        transactionRepository = module.get<Repository<Transaction>>(
            getRepositoryToken(Transaction),
        );
        cardsService = module.get<CardsService>(CardsService);
        organizationsService =
            module.get<OrganizationsService>(OrganizationsService);
        eventEmitter = module.get<EventEmitter2>(EventEmitter2);
        cacheManager = module.get(CACHE_MANAGER);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('processWebhook', () => {
        it('should approve transaction when all validations pass', async () => {
            const dto = {
                cardNumber: '1234-5678-9012-3456',
                amount: 150.5,
                timestamp: '2026-02-01T14:12:00Z',
                stationInfo: { name: 'Shell Station' },
            };

            jest.spyOn(cardsService, 'findByCardNumber').mockResolvedValue(
                mockCard as any,
            );
            jest.spyOn(cardsService, 'resetLimitsIfNeeded').mockResolvedValue(
                mockCard as any,
            );
            jest.spyOn(transactionRepository, 'create').mockReturnValue(
                mockTransaction as any,
            );
            mockQueryRunner.manager.save.mockResolvedValue({
                ...mockTransaction,
                status: TransactionStatus.APPROVED,
            });

            const result = await service.processWebhook(dto);

            expect(result.status).toBe(TransactionStatus.APPROVED);
            expect(result.amount).toBe(150.5);
            expect(result.message).toBe('Transaction approved successfully');
            expect(cardsService.updateUsage).toHaveBeenCalledWith(
                'card-uuid',
                150.5,
                150.5,
            );
            expect(organizationsService.deductBalance).toHaveBeenCalledWith(
                'org-uuid',
                150.5,
            );
            expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'transaction.approved',
                expect.anything(),
            );
        });

        it('should reject transaction when daily limit exceeded', async () => {
            const dto = {
                cardNumber: '1234-5678-9012-3456',
                amount: 400,
                timestamp: '2026-02-01T14:12:00Z',
            };

            const cardWithUsage = {
                ...mockCard,
                dailyUsage: 200,
            };

            jest.spyOn(cardsService, 'findByCardNumber').mockResolvedValue(
                cardWithUsage as any,
            );
            jest.spyOn(cardsService, 'resetLimitsIfNeeded').mockResolvedValue(
                cardWithUsage as any,
            );
            jest.spyOn(transactionRepository, 'create').mockReturnValue(
                mockTransaction as any,
            );
            mockQueryRunner.manager.save.mockResolvedValue(mockTransaction);
            jest.spyOn(transactionRepository, 'findOne').mockResolvedValue({
                ...mockTransaction,
                status: TransactionStatus.REJECTED,
            } as any);

            await expect(service.processWebhook(dto)).rejects.toThrow(
                DailyLimitExceededException,
            );
            expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
        });

        it('should reject transaction when monthly limit exceeded', async () => {
            const dto = {
                cardNumber: '1234-5678-9012-3456',
                amount: 2000,
                timestamp: '2026-02-01T14:12:00Z',
            };

            const cardWithUsage = {
                ...mockCard,
                dailyLimit: 3000,
                monthlyLimit: 10000,
                dailyUsage: 0,
                monthlyUsage: 8500,
            };

            jest.spyOn(cardsService, 'findByCardNumber').mockResolvedValue(
                cardWithUsage as any,
            );
            jest.spyOn(cardsService, 'resetLimitsIfNeeded').mockResolvedValue(
                cardWithUsage as any,
            );
            jest.spyOn(transactionRepository, 'create').mockReturnValue(
                mockTransaction as any,
            );
            mockQueryRunner.manager.save.mockResolvedValue(mockTransaction);
            jest.spyOn(transactionRepository, 'findOne').mockResolvedValue({
                ...mockTransaction,
                status: TransactionStatus.REJECTED,
            } as any);

            await expect(service.processWebhook(dto)).rejects.toThrow(
                MonthlyLimitExceededException,
            );
            expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
        });

        it('should reject transaction when insufficient balance', async () => {
            const dto = {
                cardNumber: '1234-5678-9012-3456',
                amount: 15000,
                timestamp: '2026-02-01T14:12:00Z',
            };

            jest.spyOn(cardsService, 'findByCardNumber').mockResolvedValue(
                mockCard as any,
            );
            jest.spyOn(cardsService, 'resetLimitsIfNeeded').mockResolvedValue(
                mockCard as any,
            );
            jest.spyOn(transactionRepository, 'create').mockReturnValue(
                mockTransaction as any,
            );
            mockQueryRunner.manager.save.mockResolvedValue(mockTransaction);
            jest.spyOn(transactionRepository, 'findOne').mockResolvedValue({
                ...mockTransaction,
                status: TransactionStatus.REJECTED,
            } as any);

            await expect(service.processWebhook(dto)).rejects.toThrow(
                InsufficientBalanceException,
            );
            expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
        });

        it('should emit transaction.rejected event on failure', async () => {
            const dto = {
                cardNumber: '1234-5678-9012-3456',
                amount: 15000,
                timestamp: '2026-02-01T14:12:00Z',
            };

            jest.spyOn(cardsService, 'findByCardNumber').mockResolvedValue(
                mockCard as any,
            );
            jest.spyOn(cardsService, 'resetLimitsIfNeeded').mockResolvedValue(
                mockCard as any,
            );
            jest.spyOn(transactionRepository, 'create').mockReturnValue(
                mockTransaction as any,
            );
            mockQueryRunner.manager.save.mockResolvedValue(mockTransaction);
            jest.spyOn(transactionRepository, 'findOne').mockResolvedValue({
                ...mockTransaction,
                status: TransactionStatus.REJECTED,
            } as any);
            jest.spyOn(transactionRepository, 'save').mockResolvedValue({
                ...mockTransaction,
                status: TransactionStatus.REJECTED,
            } as any);

            try {
                await service.processWebhook(dto);
            } catch {
                expect(eventEmitter.emit).toHaveBeenCalledWith(
                    'transaction.rejected',
                    expect.anything(),
                );
            }
        });

        it('should invalidate cache after successful transaction', async () => {
            const dto = {
                cardNumber: '1234-5678-9012-3456',
                amount: 150.5,
                timestamp: '2026-02-01T14:12:00Z',
            };

            jest.spyOn(cardsService, 'findByCardNumber').mockResolvedValue(
                mockCard as any,
            );
            jest.spyOn(cardsService, 'resetLimitsIfNeeded').mockResolvedValue(
                mockCard as any,
            );
            jest.spyOn(transactionRepository, 'create').mockReturnValue(
                mockTransaction as any,
            );
            mockQueryRunner.manager.save.mockResolvedValue({
                ...mockTransaction,
                status: TransactionStatus.APPROVED,
            });

            await service.processWebhook(dto);

            expect(cacheManager.del).toHaveBeenCalledWith(
                `org_balance_${mockCard.organization.id}`,
            );
            expect(cacheManager.del).toHaveBeenCalledWith(
                `card_limits_${mockCard.id}`,
            );
        });
    });
});
