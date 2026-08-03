// =============================================================================
// Court model
// =============================================================================

const pool = require('../config/db');

/**
 * Create a court (UC-03: Admin Court Management). Every court belongs to
 * exactly one admin, so `adminId` always comes from the logged-in user's
 * token, never from the request body - a player-facing form should never
 * be able to say "make me an admin's court".
 */

async function createCourt({ adminId, name, address, location, hourlyRatePhp, approvalType }) {
  const result = await pool.query(
    `INSERT INTO courts (admin_id, name, address, location, hourly_rate_php, approval_type)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [adminId, name, address, location, hourlyRatePhp, approvalType]
  );
  return result.rows[0];
}

/**
 * List every court owned by one admin (BR-05: "list of all courts managed
 * by a specific admin").
 */

async function findCourtsByAdmin(adminId) {
  const result = await pool.query(
    `SELECT *
     FROM courts 
     WHERE admin_id = $1
     ORDER BY created_at DESC`, [adminId]
  );

  return result.rows;
}

/**
 * List every court in a given location (Business Rules doc: "Players can
 * only see and book Courts that are in their location").
 */

async function findCourtsByLocation(location) {
  const result = await pool.query(
    `SELECT *
     FROM courts
     WHERE location = $1
     ORDER BY created_at DESC`, [location]
  );

  return result.rows;
}

async function findCourtById(id) {
  const result = await pool.query(
    `SELECT *
     FROM courts
    WHERE id = $1`, [id]
  );
  
  return result.rows[0] || null;
}

module.exports = { createCourt, findCourtsByAdmin, findCourtsByLocation, findCourtById };