import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrganizationsService } from './organizations.service';
import { Organization } from './entities/organization.entity';
import { OrganizationNotFoundException } from '../../common/exceptions/organization-not-found.exception';

describe('OrganizationsService', () => {
    let service: OrganizationsService;
    let repository: Repository<Organization>;

    const mockOrganization = {
        id: 'org-uuid',
        name: 'Acme Corporation',
        balance: 10000,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrganizationsService,
                {
                    provide: getRepositoryToken(Organization),
                    useValue: {
                        findOne: jest.fn(),
                        save: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<OrganizationsService>(OrganizationsService);
        repository = module.get<Repository<Organization>>(
            getRepositoryToken(Organization),
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('findById', () => {
        it('should return organization when found', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(
                mockOrganization as any,
            );

            const result = await service.findById('org-uuid');

            expect(result).toEqual(mockOrganization);
            expect(repository.findOne).toHaveBeenCalledWith({
                where: { id: 'org-uuid' },
                relations: ['cards'],
            });
        });

        it('should throw OrganizationNotFoundException when not found', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(null);

            await expect(service.findById('invalid-uuid')).rejects.toThrow(
                OrganizationNotFoundException,
            );
        });
    });

    describe('updateBalance', () => {
        it('should update organization balance', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(
                mockOrganization as any,
            );
            jest.spyOn(repository, 'save').mockResolvedValue({
                ...mockOrganization,
                balance: 9000,
            } as any);

            const result = await service.updateBalance('org-uuid', 9000);

            expect(result.balance).toBe(9000);
            expect(repository.save).toHaveBeenCalled();
        });
    });

    describe('deductBalance', () => {
        it('should deduct amount from organization balance', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(
                mockOrganization as any,
            );
            jest.spyOn(repository, 'save').mockResolvedValue({
                ...mockOrganization,
                balance: 9500,
            } as any);

            const result = await service.deductBalance('org-uuid', 500);

            expect(result.balance).toBe(9500);
        });

        it('should handle decimal amounts correctly', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(
                mockOrganization as any,
            );
            jest.spyOn(repository, 'save').mockResolvedValue({
                ...mockOrganization,
                balance: 9849.5,
            } as any);

            const result = await service.deductBalance('org-uuid', 150.5);

            expect(result.balance).toBe(9849.5);
        });
    });
});
