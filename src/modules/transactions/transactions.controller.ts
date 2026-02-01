import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
    constructor(private readonly transactionsService: TransactionsService) {}

    @Post('webhook')
    @Throttle({ short: { limit: 10, ttl: 1000 } })
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Process fuel transaction from petrol station',
        description:
            'Webhook endpoint to process fuel transactions. Validates organization balance and card limits.',
    })
    @ApiResponse({
        status: 200,
        description: 'Transaction approved',
        type: TransactionResponseDto,
    })
    @ApiResponse({
        status: 402,
        description: 'Insufficient balance',
    })
    @ApiResponse({
        status: 403,
        description: 'Daily or monthly limit exceeded',
    })
    @ApiResponse({
        status: 404,
        description: 'Card not found',
    })
    async processWebhook(
        @Body() createTransactionDto: CreateTransactionDto,
    ): Promise<TransactionResponseDto> {
        return this.transactionsService.processWebhook(createTransactionDto);
    }
}
