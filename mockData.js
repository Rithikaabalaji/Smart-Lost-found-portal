/**
 * Realistic Mock Data for Instant Demo / Offline Mode.
 * Designed with intentionally paired Lost & Found items to showcase
 * the Smart Similarity Matching Engine and Claims Workflow.
 */

export const INITIAL_PROFILES = [
  {
    id: 'usr_alice_01',
    full_name: 'Alice Chen',
    email: 'alice.chen@campus.edu',
    phone: '+1 (555) 234-5678',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr_bob_02',
    full_name: 'Bob Martinez',
    email: 'bob.m@campus.edu',
    phone: '+1 (555) 876-5432',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr_clara_03',
    full_name: 'Clara Vance',
    email: 'clara.vance@campus.edu',
    phone: '+1 (555) 432-1098',
    avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
  }
];

export const INITIAL_ITEMS = [
  // Pair 1: MacBook Air (Lost vs Found)
  {
    id: 'item_01_lost_macbook',
    user_id: 'usr_bob_02',
    type: 'lost',
    title: 'Space Gray MacBook Air M2 13-inch',
    description: 'Lost my MacBook Air M2 in a dark grey sleeve. Has a holographic NASA astronaut sticker on the top right cover corner. Contains thesis research files.',
    category: 'Electronics',
    location: 'University Main Library 2nd Floor Study Room',
    item_date: '2026-10-17',
    image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
    contact_info: 'bob.m@campus.edu / Text: (555) 876-5432',
    status: 'pending_claim',
    created_at: '2026-10-17T14:30:00Z'
  },
  {
    id: 'item_02_found_macbook',
    user_id: 'usr_alice_01',
    type: 'found',
    title: 'Apple MacBook Air Laptop with Astronaut Sticker',
    description: 'Turned in a space gray 13" Apple laptop found on desk #14. Has a cute space astronaut sticker on top. Handed to librarian desk or can meet student.',
    category: 'Electronics',
    location: 'Main Library Quiet Study Area Level 2',
    item_date: '2026-10-17',
    image_url: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&auto=format&fit=crop&q=80',
    contact_info: 'Handed to Library Desk or message via portal',
    status: 'pending_claim',
    created_at: '2026-10-17T17:00:00Z'
  },

  // Pair 2: Leather Wallet (Lost vs Found)
  {
    id: 'item_03_lost_wallet',
    user_id: 'usr_bob_02',
    type: 'lost',
    title: 'Brown Leather Fossil Bi-Fold Wallet',
    description: 'Lost my brown leather Fossil wallet. Contains driver license for Bob Martinez, student ID, and metro pass. Keep the cash, just need the cards back!',
    category: 'Wallets & Bags',
    location: 'Campus Food Court & Cafeteria',
    item_date: '2026-10-16',
    image_url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&auto=format&fit=crop&q=80',
    contact_info: 'bob.m@campus.edu',
    status: 'open',
    created_at: '2026-10-16T12:00:00Z'
  },
  {
    id: 'item_04_found_wallet',
    user_id: 'usr_clara_03',
    type: 'found',
    title: "Men's Brown Leather Bi-fold Wallet",
    description: 'Found a brown genuine leather wallet left on the booth seat near the smoothie counter. Contains cards with initials B.M.',
    category: 'Wallets & Bags',
    location: 'Cafeteria Booth near Juice Bar',
    item_date: '2026-10-16',
    image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80',
    contact_info: 'clara.vance@campus.edu',
    status: 'open',
    created_at: '2026-10-16T15:20:00Z'
  },

  // Pair 3: Car Keys on blue clip (Lost vs Found - Resolved sample)
  {
    id: 'item_05_lost_keys',
    user_id: 'usr_bob_02',
    type: 'lost',
    title: 'Subaru Car Keys with Blue Carabiner Clip',
    description: 'Key fob with Subaru badge, house key, and a royal blue aluminium carabiner clip with a small bottle opener.',
    category: 'Keys',
    location: 'North Student Parking Lot Block B',
    item_date: '2026-10-18',
    image_url: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800&auto=format&fit=crop&q=80',
    contact_info: '(555) 876-5432',
    status: 'resolved',
    created_at: '2026-10-18T09:15:00Z'
  },
  {
    id: 'item_06_found_keys',
    user_id: 'usr_alice_01',
    type: 'found',
    title: 'Car Key Fob with Blue Carabiner and House Keys',
    description: 'Found in the leaves along the sidewalk by parking lot B. Has a car lock fob and a blue metal clip.',
    category: 'Keys',
    location: 'North Parking Lot walkway',
    item_date: '2026-10-18',
    image_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
    contact_info: 'alice.chen@campus.edu',
    status: 'resolved',
    created_at: '2026-10-18T10:45:00Z'
  },

  // Standalone Item 4: Lost Student ID
  {
    id: 'item_07_lost_id',
    user_id: 'usr_clara_03',
    type: 'lost',
    title: 'Student ID Card - Clara Vance (Dept of Biology)',
    description: 'Lost my white magnetic university campus card on a green lanyard. Last seen near the Science Hall lecture hall 102.',
    category: 'IDs & Cards',
    location: 'Science Complex Building A',
    item_date: '2026-10-19',
    image_url: 'https://images.unsplash.com/photo-1589330694653-dad6d3240a2b?w=800&auto=format&fit=crop&q=80',
    contact_info: 'clara.vance@campus.edu',
    status: 'open',
    created_at: '2026-10-19T11:00:00Z'
  },

  // Standalone Item 5: Found Wireless Earbuds
  {
    id: 'item_08_found_airpods',
    user_id: 'usr_alice_01',
    type: 'found',
    title: 'White Apple AirPods Pro 2 in Black Protective Case',
    description: 'Found on the treadmill console in the campus fitness center. Case has a matte black silicone sleeve. Left with the gym front desk receptionist.',
    category: 'Electronics',
    location: 'Recreation & Fitness Center Gym',
    item_date: '2026-10-19',
    image_url: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&auto=format&fit=crop&q=80',
    contact_info: 'Inquire at Recreation Center front reception',
    status: 'open',
    created_at: '2026-10-19T16:20:00Z'
  }
];

