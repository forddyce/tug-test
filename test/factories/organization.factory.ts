import { DataSource } from 'typeorm';
import { Organization } from '../../src/modules/organizations/entities/organization.entity';

export class OrganizationFactory {
    constructor(private readonly dataSource: DataSource) {}

    async create(overrides: Partial<Organization> = {}): Promise<Organization> {
        const repo = this.dataSource.getRepository(Organization);
        const organization = repo.create({
            name: `Test Org ${Date.now()}`,
            balance: 10000.0,
            ...overrides,
        });
        return repo.save(organization);
    }

    async createMany(
        count: number,
        overrides: Partial<Organization> = {},
    ): Promise<Organization[]> {
        const organizations: Organization[] = [];
        for (let i = 0; i < count; i++) {
            organizations.push(await this.create(overrides));
        }
        return organizations;
    }
}
