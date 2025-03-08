const env = require('./config/env');

console.log('\n=== Environment Configuration Test ===\n');

// Test environment loading
console.log('1. Testing environment loading:');
const requiredVars = ['GH_TOKEN', 'GH_OWNER', 'GH_REPO', 'API_URL', 'AUTO_UPDATE', 'UPDATE_INTERVAL'];

let allVarsPresent = true;
for (const varName of requiredVars) {
    const value = env.get(varName);
    const status = value ? '✓' : '✗';
    const displayValue = varName.includes('TOKEN') ? '********' : value;
    console.log(`   ${status} ${varName}: ${displayValue}`);
    if (!value) allVarsPresent = false;
}

// Test setting and getting values
console.log('\n2. Testing set/get functionality:');
const testKey = 'TEST_VAR';
const testValue = 'test-value-123';
console.log('   Setting test variable...');
env.set(testKey, testValue);
const retrievedValue = env.get(testKey);
console.log('   Test variable value:', retrievedValue);
console.log('   Set/Get Test:', testValue === retrievedValue ? '✓ Passed' : '✗ Failed');

// Overall status
console.log('\n=== Test Summary ===');
console.log('Environment Variables:', allVarsPresent ? '✓ All Present' : '✗ Some Missing');
console.log('Set/Get Functionality:', testValue === retrievedValue ? '✓ Working' : '✗ Failed'); 