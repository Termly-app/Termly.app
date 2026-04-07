-- ============================================================
-- INVENTORY & HOSTEL SCHEMA
-- ============================================================

-- 1. INVENTORY MODULE
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    unit TEXT DEFAULT 'Units', -- e.g., Pieces, Kgs, Liters
    min_stock_level INTEGER DEFAULT 5,
    current_stock INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT')),
    quantity INTEGER NOT NULL,
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. HOSTEL MODULE
CREATE TABLE IF NOT EXISTS hostels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('Boys', 'Girls', 'Mixed')),
    capacity INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hostel_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID REFERENCES hostels(id) ON DELETE CASCADE,
    room_number TEXT NOT NULL,
    capacity INTEGER DEFAULT 4,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hostel_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    room_id UUID REFERENCES hostel_rooms(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    period_id UUID REFERENCES academic_periods(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'Active',
    check_in_date DATE DEFAULT CURRENT_DATE,
    check_out_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, period_id) -- A student can only be in one room per period
);

-- 3. UPDATING STUDENTS TABLE
ALTER TABLE students ADD COLUMN IF NOT EXISTS residence_type TEXT DEFAULT 'Day'; -- 'Day' or 'Boarding'
ALTER TABLE students ADD COLUMN IF NOT EXISTS hostel_room_id UUID REFERENCES hostel_rooms(id) ON DELETE SET NULL;

-- 4. RLS POLICIES
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostels ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_assignments ENABLE ROW LEVEL SECURITY;

-- Standard isolation policies
CREATE POLICY "inventory_items_isolation" ON inventory_items FOR ALL USING (school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid() OR id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid())));
CREATE POLICY "inventory_transactions_isolation" ON inventory_transactions FOR ALL USING (school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid() OR id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid())));
CREATE POLICY "hostels_isolation" ON hostels FOR ALL USING (school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid() OR id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid())));
CREATE POLICY "hostel_rooms_isolation" ON hostel_rooms FOR ALL USING (hostel_id IN (SELECT id FROM hostels WHERE school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid() OR id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid()))));
CREATE POLICY "hostel_assignments_isolation" ON hostel_assignments FOR ALL USING (school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid() OR id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid())));

-- Triggers for Stock Management
CREATE OR REPLACE FUNCTION update_inventory_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.type = 'IN') THEN
            UPDATE inventory_items SET current_stock = current_stock + NEW.quantity WHERE id = NEW.item_id;
        ELSIF (NEW.type = 'OUT') THEN
            UPDATE inventory_items SET current_stock = current_stock - NEW.quantity WHERE id = NEW.item_id;
        ELSIF (NEW.type = 'ADJUSTMENT') THEN
            UPDATE inventory_items SET current_stock = NEW.quantity WHERE id = NEW.item_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_stock
AFTER INSERT ON inventory_transactions
FOR EACH ROW EXECUTE FUNCTION update_inventory_stock();
