#!/usr/bin/env node

/**
 * Debug Eventbrite API connectivity
 */

const API_KEY = '3QINHE75SYXOZMJSIGI5';

async function testAPI(description, url, options = {}) {
  console.log(`\n🔍 ${description}`);
  console.log(`   URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      ...options
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      console.log(`   Response: ${JSON.stringify(data).substring(0, 150)}`);
      return { status: response.status, data };
    } catch (e) {
      console.log(`   Response: ${text.substring(0, 150)}`);
      return { status: response.status, text };
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
    return { error: error.message };
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   EVENTBRITE API ENDPOINT TESTS                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nAPI Key: ${API_KEY.substring(0, 10)}...`);
  console.log('Testing different API endpoints...\n');

  const tests = [
    [
      'Test 1: Get user profile (verify API key works)',
      'https://www.eventbriteapi.com/v3/users/me/'
    ],
    [
      'Test 2: Search events (standard endpoint)',
      'https://www.eventbriteapi.com/v3/events/search/?q=music&location.address=London'
    ],
    [
      'Test 3: Search without location',
      'https://www.eventbriteapi.com/v3/events/search/?q=music'
    ],
    [
      'Test 4: Get user events',
      'https://www.eventbriteapi.com/v3/users/me/events/'
    ]
  ];

  for (const [desc, url] of tests) {
    await testAPI(desc, url);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(60));
  console.log('Analysis:');
  console.log('- If Test 1 passes: API key is valid');
  console.log('- If Test 2 passes: Search functionality works');
  console.log('- Check response status codes for 401 (auth) or 404 (endpoint)');
  console.log('='.repeat(60) + '\n');
}

main();
