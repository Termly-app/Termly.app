import { describe, it, expect } from 'vitest';
import { getCBCCompetency, getGrade, getRemarks } from '../utils/reportCard';
import { t } from '../utils/i18n';

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
    expect(t('ee', 'sw')).toBe('Amezidisha Matarajio (EE)');
  });

  it('should default to English if key or language is missing', () => {
    expect(t('dashboard', 'en')).toBe('Dashboard');
    expect(t('dashboard', 'fr')).toBe('Dashboard');
  });
});
