// =============================================================================
// Item model
// =============================================================================
// Per-court shop/inventory (BR-07, UC-04). Admin-managed CRUD only in this
// pass - the player-facing purchase/cart flow (FR-05, the `orders` /
// `order_items` tables) is a separate feature for later.

const pool = require('../config/db');

async function createItem({ courtId, name, details, photoUrl, quantity, pricePhp }) {
  const result = await pool.query(
    `INSERT INTO items (court_id, name, details, photo_url, quantity, price_php)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [courtId, name, details, photoUrl, quantity, pricePhp]
  );
  return result.rows[0];
}

/**
 * All items for one court (UC-04: "Admin goes to a specific Court... selects
 * Inventory"). Also what a Player would browse once the shop flow exists.
 */

async function findItemsByCourt(courtId) {
  const result = await pool.query(
    `SELECT * FROM items WHERE court_id = $1 ORDER BY created_at DESC`,
    [courtId]
  );
  return result.rows;
}

async function findItemById(id) {
  const result = await pool.query(`SELECT * FROM items WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

/**
 * Partial update - same COALESCE pattern as User.updateUser, so the Admin
 * can e.g. bump just the quantity without re-sending the whole item.
 */

async function updateItem(id, { name, details, photoUrl, quantity, pricePhp } = {}) {
  const result = await pool.query(
    `UPDATE items
     SET name      = COALESCE($1, name),
         details   = COALESCE($2, details),
         photo_url = COALESCE($3, photo_url),
         quantity  = COALESCE($4, quantity),
         price_php = COALESCE($5, price_php)
     WHERE id = $6
     RETURNING *`,
    [name ?? null, details ?? null, photoUrl ?? null, quantity ?? null, pricePhp ?? null, id]
  );
  return result.rows[0] || null;
}

async function deleteItem(id) {
  const result = await pool.query(`DELETE FROM items WHERE id = $1 RETURNING id`, [id]);
  return result.rows[0] || null;
}

module.exports = { createItem, findItemsByCourt, findItemById, updateItem, deleteItem };
