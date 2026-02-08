import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CardsService } from './cards.service';
import { CardResponseDto } from './dto/card-response.dto';

@ApiTags('cards')
@Controller('cards')
export class CardsController {
    constructor(private readonly cardsService: CardsService) {}

    @Get()
    @ApiOperation({
        summary: 'Get all cards',
        description:
            'Retrieve a list of all cards with their current usage and limits',
    })
    @ApiQuery({
        name: 'organizationId',
        required: false,
        description: 'Filter cards by organization ID',
    })
    @ApiResponse({
        status: 200,
        description: 'List of cards retrieved successfully',
        type: [CardResponseDto],
    })
    async findAll(
        @Query('organizationId') organizationId?: string,
    ): Promise<CardResponseDto[]> {
        const cards = await this.cardsService.findAll(organizationId);
        return cards.map((card) => this.mapToResponseDto(card));
    }

    @Get(':cardNumber')
    @ApiOperation({
        summary: 'Get card by card number',
        description: 'Retrieve detailed information about a specific card',
    })
    @ApiResponse({
        status: 200,
        description: 'Card details retrieved successfully',
        type: CardResponseDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Card not found',
    })
    async findOne(
        @Param('cardNumber') cardNumber: string,
    ): Promise<CardResponseDto> {
        const card = await this.cardsService.findByCardNumber(cardNumber);
        return this.mapToResponseDto(card);
    }

    private mapToResponseDto(card: any): CardResponseDto {
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
    }
}
