const express = require('express');
const router = express.Router();
const { lockSlot, releaseSlot, getReservations } = require('../controllers/reservationController');

// POST   /api/reservations/lock     — temporarily lock a slot (booking page opened)
router.post('/lock', lockSlot);

// DELETE /api/reservations/release  — release lock (user left without booking)
router.delete('/release', releaseSlot);

// GET    /api/reservations/:expertId — active reservations for expert detail page
router.get('/:expertId', getReservations);

module.exports = router;
