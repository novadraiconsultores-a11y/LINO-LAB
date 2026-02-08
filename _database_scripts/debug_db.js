import { createClient } from '@supabase/supabase-js'

const url = 'https://fnzmtemzfioasdjyqyso.supabase.co'
const key = 'sb_publishable_pP0F-c5dGBnKP6wDmtyNNw_c_qWJ1FR'
const supabase = createClient(url, key)

async function test() {
    console.log('--- DB CHECK PROFILES ---')

    const { data: profiles, error: errProfiles } = await supabase.from('profiles').select('*').limit(1)
    if (errProfiles) {
        console.error('FAIL "profiles":', errProfiles.message)
    } else {
        console.log('OK "profiles": Found', profiles.length, 'rows')
        if (profiles.length > 0) {
            console.log('Sample Keys:', Object.keys(profiles[0]))
            console.log('Sample Row:', profiles[0])
        }
    }
}

test()
