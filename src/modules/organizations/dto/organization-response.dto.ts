import { ApiProperty } from '@nestjs/swagger';

export class OrganizationResponseDto {
    @ApiProperty({
        description: 'Organization unique identifier',
        example: '123e4567-e89b-12d3-a456-426614174001',
    })
    id: string;

    @ApiProperty({
        description: 'Organization name',
        example: 'Acme Corporation',
    })
    name: string;

    @ApiProperty({
        description: 'Current balance',
        example: 15000.5,
    })
    balance: number;

    @ApiProperty({
        description: 'Number of cards',
        example: 5,
        required: false,
    })
    cardCount?: number;

    @ApiProperty({
        description: 'Organization creation date',
        example: '2026-01-01T10:00:00Z',
    })
    createdAt: Date;

    @ApiProperty({
        description: 'Organization last update date',
        example: '2026-02-08T10:30:00Z',
    })
    updatedAt: Date;
}
