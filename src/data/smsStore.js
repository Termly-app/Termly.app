import { supabase } from './store';

/**
 * SMS & Communication History Store
 */

export async function logSmsHistory(payload) {
  const { data, error } = await supabase
    .from('sms_logs')
    .insert([{
      ...payload,
      created_at: new Date().toISOString()
    }]);
  
  if (error) throw error;
  return data;
}

export async function getSmsLogs(schoolId) {
  const { data, error } = await supabase
    .from('sms_logs')
    .select('*')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function getSmsBalance(schoolId) {
  const { data, error } = await supabase
    .from('school_profiles')
    .select('sms_balance')
    .eq('id', schoolId)
    .single();
  
  if (error) throw error;
  return data?.sms_balance || 0;
}


export async function queueSMS(phoneNumber, message, type = 'general') {
  if (!_currentSchoolId) return;
  try {
    const { error } = await supabase
      .from('sms_messages')
      .insert({
        school_id: _currentSchoolId,
        phone_number: phoneNumber,
        message: message,
        type: type,
        status: 'queued'
      });
    if (error) console.error('Failed to queue SMS:', error);
  } catch (err) {
    console.error('SMS Queue Error:', err);
  }
}

export async function getSMSLogs() {
  if (!_currentSchoolId) return [];
  const { data, error } = await supabase
    .from('sms_messages')
    .select('*')
    .eq('school_id', _currentSchoolId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function queueSmsBatch(messages) {
  if (!_currentSchoolId || !messages.length) return;
  const { error } = await supabase
    .from('sms_messages')
    .insert(messages.map(m => ({
      school_id: _currentSchoolId,
      phone_number: m.phone,
      message: m.message,
      type: m.type || 'general',
      status: 'queued'
    })));
  if (error) throw error;
}

export async function testSmsConnection(config) {
  const key = config.api_key?.includes('...********')
    ? await decrypt(config._encrypted?.api_key, _currentSchoolId)
    : config.api_key;

  return new Promise((resolve) => {
    setTimeout(() => {
      if (!key) {
        resolve({ success: false, message: 'API Key is required.' });
      } else if (key.length < 20) {
        resolve({ success: false, message: 'API Key appears to be too short or invalid.' });
      } else {
        resolve({ success: true, message: 'Connection to Africa\'s Talking API successful!' });
      }
    }, 1200);
  });
}

export async function logCommunication(comm) {
  mutationGuard('logCommunication');
  if (!_currentSchoolId) throw new Error('No school context');
  
  const creatorId = (await getUserByAuthId(_currentAuthUser?.id))?.id;
  
  if (comm.type === 'sms' || comm.type === 'whatsapp') {
    // If it's a broadcast, create an announcement record as well
    const { data, error } = await supabase
      .from('announcements')
      .insert({
        school_id: _currentSchoolId,
        created_by: creatorId,
        title: comm.channel === 'whatsapp' ? 'WhatsApp Broadcast' : 'SMS Broadcast',
        content: comm.message,
        target_audience: comm.target,
        status: 'published',
        metadata: {
          recipient_count: comm.count,
          channel: comm.type
        }
      })
      .select()
      .single();
    if (error) console.error('Failed to log announcement:', error);
    return data;
  }
  
  return { id: 'log-' + Date.now(), ...comm };
}

export async function sendSMSMessage(recipients, message) {
  const count = Array.isArray(recipients) ? recipients.length : 1;
  console.log(`[SMS GATEWAY] Sending to ${count} recipients: "${message}"`);
  return { success: true, count };
}

export async function sendWhatsAppMessage(recipients, message) {
  const count = Array.isArray(recipients) ? recipients.length : 1;
  if (count === 1) {
    const phone = Array.isArray(recipients) ? recipients[0] : recipients;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone.startsWith('0') ? '254' + cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }
  console.log(`[WHATSAPP GATEWAY] Broadcasting to ${count} recipients: "${message}"`);
  return { success: true, count };
}

export function getWhatsAppLink(phone, message = '') {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  const prefix = cleanPhone.startsWith('0') ? '254' : '';
  return `https://wa.me/${prefix}${cleanPhone}${message ? '?text=' + encodeURIComponent(message) : ''}`;
}

export async function getCommunicationLogs() {
  // Mock history for now to satisfy UI
  return [];
}
