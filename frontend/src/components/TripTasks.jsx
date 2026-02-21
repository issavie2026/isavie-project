import React, { useEffect, useState } from 'react';
import { tasks as tasksApi } from '../api';

const STATUS = ['todo', 'in_progress', 'done'];

export default function TripTasks({ tripId, canEdit, members }) {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    tasksApi.list(tripId)
      .then((res) => setTasks(res || []))
      .catch((e) => setError(e.message || 'Failed to load tasks'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [tripId]);

  const addTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setError('');
    try {
      await tasksApi.create(tripId, { title: title.trim() });
      setTitle('');
      load();
    } catch (e) {
      setError(e.message || 'Failed to create task');
    }
  };

  const updateStatus = async (taskId, status) => {
    try {
      await tasksApi.update(tripId, taskId, { status });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    } catch (e) {
      setError(e.message || 'Failed to update task');
    }
  };

  const removeTask = async (taskId) => {
    try {
      await tasksApi.delete(tripId, taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (e) {
      setError(e.message || 'Failed to delete task');
    }
  };

  if (loading) return <p style={{ color: 'var(--text-muted)' }}>Loading tasks...</p>;

  return (
    <div className="card" style={{ maxWidth: '42rem' }}>
      <h3 style={{ marginTop: 0 }}>Tasks</h3>
      <p className="muted">Lightweight to-dos for the group.</p>

      {canEdit && (
        <form onSubmit={addTask} style={{ marginBottom: '1rem' }}>
          <div className="input-row">
            <input placeholder="Add a task" value={title} onChange={(e) => setTitle(e.target.value)} />
            <button type="submit" className="btn btn-primary">Add</button>
          </div>
        </form>
      )}

      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      {tasks.length === 0 ? (
        <p className="muted">No tasks yet.</p>
      ) : (
        <ul className="clean-list">
          {tasks.map((task) => (
            <li key={task.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div>
                <strong>{task.title}</strong>
                <div className="muted" style={{ fontSize: '0.85rem' }}>{task.status.replace('_', ' ')}</div>
              </div>
              {canEdit && (
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <select value={task.status} onChange={(e) => updateStatus(task.id, e.target.value)}>
                    {STATUS.map((s) => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-ghost" onClick={() => removeTask(task.id)}>Delete</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
