const express = require('express');
const router = express.Router();
const { lockSlot, releaseSlot, getReservations } = require('../controllers/reservationController');


router.post('/lock', lockSlot);


router.delete('/release', releaseSlot);


router.get('/:expertId', getReservations);

module.exports = router;
