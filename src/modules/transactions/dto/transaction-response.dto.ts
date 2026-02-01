import { ApiProperty } from '@nestjs/swagger';
import { TransactionStatus } from '../entities/transaction.entity';

export class TransactionResponseDto {
    @ApiProperty({ description: 'Transaction ID' })
    id: string;

    @ApiProperty({ description: 'Transaction status', enum: TransactionStatus })
    status: TransactionStatus;

    @ApiProperty({ description: 'Transaction amount' })
    amount: number;

    @ApiProperty({ description: 'Transaction timestamp' })
    timestamp: Date;

    @ApiProperty({
        description: 'Rejection reason if rejected',
        required: false,
    })
    rejectionReason?: string;

    @ApiProperty({ description: 'Success message or error details' })
    message: string;
}
