import { HttpException, HttpStatus } from '@nestjs/common';

export class CardNotFoundException extends HttpException {
    constructor(cardNumber: string) {
        super(
            {
                statusCode: HttpStatus.NOT_FOUND,
                error: 'Card Not Found',
                message: `Card with number ${cardNumber} not found`,
            },
            HttpStatus.NOT_FOUND,
        );
    }
}
