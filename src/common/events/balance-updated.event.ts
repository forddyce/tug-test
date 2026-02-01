export class BalanceUpdatedEvent {
    constructor(
        public readonly organizationId: string,
        public readonly previousBalance: number,
        public readonly newBalance: number,
        public readonly amount: number,
    ) {}
}
