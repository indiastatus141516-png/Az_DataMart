const express = require("express");
const User = require("../models/User");
const DataItem = require("../models/DataItem");
const Category = require("../models/Category");
const PurchaseRequest = require("../models/PurchaseRequest");
const Purchase = require("../models/Purchase");
const DailyRequirement = require("../models/DailyRequirement");
const UserAllocatedData = require("../models/UserAllocatedData");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/auth");
const { allocateDataItems } = require("../services/indexAllocationService");

const router = express.Router();

const requireAdmin = requireRole("admin");

const toLocalISODate = (input) => {
  const d = new Date(input);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const dayAliases = {
  monday: ["monday", "mon"],
  tuesday: ["tuesday", "tue"],
  wednesday: ["wednesday", "wed"],
  thursday: ["thursday", "thu"],
  friday: ["friday", "fri"],
};

const getDayQuantity = (dailyQuantities = {}, dayOfWeek = "") => {
  const keys = dayAliases[dayOfWeek] || [dayOfWeek];
  for (const key of keys) {
    const value = Number(dailyQuantities?.[key] ?? 0);
    if (value > 0) return value;
  }
  return 0;
};

const normalizeDateStart = (input) => {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

const normalizeDateEnd = (input) => {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 999);
  return d;
};

const collectAffectedRange = (requests = []) => {
  let minStart = null;
  let maxEnd = null;
  for (const req of requests) {
    const start = normalizeDateStart(req?.weekRange?.startDate);
    const end = normalizeDateEnd(req?.weekRange?.endDate);
    if (!start || !end) continue;
    if (!minStart || start < minStart) minStart = start;
    if (!maxEnd || end > maxEnd) maxEnd = end;
  }
  if (!minStart || !maxEnd) return null;
  return { start: minStart, end: maxEnd };
};

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function resolveCategoryName(categoryInput) {
  const raw = (categoryInput || "").toString().trim();
  if (!raw) return raw;

  if (Category && Category.db?.readyState) {
    if (Category.base.Types.ObjectId.isValid(raw)) {
      const byId = await Category.findById(raw);
      if (byId?.name) return byId.name;
    }

    const byCode = await Category.findOne({ id: raw });
    if (byCode?.name) return byCode.name;

    const byName = await Category.findOne({
      name: { $regex: `^${escapeRegex(raw)}$`, $options: "i" },
    });
    if (byName?.name) return byName.name;
  }

  return raw;
}

async function normalizeRequestCategory(requestDoc, session = null) {
  if (!requestDoc) return requestDoc;
  const resolvedCategory = await resolveCategoryName(requestDoc.category);
  if (resolvedCategory && resolvedCategory !== requestDoc.category) {
    requestDoc.category = resolvedCategory;
    if (session) {
      await requestDoc.save({ session });
    } else {
      await requestDoc.save();
    }
  }
  return requestDoc;
}

// Backend protected route examples:
// router.get('/secure', auth, requireAdmin, (req, res) => { res.json({ message: 'admin only' }) })
// router.get('/profile', auth, (req, res) => { res.json({ userId: req.user.userId, role: req.user.role }) })

// Route to get daily requirements based on user's purchase requests
router.get("/daily-requirements/:userId", async (req, res) => {
  const userId = req.params.userId;
  try {
    // Fetch user's purchase requests
    const purchaseRequests = await PurchaseRequest.find({ userId });
    if (!purchaseRequests.length) {
      return res
        .status(404)
        .json({ message: "No purchase requests found for this user." });
    }

    // Get today's date
    const today = new Date();
    const todayString = today.toISOString().split("T")[0]; // Format YYYY-MM-DD

    // Fetch daily requirements for today based on purchase requests
    const dailyRequirements = await DailyRequirement.find({
      date: todayString,
      category: { $in: purchaseRequests.map((req) => req.category) },
    });

    res.json(dailyRequirements);
  } catch (error) {
    console.error("Error fetching daily requirements:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Bulk block users
router.put("/users/bulk/block", requireAdmin, async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "User IDs array is required" });
    }

    // Exclude admin users from blocking
    const result = await User.updateMany(
      { userId: { $in: userIds }, role: { $ne: "admin" } },
      { status: "blocked" }
    );

    res.json({
      message: `Blocked ${result.modifiedCount} users successfully`,
    });
  } catch (error) {
    console.error("Bulk block error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Bulk unblock users
router.put("/users/bulk/unblock", requireAdmin, async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "User IDs array is required" });
    }

    // Exclude admin users from unblocking
    const result = await User.updateMany(
      { userId: { $in: userIds }, role: { $ne: "admin" } },
      { status: "approved" }
    );

    res.json({
      message: `Unblocked ${result.modifiedCount} users successfully`,
    });
  } catch (error) {
    console.error("Bulk unblock error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Bulk delete users
router.delete("/users/bulk/delete", requireAdmin, async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "User IDs array is required" });
    }

    // Exclude admin users from deletion
    const usersToDelete = await User.find({
      userId: { $in: userIds },
      role: { $ne: "admin" },
    }).select("userId");
    const ids = usersToDelete.map((u) => u.userId);

    if (ids.length === 0) {
      return res
        .status(400)
        .json({ message: "No non-admin users found to delete" });
    }

    const session = await User.startSession();
    session.startTransaction();
    try {
      // Delete allocations for these users
      await UserAllocatedData.deleteMany({ userId: { $in: ids } }).session(
        session
      );

      // Delete purchases and purchase requests for these users
      await Purchase.deleteMany({ userId: { $in: ids } }).session(session);

      // Find purchase requests to determine any daily requirements created for them
      const requests = await PurchaseRequest.find({
        userId: { $in: ids },
      }).session(session);
      const affectedRange = collectAffectedRange(requests);

      // For each request, delete DailyRequirement entries that were populated for that request (createdBy 'system')
      for (const req of requests) {
        try {
          const start = new Date(req.weekRange.startDate);
          const end = new Date(req.weekRange.endDate);
          const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];

          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const idx = (d.getDay() + 6) % 7; // convert Sunday(0) -> 6, Monday(1)->0,...
            const dayOfWeek = days[idx];
            if (!dayOfWeek) continue;
            const qty = getDayQuantity(req.dailyQuantities, dayOfWeek);
            if (qty > 0) {
              // Decrement the DailyRequirement quantity by this request's contribution and remove the contribution entry
              const dateOnly = new Date(d);
              dateOnly.setHours(0, 0, 0, 0);
              const dr = await DailyRequirement.findOne({
                category: req.category,
                dayOfWeek: dayOfWeek,
                date: dateOnly,
              }).session(session);
              if (dr) {
                // Find contribution matching this purchase request
                const contribIdx = (dr.contributions || []).findIndex(
                  (c) => String(c.purchaseRequestId) === String(req._id)
                );
                if (contribIdx !== -1) {
                  const contrib = dr.contributions[contribIdx];
                  const dec = contrib.quantity || qty;
                  dr.quantity = Math.max(0, (dr.quantity || 0) - dec);
                  dr.contributions.splice(contribIdx, 1);
                } else {
                  // Fallback: decrement by expected qty
                  dr.quantity = Math.max(0, (dr.quantity || 0) - qty);
                }

                // If no contributions left and no uploaded DataItem rows for this date and quantity 0 -> remove document
                if (
                  (dr.contributions || []).length === 0 &&
                  dr.quantity === 0
                ) {
                  const iso = dateOnly.toISOString().split("T")[0];
                  const count = await DataItem.countDocuments({
                    category: dr.category,
                    "metadata.deliveryDate": iso,
                    "metadata.dayOfWeek": dr.dayOfWeek,
                  }).session(session);
                  if (count === 0) {
                    await DailyRequirement.deleteOne({ _id: dr._id }).session(
                      session
                    );
                    continue;
                  }
                }
                await dr.save({ session });
              }
            }
          }
        } catch (err) {
          console.warn(
            "Error deleting daily requirements for request",
            req._id,
            err.message
          );
        }
      }

      // Delete purchase requests for these users
      await PurchaseRequest.deleteMany({ userId: { $in: ids } }).session(
        session
      );

      // Finally delete the user documents
      const result = await User.deleteMany({ userId: { $in: ids } }).session(
        session
      );

      await session.commitTransaction();
      session.endSession();

      // Rebuild affected range so all future/pending weekdays are recalculated correctly.
      if (affectedRange) {
        try {
          await rebuildDailyRequirements(affectedRange.start, affectedRange.end);
        } catch (rebuildErr) {
          console.warn(
            "Post-delete rebuild failed for bulk delete:",
            rebuildErr.message
          );
        }
      }

      res.json({
        message: `Deleted ${result.deletedCount} users and related data successfully`,
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Bulk delete transaction error:", err);
      return res
        .status(500)
        .json({ message: "Failed to delete users and related data" });
    }
  } catch (error) {
    console.error("Bulk delete error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete single user and cascade related data
router.delete("/users/:userId", requireAdmin, async (req, res) => {
  const userId = req.params.userId;
  try {
    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin")
      return res.status(403).json({ message: "Cannot delete admin users" });

    const session = await User.startSession();
    session.startTransaction();
    try {
      // Delete allocated data for this user
      await UserAllocatedData.deleteMany({ userId }).session(session);

      // Delete purchases and purchase requests for this user
      await Purchase.deleteMany({ userId }).session(session);

      const requests = await PurchaseRequest.find({ userId }).session(session);
      const affectedRange = collectAffectedRange(requests);

      for (const req of requests) {
        try {
          const start = new Date(req.weekRange.startDate);
          const end = new Date(req.weekRange.endDate);
          const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];

          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const idx = (d.getDay() + 6) % 7;
            const dayOfWeek = days[idx];
            if (!dayOfWeek) continue;
            const qty = getDayQuantity(req.dailyQuantities, dayOfWeek);
            if (qty > 0) {
              const dateOnly = new Date(d);
              dateOnly.setHours(0, 0, 0, 0);
              const dr = await DailyRequirement.findOne({
                category: req.category,
                dayOfWeek: dayOfWeek,
                date: dateOnly,
              }).session(session);
              if (dr) {
                const contribIdx = (dr.contributions || []).findIndex(
                  (c) => String(c.purchaseRequestId) === String(req._id)
                );
                if (contribIdx !== -1) {
                  const contrib = dr.contributions[contribIdx];
                  const dec = contrib.quantity || qty;
                  dr.quantity = Math.max(0, (dr.quantity || 0) - dec);
                  dr.contributions.splice(contribIdx, 1);
                } else {
                  dr.quantity = Math.max(0, (dr.quantity || 0) - qty);
                }

                if (
                  (dr.contributions || []).length === 0 &&
                  dr.quantity === 0
                ) {
                  const iso = dateOnly.toISOString().split("T")[0];
                  const count = await DataItem.countDocuments({
                    category: dr.category,
                    "metadata.deliveryDate": iso,
                    "metadata.dayOfWeek": dr.dayOfWeek,
                  }).session(session);
                  if (count === 0) {
                    await DailyRequirement.deleteOne({ _id: dr._id }).session(
                      session
                    );
                    continue;
                  }
                }
                await dr.save({ session });
              }
            }
          }
        } catch (err) {
          console.warn(
            "Error deleting daily requirements for request",
            req._id,
            err.message
          );
        }
      }

      await PurchaseRequest.deleteMany({ userId }).session(session);

      const result = await User.deleteOne({ userId }).session(session);

      await session.commitTransaction();
      session.endSession();

      // Rebuild affected range so all future/pending weekdays are recalculated correctly.
      if (affectedRange) {
        try {
          await rebuildDailyRequirements(affectedRange.start, affectedRange.end);
        } catch (rebuildErr) {
          console.warn(
            `Post-delete rebuild failed for user ${userId}:`,
            rebuildErr.message
          );
        }
      }

      return res.json({
        message: `Deleted user ${userId} and related data successfully`,
        deletedCount: result.deletedCount,
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Delete user transaction error:", err);
      return res
        .status(500)
        .json({ message: "Failed to delete user and related data" });
    }
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get all users for approval
router.get("/users", requireAdmin, async (req, res) => {
  try {
    const { search } = req.query;

    let query = {};
    if (search && typeof search === "string" && search.trim().length > 0) {
      const re = new RegExp(search.trim(), "i");
      query = {
        $or: [
          { userId: re },
          { email: re },
          { "profile.firstName": re },
          { "profile.lastName": re },
          { "profile.company": re },
        ],
      };
    }

    const users = await User.find(query).select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Approve or reject user
router.put("/users/:userId", requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const user = await User.findOneAndUpdate(
      { userId: req.params.userId },
      { status },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get all purchase requests
router.get("/purchase-requests", requireAdmin, async (req, res) => {
  try {
    // Optional query params: startDate, endDate (yyyy-mm-dd) - filter requests whose weekRange overlaps the provided range
    const { startDate, endDate, search } = req.query;
    let query = {};

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      query["weekRange.startDate"] = { $lte: end };
      query["weekRange.endDate"] = { $gte: start };
    }

    // If search provided, attempt to match user (by userId or email) or category or status
    if (search && typeof search === "string" && search.trim().length > 0) {
      const s = search.trim();
      const re = new RegExp(s, "i");

      // Find matching users by userId or email
      const matchingUsers = await User.find({
        $or: [{ userId: re }, { email: re }],
      }).select("userId");
      const userIds = matchingUsers.map((u) => u.userId);

      query.$or = [{ category: re }, { status: re }];

      if (userIds.length > 0) {
        query.$or.push({ userId: { $in: userIds } });
      }
    }

    const requests = await PurchaseRequest.find(query).sort({ createdAt: -1 });

    // Enrich requests with user email and computed totalQuantity
    const uniqueUserIds = Array.from(new Set(requests.map((r) => r.userId)));
    const usersMap = {};
    if (uniqueUserIds.length > 0) {
      const users = await User.find({ userId: { $in: uniqueUserIds } }).select(
        "userId email"
      );
      users.forEach((u) => {
        usersMap[u.userId] = u;
      });
    }

    const enriched = requests.map((r) => {
      const daily = r.dailyQuantities || {};
      const weeklyTotal = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
      ].reduce((s, d) => s + (Number(daily[d]) || 0), 0);
      const totalQuantity =
        typeof r.quantity === "number" && r.quantity >= 0
          ? r.quantity
          : weeklyTotal;

      return {
        _id: r._id,
        userId: r.userId,
        userEmail: usersMap[r.userId]?.email || null,
        category: r.category,
        status: r.status,
        weekRange: r.weekRange,
        dailyQuantities: r.dailyQuantities,
        quantity: r.quantity,
        totalQuantity,
        deliveriesCompleted: r.deliveriesCompleted,
        nextDeliveryDate: r.nextDeliveryDate,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error("Get purchase requests error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Approve or reject purchase request
router.put("/purchase-requests/:id", requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["approved", "rejected"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Idempotent state transition:
    // only update when status actually changes so repeated "approve" clicks
    // do not re-run downstream side effects.
    const request = await PurchaseRequest.findOneAndUpdate(
      { _id: req.params.id, status: { $ne: status } },
      { status },
      { new: true }
    );

    if (!request) {
      const existing = await PurchaseRequest.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Request not found" });
      }
      // No status transition happened (already at requested status).
      // Return current request and skip side effects.
      return res.json({
        ...existing.toObject(),
        statusTransitionApplied: false,
      });
    }

    await normalizeRequestCategory(request);

    // Deterministic weekly rebuild keeps daily requirements consistent even if
    // there were earlier duplicate clicks/retries.
    try {
      await rebuildDailyRequirements(
        new Date(request.weekRange.startDate),
        new Date(request.weekRange.endDate)
      );
    } catch (e) {
      console.warn(
        "Failed to rebuild daily requirements after request status update:",
        e.message
      );
    }

    // If approving, allocate data for this request once on real transition.
    if (status === "approved") {
      await allocateDataForRequest(request);
    }

    res.json({ ...request.toObject(), statusTransitionApplied: true });
  } catch (error) {
    console.error("Purchase request update error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all data items
router.get("/data-items", requireAdmin, async (req, res) => {
  try {
    const dataItems = await DataItem.find().sort({ index: 1 });
    res.json(dataItems);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get data items by category for viewing uploaded data
router.get("/data-items/category/:category", requireAdmin, async (req, res) => {
  try {
    const dataItems = await DataItem.find({
      category: req.params.category,
    }).sort({ index: 1 });
    res.json(dataItems);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Analytics data
router.get("/analytics", requireAdmin, async (req, res) => {
  try {
    // Only count completed purchases
    const totalSales = await Purchase.countDocuments({
      paymentStatus: "completed",
    });

    // Price system removed - revenue calculations no longer applicable
    const totalRevenue = [{ total: 0 }];
    const committedRevenueAgg = [{ total: 0 }];

    const activeUsers = await User.countDocuments({ status: "approved" });
    const soldItems = await DataItem.countDocuments({ status: "sold" });
    const blockedUsers = await User.countDocuments({ status: "blocked" });
    const pendingRequests = await PurchaseRequest.countDocuments({
      status: "pending",
    });

    // Recent purchases for sales report (only completed ones)
    const recentPurchases = await Purchase.find({ paymentStatus: "completed" })
      .populate("userId", "email")
      .sort({ createdAt: -1 })
      .limit(10)
      .select("userId createdAt");

    // Simple alerting heuristics
    const realized = totalRevenue[0]?.total || 0;
    const committed = committedRevenueAgg[0]?.total || 0;
    const alerts = [];

    // If committed is much larger than realized or there are many pending/approved requests, create alerts
    if (committed > realized * 2 && committed > 0) {
      alerts.push({
        level: "warning",
        message:
          "Committed revenue is more than twice realized revenue. Review approvals and payment pipeline.",
      });
    }

    if (pendingRequests > 1000) {
      alerts.push({
        level: "critical",
        message: `High pending requests: ${pendingRequests}. Investigate processing.`,
      });
    }

    res.json({
      totalSales,
      totalRevenue: realized,
      committedRevenue: committed,
      activeUsers,
      soldItems,
      blockedUsers,
      pendingRequests,
      recentPurchases,
      alerts,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get fixed categories (A, B, C, D)
router.get("/categories/fixed", requireAdmin, async (req, res) => {
  try {
    const categories = await Category.find().sort({ id: 1 });
    res.json(categories);
  } catch (error) {
    console.error("Fixed categories error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create new fixed category with auto-generated ID
router.post("/categories/fixed", requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Category name is required" });
    }

    // Find the next available ID (A, B, C, D, E...)
    const existingCategories = await Category.find().sort({ id: 1 });
    const usedIds = existingCategories.map((cat) => cat.id.toUpperCase());
    let nextId = "A";

    while (usedIds.includes(nextId)) {
      nextId = String.fromCharCode(nextId.charCodeAt(0) + 1);
    }

    // Check if name already exists
    const existingCategory = await Category.findOne({ name: name.trim() });
    if (existingCategory) {
      return res.status(400).json({ message: "Category name already exists" });
    }

    const category = new Category({
      id: nextId,
      name: name.trim(),
    });

    await category.save();

    res.json({
      message: `Category ${nextId} created successfully`,
      category,
    });
  } catch (error) {
    console.error("Create fixed category error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update fixed category name
router.put("/categories/fixed/:id", requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Category name is required" });
    }

    const category = await Category.findOneAndUpdate(
      { id: req.params.id },
      { name: name.trim() },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({
      message: `Category ${req.params.id} updated successfully`,
      category,
    });
  } catch (error) {
    console.error("Update fixed category error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete data for fixed category
router.delete("/categories/fixed/:id/data", requireAdmin, async (req, res) => {
  try {
    // Find the category name
    const category = await Category.findOne({ id: req.params.id });
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Delete all data items for this category
    const result = await DataItem.deleteMany({ category: category.name });

    res.json({
      message: `Deleted ${result.deletedCount} data items for category ${req.params.id} (${category.name})`,
    });
  } catch (error) {
    console.error("Delete category data error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete fixed category
router.delete("/categories/fixed/:id", requireAdmin, async (req, res) => {
  try {
    const category = await Category.findOneAndDelete({ id: req.params.id });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Optionally delete associated data items
    const dataResult = await DataItem.deleteMany({ category: category.name });

    res.json({
      message: `Category ${req.params.id} deleted successfully. Removed ${dataResult.deletedCount} data items.`,
    });
  } catch (error) {
    console.error("Delete fixed category error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all categories for management (legacy)
router.get("/categories", requireAdmin, async (req, res) => {
  try {
    const categories = await DataItem.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          minIndex: { $min: "$index" },
          maxIndex: { $max: "$index" },
          availableCount: {
            $sum: { $cond: [{ $eq: ["$status", "available"] }, 1, 0] },
          },
          soldCount: {
            $sum: { $cond: [{ $eq: ["$status", "sold"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          category: "$_id",
          totalCount: "$count",
          availableCount: 1,
          soldCount: 1,
          indexRange: {
            $concat: [
              { $toString: "$minIndex" },
              "-",
              { $toString: "$maxIndex" },
            ],
          },
        },
      },
    ]);

    res.json(categories);
  } catch (error) {
    console.error("Categories error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Bulk delete purchase requests
router.delete(
  "/purchase-requests/bulk/delete",
  requireAdmin,
  async (req, res) => {
    try {
      const { requestIds } = req.body;

      if (!Array.isArray(requestIds) || requestIds.length === 0) {
        return res
          .status(400)
          .json({ message: "Request IDs array is required" });
      }

      const result = await PurchaseRequest.deleteMany({
        _id: { $in: requestIds },
      });

      res.json({
        message: `Deleted ${result.deletedCount} purchase requests successfully`,
      });
    } catch (error) {
      console.error("Bulk delete purchase requests error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Update category name (and propagate to DataItem and DailyRequirement)
router.put("/categories/:categoryId", requireAdmin, async (req, res) => {
  try {
    const { newCategoryName } = req.body;

    if (!newCategoryName) {
      return res.status(400).json({ message: "Invalid category name" });
    }

    // Update all items in this category
    const result = await DataItem.updateMany(
      { category: req.params.categoryId },
      { category: newCategoryName }
    );

    // Update all daily requirements for this category
    const drResult = await DailyRequirement.updateMany(
      { category: req.params.categoryId },
      { category: newCategoryName }
    );

    if (result.matchedCount === 0 && drResult.matchedCount === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({
      message: `Updated ${result.modifiedCount} items and ${drResult.modifiedCount} daily requirements in category "${req.params.categoryId}" to "${newCategoryName}"`,
    });
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add new category
router.post("/categories", requireAdmin, async (req, res) => {
  try {
    const { categoryName } = req.body;

    if (!categoryName) {
      return res.status(400).json({ message: "Invalid category name" });
    }

    // Check if category already exists
    const existingCategory = await DataItem.findOne({ category: categoryName });
    if (existingCategory) {
      return res.status(400).json({ message: "Category already exists" });
    }

    // Create a sample data item for the new category
    const lastItem = await DataItem.findOne().sort({ index: -1 });
    const nextIndex = lastItem ? lastItem.index + 1 : 1;

    const newItem = new DataItem({
      category: categoryName,
      status: "available",
      index: nextIndex,
      metadata: { createdBy: "admin", categoryType: "new" },
    });

    await newItem.save();

    res.json({
      message: `Category "${categoryName}" created successfully`,
      category: categoryName,
    });
  } catch (error) {
    console.error("Add category error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete category (with confirmation)
router.delete("/categories/:categoryName", requireAdmin, async (req, res) => {
  try {
    const categoryName = req.params.categoryName;

    // Check if category exists and has items
    const itemCount = await DataItem.countDocuments({ category: categoryName });

    if (itemCount === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Delete all items in the category
    const result = await DataItem.deleteMany({ category: categoryName });

    res.json({
      message: `Category "${categoryName}" deleted successfully. Removed ${result.deletedCount} items.`,
    });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Set daily requirements for categories
router.post("/daily-requirements", requireAdmin, async (req, res) => {
  try {
    const { category, dayOfWeek, quantity, date } = req.body;

    if (
      !category ||
      !dayOfWeek ||
      typeof quantity !== "number" ||
      quantity < 0 ||
      !date
    ) {
      return res.status(400).json({ message: "Invalid input parameters" });
    }

    // Validate dayOfWeek
    const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    if (!validDays.includes(dayOfWeek.toLowerCase())) {
      return res.status(400).json({ message: "Invalid day of week" });
    }

    const normalizedDay = dayOfWeek.toLowerCase();
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    const dayEnd = new Date(normalizedDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Match requirement by category/day within the same local calendar day.
    let requirement = await DailyRequirement.findOne({
      category,
      dayOfWeek: normalizedDay,
      date: { $gte: normalizedDate, $lte: dayEnd },
    }).sort({ date: -1, createdAt: -1 });

    if (requirement) {
      requirement.quantity = quantity;
      requirement.date = normalizedDate;
      requirement.createdBy = req.user.userId;
      await requirement.save();
    } else {
      requirement = await DailyRequirement.create({
        category,
        dayOfWeek: normalizedDay,
        date: normalizedDate,
        quantity,
        createdBy: req.user.userId,
      });
    }

    // Remove duplicates for same category/day/date to avoid overwrite-to-zero issues.
    await DailyRequirement.deleteMany({
      _id: { $ne: requirement._id },
      category,
      dayOfWeek: normalizedDay,
      date: { $gte: normalizedDate, $lte: dayEnd },
    });

    res.json({
      message: `Daily requirement set for ${category} on ${dayOfWeek}: ${quantity} items`,
      requirement,
    });
  } catch (error) {
    console.error("Set daily requirement error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Upload daily data for categories
router.post("/daily-data/upload", requireAdmin, async (req, res) => {
  try {
    const { category, dayOfWeek, date, data } = req.body;

    if (!category || !dayOfWeek || !date || !Array.isArray(data)) {
      return res.status(400).json({ message: "Invalid input parameters" });
    }

    // Validate dayOfWeek
    const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    if (!validDays.includes(dayOfWeek.toLowerCase())) {
      return res.status(400).json({ message: "Invalid day of week" });
    }

    // Store uploaded rows as DataItem documents with delivery metadata; do NOT store the raw rows in DailyRequirement.uploadedData
    const DataItem = require("../models/DataItem");

    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    const dayEnd = new Date(normalizedDate);
    dayEnd.setHours(23, 59, 59, 999);
    const normalizedDay = dayOfWeek.toLowerCase();

    // Determine next index for sequential indexing
    const lastItem = await DataItem.findOne().sort({ index: -1 });
    let nextIndex = lastItem ? lastItem.index + 1 : 1;

    const dataItems = data.map((row) => ({
      category,
      status: "available",
      index: nextIndex++,
      metadata: {
        ...row,
        deliveryDate: toLocalISODate(normalizedDate),
        dayOfWeek: normalizedDay,
      },
    }));

    await DataItem.insertMany(dataItems);

    // Ensure a DailyRequirement exists for reporting without resetting existing quantity.
    let requirement = await DailyRequirement.findOne({
      category,
      dayOfWeek: normalizedDay,
      date: { $gte: normalizedDate, $lte: dayEnd },
    }).sort({ date: -1, createdAt: -1 });

    if (requirement) {
      requirement.date = normalizedDate;
      await requirement.save();
    } else {
      requirement = await DailyRequirement.create({
        category,
        dayOfWeek: normalizedDay,
        date: normalizedDate,
        quantity: 0,
        createdBy: req.user.userId,
      });
    }

    // Keep only one requirement document for same category/day/date.
    await DailyRequirement.deleteMany({
      _id: { $ne: requirement._id },
      category,
      dayOfWeek: normalizedDay,
      date: { $gte: normalizedDate, $lte: dayEnd },
    });

    res.json({
      message: `Daily data uploaded for ${category} on ${dayOfWeek}: ${data.length} items`,
      requirement,
    });
  } catch (error) {
    console.error("Upload daily data error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get daily requirements for a given week (defaults to current week)
router.get("/daily-requirements", requireAdmin, async (req, res) => {
  try {
    // Allow optional query params: startDate and endDate (ISO yyyy-mm-dd)
    let { startDate, endDate } = req.query;

    const toMidnight = (d) => {
      const dt = new Date(d);
      dt.setHours(0, 0, 0, 0);
      return dt;
    };

    if (!startDate || !endDate) {
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - today.getDay() + 1);
      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4);
      startDate = monday.toISOString().split("T")[0];
      endDate = friday.toISOString().split("T")[0];
    }

    const start = toMidnight(startDate);
    const end = new Date(toMidnight(endDate));
    end.setHours(23, 59, 59, 999);

    // Find daily requirements for provided week range
    const requirementsData = await DailyRequirement.find({
      date: {
        $gte: start,
        $lte: end,
      },
    }).sort({ category: 1, date: 1 });

    // Group by category and date
    const requirements = {};
    const grandTotal = {
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      total: 0,
    };

    requirementsData.forEach((r) => {
      const category = r.category;
      const dayOfWeek = r.dayOfWeek;
      const contributionTotal = (r.contributions || []).reduce(
        (sum, c) => sum + (Number(c.quantity) || 0),
        0
      );
      const quantity = Math.max(Number(r.quantity) || 0, contributionTotal);

      if (!requirements[category]) {
        requirements[category] = {
          monday: 0,
          tuesday: 0,
          wednesday: 0,
          thursday: 0,
          friday: 0,
          total: 0,
        };
      }

      requirements[category][dayOfWeek] = Math.max(
        requirements[category][dayOfWeek] || 0,
        quantity
      );
    });

    // Calculate totals from normalized day values
    Object.values(requirements).forEach((cat) => {
      cat.total =
        (cat.monday || 0) +
        (cat.tuesday || 0) +
        (cat.wednesday || 0) +
        (cat.thursday || 0) +
        (cat.friday || 0);
      grandTotal.monday += cat.monday;
      grandTotal.tuesday += cat.tuesday;
      grandTotal.wednesday += cat.wednesday;
      grandTotal.thursday += cat.thursday;
      grandTotal.friday += cat.friday;
      grandTotal.total += cat.total;
    });

    // Format dates DD/MM/YY
    const formatDate = (date) => {
      const d = new Date(date);
      const day = d.getDate().toString().padStart(2, "0");
      const month = (d.getMonth() + 1).toString().padStart(2, "0");
      const year = d.getFullYear().toString().slice(-2);
      return `${day}/${month}/${year}`;
    };

    const mondayDate = new Date(start);
    const dates = {
      monday: formatDate(mondayDate),
      tuesday: formatDate(
        new Date(mondayDate.getTime() + 1 * 24 * 60 * 60 * 1000)
      ),
      wednesday: formatDate(
        new Date(mondayDate.getTime() + 2 * 24 * 60 * 60 * 1000)
      ),
      thursday: formatDate(
        new Date(mondayDate.getTime() + 3 * 24 * 60 * 60 * 1000)
      ),
      friday: formatDate(
        new Date(mondayDate.getTime() + 4 * 24 * 60 * 60 * 1000)
      ),
    };

    res.json({
      dates,
      requirements,
      grandTotal,
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    });
  } catch (error) {
    console.error("Get daily requirements error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user profile for admin
router.get("/users/:userId/profile", requireAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId }).select(
      "-password"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Update user profile for admin
router.put("/users/:userId/profile", requireAdmin, async (req, res) => {
  try {
    const { profile, email } = req.body;

    const updateData = {};
    if (profile) updateData.profile = profile;
    if (email) updateData.email = email;

    const user = await User.findOneAndUpdate(
      { userId: req.params.userId },
      updateData,
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Populate daily requirements for a purchase request
async function populateDailyRequirementsForRequest(request) {
  try {
    await normalizeRequestCategory(request);
    const startDate = new Date(request.weekRange.startDate);
    const endDate = new Date(request.weekRange.endDate);
    const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday"];

    // Loop through each day in the week range
    for (
      let date = new Date(startDate);
      date <= endDate;
      date.setDate(date.getDate() + 1)
    ) {
      const dayOfWeek = daysOfWeek[date.getDay() - 1]; // getDay() returns 0 for Sunday, 1 for Monday, etc.

      if (dayOfWeek && getDayQuantity(request.dailyQuantities, dayOfWeek) > 0) {
        const qtyToAdd = getDayQuantity(request.dailyQuantities, dayOfWeek);
        if (qtyToAdd <= 0) continue;

        // Increment existing requirement quantity and record this request's contribution
        const dateOnly = new Date(date);
        dateOnly.setHours(0, 0, 0, 0);

        const existing = await DailyRequirement.findOne({
          category: request.category,
          dayOfWeek,
          date: dateOnly,
        });
        if (existing) {
          const alreadyContributed = (existing.contributions || []).some(
            (c) => String(c.purchaseRequestId) === String(request._id)
          );
          // Idempotency guard: this request/day/category was already applied.
          if (alreadyContributed) continue;

          existing.quantity = (existing.quantity || 0) + qtyToAdd;
          existing.contributions = existing.contributions || [];
          existing.contributions.push({
            purchaseRequestId: request._id,
            userId: request.userId,
            quantity: qtyToAdd,
          });
          await existing.save();
        } else {
          // create new document with contribution
          const newReq = new DailyRequirement({
            category: request.category,
            dayOfWeek,
            date: dateOnly,
            quantity: qtyToAdd,
            createdBy: "system",
            contributions: [
              {
                purchaseRequestId: request._id,
                userId: request.userId,
                quantity: qtyToAdd,
              },
            ],
          });
          await newReq.save();
        }
      }
    }

    console.log(`Populated daily requirements for request ${request._id}`);
  } catch (error) {
    console.error("Populate daily requirements error:", error);
    throw error;
  }
}

// Rebuild daily requirements for the provided date range by scanning all approved purchase requests
async function rebuildDailyRequirements(startDate, endDate) {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Build a map: dateString -> category -> array of contributions
    const contributionsMap = {};

    // Fetch all approved requests that overlap the range
    const requests = await PurchaseRequest.find({
      status: { $in: ["approved", "completed"] },
      "weekRange.startDate": { $lte: end },
      "weekRange.endDate": { $gte: start },
    });

    for (const req of requests) {
      const reqStart = new Date(req.weekRange.startDate);
      const reqEnd = new Date(req.weekRange.endDate);
      for (
        let d = new Date(Math.max(reqStart, start));
        d <= reqEnd && d <= end;
        d.setDate(d.getDate() + 1)
      ) {
        const dateOnly = new Date(d);
        dateOnly.setHours(0, 0, 0, 0);
        const dayIdx = dateOnly.getDay();
        const days = [
          "sunday",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
        ];
        const dayOfWeek = days[dayIdx];
        if (!dayOfWeek) continue;
        const qty = getDayQuantity(req.dailyQuantities, dayOfWeek);
        if (qty <= 0) continue;

        const key = toLocalISODate(dateOnly);
        contributionsMap[key] = contributionsMap[key] || {};
        contributionsMap[key][req.category] =
          contributionsMap[key][req.category] || [];
        contributionsMap[key][req.category].push({
          purchaseRequestId: req._id,
          userId: req.userId,
          quantity: qty,
          dayOfWeek,
        });
      }
    }

    // For each date/category, upsert DailyRequirement with summed quantity and contributions
    for (const dateKey of Object.keys(contributionsMap)) {
      const dateObj = new Date(dateKey);
      for (const category of Object.keys(contributionsMap[dateKey])) {
        const contribs = contributionsMap[dateKey][category];
        const totalQty = contribs.reduce((s, c) => s + (c.quantity || 0), 0);

        // Preserve existing uploadedData if present
        const existing = await DailyRequirement.findOne({
          category,
          date: dateObj,
          dayOfWeek: contribs[0].dayOfWeek,
        });
        if (existing) {
          existing.quantity = totalQty;
          existing.contributions = contribs.map((c) => ({
            purchaseRequestId: c.purchaseRequestId,
            userId: c.userId,
            quantity: c.quantity,
          }));
          await existing.save();
        } else {
          const newReq = new DailyRequirement({
            category,
            dayOfWeek: contribs[0].dayOfWeek,
            date: dateObj,
            quantity: totalQty,
            createdBy: "system",
            contributions: contribs.map((c) => ({
              purchaseRequestId: c.purchaseRequestId,
              userId: c.userId,
              quantity: c.quantity,
            })),
          });
          await newReq.save();
        }
      }
    }

    // Optionally cleanup any DailyRequirement in range that no longer has contributions and has no uploaded DataItem rows
    const candidates = await DailyRequirement.find({
      date: { $gte: start, $lte: end },
      $or: [
        { contributions: { $exists: true, $size: 0 } },
        { contributions: { $exists: false } },
      ],
      quantity: 0,
    });
    for (const dr of candidates) {
      const iso = toLocalISODate(dr.date);
      const count = await DataItem.countDocuments({
        category: dr.category,
        "metadata.deliveryDate": iso,
        "metadata.dayOfWeek": dr.dayOfWeek,
      });
      if (count === 0) {
        await DailyRequirement.deleteOne({ _id: dr._id });
      }
    }

    console.log(
      `Rebuilt daily requirements for ${
        startDate.toISOString().split("T")[0]
      } -> ${endDate.toISOString().split("T")[0]}`
    );
  } catch (error) {
    console.error("Rebuild daily requirements error:", error);
    throw error;
  }
}

// Admin route to trigger rebuild for a week range (query params: startDate, endDate)
router.post("/daily-requirements/rebuild", requireAdmin, async (req, res) => {
  try {
    let { startDate, endDate } = req.body || req.query;
    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "startDate and endDate are required (yyyy-mm-dd)" });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    await rebuildDailyRequirements(start, end);
    res.json({ message: "Rebuilt daily requirements for given range" });
  } catch (err) {
    console.error("Rebuild route error:", err);
    res.status(500).json({ message: "Failed to rebuild daily requirements" });
  }
});

// Data allocation function
async function allocateDataForRequest(request) {
  try {
    await normalizeRequestCategory(request);
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    const allocations = [];

    for (const day of days) {
      const quantity = getDayQuantity(request.dailyQuantities, day);
      if (quantity > 0) {
        // Find daily requirement for this category and day
        const requirement = await DailyRequirement.findOne({
          category: request.category,
          dayOfWeek: day,
          date: {
            $gte: new Date(request.weekRange.startDate),
            $lte: new Date(request.weekRange.endDate),
          },
        });

        // Allocate directly from DataItem collection (index-based FIFO)
        const allocated = await allocateDataItems(
          request.category,
          quantity,
          request.userId
        );
        if (allocated === null) {
          console.warn(
            `Concurrency conflict while allocating for user ${request.userId} on ${day}`
          );
          continue;
        }

        if (!allocated || allocated.length === 0) {
          console.warn(
            `Insufficient DataItem inventory for ${request.category} on ${day}. Required: ${quantity}, Available: 0`
          );
          continue;
        }

        const allocation = new UserAllocatedData({
          userId: request.userId,
          category: request.category,
          allocatedData: allocated,
          date: new Date(),
          status: "allocated",
          totalAllocated: allocated.length,
          purchaseRequestId: request._id,
          dayOfWeek: day,
        });

        await allocation.save();
        allocations.push(allocation);
      }
    }

    console.log(
      `Allocated data for user ${request.userId}: ${allocations.length} allocations`
    );
    return allocations;
  } catch (error) {
    console.error("Data allocation error:", error);
    throw error;
  }
}

// User endpoint: collect/ download daily allocated data (strictly one request/day/date)
router.post("/users/collect-daily", auth, async (req, res) => {
  const userId = req.user.userId;
  try {
    const {
      date,
      purchaseRequestId,
      dayOfWeek: requestedDayOfWeek,
    } = req.body || req.query || {};

    const parseLocalDate = (dstr) => {
      if (!dstr) return new Date();
      const parts = String(dstr)
        .split("-")
        .map((p) => parseInt(p, 10));
      if (parts.length !== 3 || parts.some(isNaN)) return new Date(dstr);
      return new Date(parts[0], parts[1] - 1, parts[2]);
    };

    const targetDate = date ? parseLocalDate(date) : new Date();
    if (Number.isNaN(targetDate.getTime())) {
      return res.status(400).json({
        purchaseRequestId: purchaseRequestId || null,
        dayOfWeek: null,
        date: null,
        message: "Invalid date format. Expected yyyy-mm-dd",
        deliveryStatus: "not_available",
        allocations: [],
      });
    }
    targetDate.setHours(0, 0, 0, 0);

    const dayIdx = targetDate.getDay(); // 0=Sun,1=Mon...
    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const dayOfWeek = (requestedDayOfWeek || days[dayIdx] || "")
      .toString()
      .toLowerCase();
    const responseBase = {
      purchaseRequestId: purchaseRequestId || null,
      dayOfWeek,
      date: toLocalISODate(targetDate),
    };
    const buildResponse = (overrides = {}) => ({
      ...responseBase,
      deliveryStatus: "not_available",
      allocations: [],
      ...overrides,
    });
    const toAllocationPayload = (alloc) => ({
      purchaseRequestId: alloc.purchaseRequestId,
      dayOfWeek: alloc.dayOfWeek,
      date: toLocalISODate(alloc.date),
      category: alloc.category,
      allocated: alloc.totalAllocated || 0,
      data: alloc.allocatedData || [],
    });

    if (!purchaseRequestId) {
      return res
        .status(400)
        .json(buildResponse({ message: "purchaseRequestId is required" }));
    }

    const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    if (!validDays.includes(dayOfWeek)) {
      return res.status(400).json(
        buildResponse({
          message: "No scheduled deliveries on this date",
        })
      );
    }

    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);
    const isoDate = toLocalISODate(targetDate);
    responseBase.date = isoDate;
    responseBase.purchaseRequestId = purchaseRequestId;

    const requestDoc = await PurchaseRequest.findOne({
      _id: purchaseRequestId,
      userId,
      status: { $in: ["approved", "completed"] },
      "weekRange.startDate": { $lte: dayEnd },
      "weekRange.endDate": { $gte: dayStart },
    });

    if (!requestDoc) {
      return res.json(
        buildResponse({ message: "No active purchase request for selected date" })
      );
    }

    await normalizeRequestCategory(requestDoc);
    const qty = getDayQuantity(requestDoc.dailyQuantities, dayOfWeek);
    if (qty <= 0) {
      return res.json(
        buildResponse({ message: "No scheduled quantity for selected date" })
      );
    }

    const existingFilter = {
      userId,
      purchaseRequestId: requestDoc._id,
      dayOfWeek,
      date: { $gte: dayStart, $lte: dayEnd },
    };
    const existingAllocation = await UserAllocatedData.findOne(existingFilter).lean();
    if (existingAllocation) {
      return res.json({
        ...buildResponse(),
        message: "Allocation already exists for selected date",
        deliveryStatus: "already_allocated",
        allocations: [toAllocationPayload(existingAllocation)],
      });
    }

    const session = await PurchaseRequest.startSession();
    session.startTransaction();

    try {
      const locked = await PurchaseRequest.findOneAndUpdate(
        {
          _id: requestDoc._id,
          userId,
          [`deliveriesCompleted.${dayOfWeek}`]: { $ne: true },
        },
        { $set: { [`deliveriesCompleted.${dayOfWeek}`]: true } },
        { new: true, session }
      );

      if (!locked) {
        await session.commitTransaction();
        session.endSession();

        const latestExisting = await UserAllocatedData.findOne(existingFilter).lean();
        if (latestExisting) {
          return res.json({
            ...buildResponse(),
            message: "Allocation already exists for selected date",
            deliveryStatus: "already_allocated",
            allocations: [toAllocationPayload(latestExisting)],
          });
        }

        return res.json(
          buildResponse({ message: "No data available to download for selected date" })
        );
      }

      const allocated = await allocateDataItems(
        requestDoc.category,
        qty,
        userId,
        session,
        { deliveryDate: isoDate, dayOfWeek }
      );

      if (allocated === null || !Array.isArray(allocated) || allocated.length === 0) {
        await PurchaseRequest.updateOne(
          { _id: requestDoc._id },
          { $set: { [`deliveriesCompleted.${dayOfWeek}`]: false } },
          { session }
        );
        await session.commitTransaction();
        session.endSession();
        return res.json(
          buildResponse({ message: "No data available to download for selected date" })
        );
      }

      const allocation = new UserAllocatedData({
        userId,
        category: requestDoc.category,
        allocatedData: allocated,
        date: targetDate,
        status: "delivered",
        totalAllocated: allocated.length,
        purchaseRequestId: requestDoc._id,
        dayOfWeek,
      });
      await allocation.save({ session });

      await session.commitTransaction();
      session.endSession();

      return res.json({
        ...buildResponse(),
        message: "Allocated data for selected date",
        deliveryStatus: "allocated_now",
        allocations: [
          {
            purchaseRequestId: requestDoc._id,
            dayOfWeek,
            date: isoDate,
            category: requestDoc.category,
            allocated: allocated.length,
            data: allocated,
          },
        ],
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();

      if (err?.code === 11000) {
        const duplicateExisting = await UserAllocatedData.findOne(existingFilter).lean();
        if (duplicateExisting) {
          return res.json({
            ...buildResponse(),
            message: "Allocation already exists for selected date",
            deliveryStatus: "already_allocated",
            allocations: [toAllocationPayload(duplicateExisting)],
          });
        }
      }

      console.error("Collect daily transaction error:", err);
      return res
        .status(500)
        .json({ message: "Failed to allocate data for today" });
    }
  } catch (error) {
    console.error("Collect daily error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});
// Delete category and associated data requirements
router.delete("/categories/:categoryId", requireAdmin, async (req, res) => {
  const categoryId = req.params.categoryId;
  const session = await Category.startSession();
  session.startTransaction();
  try {
    // Delete associated daily requirements
    await DailyRequirement.deleteMany({ category: categoryId }).session(
      session
    );

    // Delete the category
    const result = await Category.deleteOne({ _id: categoryId }).session(
      session
    );

    await session.commitTransaction();
    session.endSession();

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({
      message: "Category and associated data requirements deleted successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error deleting category:", error);
    res.status(500).json({
      message: "Failed to delete category and associated data requirements",
    });
  }
});

module.exports = router;
// Export helper for external use (e.g., server startup rebuild)
module.exports.rebuildDailyRequirements = rebuildDailyRequirements;

