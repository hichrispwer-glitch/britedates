import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  PanResponder,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

// Simple React Native port of the demo for Expo (web & native)

const MOCK_USERS = [
  { id: "1", name: "Sarah", age: 28, photo: "👩‍🎤", interests: ["music", "art", "food"], location: { city: "London" } },
  { id: "2", name: "Emma", age: 26, photo: "👩‍💼", interests: ["fitness", "music", "tech"], location: { city: "London" } },
  { id: "3", name: "Olivia", age: 27, photo: "👩‍🎨", interests: ["art", "coffee", "music"], location: { city: "London" } },
];

const MOCK_EVENTS = {
  music: [
    { id: "1", name: "The Big Indie Tribute Festival", venue: "The Garage, Highbury", date: "Saturday 8pm", price: "£13.69", category: "music" },
    { id: "2", name: "Jazz Night at Ronnie Scott's", venue: "Soho", date: "Friday 9pm", price: "£25", category: "music" },
    { id: "6", name: "Live Band Night", venue: "Electric Ballroom, Camden", date: "Thursday 7pm", price: "£15", category: "music" },
  ],
  art: [
    { id: "3", name: "Contemporary Art Exhibition", venue: "Tate Modern, South Bank", date: "Sunday 2pm", price: "Free", category: "art" },
    { id: "7", name: "Street Art Walking Tour", venue: "Shoreditch", date: "Saturday 10am", price: "£12", category: "art" },
  ],
  food: [
    { id: "4", name: "Street Food Market", venue: "Camden Market", date: "Saturday 12pm", price: "£10", category: "food" },
    { id: "8", name: "Dim Sum Lunch", venue: "Chinatown", date: "Sunday 1pm", price: "£18", category: "food" },
  ],
  fitness: [
    { id: "5", name: "Outdoor Yoga Session", venue: "Hyde Park", date: "Sunday 10am", price: "£15", category: "fitness" },
    { id: "9", name: "Running Club Meetup", venue: "Victoria Park", date: "Wednesday 6pm", price: "Free", category: "fitness" },
  ],
};

const INTEREST_ICONS: Record<string, string> = {
  music: "🎵",
  art: "📸",
  food: "🍔",
  fitness: "🏋️",
  tech: "💻",
  coffee: "☕",
};

async function fetchEventbriteEvents(interests: string[] = [], location: { city: string } = { city: "London" }, token = "") {
  if (!token) return [];
  const results: any[] = [];
  
  // Determine if we're using the proxy or direct API
  const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const proxyUrl = isLocalDev ? 'http://localhost:3001/api/events' : '/api/events';
  
  for (const interest of interests) {
    try {
      console.log(`Fetching events for ${interest} in ${location.city}...`);
      
      // Call the proxy endpoint
      const url = `${proxyUrl}?query=${encodeURIComponent(interest)}&location=${encodeURIComponent(location.city)}`;
      const res = await fetch(url);
      
      console.log(`Response status: ${res.status}`);
      
      if (!res.ok) {
        const error = await res.text();
        console.error(`API error for ${interest}:`, error);
        continue;
      }
      
      const data = await res.json();
      console.log(`Received ${data.events?.length || 0} events for ${interest}`);
      
      if (data && Array.isArray(data.events)) {
        for (const e of data.events) {
          results.push(e);
        }
      }
    } catch (err: any) {
      console.error(`Fetch error for ${interest}:`, err.message || err);
    }
  }
  
  console.log(`Total events collected: ${results.length}`);
  
  // Remove duplicates and format
  const uniqueMap = new Map();
  for (const r of results) {
    if (!uniqueMap.has(r.id)) uniqueMap.set(r.id, r);
  }
  
  const formatted = formatEventbriteEvents(Array.from(uniqueMap.values()));
  console.log(`Formatted to ${formatted.length} unique events`);
  return formatted;
}

