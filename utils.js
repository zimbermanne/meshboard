import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';

/**
 * Generate a NODE ID in format NODE-XXXX-XXXX
 */
export function generateNodeId() {
  const uuid = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
  const part1 = uuid.substring(0, 4);
  const part2 = uuid.substring(4, 8);
  return `NODE-${part1}-${part2}`;
}

/**
 * Generate a unique message ID
 */
export function generateMessageId() {
  return `MSG-${uuidv4().substring(0, 12).toUpperCase()}`;
}

/**
 * Generate a unique token in format TXN-XXXX-XXXX-XXXX
 */
export function generateToken() {
  const uuid = uuidv4().replace(/-/g, '').toUpperCase();
  const part1 = uuid.substring(0, 4);
  const part2 = uuid.substring(4, 8);
  const part3 = uuid.substring(8, 12);
  return `TXN-${part1}-${part2}-${part3}`;
}

/**
 * Generate payment ID
 */
export function generatePaymentId() {
  return `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

/**
 * Generate JWT token for admin dashboard
 */
export function generateJWT(username, secret) {
  return jwt.sign({ username }, secret, { expiresIn: '24h' });
}

/**
 * Verify JWT token
 */
export function verifyJWT(token, secret) {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
}

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password) {
  return bcryptjs.hash(password, 10);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password, hash) {
  return bcryptjs.compare(password, hash);
}

/**
 * Get current month in YYYY-MM format
 */
export function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Convert days to seconds
 */
export function daysToSeconds(days) {
  return days * 24 * 60 * 60;
}

/**
 * Get pricing for duration
 */
export const PRICING = {
  1: 1.00,
  2: 2.00,
  3: 3.00,
  4: 4.00,
  5: 5.00,
  6: 6.00,
  7: 7.00
};

export function getPrice(days) {
  return PRICING[days] || null;
}
