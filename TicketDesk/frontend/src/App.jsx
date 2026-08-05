import React, { useState, useEffect } from 'react';
import './index.css';

const API_URL = 'http://localhost:9090/api';

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({});
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [updateStatusVal, setUpdateStatusVal] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDashboard();
    fetchTickets();
  }, [filterStatus]);

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API_URL}/dashboard`);
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTickets = async () => {
    try {
      let url = `${API_URL}/tickets`;
      if (filterStatus) url += `?status=${filterStatus}`;
      const res = await fetch(url);
      const data = await res.json();
      setTickets(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTicketDetail = async (id) => {
    try {
      const res = await fetch(`${API_URL}/tickets/${id}`);
      const data = await res.json();
      setSelectedTicket(data);
      setUpdateStatusVal(data.status);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
      title: formData.get('title'),
      category: formData.get('category'),
      priority: formData.get('priority'),
      description: formData.get('description'),
    };
    try {
      await fetch(`${API_URL}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setCreateModalOpen(false);
      fetchDashboard();
      fetchTickets();
    } catch (e) {
      alert('Failed to create ticket');
    }
  };

  const handleUpdateStatus = async (status) => {
    try {
      await fetch(`${API_URL}/tickets/${selectedTicket.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      fetchTicketDetail(selectedTicket.id);
      fetchDashboard();
      fetchTickets();
    } catch (e) {
      alert('Failed to update status');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    const content = e.target.elements.comment.value;
    if (!content) return;
    try {
      await fetch(`${API_URL}/tickets/${selectedTicket.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      e.target.reset();
      fetchTicketDetail(selectedTicket.id);
    } catch (e) {
      alert('Failed to add comment');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await fetch(`${API_URL}/tickets/${selectedTicket.id}/upload-url?filename=${encodeURIComponent(file.name)}`);
      const data = await res.json();
      await fetch(`${API_URL}/tickets/${selectedTicket.id}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachmentUrl: data.objectKey })
      });
      fetchTicketDetail(selectedTicket.id);
    } catch (err) {
      alert('Failed to upload file');
    }
  };
  const matchesSearch = (t) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q) ||
      ('#' + t.id).includes(q) ||
      t.id.toString().includes(q.replace('#', ''))
    );
  };

  return (
    <>
      <div className="bg-shape shape-1"></div>
      <div className="bg-shape shape-2"></div>
      <div className="bg-shape shape-3"></div>

      <div className="app-container">
        <aside className="sidebar glass-panel">
          <div className="logo">
            <h2>🎫 TicketDesk</h2>
          </div>
          <nav>
            <button className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')}>
              Dashboard
            </button>
            <button className={`nav-item ${activeView === 'tickets' ? 'active' : ''}`} onClick={() => setActiveView('tickets')}>
              All Tickets
            </button>
            <button className="nav-item create-btn" onClick={() => setCreateModalOpen(true)}>
              + New Ticket
            </button>
          </nav>
        </aside>

        <main className="content-area">
          <header className="topbar glass-panel">
            <div className="search-bar">
              <input 
                type="text" 
                placeholder="Search tickets..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="user-profile">
              <img src="https://ui-avatars.com/api/?name=Admin&background=6c5ce7&color=fff" alt="User" />
            </div>
          </header>

          {activeView === 'dashboard' && (
            <div className="view">
              <h1 className="page-title">Overview</h1>
              <div className="stats-grid">
                <div className="stat-card glass-panel">
                  <span className="stat-title">Total Tickets</span>
                  <span className="stat-value">{stats.total || 0}</span>
                </div>
                <div className="stat-card glass-panel" style={{ borderBottom: '3px solid var(--primary)' }}>
                  <span className="stat-title">Open</span>
                  <span className="stat-value">{stats.byStatus?.OPEN || 0}</span>
                </div>
                <div className="stat-card glass-panel" style={{ borderBottom: '3px solid var(--priority-high)' }}>
                  <span className="stat-title">High/Critical</span>
                  <span className="stat-value">{(stats.byPriority?.HIGH || 0) + (stats.byPriority?.CRITICAL || 0)}</span>
                </div>
              </div>
              <h2 className="section-title mt-2">Recent Tickets</h2>
              <div className="tickets-grid">
                {tickets
                  .filter(matchesSearch)
                  .slice(0, 4)
                  .map(t => (
                  <TicketCard key={t.id} ticket={t} onClick={() => fetchTicketDetail(t.id)} />
                ))}
              </div>
            </div>
          )}

          {activeView === 'tickets' && (
            <div className="view">
              <div className="flex-between">
                <h1 className="page-title">All Tickets</h1>
                <div className="filters">
                  <select className="glass-input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">All Statuses</option>
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
              </div>
              <div className="tickets-grid">
                {tickets
                  .filter(matchesSearch)
                  .map(t => (
                  <TicketCard key={t.id} ticket={t} onClick={() => fetchTicketDetail(t.id)} />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Create Modal */}
      <div className={`modal-overlay ${isCreateModalOpen ? 'active' : ''}`}>
        <div className="modal glass-panel">
          <div className="modal-header">
            <h3>Create New Ticket</h3>
            <button className="close-btn" onClick={() => setCreateModalOpen(false)}>×</button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleCreateTicket}>
              <div className="form-group">
                <label>Title</label>
                <input type="text" name="title" className="glass-input" required />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select name="category" className="glass-input" required>
                  <option value="HARDWARE">Hardware</option>
                  <option value="SOFTWARE">Software</option>
                  <option value="NETWORK">Network</option>
                  <option value="ACCESS">Access</option>
                </select>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select name="priority" className="glass-input" required>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea name="description" className="glass-input" rows="4" required></textarea>
              </div>
              <button type="submit" className="btn primary-btn">Submit Ticket</button>
            </form>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <div className={`modal-overlay ${selectedTicket ? 'active' : ''}`}>
        {selectedTicket && (
          <div className="modal glass-panel modal-lg">
            <div className="modal-header">
              <h3>{selectedTicket.title}</h3>
              <button className="close-btn" onClick={() => setSelectedTicket(null)}>×</button>
            </div>
            <div className="modal-body ticket-detail-layout">
              <div className="ticket-info">
                <div className="badges">
                  <span className={`badge badge-priority-${selectedTicket.priority.toLowerCase()}`}>{selectedTicket.priority}</span>
                  <span className="badge badge-status">{selectedTicket.status}</span>
                </div>
                <p className="ticket-desc">{selectedTicket.description}</p>
                
                <div className="attachment-section mt-2">
                  <h4>Attachment</h4>
                  {selectedTicket.attachmentUrl ? (
                    <div><a href={selectedTicket.attachmentUrl} target="_blank" rel="noreferrer" style={{color: 'var(--primary)'}}>View Attachment</a></div>
                  ) : <div>No attachment</div>}
                  <div className="upload-area mt-1">
                    <input type="file" id="file-upload" style={{display: 'none'}} onChange={handleFileUpload} />
                    <button className="btn secondary-btn btn-sm" onClick={() => document.getElementById('file-upload').click()}>
                      Attach File
                    </button>
                  </div>
                </div>

                <div className="status-updater mt-2">
                  <h4>Update Status</h4>
                  <div className="flex-gap">
                    <select className="glass-input" value={updateStatusVal} onChange={(e) => setUpdateStatusVal(e.target.value)}>
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                    <button className="btn primary-btn btn-sm" onClick={() => handleUpdateStatus(updateStatusVal)}>
                      Update
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="ticket-comments">
                <h4>Comments</h4>
                <div className="comments-list">
                  {selectedTicket.comments?.length === 0 && <p className="text-muted">No comments yet.</p>}
                  {selectedTicket.comments?.map(c => (
                    <div className="comment-bubble" key={c.id}>
                      <div className="comment-meta">{new Date(c.createdAt).toLocaleString()}</div>
                      <div>{c.content}</div>
                    </div>
                  ))}
                </div>
                <form className="add-comment" onSubmit={handleAddComment}>
                  <textarea name="comment" className="glass-input" rows="2" placeholder="Write a comment..." required></textarea>
                  <button type="submit" className="btn primary-btn mt-1">Send</button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function TicketCard({ ticket, onClick }) {
  return (
    <div className="ticket-card glass-panel" onClick={onClick}>
      <div className="ticket-header">
        <div>
          <div className="ticket-title">{ticket.title}</div>
          <div className="ticket-meta">#{ticket.id} • {ticket.category}</div>
        </div>
      </div>
      <div className="badges mt-1">
        <span className={`badge badge-priority-${ticket.priority.toLowerCase()}`}>{ticket.priority}</span>
        <span className="badge badge-status">{ticket.status}</span>
      </div>
    </div>
  );
}

export default App;