// Smart matching algorithm
function calculateCompatibility(currentUser: any, profile: any): { score: number; interestOverlap: number; eventAlignment: number; distanceScore: number } {
  // Mutual interests overlap (0-100)
  const currentInterests = currentUser.interests || [];
  const profileInterests = profile.interests || [];
  const mutualCount = currentInterests.filter((i: string) => profileInterests.includes(i)).length;
  const totalUnique = new Set([...currentInterests, ...profileInterests]).size;
  const interestOverlap = totalUnique > 0 ? Math.round((mutualCount / totalUnique) * 100) : 0;

  // Event preferences alignment: check if interests align with common event categories
  const eventCategories = ['music', 'art', 'food', 'fitness', 'tech', 'coffee'];
  const commonEventCategories = eventCategories.filter(cat => currentInterests.includes(cat) && profileInterests.includes(cat));
  const eventAlignment = commonEventCategories.length > 0 ? Math.round((commonEventCategories.length / eventCategories.length) * 100) : interestOverlap;

  // Distance proximity: mock distance score (could be real GPS in production)
  // Assume users in same city get higher score
  const currentCity = currentUser.location?.city || '';
  const profileCity = profile.location?.city || '';
  const distanceScore = currentCity === profileCity ? 100 : Math.max(50, 100 - (Math.random() * 30));

  // Overall compatibility: weighted average
  const score = Math.round((interestOverlap * 0.5 + eventAlignment * 0.25 + distanceScore * 0.25));

  return { score, interestOverlap, eventAlignment, distanceScore };
}

// Format Eventbrite events to match app event structure
function formatEventbriteEvents(events: any[]): any[] {
  return events.map((e: any) => {
    const eventName = e.name?.text || 'Event';
    const startDate = e.start?.local || '';
    const venueInfo = e.venue_id ? `Venue ${e.venue_id}` : 'Location TBA';
    const price = e.ticket_availability?.minimum_ticket_price?.display || (e.is_free ? 'Free' : 'Paid');
    
    // Guess category from event name
    const nameUpper = eventName.toUpperCase();
    let category = 'music';
    if (nameUpper.includes('FOOD') || nameUpper.includes('DINNER') || nameUpper.includes('LUNCH')) category = 'food';
    else if (nameUpper.includes('ART') || nameUpper.includes('GALLERY') || nameUpper.includes('EXHIBIT')) category = 'art';
    else if (nameUpper.includes('FIT') || nameUpper.includes('YOGA') || nameUpper.includes('GYM')) category = 'fitness';
    else if (nameUpper.includes('TECH') || nameUpper.includes('CODE') || nameUpper.includes('DEVELOPER')) category = 'tech';
    else if (nameUpper.includes('COFFEE') || nameUpper.includes('CAFE')) category = 'coffee';
    else if (nameUpper.includes('MUSIC') || nameUpper.includes('CONCERT') || nameUpper.includes('FESTIVAL')) category = 'music';

    return {
      id: e.id,
      name: eventName,
      venue: venueInfo,
      date: startDate,
      price,
      category,
      url: e.url,
      source: 'eventbrite',
    };
  });
}

