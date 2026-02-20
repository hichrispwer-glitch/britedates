#!/usr/bin/env node

/**
 * Test script for Vercel Eventbrite API integration
 * This tests if the /api/events endpoint loads events correctly
 */

const http = require('http');
const https = require('https');

// Configuration
const API_KEY = '3QINHE75SYXOZMJSIGI5'; // From EVENTBRITE_SETUP.md

// Endpoints to test
const endpoints = [
  {
    name: 'Local (vercel dev)',
    url: 'http://localhost:3000/api/events?query=music&location=London',
  },
  {
    name: 'Vercel Production',
    url: 'https://stickersmash.vercel.app/api/events?query=music&location=London',
  }
];

async function fetchWithTimeout(url, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function testEndpoint(endpoint) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${endpoint.name}`);
  console.log(`URL: ${endpoint.url}`);
  console.log('='.repeat(60));

  try {
    const response = await fetchWithTimeout(endpoint.url, 15000);
    
    console.log(`✓ Connected (Status: ${response.status})`);

    if (!response.ok) {
      const text = await response.text();
      console.log(`✗ API returned error status`);
      console.log(`  Response: ${text.substring(0, 200)}`);
      return false;
    }

    const data = await response.json();
    console.log(`✓ Response parsed as JSON`);

    // Check response structure
    if (data.events && Array.isArray(data.events)) {
      console.log(`✓ Response contains 'events' array`);
      console.log(`  Events found: ${data.events.length}`);
      
      if (data.events.length > 0) {
        const firstEvent = data.events[0];
        console.log(`  Sample event:`);
        console.log(`    - Name: ${firstEvent.name?.text || 'N/A'}`);
        console.log(`    - Date: ${firstEvent.start?.local || 'N/A'}`);
        console.log(`    - Price: ${firstEvent.is_free ? 'Free' : firstEvent.ticket_availability?.minimum_ticket_price?.display || 'Paid'}`);
      }
      return true;
    } else if (data.error) {
      console.log(`✗ API returned error: ${data.error}`);
      return false;
    } else {
      console.log(`⚠ Unexpected response structure:`);
      console.log(`  ${JSON.stringify(data).substring(0, 200)}`);
      return false;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`✗ Request timeout (took longer than 15s)`);
    } else {
      console.log(`✗ Request failed: ${error.message}`);
      if (error.code === 'ECONNREFUSED') {
        console.log('  (Connection refused - is the server running?)');
      }
    }
    return false;
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     BRITE DATES - EVENTBRITE API INTEGRATION TEST          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  console.log('\nConfiguration:');
  console.log(`  API Key: ${API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`  Endpoints to test: ${endpoints.length}`);

  const results = [];
  
  for (const endpoint of endpoints) {
    const success = await testEndpoint(endpoint);
    results.push({ name: endpoint.name, success });
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log('='.repeat(60));
  
  for (const result of results) {
    const icon = result.success ? '✓' : '✗';
    console.log(`${icon} ${result.name}`);
  }

  const allPassed = results.every(r => r.success);
  
  if (allPassed) {
    console.log('\n✓ All tests passed! The API is working correctly.');
  } else {
    console.log('\n⚠ Some tests failed. See details above.');
  }
  
  console.log('\nNext steps:');
  if (!results[0].success) {
    console.log('  1. Run: vercel dev');
    console.log('  2. Re-run this test to check local endpoint');
  }
  if (!results[1].success) {
    console.log('  1. Deploy to Vercel: vercel');
    console.log('  2. Set EVENTBRITE_API_KEY in Vercel dashboard');
    console.log('  3. Re-run this test to check production endpoint');
  }

  console.log('\n');
}

main().catch(console.error);
