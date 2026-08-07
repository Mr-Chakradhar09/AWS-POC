import React, { useState, useEffect, useRef } from 'react';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [tickets, setTickets] = useState([]);
  const [techs, setTechs] = useState([]);
  const [stats, setStats] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isCreateUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [updateStatusVal, setUpdateStatusVal] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Authentication Handlers
  const handleLogin = async (e, quickCreds) => {
    if (e) e.preventDefault();
    const username = quickCreds ? quickCreds.username : e.target.username.value;
    const password = quickCreds ? quickCreds.password : e.target.password.value;
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
      } else {
        alert('Invalid credentials');
      }
    } catch (err) {
      alert('Login failed');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setTickets([]);
    setStats({});
    setNotifications([]);
    setActiveView('dashboard');
  };

  // Data Fetching
  useEffect(() => {
    if (currentUser) {
      fetchDashboard();
      fetchTickets();
      fetchNotifications();
      if (currentUser.role === 'ADMIN') {
        fetchTechs();
      }
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [currentUser, filterStatus]);

  const fetchTechs = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/users?role=TECH`);
      setTechs(await res.json());
    } catch (e) { console.error(e); }
  };

  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'X-User-Id': currentUser?.id,
      'X-User-Role': currentUser?.role
    };
  };

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API_URL}/dashboard`, { headers: getAuthHeaders() });
      setStats(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchTickets = async () => {
    try {
      let url = `${API_URL}/tickets`;
      if (filterStatus) url += `?status=${filterStatus}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      setTickets(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/notifications/${currentUser.id}`);
      setNotifications(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchTicketDetail = async (id) => {
    try {
      const res = await fetch(`${API_URL}/tickets/${id}`, { headers: getAuthHeaders() });
      const data = await res.json();
      setSelectedTicket(data);
      setUpdateStatusVal(data.status);
    } catch (e) { console.error(e); }
  };

  // Actions
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
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      setCreateModalOpen(false);
      fetchDashboard();
      fetchTickets();
    } catch (e) { alert('Failed to create ticket'); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
      username: formData.get('username'),
      password: formData.get('password'),
      role: formData.get('role')
    };
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('User created successfully!');
        setCreateUserModalOpen(false);
        if (currentUser.role === 'ADMIN') {
          fetchTechs();
        }
      } else {
        const err = await res.text();
        alert('Error: ' + err);
      }
    } catch (e) { alert('Failed to create user'); }
  };

  const handleUpdateStatus = async (status) => {
    try {
      await fetch(`${API_URL}/tickets/${selectedTicket.id}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
      });
      fetchDashboard();
      fetchTickets();
      setSelectedTicket(null);
      setActiveView('dashboard');
    } catch (e) { alert('Failed to update status'); }
  };

  const handleAssignTicket = async (techId) => {
    if (!techId) return;
    try {
      await fetch(`${API_URL}/tickets/${selectedTicket.id}/assign`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ assigneeId: parseInt(techId) })
      });
      fetchDashboard();
      fetchTickets();
      setSelectedTicket(null);
      setActiveView('dashboard');
    } catch (e) { alert('Failed to assign ticket'); }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    const content = e.target.elements.comment.value;
    if (!content) return;
    try {
      await fetch(`${API_URL}/tickets/${selectedTicket.id}/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content, authorName: currentUser.username })
      });
      e.target.reset();
      fetchTicketDetail(selectedTicket.id);
    } catch (e) { alert('Failed to add comment'); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await fetch(`${API_URL}/tickets/${selectedTicket.id}/upload-url?filename=${encodeURIComponent(file.name)}`);
      const data = await res.json();
      await fetch(`${API_URL}/tickets/${selectedTicket.id}/attachments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ attachmentUrl: data.objectKey })
      });
      fetchTicketDetail(selectedTicket.id);
    } catch (err) { alert('Failed to upload file'); }
  };

  const requestMoreTickets = async () => {
    try {
      await fetch(`${API_URL}/notifications/request-tickets`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      alert('Request sent to Admins!');
    } catch (e) { alert('Failed to request tickets'); }
  };

  const markNotificationRead = async (id) => {
    try {
      await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PATCH' });
      fetchNotifications();
    } catch (e) { console.error(e); }
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

  const handleToggleNotifications = () => {
    if (!showNotifications) {
      notifications.filter(n => !n.read).forEach(n => markNotificationRead(n.id));
    }
    setShowNotifications(!showNotifications);
  };

  // Auth View Render
  if (!currentUser) {
    const fillLoginForm = (u, p) => {
      document.getElementsByName('username')[0].value = u;
      document.getElementsByName('password')[0].value = p;
    };

    return (
      <>
        <div className="bg-shape shape-1"></div>
        <div className="bg-shape shape-2"></div>
        <div className="bg-shape shape-3"></div>
        <div className="auth-container">
          <div className="auth-card glass-panel">
            <h2 className="text-center mb-2">Login to TicketDesk</h2>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Username</label>
                <input type="text" name="username" className="glass-input" required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? "text" : "password"} name="password" style={{paddingRight: '40px'}} className="glass-input" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn primary-btn w-100">Login</button>
            </form>
            <div className="mt-2 text-center">
              <p className="text-muted mb-1">Quick Fill Credentials:</p>
              <div className="flex-gap" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn secondary-btn btn-sm" onClick={() => fillLoginForm('user', 'user123')}>Fill User</button>
                <button className="btn secondary-btn btn-sm" onClick={() => fillLoginForm('admin', 'admin123')}>Fill Admin</button>
                <button className="btn secondary-btn btn-sm" onClick={() => fillLoginForm('tech', 'tech123')}>Fill Tech</button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  // Main App Render
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
            {currentUser.role !== 'TECH' && (
              <button className="nav-item create-btn" onClick={() => setCreateModalOpen(true)}>
                + New Ticket
              </button>
            )}
            {currentUser.role === 'ADMIN' && (
              <button className="nav-item create-btn mt-1" onClick={() => setCreateUserModalOpen(true)} style={{background: 'rgba(108, 92, 231, 0.5)'}}>
                + Create User
              </button>
            )}
          </nav>
        </aside>

        <main className="content-area">
          <header className="topbar glass-panel flex-between">
            <div className="search-bar">
              <input 
                type="text" 
                placeholder="Search tickets..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="user-profile flex-gap" style={{ alignItems: 'center' }}>
              
              <div className="notifications-wrapper" style={{ position: 'relative' }} ref={notifRef}>
                <button className="btn secondary-btn btn-sm" onClick={handleToggleNotifications}>
                  🔔 {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                </button>
                {showNotifications && (
                  <div className="notifications-dropdown glass-panel">
                    <h4>Notifications</h4>
                    {notifications.length === 0 ? <p className="text-muted">No notifications</p> : null}
                    {notifications.map(n => (
                      <div key={n.id} className="notification-item">
                        <p>{n.message}</p>
                        <small className="text-muted">{new Date(n.createdAt).toLocaleTimeString()}</small>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="profile-info">
                <span className="badge badge-priority-high">{currentUser.role}</span>
                <span style={{marginLeft: '10px'}}>{currentUser.username}</span>
              </div>
              <button className="btn secondary-btn btn-sm" onClick={handleLogout}>Logout</button>
            </div>
          </header>

          {activeView === 'dashboard' && (
            <div className="view">
              <div className="flex-between">
                <div className="flex-gap" style={{ alignItems: 'center' }}>
                  <h1 className="page-title">{currentUser.role === 'USER' ? 'My Dashboard' : 'Overview'}</h1>
                </div>
                {currentUser.role === 'TECH' && (tickets || []).filter(t => t.status !== 'CLOSED' && t.status !== 'RESOLVED').length === 0 && (
                  <button className="btn primary-btn" style={{ fontSize: '14px', padding: '5px', margin: '0 80px', width: 'fit-content' }} onClick={requestMoreTickets}>Request More Tickets</button>
                )}
              </div>
              
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
                  .filter(t => !filterStatus || t.status === filterStatus)
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

      {/* Create User Modal (ADMIN ONLY) */}
      {currentUser.role === 'ADMIN' && (
        <div className={`modal-overlay ${isCreateUserModalOpen ? 'active' : ''}`}>
          <div className="modal glass-panel">
            <div className="modal-header">
              <h3>Create New User</h3>
              <button className="close-btn" onClick={() => setCreateUserModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreateUser}>
                <div className="form-group">
                  <label>Username</label>
                  <input type="text" name="username" className="glass-input" required />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPassword ? "text" : "password"} name="password" style={{paddingRight: '40px'}} className="glass-input" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select name="role" className="glass-input" required>
                    <option value="USER">Standard User</option>
                    <option value="TECH">IT Technician</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
                <button type="submit" className="btn primary-btn" style={{background: 'var(--primary)'}}>Create User</button>
              </form>
            </div>
          </div>
        </div>
      )}

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

                {/* Tech Status Update */}
                {(currentUser.role === 'TECH' || currentUser.role === 'ADMIN') && (
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
                )}

                {/* Admin Assignment */}
                {currentUser.role === 'ADMIN' && (
                  <div className="assign-updater mt-2">
                    <h4>Assign to Tech</h4>
                    <div className="flex-gap">
                      <select id="tech-select" className="glass-input" defaultValue={selectedTicket.assigneeId || ''}>
                        <option value="" disabled>Select a Tech...</option>
                        {techs.map(t => (
                          <option key={t.id} value={t.id}>{t.username} (Tech #{t.id})</option>
                        ))}
                      </select>
                      <button className="btn secondary-btn btn-sm" onClick={() => handleAssignTicket(document.getElementById('tech-select').value)}>
                        Assign
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="ticket-comments">
                <h4>Comments</h4>
                <div className="comments-list">
                  {selectedTicket.comments?.length === 0 && <p className="text-muted">No comments yet.</p>}
                  {selectedTicket.comments?.map(c => (
                    <div className="comment-bubble" key={c.id}>
                      <div className="comment-meta">{c.authorName || 'Unknown User'} • {new Date(c.createdAt).toLocaleString()}</div>
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
