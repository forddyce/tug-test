import { DataSource } from 'typeorm';
import { Card } from '../../src/modules/cards/entities/card.entity';

export class CardFactory {
    constructor(private readonly dataSource: DataSource) {}

    async create(overrides: Partial<Card> = {}): Promise<Card> {
        const repo = this.dataSource.getRepository(Card);
        const card = repo.create({
            cardNumber: `CARD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            dailyLimit: 500.0,
            monthlyLimit: 10000.0,
            dailyUsage: 0,
            monthlyUsage: 0,
            lastResetDate: new Date(),
            ...overrides,
        });
        return repo.save(card);
    }

    async createMany(
        count: number,
        overrides: Partial<Card> = {},
    ): Promise<Card[]> {
        const cards: Card[] = [];
        for (let i = 0; i < count; i++) {
            cards.push(await this.create(overrides));
        }
        return cards;
    }
}
