#!/usr/bin/env node

/**
 * Direct test of Eventbrite API call
 * This simulates what the /api/events.js endpoint does
 */

const API_KEY = '3QINHE75SYXOZMJSIGI5';

async function testDirectEventbriteAPI() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   DIRECT EVENTBRITE API TEST (No Proxy)                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const query = 'music';
  const location = 'London';
  // Try the /events endpoint instead of /events/search
  const url = `https://www.eventbriteapi.com/v3/events/search/?q=${encodeURIComponent(query)}&location.address=${encodeURIComponent(location)}&expand=venue`;
  const url2 = `https://www.eventbriteapi.com/v3/organizations/me/events`;

  console.log(`Query: "${query}"`);
  console.log(`Location: "${location}"`);
  console.log(`API Key: ${API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`\nURL: ${url}\n`);

  try {
    console.log('🔄 Calling Eventbrite API...');
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const error = await response.text();
      console.log(`\n✗ API Error Response:`);
      console.log(error);
      return false;
    }

    const data = await response.json();
    
    if (data.events && data.events.length > 0) {
      console.log(`\n✓ Success! Found ${data.events.length} events\n`);
      
      console.log('Sample Events:');
      data.events.slice(0, 3).forEach((event, i) => {
        console.log(`\n${i + 1}. ${event.name?.text || 'Event'}`);
        console.log(`   Date: ${event.start?.local || 'N/A'}`);
        console.log(`   Venue: ${event.venue?.name || 'N/A'}`);
        console.log(`   Price: ${event.is_free ? 'Free' : (event.ticket_availability?.minimum_ticket_price?.display || 'Paid')}`);
      });
      
      return true;
    } else {
      console.log(`\n⚠ No events found`);
      console.log(`Response keys: ${Object.keys(data).join(', ')}`);
      console.log(`Events array: ${data.events?.length || 0}`);
      return false;
    }
  } catch (error) {
    console.log(`\n✗ Error: ${error.message}`);
    return false;
  }
}

testDirectEventbriteAPI().then(success => {
  console.log('\n' + '='.repeat(60));
  if (success) {
    console.log('✓ API key is working! Events are being returned.');
    console.log('\nNext steps:');
    console.log('1. Deploy /api/events.js to Vercel');
    console.log('2. Set EVENTBRITE_API_KEY environment variable on Vercel');
    console.log('3. Test the app through the web interface');
  } else {
    console.log('✗ API is not returning events. Possible issues:');
    console.log('1. API key is invalid or expired');
    console.log('2. API rate limit exceeded');
    console.log('3. Eventbrite API is down');
  }
  console.log('='.repeat(60) + '\n');
  process.exit(success ? 0 : 1);
});
