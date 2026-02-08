import { ApiProperty } from '@nestjs/swagger';

export class CardResponseDto {
    @ApiProperty({
        description: 'Card unique identifier',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    id: string;

    @ApiProperty({
        description: 'Card number',
        example: 'CARD-001',
    })
    cardNumber: string;

    @ApiProperty({
        description: 'Organization ID',
        example: '123e4567-e89b-12d3-a456-426614174001',
    })
    organizationId: string;

    @ApiProperty({
        description: 'Organization name',
        example: 'Acme Corporation',
        required: false,
    })
    organizationName?: string;

    @ApiProperty({
        description: 'Daily spending limit',
        example: 500.0,
    })
    dailyLimit: number;

    @ApiProperty({
        description: 'Monthly spending limit',
        example: 5000.0,
    })
    monthlyLimit: number;

    @ApiProperty({
        description: 'Current daily usage',
        example: 150.5,
    })
    dailyUsage: number;

    @ApiProperty({
        description: 'Current monthly usage',
        example: 1250.75,
    })
    monthlyUsage: number;

    @ApiProperty({
        description: 'Daily remaining balance',
        example: 349.5,
    })
    dailyRemaining: number;

    @ApiProperty({
        description: 'Monthly remaining balance',
        example: 3749.25,
    })
    monthlyRemaining: number;

    @ApiProperty({
        description: 'Last reset date',
        example: '2026-02-08T00:00:00Z',
    })
    lastResetDate: Date;

    @ApiProperty({
        description: 'Card creation date',
        example: '2026-01-01T10:00:00Z',
    })
    createdAt: Date;

    @ApiProperty({
        description: 'Card last update date',
        example: '2026-02-08T10:30:00Z',
    })
    updatedAt: Date;
}
