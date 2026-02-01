import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Card } from '../../cards/entities/card.entity';

export enum TransactionStatus {
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    PENDING = 'PENDING',
}

@Entity('transactions')
export class Transaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', name: 'card_id' })
    cardId: string;

    @ManyToOne(() => Card, (card) => card.transactions)
    @JoinColumn({ name: 'card_id' })
    card: Card;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;

    @Column({
        type: 'enum',
        enum: TransactionStatus,
        default: TransactionStatus.PENDING,
    })
    status: TransactionStatus;

    @Column({ type: 'timestamp' })
    timestamp: Date;

    @Column({ type: 'jsonb', nullable: true, name: 'station_info' })
    stationInfo: Record<string, any>;

    @Column({
        type: 'varchar',
        length: 500,
        nullable: true,
        name: 'rejection_reason',
    })
    rejectionReason: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
