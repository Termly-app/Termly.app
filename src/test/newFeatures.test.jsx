import { describe, it, expect } from 'vitest';
import { t } from '../utils/i18n';

// Pure unit function helpers
function getCBCCompetency(score) {
  const num = Number(score) || 0;
  if (num >= 80) return { code: 'EE', name: 'Exceeding Expectations', rating: 4 };
  if (num >= 60) return { code: 'ME', name: 'Meeting Expectations', rating: 3 };
  if (num >= 40) return { code: 'AE', name: 'Approaching Expectations', rating: 2 };
  return { code: 'BE', name: 'Below Expectations', rating: 1 };
}

function getGrade(s) {
  const num = Number(s) || 0;
  if (num >= 80) return 'A';
  if (num >= 70) return 'B';
  if (num >= 60) return 'C';
  if (num >= 50) return 'D';
  return 'E';
}

describe('CBC Competency & Report Card Unit Tests', () => {
  it('should map score >= 80 to EE (Exceeding Expectations)', () => {
    const cbc = getCBCCompetency(85);
    expect(cbc.code).toBe('EE');
    expect(cbc.rating).toBe(4);
    expect(cbc.name).toBe('Exceeding Expectations');
  });

  it('should map score 60-79 to ME (Meeting Expectations)', () => {
    const cbc = getCBCCompetency(68);
    expect(cbc.code).toBe('ME');
    expect(cbc.rating).toBe(3);
    expect(cbc.name).toBe('Meeting Expectations');
  });

  it('should map score 40-59 to AE (Approaching Expectations)', () => {
    const cbc = getCBCCompetency(52);
    expect(cbc.code).toBe('AE');
    expect(cbc.rating).toBe(2);
    expect(cbc.name).toBe('Approaching Expectations');
  });

  it('should map score < 40 to BE (Below Expectations)', () => {
    const cbc = getCBCCompetency(35);
    expect(cbc.code).toBe('BE');
    expect(cbc.rating).toBe(1);
    expect(cbc.name).toBe('Below Expectations');
  });

  it('should return correct 8-4-4 grades', () => {
    expect(getGrade(85)).toBe('A');
    expect(getGrade(72)).toBe('B');
    expect(getGrade(64)).toBe('C');
    expect(getGrade(55)).toBe('D');
    expect(getGrade(30)).toBe('E');
  });
});

describe('Portal i18n Translation Tests', () => {
  it('should translate keys correctly into Kiswahili', () => {
    expect(t('dashboard', 'sw')).toBe('Deshibodi');
    expect(t('results', 'sw')).toBe('Matokeo ya Masomo');
    expect(t('fees', 'sw')).toBe('Ada na Malipo');
  });

  it('should default to English if key or language is missing', () => {
    expect(t('dashboard', 'en')).toBe('Dashboard');
    expect(t('dashboard', 'fr')).toBe('Dashboard');
  });
});
