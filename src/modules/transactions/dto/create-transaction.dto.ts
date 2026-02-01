import {
    IsString,
    IsNumber,
    IsNotEmpty,
    Min,
    IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransactionDto {
    @ApiProperty({
        description: 'Card number for the transaction',
        example: '1234-5678-9012-3456',
    })
    @IsString()
    @IsNotEmpty()
    cardNumber: string;

    @ApiProperty({
        description: 'Transaction amount',
        example: 150.5,
        minimum: 0.01,
    })
    @IsNumber()
    @Min(0.01)
    amount: number;

    @ApiProperty({
        description: 'Transaction timestamp',
        example: '2026-02-01T13:45:00Z',
    })
    @IsString()
    @IsNotEmpty()
    timestamp: string;

    @ApiProperty({
        description: 'Idempotency key for duplicate prevention',
        example: 'station_123_txn_abc_2026-02-01T13:45:00Z',
        required: false,
    })
    @IsOptional()
    @IsString()
    idempotencyKey?: string;

    @IsOptional()
    @ApiProperty({
        description: 'Petrol station information',
        example: { name: 'Shell Station', location: 'Main St' },
        required: false,
    })
    stationInfo?: Record<string, any>;
}