export const INITIAL_CLAIMS = [
  {
    id: 'claim_01',
    item_id: 'item_02_found_macbook',
    claimant_id: 'usr_bob_02',
    message: 'Hello Alice! That is my MacBook Air. I left it in Room 204. You can verify it by opening the lid — the lockscreen username is "Bob M." and there is a small scratch on the USB-C port.',
    status: 'pending',
    created_at: '2026-10-17T18:10:00Z',
    updated_at: '2026-10-17T18:10:00Z'
  },
  {
    id: 'claim_02',
    item_id: 'item_06_found_keys',
    claimant_id: 'usr_bob_02',
    message: 'These are my Subaru car keys! The key ring has a mini aluminium bottle opener.',
    status: 'approved',
    created_at: '2026-10-18T11:00:00Z',
    updated_at: '2026-10-18T11:45:00Z'
  }
];

export const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif_01',
    user_id: 'usr_alice_01',
    message: 'Bob Martinez submitted a claim on your found item: "Apple MacBook Air Laptop with Astronaut Sticker"',
    read_at: null,
    link_url: '#claims',
    created_at: '2026-10-17T18:10:00Z'
  },
  {
    id: 'notif_02',
    user_id: 'usr_bob_02',
    message: 'Your claim for "Car Key Fob with Blue Carabiner and House Keys" was APPROVED by Alice Chen.',
    read_at: '2026-10-18T12:00:00Z',
    link_url: '#claims',
    created_at: '2026-10-18T11:45:00Z'
  },
  {
    id: 'notif_03',
    user_id: 'usr_bob_02',
    message: 'Smart Match Alert: A found item "Apple MacBook Air Laptop" strongly matches your lost report!',
    read_at: null,
    link_url: '#matches',
    created_at: '2026-10-17T17:05:00Z'
  }
];
