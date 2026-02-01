import { HttpException, HttpStatus } from '@nestjs/common';

export class DailyLimitExceededException extends HttpException {
    constructor(attempted: number, limit: number, used: number) {
        super(
            {
                statusCode: HttpStatus.FORBIDDEN,
                error: 'Daily Limit Exceeded',
                message: `Daily limit exceeded. Attempted: ${attempted}, Limit: ${limit}, Already used: ${used}`,
            },
            HttpStatus.FORBIDDEN,
        );
    }
}
