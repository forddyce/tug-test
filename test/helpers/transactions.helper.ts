import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

export class TransactionsTestHelper {
    constructor(private readonly app: INestApplication) {}

    async sendWebhook(payload: {
        cardNumber: string;
        amount: number;
        timestamp?: string;
        stationInfo?: Record<string, any>;
    }) {
        return request(this.app.getHttpServer())
            .post('/transactions/webhook')
            .send({
                timestamp: new Date().toISOString(),
                ...payload,
            });
    }

    expectApproved(response: request.Response) {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id');
        expect(response.body.status).toBe('APPROVED');
        expect(response.body.message).toBe('Transaction approved successfully');
        return response.body;
    }

    expectRejected(
        response: request.Response,
        statusCode: number,
        errorType: string,
    ) {
        expect(response.status).toBe(statusCode);
        expect(response.body.error).toBe(errorType);
        return response.body;
    }

    expectDailyLimitExceeded(response: request.Response) {
        return this.expectRejected(response, 403, 'Daily Limit Exceeded');
    }

    expectMonthlyLimitExceeded(response: request.Response) {
        return this.expectRejected(response, 403, 'Monthly Limit Exceeded');
    }

    expectInsufficientBalance(response: request.Response) {
        return this.expectRejected(response, 402, 'Insufficient Balance');
    }

    expectCardNotFound(response: request.Response) {
        return this.expectRejected(response, 404, 'Card Not Found');
    }

    expectValidationError(response: request.Response) {
        expect(response.status).toBe(400);
        expect(Array.isArray(response.body.message)).toBe(true);
        return response.body;
    }
}
