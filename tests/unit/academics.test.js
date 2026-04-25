import { describe, it, expect, vi, beforeEach } from 'vitest';
import { previewClassPromotion } from '../../src/data/academicsStore';

// Mock dependencies
vi.mock('../../src/data/store', () => ({
  _currentSchoolId: 'test-school-123',
  getSchoolProfile: vi.fn(),
  mutationGuard: vi.fn(),
}));

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

import { getSchoolProfile } from '../../src/data/store';
import { supabase } from '../../src/lib/supabase';

describe('Academics Engine: Class Promotion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('previewClassPromotion should correctly calculate grade increments', async () => {
    // Setup standard progression map
    getSchoolProfile.mockResolvedValue({
      platform_settings: {
        grade_progression_map: {
          'Grade 1': 'Grade 2',
          'Grade 2': 'Grade 3',
          'Grade 8': 'Graduated',
          'Form 4': 'Graduated'
        }
      }
    });

    // Mock DB queries
    const mockStreams = [
      { id: 'str1', level: 'Grade 1', name: 'Grade 1 North' },
      { id: 'str2', level: 'Grade 8', name: 'Grade 8 West' }
    ];
    const mockStudents = [
      { id: 's1', stream_id: 'str1', status: 'active', name: 'Student 1' },
      { id: 's2', stream_id: 'str1', status: 'active', name: 'Student 2' },
      { id: 's3', stream_id: 'str2', status: 'active', name: 'Student 3' }
    ];
    const mockAssignments = [];

    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: mockStudents }), // Last chain for students
    });

    // Specifically mock the multiple `supabase.from` chains
    supabase.from.mockImplementation((table) => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
      };
      
      if (table === 'class_streams') {
        chain.eq = vi.fn().mockImplementation((col, val) => {
          if (col === 'is_active' && val === true) return Promise.resolve({ data: mockStreams });
          return chain;
        });
      } else if (table === 'students') {
        chain.in = vi.fn().mockResolvedValue({ data: mockStudents });
      } else if (table === 'teacher_assignments') {
        chain.eq = vi.fn().mockImplementation((col, val) => {
          if (col === 'is_active' && val === true) return Promise.resolve({ data: mockAssignments });
          return chain;
        });
      }
      return chain;
    });

    const preview = await previewClassPromotion('2025', '2026');

    expect(preview.length).toBe(2);

    // Grade 1 -> Grade 2 check
    const g1 = preview.find(p => p.currentLevel === 'Grade 1');
    expect(g1.nextLevel).toBe('Grade 2');
    expect(g1.action).toBe('promote');
    expect(g1.studentsCount).toBe(2);

    // Grade 8 -> Graduated check
    const g8 = preview.find(p => p.currentLevel === 'Grade 8');
    expect(g8.nextLevel).toBe('Graduated');
    expect(g8.action).toBe('graduate');
    expect(g8.studentsCount).toBe(1);
  });
});
