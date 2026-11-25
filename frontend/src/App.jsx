import { useEffect, useMemo, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { Check, CheckCheck, Circle, ClipboardList, LoaderCircle, Plus, Sparkles, Trash2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || 'Request failed. Please try again.');
  }
  return response.status === 204 ? null : response.json();
}

export default function App() {
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState('all');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    request('/todos')
      .then(setTodos)
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, []);

  const completed = todos.filter((todo) => todo.completed).length;
  const remaining = todos.length - completed;
  const visibleTodos = useMemo(() => todos.filter((todo) => (
    filter === 'active' ? !todo.completed : filter === 'completed' ? todo.completed : true
  )), [todos, filter]);
  const progress = todos.length ? Math.round((completed / todos.length) * 100) : 0;

  async function addTodo(event) {
    event.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const todo = await request('/todos', { method: 'POST', body: JSON.stringify({ title }) });
      setTodos((current) => [todo, ...current]);
      setTitle('');
      toast.success('Task added to your list');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleTodo(todo) {
    const next = !todo.completed;
    setTodos((current) => current.map((item) => item._id === todo._id ? { ...item, completed: next } : item));
    try {
      const updated = await request(`/todos/${todo._id}`, { method: 'PATCH', body: JSON.stringify({ completed: next }) });
      setTodos((current) => current.map((item) => item._id === todo._id ? updated : item));
    } catch (error) {
      setTodos((current) => current.map((item) => item._id === todo._id ? todo : item));
      toast.error(error.message);
    }
  }

  async function deleteTodo(todo) {
    const previous = todos;
    setTodos((current) => current.filter((item) => item._id !== todo._id));
    try {
      await request(`/todos/${todo._id}`, { method: 'DELETE' });
      toast.success('Task deleted');
    } catch (error) {
      setTodos(previous);
      toast.error(error.message);
    }
  }

  async function clearCompleted() {
    const done = todos.filter((todo) => todo.completed);
    if (!done.length) return;
    const previous = todos;
    setTodos((current) => current.filter((todo) => !todo.completed));
    const results = await Promise.allSettled(done.map((todo) => request(`/todos/${todo._id}`, { method: 'DELETE' })));
    const failed = done.filter((_todo, index) => results[index].status === 'rejected');
    if (failed.length) {
      setTodos((current) => [...failed, ...current]);
      toast.error(`Could not delete ${failed.length} task(s)`);
    } else {
      toast.success('Completed tasks cleared');
    }
    if (results.length && results.every((result) => result.status === 'rejected')) setTodos(previous);
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 sm:py-16">
      <Toaster position="top-right" toastOptions={{ duration: 2800, style: { borderRadius: '14px', padding: '12px 16px' } }} />
      <div className="mx-auto max-w-2xl">
        <header className="mb-10 flex items-center justify-between">
          <a className="flex items-center gap-3" href="#top" aria-label="Daylight home">
            <span className="brand-mark"><CheckCheck size={21} strokeWidth={2.5} /></span>
            <span className="text-lg font-extrabold tracking-tight text-slate-800">daylight<span className="text-indigo-500">.</span></span>
          </a>
          <span className="rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-500">YOUR PERSONAL SPACE</span>
        </header>

        <section id="top" className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600"><Sparkles size={16} /> A little progress goes a long way</div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Make room for<br /><span className="text-indigo-500">what matters.</span></h1>
          <p className="mt-4 max-w-md text-base leading-7 text-slate-500">Keep your day clear and your next step simple. One task at a time.</p>
        </section>

        <section className="panel mb-5 p-5 sm:p-6" aria-label="Task progress">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div><p className="text-sm font-semibold text-slate-500">YOUR DAILY PROGRESS</p><p className="mt-1 text-2xl font-extrabold text-slate-800">{completed} <span className="text-base font-medium text-slate-400">/ {todos.length} completed</span></p></div>
            <span className="text-2xl font-extrabold text-indigo-600">{progress}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-400 transition-all duration-500" style={{ width: `${progress}%` }} /></div>
          <div className="mt-4 flex justify-between text-xs font-medium text-slate-400"><span>{remaining} left to do</span><span>{completed ? 'Keep that momentum!' : 'Your fresh start begins here'}</span></div>
        </section>

        <section className="panel overflow-hidden">
          <form onSubmit={addTodo} className="flex gap-2 border-b border-slate-100 p-4 sm:p-5">
            <label className="sr-only" htmlFor="new-task">Add a task</label>
            <input id="new-task" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} placeholder="What needs to get done?" className="min-w-0 flex-1 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none ring-indigo-200 transition placeholder:text-slate-400 focus:ring-2" />
            <button type="submit" disabled={!title.trim() || saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-45"><Plus size={18} /> <span className="hidden sm:inline">Add task</span></button>
          </form>

          <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-5 sm:px-6">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700"><ClipboardList size={17} className="text-indigo-500" /> Your tasks <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{todos.length}</span></div>
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1" aria-label="Filter tasks">
              {[['all', 'All'], ['active', 'Active'], ['completed', 'Done']].map(([value, label]) => <button key={value} onClick={() => setFilter(value)} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 ${filter === value ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{label}</button>)}
            </div>
          </div>

          <div className="min-h-64 px-3 pb-3 pt-2 sm:px-4">
            {loading ? <div className="flex h-56 items-center justify-center text-sm text-slate-400"><LoaderCircle className="mr-2 animate-spin" size={18} /> Loading your tasks...</div> : visibleTodos.length ? <ul className="space-y-1">{visibleTodos.map((todo) => <li key={todo._id} className="task-row group flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-slate-50 sm:px-4"><button onClick={() => toggleTodo(todo)} aria-label={todo.completed ? 'Mark as active' : 'Mark as completed'} className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${todo.completed ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 text-transparent hover:border-indigo-400'}`}>{todo.completed ? <Check size={14} strokeWidth={3} /> : <Circle size={12} />}</button><span className={`min-w-0 flex-1 break-words text-sm font-medium ${todo.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{todo.title}</span><button onClick={() => deleteTodo(todo)} aria-label={`Delete ${todo.title}`} className="rounded-lg p-2 text-slate-300 opacity-100 transition hover:bg-rose-50 hover:text-rose-500 sm:opacity-0 sm:group-hover:opacity-100"><Trash2 size={16} /></button></li>)}</ul> : <div className="flex h-56 flex-col items-center justify-center text-center"><span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500"><CheckCheck size={23} /></span><p className="font-bold text-slate-700">{filter === 'completed' ? 'Nothing completed yet' : filter === 'active' ? 'You’re all caught up!' : 'A clear page. A fresh start.'}</p><p className="mt-1 text-sm text-slate-400">{filter === 'all' ? 'Add your first task above and make today count.' : 'Tasks in this view will show up here.'}</p></div>}
          </div>

          {completed > 0 && <footer className="flex items-center justify-between border-t border-slate-100 px-5 py-4"><span className="text-xs font-medium text-slate-400">{completed} task{completed === 1 ? '' : 's'} completed</span><button onClick={clearCompleted} className="text-xs font-semibold text-slate-400 transition hover:text-rose-500">Clear completed</button></footer>}
        </section>
        <p className="mt-7 text-center text-xs font-medium tracking-wide text-slate-400">MADE FOR CALMER, MORE FOCUSED DAYS</p>
      </div>
    </main>
  );
}

