import { supabase } from '../lib/supabase';
import { _currentSchoolId, mutationGuard } from './coreStore';
import { sendSMSMessage, sendWhatsAppMessage, queueSmsBatch, logCommunication } from './smsStore';

/**
 * Broadcast Store — Phase 1: WhatsApp Flows & SMS Fallback
 * Unified multi-channel dispatch with templates, delivery tracking, and fallback logic.
 */

// ===========================
// BROADCAST TEMPLATES
// ===========================

export const BROADCAST_TEMPLATES = {
  emergency_alert: {
    key: 'emergency_alert',
    name: 'Emergency Alert',
    icon: '🚨',
    color: '#EF4444',
    bg: '#FEF2F2',
    description: 'Urgent safety or emergency notification',
    smsTemplate: (data) =>
      `🚨 EMERGENCY — ${data.schoolName}: ${data.message}. Contact school: ${data.phone || 'office'}`,
    whatsappTemplate: (data) =>
      `🚨 *EMERGENCY ALERT*\n\n*${data.schoolName}*\n\n${data.message}\n\n📞 Contact: ${data.phone || 'School Office'}\n⏰ ${new Date().toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}`,
  },

  fee_invoice: {
    key: 'fee_invoice',
    name: 'Fee Invoice / Reminder',
    icon: '💳',
    color: '#F59E0B',
    bg: '#FFFBEB',
    description: 'Fee balance reminder with M-Pesa payment details',
    smsTemplate: (data) =>
      `Dear ${data.parentName || 'Parent'}, ${data.childName}'s fee balance is KSh ${Number(data.balance || 0).toLocaleString()}. Pay via M-Pesa Paybill ${data.paybill || '---'}. Ref: ${data.admNo || 'N/A'}. ${data.schoolName}`,
    whatsappTemplate: (data) =>
      `💳 *Fee Reminder*\n\n*${data.schoolName}*\n\nDear ${data.parentName || 'Parent'},\n\n📋 Student: *${data.childName}*\n🏷 Adm No: ${data.admNo || 'N/A'}\n💰 Balance: *KSh ${Number(data.balance || 0).toLocaleString()}*\n\n*Payment via M-Pesa:*\nPaybill: ${data.paybill || '---'}\nAccount: ${data.admNo || 'Adm No'}\n\nThank you.`,
  },

  exam_results: {
    key: 'exam_results',
    name: 'Exam Results Notification',
    icon: '📊',
    color: '#3B82F6',
    bg: '#EFF6FF',
    description: 'Notify parents that exam results are available',
    smsTemplate: (data) =>
      `${data.schoolName}: ${data.childName || "Your child"}'s ${data.examName || 'exam'} results are ready. Average: ${data.average || '--'}%. Log in to the parent portal for details.`,
    whatsappTemplate: (data) =>
      `📊 *Exam Results Available*\n\n*${data.schoolName}*\n\n📝 Exam: *${data.examName || 'Term Exam'}*\n👤 Student: *${data.childName || 'Your child'}*\n📈 Average: *${data.average || '--'}%*\n\n🔗 Log in to the Parent Portal to view the full report card.\n\nRegards,\n${data.schoolName} Academic Office`,
  },

  general_notice: {
    key: 'general_notice',
    name: 'General Notice',
    icon: '📢',
    color: '#8B5CF6',
    bg: '#F5F3FF',
    description: 'General school announcement or circular',
    smsTemplate: (data) =>
      `${data.schoolName} Notice: ${data.message}`,
    whatsappTemplate: (data) =>
      `📢 *School Notice*\n\n*${data.schoolName}*\n\n${data.message}\n\n— ${data.schoolName} Administration`,
  },
};

// ===========================
// CHANNEL STRATEGIES
// ===========================

const CHANNELS = {
  sms: {
    key: 'sms',
    name: 'SMS',
    icon: '💬',
    send: async (phones, message) => sendSMSMessage(phones, message),
  },
  whatsapp: {
    key: 'whatsapp',
    name: 'WhatsApp',
    icon: '📱',
    send: async (phones, message) => sendWhatsAppMessage(phones, message),
  },
};

// ===========================
// SEND BROADCAST
// ===========================

/**
 * Send a broadcast message via one or both channels.
 * @param {Object} opts
 * @param {'sms'|'whatsapp'|'both'} opts.channel
 * @param {string} opts.templateKey — key from BROADCAST_TEMPLATES
 * @param {Array<{phone: string, parentName?: string, childName?: string, admNo?: string, balance?: number}>} opts.recipients
 * @param {Object} opts.data — extra template data (schoolName, message, etc.)
 * @param {string} opts.schoolName
 * @returns {Promise<{success: boolean, stats: Object}>}
 */