export default function Index() {
  const [screen, setScreen] = useState<"login" | "home" | "onboarding" | "swipe" | "match" | "events">("login");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showEmailLogin, setShowEmailLogin] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState({ name: "", age: '', photo: '🙂', bio: '', interests: [] as string[], location: { city: "" } });
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [matches, setMatches] = useState<any[]>([]);
  const [currentMatch, setCurrentMatch] = useState<any | null>(null);
  const [suggestedEvents, setSuggestedEvents] = useState<any[]>([]);
  const [eventbriteToken, setEventbriteToken] = useState<string>("");
  const homeScrollRef = useRef<any>(null);

  useEffect(() => {
    try {
      const t = localStorage.getItem("eventbrite_token");
      if (t) setEventbriteToken(t);
    } catch (e) {}
  }, []);

  // load saved profile
  useEffect(() => {
    try {
      const p = localStorage.getItem('profile');
      if (p) {
        const parsed = JSON.parse(p);
        if (parsed) {
          if (parsed.name === 'AppleUser' || parsed.name === 'Tom') parsed.name = '';
          if (parsed.location && parsed.location.city === 'London') parsed.location.city = '';
        }
        setCurrentUser(prev => ({ ...prev, ...parsed }));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("eventbrite_token", eventbriteToken); } catch (e) {}
  }, [eventbriteToken]);

  // persist profile
  useEffect(() => {
    try { localStorage.setItem('profile', JSON.stringify(currentUser)); } catch (e) {}
  }, [currentUser]);

  const availableInterests = ["music", "art", "food", "fitness", "tech", "coffee"];

  const handleInterestSelect = (interest: string) => {
    if (currentUser.interests.includes(interest)) {
      setCurrentUser({ ...currentUser, interests: currentUser.interests.filter(i => i !== interest) });
    } else {
      setCurrentUser({ ...currentUser, interests: [...currentUser.interests, interest] });
    }
  };

  const handleSwipe = (direction: "left" | "right") => {
    if (direction === "right") {
      const profile = MOCK_USERS[currentProfileIndex];
      const mutualInterests = currentUser.interests.filter(i => profile.interests.includes(i));
      
      if (mutualInterests.length > 0) {
        // Use smart matching algorithm
        const { score, interestOverlap, eventAlignment, distanceScore } = calculateCompatibility(currentUser, profile);
        
        const match = {
          user: profile,
          mutualInterests,
          compatibility: score,
          interestOverlap,
          eventAlignment,
          distanceScore,
        };
        setCurrentMatch(match);
        setMatches(prev => [...prev, match]);

        // fetch live events, fall back to mock
        (async () => {
          const live = await fetchEventbriteEvents(mutualInterests, currentUser.location, eventbriteToken);
          if (live && live.length > 0) setSuggestedEvents(live);
          else setSuggestedEvents(mutualInterests.flatMap((i: string) => MOCK_EVENTS[i as keyof typeof MOCK_EVENTS] || []));
        })();

        setScreen("match");
      }
    }
    setCurrentProfileIndex(idx => (idx < MOCK_USERS.length - 1 ? idx + 1 : 0));
  };

  const viewEvents = async () => {
    if (currentMatch) {
      // if suggestedEvents empty, try live fetch
      if (!suggestedEvents || suggestedEvents.length === 0) {
        const live = await fetchEventbriteEvents(currentMatch.mutualInterests, currentUser.location, eventbriteToken);
        if (live && live.length > 0) setSuggestedEvents(live);
        else setSuggestedEvents(currentMatch.mutualInterests.flatMap((i: string) => MOCK_EVENTS[i as keyof typeof MOCK_EVENTS] || []));
      }
    }
    setScreen("events");
  };

  const backToSwipe = () => { setScreen("swipe"); setCurrentMatch(null); };

  // Animated pan and PanResponder for swipe gestures
  const pan = useRef(new Animated.ValueXY()).current;
  const rotate = pan.x.interpolate({ inputRange: [-300, 0, 300], outputRange: ['-15deg', '0deg', '15deg'], extrapolate: 'clamp' });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (e, { dx, dy }) => {
        const absDx = Math.abs(dx);
        if (absDx > 120) {
          const dir = dx > 0 ? 'right' : 'left';
          Animated.timing(pan, { toValue: { x: dir === 'right' ? 500 : -500, y: dy }, duration: 200, useNativeDriver: false }).start(() => {
            pan.setValue({ x: 0, y: 0 });
            handleSwipe(dir as any);
          });
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: false }).start();
        }
      }
    })
  ).current;

  // Bottom navigation component
  const BottomNav = () => (
    <View style={styles.bottomNav}>
      <TouchableOpacity style={styles.navButton} onPress={() => setScreen('home')}>
        <Text style={styles.navIcon}>🏠</Text>
        <Text style={styles.navLabel}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navButton} onPress={() => setScreen('swipe')}>
        <Text style={styles.navIcon}>🫰</Text>
        <Text style={styles.navLabel}>Swipe</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navButton} onPress={() => setScreen('match')}>
        <Text style={styles.navIcon}>💬</Text>
        <Text style={styles.navLabel}>Chats</Text>
        {matches.length > 0 && (
          <View style={styles.navBadge}><Text style={styles.navBadgeText}>{matches.length}</Text></View>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.navButton} onPress={() => setScreen('events')}>
        <Text style={styles.navIcon}>🎟️</Text>
        <Text style={styles.navLabel}>Events</Text>
      </TouchableOpacity>
    </View>
  );

  // Screens

  // Login Screen
  if (screen === "login") {
    const handleAppleSignIn = () => {
      // Simulate Apple sign-in for demo (does not auto-set name)
      setScreen('home');
    };
    const handleGoogleSignIn = () => {
      // Simulate Google sign-in for demo
      setCurrentUser({ ...currentUser, name: 'GoogleUser' });
      setScreen('home');
    };

    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4D8C8' }]}> 
        <View style={[styles.card, { maxWidth: 420, width: '92%' }]}> 
          <Text style={styles.h2}>Welcome to Britedates</Text>
          <Text style={styles.subtitle}>Find your perfect first date — quick sign in to continue.</Text>

          <TouchableOpacity onPress={handleAppleSignIn} style={[styles.socialButton, { backgroundColor: '#000' }]}> 
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <View style={[styles.iconCircle, { backgroundColor: 'white', marginRight: 8 }]}>
                <Text style={{ fontSize: 16, color: '#000' }}></Text>
              </View>
              <Text style={styles.socialText}>Sign in with Apple</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleGoogleSignIn} style={[styles.socialButton, { backgroundColor: '#4285F4' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <View style={[styles.iconCircle, { backgroundColor: 'white', marginRight: 8 }]}> 
                <Text style={{ fontSize: 16, color: '#4285F4', fontWeight: '900' }}>G</Text>
              </View>
              <Text style={styles.socialText}>Sign in with Google</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowEmailLogin(true)} style={styles.moreOptions}><Text style={{ color: '#666' }}>More options (email)</Text></TouchableOpacity>

          {showEmailLogin && (
            <>
              <TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" style={styles.loginInput} />
              <TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry style={styles.loginInput} />
              <TouchableOpacity onPress={() => {
                // simple validation
                if (email && email.includes('@')) {
                  const name = email.split('@')[0];
                  setCurrentUser({ ...currentUser, name });
                  setScreen('home');
                } else {
                  setScreen('home');
                }
              }} style={styles.loginButton}><Text style={{ color: 'white', fontWeight: '700' }}>Continue</Text></TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Home / Profile screen
  if (screen === 'home') {
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF7F2' }]}> 
        <ScrollView ref={homeScrollRef} contentContainerStyle={{ alignItems: 'center', paddingBottom: 120 }} style={{ width: '100%' }}>
          <View style={[styles.card, { maxWidth: 520, width: '94%' }]}> 
            <Text style={styles.h2}>Your Profile</Text>
            <Text style={styles.subtitle}>Add a display name, emoji/photo, bio and location so matches learn about you.</Text>
            <TouchableOpacity onPress={() => { homeScrollRef.current?.scrollToEnd({ animated: true }); }} style={styles.scrollButton}><Text style={{ color: '#FF6B35', fontWeight: '700' }}>Scroll down ↓</Text></TouchableOpacity>

          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            {((currentUser.photo || '').startsWith('http') || (currentUser.photo || '').startsWith('data:')) ? (
              <Image source={{ uri: currentUser.photo }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholder}><Text style={{ fontSize: 48 }}>{currentUser.photo}</Text></View>
            )}

            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <TouchableOpacity onPress={() => {
                if (typeof document !== 'undefined') {
                  const inp = document.createElement('input');
                  inp.type = 'file';
                  inp.accept = 'image/*';
                  inp.onchange = async (e: any) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      setCurrentUser(prev => ({ ...prev, photo: reader.result as string }));
                    };
                    reader.readAsDataURL(file);
                  };
                  inp.click();
                }
              }} style={[styles.loginButton, { marginRight: 8 }]}> 
                <Text style={{ color: 'white', fontWeight: '700' }}>Upload Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setCurrentUser(prev => ({ ...prev, photo: '🙂' })); }} style={[styles.ctaOutline, { paddingHorizontal: 12 }]}> 
                <Text style={{ color: '#E8967D', fontWeight: '700' }}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={{ fontWeight: '700' }}>Name</Text>
          <TextInput value={currentUser.name} onChangeText={(v) => setCurrentUser({ ...currentUser, name: v })} placeholder="Name" style={styles.loginInput} />

          <Text style={{ fontWeight: '700' }}>Age</Text>
          <TextInput value={currentUser.age as any} onChangeText={(v) => setCurrentUser({ ...currentUser, age: v })} placeholder="Age" keyboardType="numeric" style={styles.loginInput} />

          <Text style={{ fontWeight: '700' }}>City</Text>
          <TextInput value={currentUser.location.city} onChangeText={(v) => setCurrentUser({ ...currentUser, location: { city: v } })} placeholder="City" style={styles.loginInput} />

          <Text style={{ fontWeight: '700' }}>Short bio</Text>
          <TextInput value={currentUser.bio} onChangeText={(v) => setCurrentUser({ ...currentUser, bio: v })} placeholder="A short intro" style={[styles.loginInput, { height: 80 }]} multiline />
          <Text style={{ marginTop: 12, fontWeight: '800' }}>What's your vibe?</Text>
          <Text style={styles.subtitle}>Pick a few interests that match your vibe.</Text>

          <View style={styles.grid}>
            {availableInterests.map(interest => {
              const isSelected = currentUser.interests.includes(interest);
              return (
                <TouchableOpacity key={interest} onPress={() => handleInterestSelect(interest)} style={[styles.chip, isSelected && styles.chipSelected]}>
                  <Text style={{ marginRight: 8 }}>{INTEREST_ICONS[interest]}</Text>
                  <Text style={{ textTransform: 'capitalize', color: isSelected ? '#E8967D' : '#333' }}>{interest}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity disabled={currentUser.interests.length === 0} onPress={() => setScreen('swipe')} style={[styles.loginButton, currentUser.interests.length === 0 && styles.ctaDisabled, { marginTop: 8 }]}>
            <Text style={{ color: 'white', fontWeight: '700' }}>Save & Start Finding Dates</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        <BottomNav />
      </SafeAreaView>
    );
  }

  if (screen === "swipe") {
    const currentProfile = MOCK_USERS[currentProfileIndex];
    const nextProfile = MOCK_USERS[(currentProfileIndex + 1) % MOCK_USERS.length];
    const rotateStr = rotate;
    const animatedStyle: any = { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate: rotateStr }] };

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#f5f5f5' }]}> 
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setScreen('home')} style={{ paddingRight: 12 }}><Text>← Back</Text></TouchableOpacity>
          <Text style={{ fontWeight: '800' }}>Brite dates</Text>
          <Text style={styles.badge}>{matches.length} matches</Text>
        </View>

        <View style={{ alignItems: 'center', marginTop: 24 }}>
          {nextProfile && (
            <View style={[styles.profileCard, { position: 'absolute', top: 0, width: '90%', opacity: 0.8 }]}>
              <View style={styles.photo}><Text style={{ fontSize: 120 }}>{nextProfile.photo}</Text></View>
              <View style={{ padding: 16 }}>
                <Text style={{ fontSize: 20, fontWeight: '700' }}>{nextProfile.name}, {nextProfile.age}</Text>
                <Text style={{ color: '#666', marginVertical: 8 }}>📍 {nextProfile.location.city}</Text>
              </View>
            </View>
          )}

          <Animated.View {...panResponder.panHandlers} style={[styles.profileCard, animatedStyle, { width: '90%' }] as any}>
            <View style={styles.photo}><Text style={{ fontSize: 120 }}>{currentProfile.photo}</Text></View>
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '700' }}>{currentProfile.name}, {currentProfile.age}</Text>
              <Text style={{ color: '#666', marginVertical: 8 }}>📍 {currentProfile.location.city}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {currentProfile.interests.map(i => (
                  <View key={i} style={[styles.tag, currentUser.interests.includes(i) && styles.tagMutual]}>
                    <Text>{INTEREST_ICONS[i]} {i}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 220 }}>
          <TouchableOpacity onPress={() => {
            Animated.timing(pan, { toValue: { x: -500, y: 0 }, duration: 200, useNativeDriver: false }).start(() => { pan.setValue({ x: 0, y: 0 }); handleSwipe('left'); });
          }} style={styles.circleButton}><Text>✖️</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => {
            Animated.timing(pan, { toValue: { x: 500, y: 0 }, duration: 200, useNativeDriver: false }).start(() => { pan.setValue({ x: 0, y: 0 }); handleSwipe('right'); });
          }} style={[styles.circleButton, styles.heartButton]}><Text style={{ color: 'white' }}>❤️</Text></TouchableOpacity>
        </View>
        <BottomNav />
      </SafeAreaView>
    );
  }

  if (screen === 'match') {
    if (currentMatch) {
      return (
        <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8967D' }]}> 
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setScreen('home')} style={{ paddingRight: 12 }}><Text>← Back</Text></TouchableOpacity>
            <Text style={{ fontWeight: '800' }}>Chats</Text>
            <Text style={styles.badge}>{matches.length} matches</Text>
          </View>
          <View style={styles.matchBox}>
            <Text style={{ fontSize: 48 }}>🔥</Text>
            <Text style={{ fontSize: 28, fontWeight: '900' }}>It's a Match!</Text>
            <Text style={{ fontSize: 48 }}>{currentMatch.user.photo}</Text>
            <Text style={{ fontSize: 20, marginVertical: 8 }}>You and {currentMatch.user.name}</Text>
            <View style={{ backgroundColor: '#FFF3E0', padding: 12, borderRadius: 12, marginVertical: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: 28, color: '#FF6B35', fontWeight: '900' }}>{currentMatch.compatibility}%</Text>
              <Text style={{ color: '#666' }}>Compatibility Match</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
              {currentMatch.mutualInterests.map((mi: string) => (
                <View key={mi} style={styles.mutual}><Text>{INTEREST_ICONS[mi]} {mi}</Text></View>
              ))}
            </View>
            <TouchableOpacity onPress={viewEvents} style={[styles.cta, { marginTop: 12 }]}><Text style={styles.ctaText}>See Perfect Date Ideas 🎉</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setCurrentMatch(null)} style={[styles.ctaOutline, { marginTop: 8 }]}><Text style={{ color: '#E8967D', fontWeight: '700' }}>Back to Chats</Text></TouchableOpacity>
          </View>
          <BottomNav />
        </SafeAreaView>
      );
    }

    // Chat list when no active selected match
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#f8f8f8' }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setScreen('home')} style={{ paddingRight: 12 }}><Text>← Back</Text></TouchableOpacity>
          <Text style={{ fontWeight: '800' }}>Chats</Text>
          <Text style={styles.badge}>{matches.length} matches</Text>
        </View>
        <View style={[styles.card, { marginTop: 16 }]}> 
          <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: 8 }}>Chats</Text>
          {matches.length === 0 && <Text style={{ color: '#666' }}>No matches yet — swipe to meet people.</Text>}
          {matches.map((m, idx) => (
            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
              <View style={styles.imagePlaceholder}><Text style={{ fontSize: 28 }}>{m.user.photo}</Text></View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontWeight: '800' }}>{m.user.name}</Text>
                <Text style={{ color: '#666' }}>{m.mutualInterests.join(', ')} • {m.compatibility}%</Text>
              </View>
              <TouchableOpacity onPress={() => setCurrentMatch(m)} style={[styles.loginButton, { paddingVertical: 8, paddingHorizontal: 12 }]}><Text style={{ color: 'white' }}>Open</Text></TouchableOpacity>
            </View>
          ))}
        </View>
        <BottomNav />
      </SafeAreaView>
    );
  }

  if (screen === 'events') {
    const loadEventbriteEvents = async () => {
      try {
        // Use current user interests or currentMatch interests
        const interests = currentMatch?.mutualInterests || currentUser.interests || ['music'];
        const live = await fetchEventbriteEvents(interests, currentUser.location, 'dummy-token');
        if (live && live.length > 0) {
          setSuggestedEvents(live);
          alert(`Loaded ${live.length} events from Eventbrite!`);
        } else {
          alert('No Eventbrite events found. Check your proxy is running and Eventbrite has events for these interests.');
        }
      } catch (err) {
        console.error('Error loading events:', err);
        alert('Error loading events. Check console for details.');
      }
    };

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#FFEDE2' }]}> 
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={styles.headerLarge}>
            <View style={styles.logoCircle}><Text style={{ fontSize: 36, color: 'white', fontWeight: '900' }}>e</Text></View>
            <View style={{ marginLeft: 12 }}>
              <Text style={{ fontSize: 28, fontWeight: '900', color: '#FF6B35' }}>Britedates</Text>
              <Text style={{ color: '#E06A3A' }}>Find your perfect first date!</Text>
            </View>
          </View>

          <TouchableOpacity onPress={backToSwipe} style={styles.backButton}><Text>← Back</Text></TouchableOpacity>

          <TouchableOpacity onPress={loadEventbriteEvents} style={[styles.loadButton, { width: '100%', marginBottom: 12 }]}><Text style={{ color: 'white', fontWeight: '700' }}>Load Real Eventbrite Events</Text></TouchableOpacity>
          <View style={{ backgroundColor: '#FFF5EE', padding: 12, borderRadius: 8, marginBottom: 12 }}>
            <Text style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>ℹ️ This app is connected to Eventbrite API via Vercel serverless function. Click above to load real London events!</Text>
          </View>

          {(!suggestedEvents || suggestedEvents.length === 0) && <View style={styles.empty}><Text style={{ marginBottom: 8 }}>Browse exciting events happening around you:</Text></View>}
          {(!suggestedEvents || suggestedEvents.length === 0) && Object.values(MOCK_EVENTS).flat().map((ev, idx) => {
            const partner = currentMatch?.user || matches[0]?.user || { name: 'someone', photo: '🙂' };
            const mutual = currentMatch?.mutualInterests?.[0] || matches[0]?.mutualInterests?.[0] || ev.category || 'events';
            return (
              <View key={ev.id} style={styles.eventLargeContainer}>
                <View style={styles.eventLargeCard}>
                  <View style={styles.eventImage}>
                    <Text style={{ color: 'white' }}>Image</Text>
                  </View>
                  <View style={styles.eventDetails}>
                    <Text style={{ fontSize: 18, fontWeight: '800' }}>{ev.name}</Text>
                    <Text style={{ color: '#666', marginVertical: 6 }}>{ev.venue} • {ev.date}</Text>
                    <Text style={{ color: '#E8967D', fontWeight: '800' }}>{ev.price}</Text>
                  </View>
                </View>

                <View style={styles.pairRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '800', color: '#E0542D' }}>You and {partner?.name || 'someone'} love {mutual}, how about a night out?</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                      <View style={styles.pairPhoto}><Text style={{ fontSize: 28 }}>{currentUser.photo}</Text></View>
                      <Text style={{ fontSize: 28, marginHorizontal: 8 }}>+</Text>
                      <View style={styles.pairPhoto}><Text style={{ fontSize: 28 }}>{partner?.photo || '🙂'}</Text></View>
                    </View>
                  </View>
                  <Text style={styles.distanceLarge}>{(idx+1)*2}km</Text>
                </View>
              </View>
            );
          })}

          {(suggestedEvents && suggestedEvents.length > 0) && suggestedEvents.map((ev, idx) => {
            const match = currentMatch || matches[idx] || matches[0];
            const partner = match?.user || { name: 'someone', photo: '🙂' };
            const compatibility = match?.compatibility || 75;
            const mutual = match?.mutualInterests?.[0] || ev.category || 'events';
            const categoryEmoji: Record<string, string> = { food: '🍽️', music: '🎵', art: '🎨', fitness: '🧘', tech: '💻', coffee: '☕' };
            const eventIcon = categoryEmoji[ev.category] || '🎉';
            const bgColors: Record<string, string> = { 
              food: '#FF8C00', 
              music: '#9D4EDD', 
              art: '#3A86FF', 
              fitness: '#06A77D', 
              tech: '#FB5607', 
              coffee: '#8B4513' 
            };
            const bgColor = bgColors[ev.category] || '#FF6B35';
            return (
              <View key={ev.id || idx} style={styles.eventLargeContainer}>
                <View style={styles.eventLargeCard}>
                  <View style={[styles.eventImage, { backgroundColor: bgColor }]}>
                    <Text style={{ fontSize: 64 }}>{eventIcon}</Text>
                    <TouchableOpacity style={styles.buyButton}><Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>buy together</Text></TouchableOpacity>
                  </View>
                  <View style={styles.eventDetails}>
                    <Text style={{ fontSize: 11, color: '#E8967D', fontWeight: '700' }}>Almost full</Text>
                    <Text style={{ fontSize: 16, fontWeight: '800', marginVertical: 4 }}>{ev.name}</Text>
                    <Text style={{ color: '#666', marginVertical: 4, fontSize: 12 }}>{ev.venue} • {ev.date}</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Text style={{ color: '#999', fontSize: 12, textDecorationLine: 'line-through' }}>From £13.69</Text>
                      <Text style={{ color: '#E8967D', fontWeight: '800' }}>OR</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.pairRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '800', color: '#E0542D', marginBottom: 8 }}>You and {partner.name} love {mutual}, how about a night out?</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <View style={styles.pairPhoto}><Text style={{ fontSize: 24 }}>{currentUser.photo}</Text></View>
                      <Text style={{ fontSize: 20, marginHorizontal: 8 }}>+</Text>
                      <View style={styles.pairPhoto}><Text style={{ fontSize: 24 }}>{partner.photo || '🙂'}</Text></View>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 28, fontWeight: '900', color: '#E8967D' }}>£27.30</Text>
                    <Text style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>{(idx+1)*2}km</Text>
                    <Text style={{ fontSize: 11, color: '#666' }}>Mutual interest</Text>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#E8967D' }}>{compatibility}%</Text>
                  </View>
                </View>

                <TouchableOpacity style={[styles.loginButton, { marginTop: 12 }]}><Text style={{ color: 'white', fontWeight: '700' }}>Suggest to {partner.name}</Text></TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
        <BottomNav />
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 14, margin: 16 },
  h2: { fontSize: 20, fontWeight: '800', marginBottom: 12, color: '#FF6B35' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', margin: 6 },
  chipSelected: { borderColor: '#FF6B35', backgroundColor: '#FFF5EE' },
  cta: { marginTop: 12, padding: 14, borderRadius: 50, backgroundColor: '#FF6B35', alignItems: 'center' },
  ctaDisabled: { backgroundColor: '#ddd' },
  ctaText: { color: 'white', fontWeight: '800' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 12 },
  loginInput: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 12, backgroundColor: 'white' },
  loginButton: { padding: 12, borderRadius: 8, backgroundColor: '#FF6B35', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  badge: { backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  bottomNav: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 72, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  navButton: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  navIcon: { fontSize: 22 },
  navLabel: { fontSize: 12, color: '#666' },
  navBadge: { position: 'absolute', top: -6, right: -12, backgroundColor: '#FF6B35', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  navBadgeText: { color: 'white', fontSize: 12, fontWeight: '700' },
  profileCard: { backgroundColor: 'white', margin: 16, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.1, elevation: 2 },
  photo: { height: 240, alignItems: 'center', justifyContent: 'center', fontSize: 80, backgroundColor: '#FFF5EE' as any },
  circleButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ddd' },
  heartButton: { backgroundColor: '#FF6B35' },
  matchBox: { backgroundColor: 'white', padding: 20, borderRadius: 16, alignItems: 'center', width: '90%' },
  mutual: { padding: 10, borderRadius: 20, backgroundColor: '#FFF5EE', borderWidth: 1, borderColor: '#FF6B35', margin: 6 },
  backButton: { marginBottom: 8 },
  tokenInput: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', backgroundColor: 'white' },
  loadButton: { padding: 10, borderRadius: 8, backgroundColor: '#FF6B35', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  empty: { padding: 16, backgroundColor: 'white', borderRadius: 12 },
  eventCard: { backgroundColor: 'white', padding: 12, borderRadius: 12, flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 },
  eventIcon: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#FFF5EE', alignItems: 'center', justifyContent: 'center' },
  badgeSmall: { fontSize: 12, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#E8F0FF', color: '#1664D8', borderRadius: 8 },
  suggestBtn: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#FF6B35' },
  tag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f0f0f0', margin: 4 },
  tagMutual: { backgroundColor: '#FFF5EE', borderWidth: 1, borderColor: '#FF6B35' },
  imagePlaceholder: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF5EE', marginBottom: 8 },
  imagePreview: { width: 120, height: 120, borderRadius: 60, marginBottom: 8 },
  socialButton: { padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  scrollButton: { marginTop: 8, alignItems: 'center' },
  socialText: { color: 'white', fontWeight: '700' },
  moreOptions: { alignItems: 'center', marginVertical: 8 },
  iconCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buyButton: { position: 'absolute', bottom: 12, right: 12, backgroundColor: '#FF9500', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  eventLargeContainer: { backgroundColor: 'white', marginBottom: 16, borderRadius: 12, overflow: 'hidden' },
  eventLargeCard: { flexDirection: 'row', height: 180 },
  eventImage: { width: '40%', backgroundColor: '#333', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  eventDetails: { width: '60%', padding: 12, justifyContent: 'space-between' },
  pairPhoto: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF5EE', alignItems: 'center', justifyContent: 'center' },
  pairRow: { flexDirection: 'row', padding: 12, alignItems: 'flex-start' },
  distanceLarge: { fontSize: 24, fontWeight: '900', color: '#E8967D' },
  ctaOutline: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#FF6B35', alignItems: 'center' },
  headerLarge: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FF6B35', borderRadius: 12, marginBottom: 16 },
  logoCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E8967D', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
});
