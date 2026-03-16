-- ============================================================
-- Atomic Payment Recording (Secure Transaction)
-- ============================================================

CREATE OR REPLACE FUNCTION record_payment(
  p_student_id UUID,
  p_school_id UUID,
  p_period_id UUID,
  p_amount NUMERIC,
  p_method TEXT,
  p_reference TEXT,
  p_date TEXT
) RETURNS VOID AS $$
DECLARE
  v_fee_id UUID;
  v_current_paid NUMERIC;
  v_total_fee NUMERIC;
  v_new_paid NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- 1. Get or Create Fee Record
  SELECT id, paid, total_fee INTO v_fee_id, v_current_paid, v_total_fee
  FROM fees
  WHERE student_id = p_student_id AND period_id = p_period_id;

  IF NOT FOUND THEN
    -- This shouldn't happen if we pre-calculate in store.js, 
    -- but for safety, we handle it if the caller knows total_fee
    -- (Or we could fetch it from grade fees here)
    RAISE EXCEPTION 'Fee record not found for student in this period';
  END IF;

  -- 2. Calculate New Totals
  v_new_paid := v_current_paid + p_amount;
  v_new_balance := v_total_fee - v_new_paid;

  -- 3. Insert Payment Record
  INSERT INTO fee_payments (fee_id, amount, date, method, reference)
  VALUES (v_fee_id, p_amount, p_date, p_method, p_reference);

  -- 4. Update Fee Totals
  UPDATE fees
  SET paid = v_new_paid, balance = v_new_balance
  WHERE id = v_fee_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
