#!/usr/bin/env node

/**
 * Node.js test script for database connection and config loading
 * Run with: node test_db_node.js
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = "https://khqarcvszewerjckmtpg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtocWFyY3ZzemV3ZXJqY2ttdHBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NTE5MTEsImV4cCI6MjA2NDMyNzkxMX0.d8_q1aI_I5pwNf73FIKxNo8Ok0KNxzF-SGDGegpRwbY";

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Test functions
async function testConnection() {
    console.log('🔗 Testing Supabase connection...');
    
    try {
        // Test basic connection
        const { data: authData, error: authError } = await supabase.auth.getUser();
        
        // Test database query
        const { data: dbData, error: dbError } = await supabase
            .from('event_general_catalog')
            .select('event_type')
            .limit(5);

        if (dbError) {
            throw new Error(`Database query failed: ${dbError.message}`);
        }

        console.log('✅ Connection successful!');
        console.log(`   Auth status: ${authData?.user ? 'Authenticated' : 'Anonymous'}`);
        console.log(`   Events found: ${dbData?.length || 0}`);
        if (dbData && dbData.length > 0) {
            console.log('   Sample events:', dbData.map(e => e.event_type).join(', '));
        }
        return true;
    } catch (error) {
        console.log('❌ Connection failed:', error.message);
        return false;
    }
}

async function testRPCFunction() {
    console.log('\n📡 Testing RPC function...');
    
    try {
        const { data, error } = await supabase.rpc('rpc_load_event_config', { 
            p_event_short_ref: 'TN2025' 
        });

        if (error) {
            throw new Error(`RPC call failed: ${error.message}`);
        }

        if (data && data.event) {
            console.log('✅ RPC function working!');
            console.log(`   Event: ${data.event.event_short_ref}`);
            console.log(`   Season: ${data.event.season}`);
            console.log(`   Divisions: ${data.divisions?.length || 0}`);
            console.log(`   Packages: ${data.packages?.length || 0}`);
            console.log(`   Practice Items: ${data.practiceItems?.length || 0}`);
            console.log(`   Time Slots: ${data.timeslots?.length || 0}`);
            console.log(`   UI Texts: ${data.uiTexts?.length || 0}`);
            return true;
        } else {
            throw new Error('RPC returned invalid data structure');
        }
    } catch (error) {
        console.log('❌ RPC test failed:', error.message);
        return false;
    }
}

async function testDatabaseTables() {
    console.log('\n📊 Testing database tables and views...');
    
    // Test the actual tables and views that exist
    const tables = [
        'event_general_catalog',
        'timeslot_catalog', 
        'team_meta',
        'practice_preferences',
        'registration_meta',
        'race_day_requests'
    ];
    
    const views = [
        'v_event_config_public',
        'v_divisions_public', 
        'v_packages_public',
        'v_practice_items_public',
        'v_timeslots_public',
        'v_ui_texts_public'
    ];
    
    const results = {};
    
    // Test tables
    console.log('   Testing tables:');
    for (const table of tables) {
        try {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .limit(1);
            
            if (error) {
                console.log(`     ❌ ${table}: ${error.message}`);
                results[table] = false;
            } else {
                console.log(`     ✅ ${table}: ${data?.length || 0} records (sample)`);
                results[table] = true;
            }
        } catch (error) {
            console.log(`     ❌ ${table}: ${error.message}`);
            results[table] = false;
        }
    }
    
    // Test views
    console.log('   Testing views:');
    for (const view of views) {
        try {
            const { data, error } = await supabase
                .from(view)
                .select('*')
                .limit(1);
            
            if (error) {
                console.log(`     ❌ ${view}: ${error.message}`);
                results[view] = false;
            } else {
                console.log(`     ✅ ${view}: ${data?.length || 0} records (sample)`);
                results[view] = true;
            }
        } catch (error) {
            console.log(`     ❌ ${view}: ${error.message}`);
            results[view] = false;
        }
    }
    
    return results;
}

async function testConfigValidation() {
    console.log('\n🔍 Testing config data validation...');
    
    try {
        const { data, error } = await supabase.rpc('rpc_load_event_config', { 
            p_event_short_ref: 'TN2025' 
        });

        if (error) {
            throw new Error(`RPC call failed: ${error.message}`);
        }

        // Validate required structure
        const requiredKeys = ['event', 'divisions', 'packages', 'raceDay', 'practiceItems', 'timeslots', 'uiTexts'];
        const missingKeys = requiredKeys.filter(key => !(key in data));
        
        if (missingKeys.length > 0) {
            throw new Error(`Missing required keys: ${missingKeys.join(', ')}`);
        }

        // Validate event data
        if (!data.event.event_short_ref) {
            throw new Error('Event missing event_short_ref');
        }

        // Validate arrays
        const arrayKeys = ['divisions', 'packages', 'raceDay', 'practiceItems', 'timeslots', 'uiTexts'];
        for (const key of arrayKeys) {
            if (!Array.isArray(data[key])) {
                throw new Error(`${key} is not an array`);
            }
        }

        console.log('✅ Config data validation passed!');
        console.log('   All required keys present');
        console.log('   All data structures valid');
        
        // Show summary
        console.log('   Summary:');
        console.log(`     - Event: ${data.event.event_short_ref}`);
        console.log(`     - Divisions: ${data.divisions.length}`);
        console.log(`     - Packages: ${data.packages.length}`);
        console.log(`     - Practice Items: ${data.practiceItems.length}`);
        console.log(`     - Time Slots: ${data.timeslots.length}`);
        console.log(`     - UI Texts: ${data.uiTexts.length}`);
        
        return true;
    } catch (error) {
        console.log('❌ Config validation failed:', error.message);
        return false;
    }
}

// Main test runner
async function runTests() {
    console.log('🚀 Starting database connection and config tests...\n');
    
    const results = {
        connection: await testConnection(),
        rpc: await testRPCFunction(),
        tables: await testDatabaseTables(),
        validation: await testConfigValidation()
    };
    
    console.log('\n📋 Test Summary:');
    console.log(`   Connection: ${results.connection ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   RPC Function: ${results.rpc ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Tables: ${Object.values(results.tables).every(Boolean) ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Validation: ${results.validation ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = results.connection && results.rpc && results.validation;
    console.log(`\n${allPassed ? '🎉 All tests passed!' : '⚠️  Some tests failed.'}`);
    
    if (allPassed) {
        console.log('\n✨ Your database connection and config loading are working correctly!');
        console.log('   You can now run the HTML test page in your browser for UI testing.');
    } else {
        console.log('\n🔧 Please check the errors above and fix any issues.');
    }
    
    process.exit(allPassed ? 0 : 1);
}

// Run tests
runTests().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
});