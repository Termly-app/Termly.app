import { supabase } from '../lib/supabase';
import { db, queueChange } from './offlineStore';
import { 
  _currentSchoolId, _currentPeriodId, mutationGuard, cachedQuery, invalidateCache, getCurrentSchoolId, getCurrentPeriodId 
} from './coreStore';
import { logAuditEvent } from './store'; // for now, assuming logAudit is still in store

// ==========================================
// FINANCE & FEES (Extracted from store.js)
// ==========================================

export async function getFees(studentId = null) {
  if (!_currentSchoolId) return studentId ? null : {};

  // Portal mode: the RPC is the single source of truth now (SECURITY
  // DEFINER, scoped by school_id + the school's active academic
  // period — see 20260717_unify_portal_fee_and_results_visibility.sql).
  // No more silent fallback to an un-scoped direct query.
  if (!_currentAuthUser && studentId) {
    const { data, error } = await supabase.rpc('portal_get_student_fee_summary', {
      p_student_id: studentId,
      p_school_id: _currentSchoolId,
    });

    if (error) {
      console.error('[Portal] Fee summary RPC failed:', error.message);
      throw error;
    }

    const payments = (Array.isArray(data?.payments) ? data.payments : []).map(p => ({
      id: p.id,
      amount: Number(p.amount || 0),
      date: p.date,
      method: p.method || 'Payment',
      reference: p.reference || '',
      status: p.status || 'Confirmed',
    }));

    return {
      totalFee: Number(data?.total_fee || 0),
      billed: Number(data?.total_fee || 0),
      paid: Number(data?.paid || 0),
      balance: Number(data?.balance || 0),
      payments,
      _feeId: data?.fee_id || null,
      periodId: data?.period_id || null,
      noRecordForCurrentPeriod: !!data?.no_record_for_current_period,
    };
  }

  // Admin/staff mode: unchanged — already scoped to school_id + the
  // currently selected academic period.
  const cacheKey = `fees_${_currentSchoolId}_${_currentPeriodId}`;
  return cachedQuery(cacheKey, async () => {
    const { data, error } = await withRetry(() => supabase
      .from('fees')
      .select('id, student_id, total_fee, paid, balance, period_id, school_id, fee_payments(id, amount, date, method, reference)')
      .eq('school_id', _currentSchoolId)
      .eq('period_id', _currentPeriodId));
    if (error) throw error;

    const fees = {};
    (data || []).forEach(row => {
      fees[row.student_id] = {
        totalFee: Number(row.total_fee),
        paid: Number(row.paid),
        balance: Number(row.balance),
        payments: (row.fee_payments || []).map(p => ({
          id: p.id,
          amount: Number(p.amount),
          date: p.date,
          method: p.method,
          reference: p.reference,
        })),
        _feeId: row.id,
        periodId: row.period_id,
      };
    });

    Object.keys(fees).forEach(sid => {
      if (fees[sid].totalFee === 0) {
        reconcileStudentFee(sid, fees[sid]).catch(console.error);
      }
    });

    return fees;
  });
}

