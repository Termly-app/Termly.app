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
