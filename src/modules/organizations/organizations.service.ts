import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { Card } from '../cards/entities/card.entity';
import { OrganizationNotFoundException } from '../../common/exceptions/organization-not-found.exception';

@Injectable()
export class OrganizationsService {
    constructor(
        @InjectRepository(Organization)
        private readonly organizationRepository: Repository<Organization>,
    ) {}

    async findAll(): Promise<Organization[]> {
        return this.organizationRepository.find({
            relations: ['cards'],
            order: { createdAt: 'DESC' },
        });
    }

    async findById(id: string): Promise<Organization> {
        const organization = await this.organizationRepository.findOne({
            where: { id },
            relations: ['cards'],
        });

        if (!organization) {
            throw new OrganizationNotFoundException(id);
        }

        return organization;
    }

    async getOrganizationCards(id: string): Promise<Card[]> {
        const organization = await this.findById(id);
        return organization.cards || [];
    }

    async updateBalance(id: string, newBalance: number): Promise<Organization> {
        const organization = await this.findById(id);
        organization.balance = newBalance;
        return this.organizationRepository.save(organization);
    }

    async deductBalance(id: string, amount: number): Promise<Organization> {
        const organization = await this.findById(id);
        const newBalance = Number(organization.balance) - amount;
        return this.updateBalance(id, newBalance);
    }
}
