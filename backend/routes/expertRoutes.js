const express = require('express');
const router = express.Router();
const { getExperts, getExpertById } = require('../controllers/expertController');

// GET /api/experts?page=1&limit=6&category=Technology&search=john
router.get('/', getExperts);

// GET /api/experts/:id
router.get('/:id', getExpertById);

module.exports = router;
