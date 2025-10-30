const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const apiRoutes = require('./routes/api');
const Task = require('./models/Task'); // import Task model

const app = express();
const PORT = process.env.PORT || 5001;

// --- Database Connection ---
const MONGO_URI = 'mongodb+srv://tadidurgaprasad01_db_user:Durga@cluster0.l6mkeax.mongodb.net/tasktracker';

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected successfully.');

    // --- Auto-seed logic ---
    const existingTasks = await Task.find();
    if (existingTasks.length === 0) {
      console.log('🌱 No tasks found. Seeding default data...');
      const seedTasks = [
        {
          title: 'Design the new homepage',
          description: 'Create mockups in Figma for the v2 homepage.',
          priority: 'High',
          status: 'In Progress',
          dueDate: new Date(Date.now() + 2 * 86400000)
        },
        {
          title: 'Fix login bug',
          description: 'User cannot reset password.',
          priority: 'High',
          status: 'To Do',
          dueDate: new Date(Date.now() + 86400000)
        },
        {
          title: 'Write blog post about AI',
          description: 'Draft a 500-word article on new AI trends.',
          priority: 'Medium',
          status: 'To Do',
          dueDate: new Date(Date.now() + 7 * 86400000)
        },
        {
          title: 'Deploy backend to production',
          description: 'Push latest changes to the live server.',
          priority: 'High',
          status: 'To Do',
          dueDate: new Date(Date.now() + 3 * 86400000)
        },
        {
          title: 'Update user documentation',
          description: 'Add new section for the task tracker feature.',
          priority: 'Low',
          status: 'Done',
          dueDate: new Date(Date.now() - 5 * 86400000)
        },
        {
          title: 'Review team pull requests',
          priority: 'Medium',
          status: 'In Progress',
        },
      ];
      await Task.insertMany(seedTasks);
      console.log('✅ Default tasks added.');
    }
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Routes ---
app.use('/api', apiRoutes);

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});
