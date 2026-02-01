import { DataSource } from 'typeorm';
import { OrganizationFactory } from './organization.factory';
import { CardFactory } from './card.factory';

export class TestFactory {
    public readonly organizations: OrganizationFactory;
    public readonly cards: CardFactory;

    constructor(private readonly dataSource: DataSource) {
        this.organizations = new OrganizationFactory(dataSource);
        this.cards = new CardFactory(dataSource);
    }
}
