import { HttpException, HttpStatus } from '@nestjs/common';

export class OrganizationNotFoundException extends HttpException {
    constructor(organizationId: string) {
        super(
            {
                statusCode: HttpStatus.NOT_FOUND,
                error: 'Organization Not Found',
                message: `Organization with ID ${organizationId} not found`,
            },
            HttpStatus.NOT_FOUND,
        );
    }
}
