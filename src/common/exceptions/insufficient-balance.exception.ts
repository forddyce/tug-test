import { HttpException, HttpStatus } from '@nestjs/common';

export class InsufficientBalanceException extends HttpException {
    constructor(required: number, available: number) {
        super(
            {
                statusCode: HttpStatus.PAYMENT_REQUIRED,
                error: 'Insufficient Balance',
                message: `Insufficient balance. Required: ${required}, Available: ${available}`,
            },
            HttpStatus.PAYMENT_REQUIRED,
        );
    }
}
