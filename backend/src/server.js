import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import Todo from './models/Todo.js';

export const app = express();
const port = Number(process.env.PORT) || 5000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/todo_app';

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

app.get('/api/todos', async (_req, res, next) => {
  try {
    const todos = await Todo.find().sort({ createdAt: -1 });
    res.json(todos);
  } catch (error) {
    next(error);
  }
});

app.post('/api/todos', async (req, res, next) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    if (!title) return res.status(400).json({ message: 'Please enter a task.' });
    if (title.length > 160) return res.status(400).json({ message: 'Task must be 160 characters or fewer.' });
    const todo = await Todo.create({ title });
    res.status(201).json(todo);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/todos/:id', async (req, res, next) => {
  try {
    const updates = {};
    if (typeof req.body.completed === 'boolean') updates.completed = req.body.completed;
    if (typeof req.body.title === 'string') {
      const title = req.body.title.trim();
      if (!title || title.length > 160) return res.status(400).json({ message: 'Task title must contain 1–160 characters.' });
      updates.title = title;
    }
    const todo = await Todo.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!todo) return res.status(404).json({ message: 'Task not found.' });
    res.json(todo);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/todos/:id', async (req, res, next) => {
  try {
    const todo = await Todo.findByIdAndDelete(req.params.id);
    if (!todo) return res.status(404).json({ message: 'Task not found.' });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid task ID.' });
  console.error(error);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

if (process.env.NODE_ENV !== 'test') {
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');
  app.listen(port, '0.0.0.0', () => console.log(`Todo API listening on port ${port}`));
}

