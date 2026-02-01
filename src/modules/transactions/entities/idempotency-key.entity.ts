import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    Index,
} from 'typeorm';

@Entity('idempotency_keys')
@Index(['key'], { unique: true })
export class IdempotencyKey {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    key: string;

    @Column({ type: 'uuid', nullable: true })
    transactionId: string;

    @Column({ type: 'jsonb' })
    response: Record<string, any>;

    @Column({ type: 'varchar', length: 20 })
    status: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @Column({ name: 'expires_at', type: 'timestamp' })
    expiresAt: Date;
}