export async function sendBroadcast({ channel = 'sms', templateKey, recipients, data = {}, schoolName }) {
  mutationGuard('sendBroadcast');
  if (!_currentSchoolId) throw new Error('No school context for broadcast');

  const template = BROADCAST_TEMPLATES[templateKey] || BROADCAST_TEMPLATES.general_notice;
  const enrichedData = { ...data, schoolName: schoolName || data.schoolName || 'School' };

  const stats = { total: recipients.length, sms_sent: 0, whatsapp_sent: 0, failed: 0, channel };
  const channels = channel === 'both' ? ['sms', 'whatsapp'] : [channel];

  for (const ch of channels) {
    const strategy = CHANNELS[ch];
    if (!strategy) continue;

    const phones = recipients.map(r => r.phone).filter(Boolean);
    if (phones.length === 0) continue;

    // For personalized templates (fee_invoice), send individually
    if (templateKey === 'fee_invoice') {
      for (const recipient of recipients) {
        if (!recipient.phone) { stats.failed++; continue; }
        try {
          const personalData = { ...enrichedData, ...recipient };
          const msg = ch === 'whatsapp'
            ? template.whatsappTemplate(personalData)
            : template.smsTemplate(personalData);
          await strategy.send([recipient.phone], msg);
          stats[`${ch}_sent`]++;
        } catch (err) {
          console.error(`[Broadcast] Failed to send ${ch} to ${recipient.phone}:`, err);
          stats.failed++;
        }
      }
    } else {
      // Bulk send for non-personalized templates
      try {
        const msg = ch === 'whatsapp'
          ? template.whatsappTemplate(enrichedData)
          : template.smsTemplate(enrichedData);
        await strategy.send(phones, msg);
        stats[`${ch}_sent`] += phones.length;
      } catch (err) {
        console.error(`[Broadcast] Bulk ${ch} failed:`, err);
        stats.failed += phones.length;
      }
    }
  }

  // Log the broadcast
  try {
    await supabase.from('broadcast_logs').insert({
      school_id: _currentSchoolId,
      channel,
      template: templateKey,
      recipient_count: stats.total,
      sms_sent: stats.sms_sent,
      whatsapp_sent: stats.whatsapp_sent,
      failed: stats.failed,
      message_preview: template.smsTemplate(enrichedData).substring(0, 200),
      metadata: { data: enrichedData },
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('[Broadcast] Failed to log broadcast:', e.message);
  }

  // Also log as announcement for the Communications page
  try {
    await logCommunication({
      type: channel === 'both' ? 'whatsapp' : channel,
      channel,
      message: template.smsTemplate(enrichedData),
      target: 'broadcast',
      count: stats.total,
    });
  } catch (e) {
    console.warn('[Broadcast] Failed to log announcement:', e.message);
  }

  return { success: stats.failed < stats.total, stats };
}

// ===========================
// BROADCAST HISTORY
// ===========================

export async function getBroadcastHistory(limit = 50) {
  if (!_currentSchoolId) return [];
  try {
    const { data, error } = await supabase
      .from('broadcast_logs')
      .select('*')
      .eq('school_id', _currentSchoolId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn('[Broadcast] History fetch failed:', e.message);
    return [];
  }
}

// ===========================
// BROADCAST STATS
// ===========================

export async function getBroadcastStats() {
  if (!_currentSchoolId) return { total_sent: 0, by_channel: {}, by_template: {} };
  try {
    const { data, error } = await supabase
      .from('broadcast_logs')
      .select('channel, template, sms_sent, whatsapp_sent, recipient_count')
      .eq('school_id', _currentSchoolId);
    if (error) throw error;

    const stats = { total_sent: 0, by_channel: { sms: 0, whatsapp: 0 }, by_template: {} };
    (data || []).forEach(row => {
      stats.total_sent += (row.sms_sent || 0) + (row.whatsapp_sent || 0);
      stats.by_channel.sms += row.sms_sent || 0;
      stats.by_channel.whatsapp += row.whatsapp_sent || 0;
      if (!stats.by_template[row.template]) stats.by_template[row.template] = 0;
      stats.by_template[row.template] += row.recipient_count || 0;
    });
    return stats;
  } catch (e) {
    console.warn('[Broadcast] Stats fetch failed:', e.message);
    return { total_sent: 0, by_channel: {}, by_template: {} };
  }
}

// ===========================
// QUICK SEND HELPERS
// ===========================

/**
 * Quick-send an emergency alert to all parents.
 */
export async function sendEmergencyAlert(message, recipients, schoolName, schoolPhone) {
  return sendBroadcast({
    channel: 'both',
    templateKey: 'emergency_alert',
    recipients,
    data: { message, phone: schoolPhone },
    schoolName,
  });
}

/**
 * Quick-send fee reminders to defaulters.
 */
export async function sendFeeReminders(defaulters, paybill, schoolName) {
  const recipients = defaulters.map(d => ({
    phone: d.parentPhone || d.parent_phone,
    parentName: d.parentName || d.parent_name || 'Parent',
    childName: d.name,
    admNo: d.admNo || d.adm_no,
    balance: d.balance || 0,
  }));
  return sendBroadcast({
    channel: 'sms',
    templateKey: 'fee_invoice',
    recipients,
    data: { paybill },
    schoolName,
  });
}
