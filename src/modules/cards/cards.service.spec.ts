import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CardsService } from './cards.service';
import { Card } from './entities/card.entity';
import { CardNotFoundException } from '../../common/exceptions/card-not-found.exception';

describe('CardsService', () => {
    let service: CardsService;
    let repository: Repository<Card>;

    const mockCard = {
        id: 'card-uuid',
        cardNumber: '1234-5678-9012-3456',
        organizationId: 'org-uuid',
        dailyLimit: 500,
        monthlyLimit: 10000,
        dailyUsage: 100,
        monthlyUsage: 500,
        lastResetDate: new Date('2026-02-01'),
        organization: {
            id: 'org-uuid',
            name: 'Acme Corporation',
            balance: 10000,
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CardsService,
                {
                    provide: getRepositoryToken(Card),
                    useValue: {
                        findOne: jest.fn(),
                        save: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<CardsService>(CardsService);
        repository = module.get<Repository<Card>>(getRepositoryToken(Card));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('findByCardNumber', () => {
        it('should return card when found', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(
                mockCard as any,
            );

            const result = await service.findByCardNumber(
                '1234-5678-9012-3456',
            );

            expect(result).toEqual(mockCard);
            expect(repository.findOne).toHaveBeenCalledWith({
                where: { cardNumber: '1234-5678-9012-3456' },
                relations: ['organization'],
            });
        });

        it('should throw CardNotFoundException when card not found', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(null);

            await expect(
                service.findByCardNumber('9999-9999-9999-9999'),
            ).rejects.toThrow(CardNotFoundException);
        });
    });

    describe('updateUsage', () => {
        it('should update card usage', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(
                mockCard as any,
            );
            jest.spyOn(repository, 'save').mockResolvedValue({
                ...mockCard,
                dailyUsage: 250,
                monthlyUsage: 750,
            } as any);

            const result = await service.updateUsage('card-uuid', 250, 750);

            expect(result.dailyUsage).toBe(250);
            expect(result.monthlyUsage).toBe(750);
            expect(repository.save).toHaveBeenCalled();
        });

        it('should throw CardNotFoundException when card not found', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(null);

            await expect(
                service.updateUsage('invalid-uuid', 100, 500),
            ).rejects.toThrow(CardNotFoundException);
        });
    });

    describe('resetLimitsIfNeeded', () => {
        it('should reset daily usage when day changes', async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const cardYesterday = {
                ...mockCard,
                lastResetDate: yesterday,
                dailyUsage: 300,
                monthlyUsage: 500,
            };

            jest.spyOn(repository, 'save').mockResolvedValue({
                ...cardYesterday,
                dailyUsage: 0,
            } as any);

            const result = await service.resetLimitsIfNeeded(
                cardYesterday as any,
            );

            expect(result.dailyUsage).toBe(0);
            expect(result.monthlyUsage).toBe(500);
            expect(repository.save).toHaveBeenCalled();
        });

        it('should reset both daily and monthly usage when month changes', async () => {
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);

            const cardLastMonth = {
                ...mockCard,
                lastResetDate: lastMonth,
                dailyUsage: 300,
                monthlyUsage: 5000,
            };

            jest.spyOn(repository, 'save').mockResolvedValue({
                ...cardLastMonth,
                dailyUsage: 0,
                monthlyUsage: 0,
            } as any);

            const result = await service.resetLimitsIfNeeded(
                cardLastMonth as any,
            );

            expect(result.dailyUsage).toBe(0);
            expect(result.monthlyUsage).toBe(0);
            expect(repository.save).toHaveBeenCalled();
        });

        it('should not reset when same day', async () => {
            const today = new Date();
            const cardToday = {
                ...mockCard,
                lastResetDate: today,
            };

            const result = await service.resetLimitsIfNeeded(cardToday as any);

            expect(result).toEqual(cardToday);
            expect(repository.save).not.toHaveBeenCalled();
        });
    });
});
