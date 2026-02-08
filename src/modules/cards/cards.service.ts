import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Card } from './entities/card.entity';
import { CardNotFoundException } from '../../common/exceptions/card-not-found.exception';

@Injectable()
export class CardsService {
    constructor(
        @InjectRepository(Card)
        private readonly cardRepository: Repository<Card>,
    ) {}

    async findAll(organizationId?: string): Promise<Card[]> {
        const whereCondition = organizationId ? { organizationId } : {};
        return this.cardRepository.find({
            where: whereCondition,
            relations: ['organization'],
            order: { createdAt: 'DESC' },
        });
    }

    async findByCardNumber(cardNumber: string): Promise<Card> {
        const card = await this.cardRepository.findOne({
            where: { cardNumber },
            relations: ['organization'],
        });

        if (!card) {
            throw new CardNotFoundException(cardNumber);
        }

        return card;
    }

    async updateUsage(
        cardId: string,
        dailyUsage: number,
        monthlyUsage: number,
    ): Promise<Card> {
        const card = await this.cardRepository.findOne({
            where: { id: cardId },
        });

        if (!card) {
            throw new CardNotFoundException(cardId);
        }

        card.dailyUsage = dailyUsage;
        card.monthlyUsage = monthlyUsage;
        card.lastResetDate = new Date();

        return this.cardRepository.save(card);
    }

    async resetLimitsIfNeeded(card: Card): Promise<Card> {
        const now = new Date();
        const lastReset = new Date(card.lastResetDate);

        const needsDailyReset = now.getDate() !== lastReset.getDate();
        const needsMonthlyReset = now.getMonth() !== lastReset.getMonth();

        if (needsMonthlyReset) {
            card.dailyUsage = 0;
            card.monthlyUsage = 0;
        } else if (needsDailyReset) {
            card.dailyUsage = 0;
        }

        if (needsDailyReset || needsMonthlyReset) {
            card.lastResetDate = now;
            return this.cardRepository.save(card);
        }

        return card;
    }
}
