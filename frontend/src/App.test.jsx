import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe('Daylight Todo UI', () => {
  it('loads and displays todos returned by the API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([
      { _id: 'todo-1', title: 'Ship the app', completed: false },
    ])));

    render(<App />);

    expect(await screen.findByText('Ship the app')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('creates a task through the API and clears the input', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ _id: 'todo-2', title: 'Test the UI', completed: false }, 201));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<App />);

    await user.type(await screen.findByLabelText('Add a task'), 'Test the UI');
    await user.click(screen.getByRole('button', { name: /add task/i }));

    expect(await screen.findByText('Test the UI')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/todos', expect.objectContaining({ method: 'POST' }));
    expect(screen.getByLabelText('Add a task')).toHaveValue('');
  });

  it('filters active and completed tasks', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([
      { _id: 'active-1', title: 'Open task', completed: false },
      { _id: 'done-1', title: 'Finished task', completed: true },
    ])));
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText('Open task')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Active' }));
    expect(screen.getByText('Open task')).toBeInTheDocument();
    expect(screen.queryByText('Finished task')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByText('Finished task')).toBeInTheDocument();
    expect(screen.queryByText('Open task')).not.toBeInTheDocument();
  });

  it('marks a task completed and sends the update to the API', async () => {
    const todo = { _id: 'todo-3', title: 'Check the pipeline', completed: false };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse([todo]))
      .mockResolvedValueOnce(jsonResponse({ ...todo, completed: true }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Mark as completed' }));
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/todos/todo-3',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ completed: true }) }),
    ));
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('deletes a task from the list', async () => {
    const todo = { _id: 'todo-4', title: 'Delete this task', completed: false };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse([todo]))
      .mockResolvedValueOnce({ ok: true, status: 204 });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Delete Delete this task' }));
    await waitFor(() => expect(screen.queryByText('Delete this task')).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenLastCalledWith('/api/todos/todo-4', expect.objectContaining({ method: 'DELETE' }));
  });
});

