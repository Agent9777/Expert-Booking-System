const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createBooking,
  getBookingsByEmail,
  updateBookingStatus,
} = require('../controllers/bookingController');

const bookingValidation = [
  body('expertId').notEmpty().withMessage('Expert ID is required').isMongoId().withMessage('Invalid expert ID'),
  body('slotId').notEmpty().withMessage('Slot ID is required'),
  body('clientName')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2–100 characters'),
  body('clientEmail')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('clientPhone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .matches(/^[0-9+\-\s()]{7,15}$/)
    .withMessage('Please provide a valid phone number'),
  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date must be in YYYY-MM-DD format'),
  body('startTime')
    .notEmpty()
    .withMessage('Start time is required')
    .matches(/^\d{2}:\d{2}$/)
    .withMessage('Time must be in HH:MM format'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
  body('sessionId').optional().isString(),
];


router.post('/', bookingValidation, createBooking);


router.get('/', getBookingsByEmail);


router.patch('/:id/status', updateBookingStatus);

module.exports = router;
