import { supabase } from '../lib/supabase';

// ============================================================================
// AUTH MODULE: API LAYER for Login & Register
// ============================================================================

export async function getAuthUserDetails(email) {
    const { data, error } = await supabase.from('users').select('school_id').eq('email', email).maybeSingle();
    if (error) throw error;
    return data;
}

export async function getHqSchool(email) {
    const { data, error } = await supabase.from('schools').select('id').eq('email', email).maybeSingle();
    if (error) throw error;
    return data;
}

export async function getUserByEmail(email) {
    const { data, error } = await supabase.from('users').select('id, school_id').eq('email', email).limit(1);
    if (error) throw error;
    return data;
}

export async function upsertAuthUser(schoolId, authUserId, name, email, role = 'Admin') {
    const { data, error } = await supabase.from('users')
        .upsert({
            school_id: schoolId, 
            auth_user_id: authUserId,
            name,
            email, 
            role
        }).select().single();
    if (error) throw error;
    return data;
}

export async function getMatchedUser(schoolId, email) {
    const { data, error } = await supabase.from('users').select('*, schools(id, name, plan)').eq('school_id', schoolId).eq('email', email).maybeSingle();
    if (error) throw error;
    return data;
}

export async function updateUserAuthId(userId, authUserId) {
    const { error } = await supabase.from('users').update({ auth_user_id: authUserId }).eq('id', userId);
    if (error) throw error;
    return true;
}

export async function getOwnedSchools(authUserId) {
    const { data, error } = await supabase.from('schools').select('*').eq('owner_id', authUserId);
    if (error) throw error;
    return data;
}

export async function getUserRecords(authUserId) {
    const { data, error } = await supabase.from('users').select('*, schools(id, name, plan)').eq('auth_user_id', authUserId);
    if (error) throw error;
    return data;
}

export async function checkSchoolExists(ownerId) {
    const { data, error } = await supabase.from('schools').select('id').eq('owner_id', ownerId).maybeSingle();
    if (error) throw error;
    return data;
}

export async function getUserRole(authUserId) {
    const { data, error } = await supabase.from('users').select('role').eq('auth_user_id', authUserId).single();
    if (error) throw error;
    return data;
}
