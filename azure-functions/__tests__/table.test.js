/**
 * Table module tests
 * @jest-environment node
 */

// Mock Azure Data Tables before requiring the module
const mockGetEntity = jest.fn();
const mockUpsertEntity = jest.fn();
const mockCreateTable = jest.fn();
const mockListEntities = jest.fn();

jest.mock('@azure/data-tables', () => ({
    TableClient: {
        fromConnectionString: jest.fn().mockReturnValue({
            getEntity: mockGetEntity,
            upsertEntity: mockUpsertEntity,
            createTable: mockCreateTable,
            listEntities: mockListEntities
        })
    },
    AzureNamedKeyCredential: jest.fn()
}));

describe('Table Module', () => {
    let tableModule;
    let originalEnv;

    beforeAll(() => {
        originalEnv = { ...process.env };
        process.env.AZURE_STORAGE_CONNECTION_STRING = 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=testkey;EndpointSuffix=core.windows.net';
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockCreateTable.mockResolvedValue({});
        jest.resetModules();
        tableModule = require('../lib/table');
    });

    describe('upsertSubscription', () => {
        it('should normalize email to lowercase', async () => {
            mockUpsertEntity.mockResolvedValue({});

            await tableModule.upsertSubscription('Test@Example.COM', {
                status: 'active',
                plan: 'premium'
            });

            expect(mockUpsertEntity).toHaveBeenCalledWith(
                expect.objectContaining({
                    partitionKey: 'Subscription',
                    email: 'test@example.com'
                }),
                'Merge'
            );
        });

        it('should handle null email gracefully', async () => {
            mockUpsertEntity.mockResolvedValue({});

            await tableModule.upsertSubscription(null, { status: 'active' });

            expect(mockUpsertEntity).toHaveBeenCalledWith(
                expect.objectContaining({
                    email: ''
                }),
                'Merge'
            );
        });
    });

    describe('getSubscription', () => {
        it('should return subscription for existing email', async () => {
            const mockSubscription = {
                partitionKey: 'Subscription',
                rowKey: 'dGVzdEBleGFtcGxlLmNvbQ==',
                email: 'test@example.com',
                status: 'active'
            };
            mockGetEntity.mockResolvedValue(mockSubscription);

            const result = await tableModule.getSubscription('test@example.com');

            expect(result).toEqual(mockSubscription);
        });

        it('should return null for non-existent subscription', async () => {
            const notFoundError = new Error('Not found');
            notFoundError.statusCode = 404;
            mockGetEntity.mockRejectedValue(notFoundError);

            const result = await tableModule.getSubscription('nonexistent@example.com');

            expect(result).toBeNull();
        });

        it('should normalize email for lookup', async () => {
            const notFoundError = new Error('Not found');
            notFoundError.statusCode = 404;
            mockGetEntity.mockRejectedValue(notFoundError);

            await tableModule.getSubscription('Test@EXAMPLE.com');

            // First call should be with normalized email
            expect(mockGetEntity).toHaveBeenCalledWith(
                'Subscription',
                expect.any(String)
            );
        });

        it('should throw non-404 errors', async () => {
            const serverError = new Error('Server error');
            serverError.statusCode = 500;
            mockGetEntity.mockRejectedValue(serverError);

            await expect(tableModule.getSubscription('test@example.com'))
                .rejects.toThrow('Server error');
        });
    });

    describe('upsertUser', () => {
        it('should add updatedAt timestamp', async () => {
            mockUpsertEntity.mockResolvedValue({});
            const beforeTime = new Date().toISOString();

            await tableModule.upsertUser('test@example.com', { name: 'Test User' });

            expect(mockUpsertEntity).toHaveBeenCalledWith(
                expect.objectContaining({
                    partitionKey: 'User',
                    email: 'test@example.com',
                    name: 'Test User',
                    updatedAt: expect.any(String)
                }),
                'Merge'
            );

            const call = mockUpsertEntity.mock.calls[0][0];
            expect(new Date(call.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
        });
    });

    describe('getUser', () => {
        it('should return user for existing email', async () => {
            const mockUser = {
                partitionKey: 'User',
                email: 'test@example.com',
                name: 'Test User'
            };
            mockGetEntity.mockResolvedValue(mockUser);

            const result = await tableModule.getUser('test@example.com');

            expect(result).toEqual(mockUser);
        });

        it('should return null for non-existent user', async () => {
            const notFoundError = new Error('Not found');
            notFoundError.statusCode = 404;
            mockGetEntity.mockRejectedValue(notFoundError);

            const result = await tableModule.getUser('nonexistent@example.com');

            expect(result).toBeNull();
        });
    });

    describe('checkRateLimit', () => {
        it('should allow first request in window', async () => {
            const notFoundError = new Error('Not found');
            notFoundError.statusCode = 404;
            mockGetEntity.mockRejectedValue(notFoundError);
            mockUpsertEntity.mockResolvedValue({});

            const result = await tableModule.checkRateLimit('192.168.1.1', 'ip', 5, 60);

            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(4);
        });

        it('should deny request when limit exceeded', async () => {
            const now = Date.now();
            const mockRateLimitEntity = {
                partitionKey: 'RateLimit',
                rowKey: 'ip_test',
                count: 5,
                windowStart: new Date(now - 30000).toISOString() // 30 seconds ago
            };
            mockGetEntity.mockResolvedValue(mockRateLimitEntity);

            const result = await tableModule.checkRateLimit('test-key', 'ip', 5, 60);

            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);
        });

        it('should reset counter when window expires', async () => {
            const expiredTime = Date.now() - 120000; // 2 minutes ago
            const mockRateLimitEntity = {
                partitionKey: 'RateLimit',
                rowKey: 'ip_test',
                count: 5,
                windowStart: new Date(expiredTime).toISOString()
            };
            mockGetEntity.mockResolvedValue(mockRateLimitEntity);
            mockUpsertEntity.mockResolvedValue({});

            const result = await tableModule.checkRateLimit('test-key', 'ip', 5, 60);

            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(4);
        });

        it('should fail open on error', async () => {
            mockGetEntity.mockRejectedValue(new Error('Database error'));

            const result = await tableModule.checkRateLimit('test-key', 'ip', 5, 60);

            expect(result.allowed).toBe(true);
            expect(result.error).toBe('Rate limit check failed');
        });
    });

    describe('upsertReceipt', () => {
        it('should require receiptNumber', async () => {
            await expect(tableModule.upsertReceipt({ amount: 100 }))
                .rejects.toThrow('Receipt number is required for RowKey');
        });

        it('should add createdAt timestamp', async () => {
            mockUpsertEntity.mockResolvedValue({});

            await tableModule.upsertReceipt({
                receiptNumber: 'RCP-001',
                amount: 4980,
                email: 'test@example.com'
            });

            expect(mockUpsertEntity).toHaveBeenCalledWith(
                expect.objectContaining({
                    partitionKey: 'Receipt',
                    rowKey: 'RCP-001',
                    receiptNumber: 'RCP-001',
                    amount: 4980,
                    createdAt: expect.any(String)
                }),
                'Merge'
            );
        });
    });
});
