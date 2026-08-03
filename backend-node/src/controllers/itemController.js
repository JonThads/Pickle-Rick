// =============================================================================
// Item (inventory) controller
// =============================================================================
// Covers BR-07, UC-04, FR-10. Mounted at /api/courts/:courtId/items, so every
// handler here works within the context of one specific court.

const Item = require('../models/Item');
const Court = require('../models/Court');

/**
 * Shared ownership check: an admin may only manage inventory on courts they
 * themselves created (same rule courtController.createCourt already relies
 * on `req.user.id`, not the request body, to establish - requireRole('admin')
 * alone would let ANY admin edit ANY court's items, which is wrong).
 * Returns the court on success, or null after already sending a response.
 */

async function loadOwnedCourtOr403(req, res) {
  const { courtId } = req.params;
  const court = await Court.findCourtById(courtId);
  if (!court) {
    res.status(404).json({ error: 'Court not found' });
    return null;
  }
  if (court.admin_id !== req.user.id) {
    res.status(403).json({ error: 'You do not manage this court' });
    return null;
  }
  return court;
}

/**
 * GET /api/courts/:courtId/items  (any logged-in user)
 * Read-only, no ownership check - Players need to see a court's inventory
 * too (BR-07: "Players can only purchase items that are available on a
 * specific court").
 */

async function listItems(req, res, next) {
  try {
    const { courtId } = req.params;
    const court = await Court.findCourtById(courtId);
    if (!court) {
      return res.status(404).json({ error: 'Court not found' });
    }

    const items = await Item.findItemsByCourt(courtId);
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/courts/:courtId/items  (admin, must own the court)
 */

async function createItem(req, res, next) {
  try {
    const court = await loadOwnedCourtOr403(req, res);
    if (!court) return;

    const { name, details, photoUrl, quantity, pricePhp } = req.body;
    if (!name || pricePhp == null) {
      return res.status(400).json({ error: 'name and pricePhp are required' });
    }

    const item = await Item.createItem({
      courtId: court.id,
      name,
      details: details || null,
      photoUrl: photoUrl || null,
      quantity: quantity ?? 0,
      pricePhp,
    });
    res.status(201).json({ item });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/courts/:courtId/items/:itemId  (admin, must own the court)
 * Used for both editing item details and updating quantity (UC-04).
 */

async function updateItem(req, res, next) {
  try {
    const court = await loadOwnedCourtOr403(req, res);
    if (!court) return;

    const { itemId } = req.params;
    const existing = await Item.findItemById(itemId);
    if (!existing || existing.court_id !== court.id) {
      return res.status(404).json({ error: 'Item not found on this court' });
    }

    const { name, details, photoUrl, quantity, pricePhp } = req.body;
    const item = await Item.updateItem(itemId, { name, details, photoUrl, quantity, pricePhp });
    res.json({ item });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/courts/:courtId/items/:itemId  (admin, must own the court)
 */

async function deleteItem(req, res, next) {
  try {
    const court = await loadOwnedCourtOr403(req, res);
    if (!court) return;

    const { itemId } = req.params;
    const existing = await Item.findItemById(itemId);
    if (!existing || existing.court_id !== court.id) {
      return res.status(404).json({ error: 'Item not found on this court' });
    }

    await Item.deleteItem(itemId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = { listItems, createItem, updateItem, deleteItem };
