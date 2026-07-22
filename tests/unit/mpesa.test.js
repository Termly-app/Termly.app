import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initiateStkPush, checkTransactionStatus } from '../../src/utils/mpesa';
import { supabase } from '../../src/lib/supabase';

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('M-PESA Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sanitizes phone number and invokes edge function for push', async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: { success: true, MerchantRequestID: '123' },
      error: null,
    });

    const result = await initiateStkPush({
      phoneNumber: '0712345678',
      amount: 100,
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('mpesa-stk-push', {
      body: {
        action: 'push',
        payload: {
          phoneNumber: '254712345678',
          amount: 100,
          accountRef: undefined,
          description: undefined,
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it('handles invalid phone numbers', async () => {
    await expect(initiateStkPush({ phoneNumber: '123', amount: 100 })).rejects.toThrow('Invalid M-Pesa phone number');
  });

  it('checks transaction status', async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: { status: 'Success' },
      error: null,
    });

    const result = await checkTransactionStatus('req-123');

    expect(supabase.functions.invoke).toHaveBeenCalledWith('mpesa-stk-push', {
      body: {
        action: 'status',
        payload: { checkoutRequestId: 'req-123' },
      },
    });
    expect(result.status).toBe('Success');
  });
});
