const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '../.env' });

const Expert = require('../models/Expert');

const generateSlots = (daysAhead = 14) => {
  const slots = [];
  const times = [
    { start: '09:00', end: '10:00' },
    { start: '10:30', end: '11:30' },
    { start: '12:00', end: '13:00' },
    { start: '14:00', end: '15:00' },
    { start: '15:30', end: '16:30' },
    { start: '17:00', end: '18:00' },
  ];

  for (let i = 1; i <= daysAhead; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const day = date.getDay();
    if (day === 0 || day === 6) continue; 

    const dateStr = date.toISOString().split('T')[0];
    times.forEach(({ start, end }) => {
      slots.push({ date: dateStr, startTime: start, endTime: end, isBooked: false });
    });
  }
  return slots;
};

const experts = [
  {
    name: 'Dr. Priya Sharma',
    category: 'Health',
    experience: 12,
    rating: 4.9,
    bio: 'Board-certified physician specializing in preventive medicine and holistic wellness. Former chief resident at AIIMS Delhi.',
    hourlyRate: 3500,
    totalReviews: 328,
    tags: ['nutrition', 'mental health', 'preventive care', 'wellness'],
    availableSlots: generateSlots(),
  },
  {
    name: 'Arjun Mehta',
    category: 'Finance',
    experience: 9,
    rating: 4.7,
    bio: 'SEBI-registered investment advisor with expertise in equity markets, mutual funds, and retirement planning. Ex-Goldman Sachs analyst.',
    hourlyRate: 5000,
    totalReviews: 214,
    tags: ['investment', 'stocks', 'mutual funds', 'tax planning', 'retirement'],
    availableSlots: generateSlots(),
  },
  {
    name: 'Sneha Patel',
    category: 'Technology',
    experience: 7,
    rating: 4.8,
    bio: 'Full-stack engineer and startup CTO. Expert in system design, cloud architecture, and engineering leadership. Built products used by 10M+ users.',
    hourlyRate: 6000,
    totalReviews: 189,
    tags: ['system design', 'cloud', 'startup', 'engineering management', 'AWS'],
    availableSlots: generateSlots(),
  },
  {
    name: 'Adv. Rahul Verma',
    category: 'Legal',
    experience: 15,
    rating: 4.6,
    bio: 'Corporate lawyer specializing in startup law, contracts, IP rights, and M&A. Handled 200+ funding rounds and acquisitions.',
    hourlyRate: 7500,
    totalReviews: 156,
    tags: ['contracts', 'startup law', 'IP', 'fundraising', 'M&A'],
    availableSlots: generateSlots(),
  },
  {
    name: 'Kavya Nair',
    category: 'Marketing',
    experience: 6,
    rating: 4.8,
    bio: 'Growth marketing strategist who scaled multiple D2C brands from 0 to ₹10Cr ARR. Specialist in performance marketing and brand building.',
    hourlyRate: 4000,
    totalReviews: 275,
    tags: ['growth hacking', 'D2C', 'performance marketing', 'brand strategy', 'SEO'],
    availableSlots: generateSlots(),
  },
  {
    name: 'Vikram Iyer',
    category: 'Design',
    experience: 8,
    rating: 4.7,
    bio: 'Product design lead at a Fortune 500. Expert in UX research, design systems, and building user-centered products at scale.',
    hourlyRate: 5500,
    totalReviews: 203,
    tags: ['UX', 'product design', 'design systems', 'Figma', 'user research'],
    availableSlots: generateSlots(),
  },
  {
    name: 'Riya Bose',
    category: 'Business',
    experience: 11,
    rating: 4.9,
    bio: 'Ex-McKinsey consultant and serial entrepreneur. Helped 50+ startups with strategy, fundraising pitch decks, and go-to-market planning.',
    hourlyRate: 8000,
    totalReviews: 312,
    tags: ['strategy', 'consulting', 'fundraising', 'go-to-market', 'operations'],
    availableSlots: generateSlots(),
  },
  {
    name: 'Prof. Anil Kumar',
    category: 'Education',
    experience: 20,
    rating: 4.6,
    bio: 'IIT professor and EdTech founder. Expert in curriculum design, academic research, and STEM education for students and professionals.',
    hourlyRate: 2500,
    totalReviews: 445,
    tags: ['STEM', 'curriculum', 'EdTech', 'research', 'teaching'],
    availableSlots: generateSlots(),
  },
];

const seed = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/expert-booking';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    await Expert.deleteMany({});
    console.log('Cleared existing experts');

    const created = await Expert.insertMany(experts);
    console.log(` Seeded ${created.length} experts with time slots`);

    await mongoose.disconnect();
    console.log('Done!');
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

seed();
