import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';
const { app } = await import('../src/server.js');
const { default: Todo } = await import('../src/models/Todo.js');
const { default: request } = await import('supertest');

const sampleTodo = {
  _id: new mongoose.Types.ObjectId().toString(),
  title: 'Learn Docker',
  completed: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

afterEach(() => {
  mock.restoreAll();
});

describe('Todo API', () => {
  it('reports API health and the current database connection state', async () => {
    const response = await request(app).get('/api/health').expect(200);
    assert.deepEqual(response.body, { status: 'ok', database: 'disconnected' });
  });

  it('returns todos from MongoDB', async () => {
    mock.method(Todo, 'find', () => ({ sort: async () => [sampleTodo] }));
    const response = await request(app).get('/api/todos').expect(200);
    assert.equal(response.body.length, 1);
    assert.equal(response.body[0].title, sampleTodo.title);
  });

  it('creates a trimmed todo with the default completion state', async () => {
    mock.method(Todo, 'create', async (data) => ({ ...sampleTodo, ...data }));
    const response = await request(app).post('/api/todos').send({ title: '  Learn Docker  ' }).expect(201);
    assert.equal(response.body.title, 'Learn Docker');
    assert.equal(response.body.completed, false);
  });

  it('rejects empty and overlong titles', async () => {
    await request(app).post('/api/todos').send({ title: '   ' }).expect(400);
    await request(app).post('/api/todos').send({ title: 'x'.repeat(161) }).expect(400);
  });

  it('updates completion and title', async () => {
    mock.method(Todo, 'findByIdAndUpdate', async (_id, updates) => ({ ...sampleTodo, ...updates }));
    const response = await request(app).patch(`/api/todos/${sampleTodo._id}`)
      .send({ completed: true, title: 'Write API tests' }).expect(200);
    assert.equal(response.body.title, 'Write API tests');
    assert.equal(response.body.completed, true);
  });

  it('returns 404 for a missing todo and 400 for an invalid id', async () => {
    mock.method(Todo, 'findByIdAndUpdate', async () => null);
    await request(app).patch('/api/todos/507f1f77bcf86cd799439011').send({ completed: true }).expect(404);
    await request(app).delete('/api/todos/not-an-id').expect(400);
  });

  it('deletes a todo and returns 204', async () => {
    mock.method(Todo, 'findByIdAndDelete', async () => sampleTodo);
    await request(app).delete(`/api/todos/${sampleTodo._id}`).expect(204);
  });
});

