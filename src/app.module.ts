import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WinstonModule } from 'nest-winston';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { typeOrmConfig } from './config/typeorm.config';
import { cacheConfig } from './config/cache.config';
import { winstonConfig } from './config/logger.config';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { CardsModule } from './modules/cards/cards.module';
import { HealthModule } from './health/health.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        WinstonModule.forRoot(winstonConfig),
        ThrottlerModule.forRoot([
            {
                name: 'short',
                ttl: 1000,
                limit: 3,
            },
            {
                name: 'medium',
                ttl: 10000,
                limit: 20,
            },
            {
                name: 'long',
                ttl: 60000,
                limit: 100,
            },
        ]),
        TypeOrmModule.forRoot(typeOrmConfig),
        CacheModule.registerAsync({
            isGlobal: true,
            useFactory: async () => cacheConfig,
        }),
        EventEmitterModule.forRoot(),
        TransactionsModule,
        OrganizationsModule,
        CardsModule,
        HealthModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
