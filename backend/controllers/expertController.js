const Expert = require('../models/Expert');

// GET /api/experts
const getExperts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 6,
      category,
      search,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(20, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (search && search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { bio: { $regex: search.trim(), $options: 'i' } },
        { tags: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const [experts, total] = await Promise.all([
      Expert.find(filter)
        .select('-availableSlots')
        .sort({ rating: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Expert.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: experts,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    console.error('getExperts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch experts' });
  }
};

// GET /api/experts/:id
const getExpertById = async (req, res) => {
  try {
    const expert = await Expert.findById(req.params.id).lean();

    if (!expert) {
      return res.status(404).json({ success: false, message: 'Expert not found' });
    }

    // Group slots by date
    const slotsByDate = {};
    const today = new Date().toISOString().split('T')[0];

    (expert.availableSlots || [])
      .filter((slot) => slot.date >= today) // Only future slots
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      })
      .forEach((slot) => {
        if (!slotsByDate[slot.date]) slotsByDate[slot.date] = [];
        slotsByDate[slot.date].push(slot);
      });

    res.json({
      success: true,
      data: { ...expert, slotsByDate },
    });
  } catch (error) {
    console.error('getExpertById error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid expert ID' });
    }
    res.status(500).json({ success: false, message: 'Failed to fetch expert' });
  }
};

module.exports = { getExperts, getExpertById };
