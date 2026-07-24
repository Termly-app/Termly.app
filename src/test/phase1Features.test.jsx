import { describe, it, expect } from 'vitest';
import { BROADCAST_TEMPLATES } from '../data/broadcastStore';

describe('Phase 1 Features Test Suite', () => {
  describe('Feature 1: WhatsApp Flows & SMS Fallback (Broadcast Store)', () => {
    it('defines all required broadcast templates with sms and whatsapp generators', () => {
      expect(BROADCAST_TEMPLATES.emergency_alert).toBeDefined();
      expect(BROADCAST_TEMPLATES.fee_invoice).toBeDefined();
      expect(BROADCAST_TEMPLATES.exam_results).toBeDefined();
      expect(BROADCAST_TEMPLATES.general_notice).toBeDefined();

      const sampleData = {
        schoolName: 'Maji Mazuri School',
        message: 'School closes at 2 PM today.',
        parentName: 'Jane Doe',
        childName: 'John Doe',
        balance: 12500,
        paybill: '522522',
        admNo: 'ADM-402',
        phone: '0712345678',
        examName: 'Mid-Term Exam',
        average: 84.2,
      };

      const emergencySMS = BROADCAST_TEMPLATES.emergency_alert.smsTemplate(sampleData);
      expect(emergencySMS).toContain('EMERGENCY');
      expect(emergencySMS).toContain('Maji Mazuri School');

      const feeWA = BROADCAST_TEMPLATES.fee_invoice.whatsappTemplate(sampleData);
      expect(feeWA).toContain('Fee Reminder');
      expect(feeWA).toContain('12,500');
      expect(feeWA).toContain('522522');

      const resultSMS = BROADCAST_TEMPLATES.exam_results.smsTemplate(sampleData);
      expect(resultSMS).toContain('Mid-Term Exam');
      expect(resultSMS).toContain('84.2%');
    });
  });

  describe('Feature 2: Broadcast Multi-Channel Generator', () => {
    it('formats custom messages correctly for SMS and WhatsApp', () => {
      const tpl = BROADCAST_TEMPLATES.general_notice;
      const sms = tpl.smsTemplate({ schoolName: 'Greenwood High', message: 'Parent Meeting on Friday' });
      const wa = tpl.whatsappTemplate({ schoolName: 'Greenwood High', message: 'Parent Meeting on Friday' });

      expect(sms).toContain('Greenwood High Notice: Parent Meeting on Friday');
      expect(wa).toContain('📢 *School Notice*');
      expect(wa).toContain('Greenwood High');
    });
  });
});
