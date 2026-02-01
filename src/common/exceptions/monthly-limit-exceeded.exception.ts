import { HttpException, HttpStatus } from '@nestjs/common';

export class MonthlyLimitExceededException extends HttpException {
    constructor(attempted: number, limit: number, used: number) {
        super(
            {
                statusCode: HttpStatus.FORBIDDEN,
                error: 'Monthly Limit Exceeded',
                message: `Monthly limit exceeded. Attempted: ${attempted}, Limit: ${limit}, Already used: ${used}`,
            },
            HttpStatus.FORBIDDEN,
        );
    }
}
