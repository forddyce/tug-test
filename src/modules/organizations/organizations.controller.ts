import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { CardResponseDto } from '../cards/dto/card-response.dto';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
    constructor(private readonly organizationsService: OrganizationsService) {}

    @Get()
    @ApiOperation({
        summary: 'Get all organizations',
        description: 'Retrieve a list of all organizations with their balances',
    })
    @ApiResponse({
        status: 200,
        description: 'List of organizations retrieved successfully',
        type: [OrganizationResponseDto],
    })
    async findAll(): Promise<OrganizationResponseDto[]> {
        const organizations = await this.organizationsService.findAll();
        return organizations.map((org) => ({
            id: org.id,
            name: org.name,
            balance: Number(org.balance),
            cardCount: org.cards?.length,
            createdAt: org.createdAt,
            updatedAt: org.updatedAt,
        }));
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get organization by ID',
        description:
            'Retrieve detailed information about a specific organization',
    })
    @ApiResponse({
        status: 200,
        description: 'Organization details retrieved successfully',
        type: OrganizationResponseDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Organization not found',
    })
    async findOne(@Param('id') id: string): Promise<OrganizationResponseDto> {
        const org = await this.organizationsService.findById(id);
        return {
            id: org.id,
            name: org.name,
            balance: Number(org.balance),
            cardCount: org.cards?.length,
            createdAt: org.createdAt,
            updatedAt: org.updatedAt,
        };
    }

    @Get(':id/cards')
    @ApiOperation({
        summary: 'Get all cards for an organization',
        description:
            'Retrieve all cards associated with a specific organization',
    })
    @ApiResponse({
        status: 200,
        description: 'Organization cards retrieved successfully',
        type: [CardResponseDto],
    })
    @ApiResponse({
        status: 404,
        description: 'Organization not found',
    })
    async getOrganizationCards(
        @Param('id') id: string,
    ): Promise<CardResponseDto[]> {
        const cards = await this.organizationsService.getOrganizationCards(id);
        return cards.map((card) => {
            const dailyLimit = Number(card.dailyLimit);
            const monthlyLimit = Number(card.monthlyLimit);
            const dailyUsage = Number(card.dailyUsage);
            const monthlyUsage = Number(card.monthlyUsage);

            return {
                id: card.id,
                cardNumber: card.cardNumber,
                organizationId: card.organizationId,
                organizationName: card.organization?.name,
                dailyLimit,
                monthlyLimit,
                dailyUsage,
                monthlyUsage,
                dailyRemaining: dailyLimit - dailyUsage,
                monthlyRemaining: monthlyLimit - monthlyUsage,
                lastResetDate: card.lastResetDate,
                createdAt: card.createdAt,
                updatedAt: card.updatedAt,
            };
        });
    }
}
