const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

// --- CREATE TASK ---
router.post('/tasks', async (req, res) => {
  try {
    if (!req.body.title) {
      return res.status(400).json({ message: 'Title is required' });
    }
    const task = new Task(req.body);
    await task.save();
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ message: 'Error creating task', error: error.message });
  }
});

// --- GET ALL TASKS ---
router.get('/tasks', async (req, res) => {
  try {
    const { status, priority, sortBy } = req.query;
    const filter = {};
    const sort = {};

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    if (sortBy === 'dueDate') sort.dueDate = 1;
    else if (sortBy === 'priority') sort.priority = -1;

    const tasks = await Task.find(filter).sort(sort);
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tasks', error: error.message });
  }
});

// --- UPDATE TASK (PATCH) ---
router.patch('/tasks/:id', async (req, res) => {
  try {
    const { status, priority } = req.body;
    const updates = {};

    if (status) updates.status = status;
    if (priority) updates.priority = priority;

    const task = await Task.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });

    if (!task) return res.status(404).json({ message: 'Task not found' });

    res.status(200).json(task);
  } catch (error) {
    res.status(400).json({ message: 'Error updating task', error: error.message });
  }
});

// --- DELETE TASK ---
router.delete('/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    res.status(200).json({ message: 'Task deleted successfully', task });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting task', error: error.message });
  }
});

// --- INSIGHTS (UPDATED + STRUCTURED) ---
router.get('/insights', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999);

    // Fetch all necessary data concurrently
    const [tasks, priorityAgg, statusAgg] = await Promise.all([
      Task.find(),
      Task.aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }]),
      Task.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
    ]);

    // --- Priority Breakdown ---
    const byPriority = { high: 0, medium: 0, low: 0 };
    priorityAgg.forEach(p => {
      const key = p._id?.toLowerCase();
      if (key && byPriority.hasOwnProperty(key)) byPriority[key] = p.count;
    });

    // --- Status Breakdown ---
    const byStatus = { open: 0, inProgress: 0, completed: 0 };
    statusAgg.forEach(s => {
      const key = s._id?.toLowerCase();
      if (!key) return;
      if (key.includes("progress")) byStatus.inProgress = s.count;
      else if (key.includes("done") || key.includes("complete")) byStatus.completed = s.count;
      else byStatus.open = s.count;
    });

    // --- Summary Generation ---
    const totalTasks = tasks.length;
    const totalOpen = byStatus.open;
    const totalDueSoon = await Task.countDocuments({
      status: { $ne: "Done" },
      dueDate: { $gte: today, $lte: threeDaysFromNow }
    });

    let summary = "";
    if (totalTasks === 0) {
      summary = "No tasks yet. Add one to get started!";
    } else if (totalOpen === 0) {
      summary = "🎉 You're all clear! No open tasks.";
    } else {
      summary = `You have ${totalOpen} pending task${totalOpen > 1 ? "s" : ""}.`;

      const topPriority = Object.entries(byPriority).sort((a, b) => b[1] - a[1])[0];
      if (topPriority && topPriority[1] > 0) {
        summary += ` Most are ${topPriority[0]}-priority tasks.`;
      }

      summary += totalDueSoon > 0
        ? ` ⚠️ ${totalDueSoon} ${totalDueSoon > 1 ? "are" : "is"} due in the next 3 days!`
        : ` Nothing is due immediately.`;
    }

    res.status(200).json({
      summary,
      byPriority,
      byStatus,
      totalTasks
    });
  } catch (error) {
    console.error("Error fetching insights:", error);
    res.status(500).json({ message: "Error fetching insights", error: error.message });
  }
});

module.exports = router;
