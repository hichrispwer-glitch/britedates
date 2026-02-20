export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { query, location } = req.query;

  // Validate input
  if (!query || !location) {
    return res.status(400).json({ error: 'Missing query or location parameter' });
  }

  // Get API key from environment variable
  const apiKey = process.env.EVENTBRITE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // First, verify the API key by calling the /users/me endpoint
    const verifyUrl = 'https://www.eventbriteapi.com/v3/users/me/';
    const verifyResponse = await fetch(verifyUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!verifyResponse.ok) {
      console.error('API key verification failed:', verifyResponse.status);
      return res.status(401).json({ error: 'Invalid or expired API key' });
    }

    const userData = await verifyResponse.json();
    console.log(`✓ API key verified for user: ${userData.name}`);

    // Since /events/search is not available in this account tier,
    // return sample events based on the query with verified API connection
    const mockEvents = generateMockEvents(query, location);
    
    res.status(200).json({
      events: mockEvents,
      pagination: {
        object_count: mockEvents.length,
        page_count: 1,
        page_size: mockEvents.length,
        page_number: 1
      },
      note: 'Using verified API connection with mock data (search endpoint not available in current tier)'
    });
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch events', details: error.message });
  }
}

function generateMockEvents(query, location) {
  const eventTemplates = {
    music: [
      { name: 'Live Jazz Night', venue: 'The Blue Note', time: '19:00' },
      { name: 'Summer Music Festival', venue: 'Hyde Park', time: '18:00' },
      { name: 'Indie Rock Concert', venue: 'Electric Ballroom', time: '20:00' },
      { name: 'Classical Symphony', venue: 'Royal Albert Hall', time: '19:30' },
    ],
    art: [
      { name: 'Contemporary Art Exhibition', venue: 'Tate Modern', time: '10:00' },
      { name: 'Street Art Walking Tour', venue: 'Shoreditch', time: '14:00' },
      { name: 'Gallery Opening Night', venue: 'Saatchi Gallery', time: '18:00' },
    ],
    food: [
      { name: 'Street Food Market', venue: 'Camden Market', time: '12:00' },
      { name: 'Cooking Class', venue: 'Borough Market', time: '18:00' },
      { name: 'Food Festival', venue: 'South Bank', time: '11:00' },
    ],
    fitness: [
      { name: 'Yoga in the Park', venue: 'Hyde Park', time: '08:00' },
      { name: 'Running Club Meetup', venue: 'Victoria Park', time: '18:30' },
      { name: 'Fitness Bootcamp', venue: 'Regent\'s Park', time: '07:00' },
    ],
  };

  const templates = eventTemplates[query.toLowerCase()] || eventTemplates.music;
  const date = new Date();
  
  return templates.map((event, idx) => ({
    id: `mock-${query}-${idx}`,
    name: { text: event.name },
    start: { local: `${date.toISOString().split('T')[0]}T${event.time}:00` },
    end: { local: `${date.toISOString().split('T')[0]}T${String(parseInt(event.time) + 2).padStart(2, '0')}:00:00` },
    venue: { name: event.venue, address: { address_1: location } },
    is_free: Math.random() > 0.6,
    ticket_availability: {
      minimum_ticket_price: { display: '£' + (Math.floor(Math.random() * 40) + 5) }
    }
  }));
}
