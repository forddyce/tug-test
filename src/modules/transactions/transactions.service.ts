import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { CardsService } from '../cards/cards.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { InsufficientBalanceException } from '../../common/exceptions/insufficient-balance.exception';
import { DailyLimitExceededException } from '../../common/exceptions/daily-limit-exceeded.exception';
import { MonthlyLimitExceededException } from '../../common/exceptions/monthly-limit-exceeded.exception';
import { TransactionApprovedEvent } from '../../common/events/transaction-approved.event';
import { TransactionRejectedEvent } from '../../common/events/transaction-rejected.event';
import { BalanceUpdatedEvent } from '../../common/events/balance-updated.event';

@Injectable()
export class TransactionsService {
    private readonly logger = new Logger(TransactionsService.name);

    constructor(
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>,
        @InjectRepository(IdempotencyKey)
        private readonly idempotencyRepository: Repository<IdempotencyKey>,
        private readonly cardsService: CardsService,
        private readonly organizationsService: OrganizationsService,
        private readonly dataSource: DataSource,
        private readonly eventEmitter: EventEmitter2,
        @Inject(CACHE_MANAGER)
        private readonly cacheManager: Cache,
    ) {}

    async processWebhook(
        dto: CreateTransactionDto,
    ): Promise<TransactionResponseDto> {
        if (dto.idempotencyKey) {
            const existingKey = await this.checkIdempotencyKey(
                dto.idempotencyKey,
            );
            if (existingKey) {
                this.logger.log(
                    `Idempotency key ${dto.idempotencyKey} already processed, returning cached response`,
                );
                return existingKey.response as TransactionResponseDto;
            }
        }

        this.logger.log(
            `Processing webhook for card ${dto.cardNumber}, amount: ${dto.amount}`,
        );

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            let card = await this.cardsService.findByCardNumber(dto.cardNumber);
            card = await this.cardsService.resetLimitsIfNeeded(card);

            const organization = card.organization;

            this.logger.debug(
                `Card found: ${card.id}, Org: ${organization.name}, Balance: ${organization.balance}`,
            );

            const transaction = this.transactionRepository.create({
                cardId: card.id,
                amount: dto.amount,
                timestamp: new Date(dto.timestamp),
                stationInfo: dto.stationInfo,
                status: TransactionStatus.PENDING,
            });

            const savedTransaction =
                await queryRunner.manager.save(transaction);

            await this.validateTransaction(
                dto.amount,
                organization.balance,
                card.dailyUsage,
                card.dailyLimit,
                card.monthlyUsage,
                card.monthlyLimit,
            );

            await this.organizationsService.deductBalance(
                organization.id,
                dto.amount,
            );

            await this.cardsService.updateUsage(
                card.id,
                Number(card.dailyUsage) + dto.amount,
                Number(card.monthlyUsage) + dto.amount,
            );

            savedTransaction.status = TransactionStatus.APPROVED;
            await queryRunner.manager.save(savedTransaction);

            await queryRunner.commitTransaction();

            this.logger.log(
                `Transaction ${savedTransaction.id} APPROVED for card ${dto.cardNumber}, amount: ${dto.amount}`,
            );

            await this.cacheManager.del(`org_balance_${organization.id}`);
            await this.cacheManager.del(`card_limits_${card.id}`);

            this.eventEmitter.emit(
                'transaction.approved',
                new TransactionApprovedEvent(
                    savedTransaction.id,
                    dto.cardNumber,
                    dto.amount,
                    organization.id,
                ),
            );

            this.eventEmitter.emit(
                'balance.updated',
                new BalanceUpdatedEvent(
                    organization.id,
                    Number(organization.balance),
                    Number(organization.balance) - dto.amount,
                    dto.amount,
                ),
            );

            const response: TransactionResponseDto = {
                id: savedTransaction.id,
                status: TransactionStatus.APPROVED,
                amount: dto.amount,
                timestamp: savedTransaction.timestamp,
                message: 'Transaction approved successfully',
            };

            if (dto.idempotencyKey) {
                await this.storeIdempotencyKey(
                    dto.idempotencyKey,
                    savedTransaction.id,
                    response,
                    'completed',
                );
            }

            return response;
        } catch (error) {
            await queryRunner.rollbackTransaction();

            this.logger.warn(
                `Transaction REJECTED for card ${dto.cardNumber}: ${error.message}`,
            );

            const transaction = await this.transactionRepository.findOne({
                where: {
                    cardId: (
                        await this.cardsService.findByCardNumber(dto.cardNumber)
                    ).id,
                },
                order: { createdAt: 'DESC' },
            });

            if (transaction) {
                transaction.status = TransactionStatus.REJECTED;
                transaction.rejectionReason = error.message;
                await this.transactionRepository.save(transaction);

                this.eventEmitter.emit(
                    'transaction.rejected',
                    new TransactionRejectedEvent(
                        transaction.id,
                        dto.cardNumber,
                        dto.amount,
                        error.message,
                    ),
                );
            }

            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    private async checkIdempotencyKey(
        key: string,
    ): Promise<IdempotencyKey | null> {
        const idempotencyKey = await this.idempotencyRepository.findOne({
            where: { key },
        });

        if (!idempotencyKey) {
            return null;
        }

        if (idempotencyKey.expiresAt < new Date()) {
            await this.idempotencyRepository.remove(idempotencyKey);
            return null;
        }

        return idempotencyKey;
    }

    private async storeIdempotencyKey(
        key: string,
        transactionId: string,
        response: TransactionResponseDto,
        status: string,
    ): Promise<void> {
        try {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);

            const idempotencyKey = this.idempotencyRepository.create({
                key,
                transactionId,
                response,
                status,
                expiresAt,
            });

            await this.idempotencyRepository.save(idempotencyKey);
        } catch (error) {
            if (error.code !== '23505') {
                throw error;
            }
        }
    }

    private async validateTransaction(
        amount: number,
        balance: number,
        dailyUsage: number,
        dailyLimit: number,
        monthlyUsage: number,
        monthlyLimit: number,
    ): Promise<void> {
        if (Number(balance) < amount) {
            throw new InsufficientBalanceException(amount, Number(balance));
        }

        if (Number(dailyUsage) + amount > Number(dailyLimit)) {
            throw new DailyLimitExceededException(
                amount,
                Number(dailyLimit),
                Number(dailyUsage),
            );
        }

        if (Number(monthlyUsage) + amount > Number(monthlyLimit)) {
            throw new MonthlyLimitExceededException(
                amount,
                Number(monthlyLimit),
                Number(monthlyUsage),
            );
        }
    }
}
