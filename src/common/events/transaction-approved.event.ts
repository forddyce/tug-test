export class TransactionApprovedEvent {
    constructor(
        public readonly transactionId: string,
        public readonly cardNumber: string,
        public readonly amount: number,
        public readonly organizationId: string,
    ) {}
}
