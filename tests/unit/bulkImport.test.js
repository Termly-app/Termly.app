import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bulkImportStudents } from '../../src/data/store';

// Mock dependencies
vi.mock('../../src/data/store', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    _currentSchoolId: 'test-school-123',
    getSchoolProfile: vi.fn(),
    mutationGuard: vi.fn(),
  };
});

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

import { getSchoolProfile } from '../../src/data/store';
import { supabase } from '../../src/lib/supabase';

describe('Data Ingestion: bulkImportStudents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should deduplicate incoming rows by admission number', async () => {
    getSchoolProfile.mockResolvedValue({ id: 'test-school-123', name: 'Test School' });

    // Mock existing streams
    supabase.from.mockImplementation((table) => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis()
      };
      
      if (table === 'class_streams') {
        chain.eq = vi.fn().mockImplementation((col, val) => {
          if (col === 'is_active' && val === true) return Promise.resolve({ data: [{ id: 'stream-1', level: 'Grade 1', name: 'Grade 1 North' }] });
          return chain;
        });
      } else if (table === 'students') {
        chain.eq = vi.fn().mockImplementation((col, val) => {
           // Simulate no existing students in DB
           return Promise.resolve({ data: [] });
        });
        chain.insert = vi.fn().mockResolvedValue({ error: null });
      }
      return chain;
    });

    // Provide rows with duplicate adm_no
    const incomingRows = [
      { name: 'John Doe', adm_no: 'ADM001', gender: 'Male', class: 'Grade 1', stream: 'Grade 1 North' },
      { name: 'John Duplicate', adm_no: 'ADM001', gender: 'Male', class: 'Grade 1', stream: 'Grade 1 North' }, // Should be skipped
      { name: 'Jane Doe', adm_no: 'ADM002', gender: 'Female', class: 'Grade 1', stream: 'Grade 1 North' },
    ];

    const progressCallback = vi.fn();
    const result = await bulkImportStudents(incomingRows, progressCallback);

    // Should only insert 2 records
    expect(result.inserted).toBe(2);
    expect(result.errors.length).toBe(1); // One duplicate error
    expect(result.errors[0].reason).toContain('Duplicate admission number');
  });
});
