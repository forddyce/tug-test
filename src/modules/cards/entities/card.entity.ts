import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';

@Entity('cards')
export class Card {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 50, unique: true, name: 'card_number' })
    cardNumber: string;

    @Column({ type: 'uuid', name: 'organization_id' })
    organizationId: string;

    @ManyToOne(() => Organization, (organization) => organization.cards)
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ type: 'decimal', precision: 10, scale: 2, name: 'daily_limit' })
    dailyLimit: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, name: 'monthly_limit' })
    monthlyLimit: number;

    @Column({
        type: 'decimal',
        precision: 10,
        scale: 2,
        default: 0,
        name: 'daily_usage',
    })
    dailyUsage: number;

    @Column({
        type: 'decimal',
        precision: 10,
        scale: 2,
        default: 0,
        name: 'monthly_usage',
    })
    monthlyUsage: number;

    @Column({ type: 'date', name: 'last_reset_date' })
    lastResetDate: Date;

    @OneToMany(() => Transaction, (transaction) => transaction.card)
    transactions: Transaction[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