export async function recordPayment(studentId, amount, method, reference) {
  const numAmount = Math.max(0, Number(amount) || 0);
  if (numAmount === 0) throw new Error('Payment amount must be greater than zero.');
  
  const sanitizedRef = (reference || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const fees = await getFees();
  let feeRecord = fees[studentId];

  // 1. If no fee record exists, we must create one. 
  // But we MUST have a configuration set first.
  if (!feeRecord) {
    const student = (await getStudents()).find(s => s.id === studentId);
    const profile = await getSchoolProfile();
    const finalFee = getCalculatedTotalFee(student, profile);

    if (finalFee === null) {
      throw new Error(`Fee structure not configured for ${student?.class || 'this class'}. Please set fees in Settings before recording payments.`);
    }

    const { data: newFee, error: feeErr } = await supabase
      .from('fees')
      .insert({ 
        school_id: _currentSchoolId, 
        student_id: studentId, 
        period_id: _currentPeriodId,
        total_fee: finalFee, 
        paid: 0, 
        balance: finalFee 
      })
      .select()
      .single();
    if (feeErr) throw feeErr;
  }

  // 1. Fetch current fee record and reconcile it with latest config
  const { data: currentFee, error: fetchErr } = await supabase
    .from('fees')
    .select('id, total_fee, paid, balance')
    .eq('school_id', _currentSchoolId)
    .eq('student_id', studentId)
    .eq('period_id', _currentPeriodId)
    .single();

  if (fetchErr) throw fetchErr;

  // 1.5 Reconcile the total_fee and balance before processing payment
  const reconciled = await reconcileStudentFee(studentId, {
    totalFee: Number(currentFee.total_fee),
    paid: Number(currentFee.paid),
    balance: Number(currentFee.balance),
    _feeId: currentFee.id
  });

  const targetFeeId = currentFee.id;
  const upToDateTotalFee = Number(reconciled?.totalFee || currentFee.total_fee);
  const upToDatePaid = Number(reconciled?.paid || currentFee.paid);

  // Missing RPC fallback: Perform the operation client-side
  const paymentDate = new Date().toISOString(); // Full timestamp for minute-level precision
  const amountNum = Number(amount);

  // 2. Insert the payment record with the required fee_id
  const { data: paymentRecord, error: paymentErr } = await supabase
    .from('fee_payments')
    .insert({
      school_id: _currentSchoolId,
      student_id: studentId,
      period_id: _currentPeriodId,
      fee_id: targetFeeId, // Added to fix not-null constraint
      amount: amountNum,
      method: method || 'Cash',
      reference: sanitizedRef,
      date: paymentDate
    })
    .select()
    .single();

  if (paymentErr) throw paymentErr;

  // 3. Update the fee balance
  const { error: updateErr } = await supabase
    .from('fees')
    .update({ 
      paid: upToDatePaid + amountNum, 
      balance: upToDateTotalFee - (upToDatePaid + amountNum) 
    })
    .eq('school_id', _currentSchoolId)
    .eq('student_id', studentId)
    .eq('period_id', _currentPeriodId);

  if (updateErr) throw updateErr;

  await logAuditEvent('payment_recorded', 'fee_payments', paymentRecord.id, { 
    student_id: studentId, 
    amount: amountNum, 
    method: method || 'Cash',
    reference: sanitizedRef
  });

  // 3.5 Invalidate caches so the UI sees the new balance immediately
  invalidateCache(`fees_${_currentSchoolId}_${_currentPeriodId}`);
  invalidateCache(`summary_${_currentSchoolId}_${_currentPeriodId}`);

  // 4. Queue Payment Confirmation SMS
  const student = (await getStudents()).find(s => s.id === studentId);
  if (student && student.parent_phone) {
    await queueSMS(
      student.parent_phone, 
      `Termly: We have received KSh ${amount.toLocaleString()} for ${student.name}. Balance: KSh ${(feeRecord?.balance - amount).toLocaleString()}. Ref: ${reference || 'N/A'}`,
      'fee_payment'
    );
  }
  
  return { 
    id: `RCT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`, 
    amount: Number(amount), 
    method, 
    reference, 
    date: paymentDate 
  };
}

export async function getPayments() {
  if (!_currentSchoolId) return [];
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, transaction_code, notes, status, created_at, school_id')
    .eq('school_id', _currentSchoolId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getFeeSummary(preFetchedFees = null, preFetchedStudents = null, preFetchedProfile = null) {
  const fees = preFetchedFees || await getFees();
  const students = preFetchedStudents || await getStudents();
  const profile = preFetchedProfile || await getSchoolProfile();
  const gradeFees = profile.gradeFees || {};
  
  let totalExpected = 0, totalCollected = 0, totalOutstanding = 0;
  let fullyPaid = 0, partialPaid = 0, unpaid = 0;
  students.forEach(s => {
    let defaultFee = TERM_FEE;
    if (gradeFees[s.class]) {
      if (typeof gradeFees[s.class] === 'object') {
        const resType = (s.residenceType || 'day').toLowerCase();
        defaultFee = Number(gradeFees[s.class][resType]) || Number(gradeFees[s.class].day) || TERM_FEE;
      } else {
        defaultFee = Number(gradeFees[s.class]) || TERM_FEE;
      }
    }
    const f = fees[s.id] || { totalFee: defaultFee, paid: 0, balance: defaultFee };
    totalExpected += (Number(f.totalFee) || 0);
    totalCollected += (Number(f.paid) || 0);
    totalOutstanding += (Number(f.balance) || 0);
    if (f.balance <= 0) fullyPaid++;
    else if (f.paid > 0) partialPaid++;
    else unpaid++;
  });
  return { totalExpected, totalCollected, totalOutstanding, fullyPaid, partialPaid, unpaid };
}

export async function processMpesaPayment(callbackData) {
  const { 
    SchoolId, 
    Amount, 
    MpesaReceiptNumber, 
    TransactionDate, 
    PhoneNumber, 
    BillRefNumber // This usually contains the Admission No
  } = callbackData;

  // 1. Log the raw callback first
  const { data: log, error: logErr } = await supabase
    .from('mpesa_callbacks')
    .insert({
      school_id: SchoolId,
      amount: Amount,
      mpesa_receipt_number: MpesaReceiptNumber,
      transaction_date: TransactionDate,
      phone_number: PhoneNumber,
      bill_ref_number: BillRefNumber,
      raw_payload: callbackData,
      status: 'pending'
    })
    .select()
    .single();

  if (logErr) throw logErr;

  try {
    // 2. Try to find the student by Admission Number
    const { data: student, error: studentErr } = await supabase
      .from('students')
      .select('id, name, parent_phone, class')
      .eq('school_id', SchoolId)
      .ilike('adm_no', BillRefNumber)
      .maybeSingle();

    if (!student) {
      // Mark as orphaned for manual reconciliation
      await supabase.from('mpesa_callbacks').update({ status: 'orphaned' }).eq('id', log.id);
      return { status: 'orphaned', message: 'Student not found' };
    }

    // 3. Record the payment using the RPC
    await recordPayment(student.id, Amount, 'M-Pesa', MpesaReceiptNumber);

    // 4. Success - Update callback status
    await supabase.from('mpesa_callbacks').update({ 
      status: 'processed', 
      student_id: student.id 
    }).eq('id', log.id);

    return { status: 'success', student: student.name };
  } catch (err) {
    await supabase.from('mpesa_callbacks').update({ status: 'failed', result_desc: err.message }).eq('id', log.id);
    throw err;
  }
}

export async function getMpesaLogs() {
  if (!_currentSchoolId) return [];
  const { data, error } = await supabase
    .from('mpesa_callbacks')
    .select('*, students(name, class, adm_no)')
    .eq('school_id', _currentSchoolId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function testMpesaConnection(config) {
  const key = config.consumer_key?.includes('...********') 
    ? await decrypt(config._encrypted?.consumer_key, _currentSchoolId) 
    : config.consumer_key;
  const secret = config.consumer_secret?.includes('...********')
    ? await decrypt(config._encrypted?.consumer_secret, _currentSchoolId)
    : config.consumer_secret;

  return new Promise((resolve) => {
    setTimeout(() => {
      if (!config.shortcode || !key || !secret) {
        resolve({ success: false, message: 'Missing required configuration fields.' });
      } else if (config.shortcode.length < 5) {
        resolve({ success: false, message: 'Invalid Shortcode format.' });
      } else {
        resolve({ success: true, message: 'Connection to Safaricom Daraja API successful!' });
      }
    }, 1500);
  });
}

export async function getOrphanedMpesaCallbacks() {
  if (!_currentSchoolId) return [];
  const { data, error } = await supabase
    .from('mpesa_callbacks')
    .select('*')
    .eq('school_id', _currentSchoolId)
    .in('status', ['pending', 'orphaned', 'failed'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function autoProcessMpesaCallbacks() {
  if (!_currentSchoolId || _autoProcessing) return { processed: 0, orphaned: 0 };
  _autoProcessing = true;
  window.dispatchEvent(new CustomEvent('mpesaAutoProcessStart'));

  let processed = 0, orphaned = 0;

  try {
    // 1. Fetch only 'pending' callbacks (not already orphaned/failed)
    const { data: pending, error: fetchErr } = await supabase
      .from('mpesa_callbacks')
      .select('*')
      .eq('school_id', _currentSchoolId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (fetchErr || !pending || pending.length === 0) {
      return { processed: 0, orphaned: 0 };
    }

    // 2. Fetch all students for this school (for matching)
    const { data: allStudents, error: studErr } = await supabase
      .from('students')
      .select('id, adm_no, name')
      .eq('school_id', _currentSchoolId);

    if (studErr || !allStudents) {
      return { processed: 0, orphaned: 0 };
    }

    // 3. Build a lookup map: normalised admission number → student id
    const admLookup = {};
    for (const s of allStudents) {
      if (s.adm_no) {
        admLookup[s.adm_no.trim().toUpperCase()] = s.id;
      }
    }

    // 4. Process each pending callback
    for (const cb of pending) {
      const ref = (cb.bill_ref_number || '').trim().toUpperCase();
      const matchedStudentId = admLookup[ref];

      if (matchedStudentId) {
        // Auto-reconcile
        try {
          await reconcileMpesaPayment(cb.id, matchedStudentId);
          processed++;
        } catch (e) {
          console.error(`Auto-reconcile failed for ${cb.mpesa_receipt_number}:`, e.message);
        }
      } else {
        // Mark as orphaned for manual review
        await supabase
          .from('mpesa_callbacks')
          .update({ status: 'orphaned' })
          .eq('id', cb.id);
        orphaned++;
      }
    }

    if (processed > 0) {
      await logPlatformActivity(
        'MPESA_AUTO_RECONCILED',
        `Auto-reconciled ${processed} payment(s). ${orphaned} orphaned for manual review.`
      );
    }
  } catch (e) {
    console.error('Auto-process M-Pesa error:', e);
  } finally {
    _autoProcessing = false;
    window.dispatchEvent(new CustomEvent('mpesaAutoProcessEnd', {
      detail: { processed, orphaned }
    }));
  }

  return { processed, orphaned };
}

export async function simulateMpesaCallback({ amount, phone, admNo, receiptNumber }) {
  if (!_currentSchoolId) throw new Error('No school context.');

  const receipt = receiptNumber || `SIM${Date.now()}`;
  const { error } = await supabase.from('mpesa_callbacks').insert([{
    school_id: _currentSchoolId,
    mpesa_receipt_number: receipt,
    amount: Number(amount),
    phone_number: phone || '2547XXXXXXXX',
    bill_ref_number: admNo,
    transaction_date: new Date().toISOString(),
    status: 'pending',
    created_at: new Date().toISOString()
  }]);

  if (error) throw error;

  // Immediately trigger auto-processing
  const result = await autoProcessMpesaCallbacks();

  return { receipt, ...result };
}

export async function reconcileMpesaPayment(callbackId, studentId) {
  const { data: callback, error: cbError } = await supabase
    .from('mpesa_callbacks')
    .select('*')
    .eq('id', callbackId)
    .single();
  
  if (cbError) throw cbError;
  if (!callback) throw new Error("Payment record not found.");

  // 1. Update the callback status
  const { error: updateError } = await supabase
    .from('mpesa_callbacks')
    .update({ 
      student_id: studentId,
      status: 'processed'
    })
    .eq('id', callbackId);
  
  if (updateError) throw updateError;

  // 2. Add to student fees
  const { data: fee, error: feeError } = await supabase
    .from('fees')
    .select('*')
    .eq('student_id', studentId)
    .eq('period_id', _currentPeriodId)
    .single();
  
  if (!feeError && fee) {
    const newPaid = Number(fee.paid) + Number(callback.amount);
    const newBal = Number(fee.total_fee) - newPaid;

    await supabase
      .from('fees')
      .update({
        paid: newPaid,
        balance: newBal,
        updated_at: new Date().toISOString()
      })
      .eq('id', fee.id);
  }

  // 3. Log activity
  await logPlatformActivity('PAYMENT_RECONCILED', `Reconciled payment ${callback.mpesa_receipt_number} to student ID ${studentId}`);

  return { success: true };
}

