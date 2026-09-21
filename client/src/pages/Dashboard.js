// pages/Dashboard.js
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const roleBadgeColor = {
  admin: { background: '#ef4444', color: '#ffffff' },
  developer: { background: '#3b82f6', color: '#ffffff' },
  viewer: { background: '#10b981', color: '#ffffff' },
  owner: { background: '#8b5cf6', color: '#ffffff' },
  read: { background: '#64748b', color: '#ffffff' },
  write: { background: '#0284c7', color: '#ffffff' },
};

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    padding: '2rem 1.5rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#0f172a',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    maxWidth: '1200px',
    margin: '0 auto 2rem',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  brandIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.3rem',
    fontWeight: 'bold',
  },
  title: {
    margin: 0,
    color: '#0f172a',
    fontSize: '1.4rem',
    fontWeight: '700',
  },
  nav: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
  },
  navLink: {
    textDecoration: 'none',
    color: '#64748b',
    fontWeight: '600',
    fontSize: '0.92rem',
    padding: '0.45rem 0.75rem',
    borderRadius: '8px',
  },
  navLinkActive: {
    color: '#1a73e8',
    background: '#eff6ff',
  },
  logoutBtn: {
    padding: '0.45rem 1rem',
    background: '#fee2e2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.9rem',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  welcomeCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '1.6rem 2rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
    border: '1px solid #e2e8f0',
    marginBottom: '1.75rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
  },
  avatar: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: '700',
  },
  badge: {
    display: 'inline-block',
    padding: '0.25rem 0.7rem',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginLeft: '0.6rem',
  },
  newProjectBtn: {
    padding: '0.75rem 1.4rem',
    background: 'linear-gradient(135deg, #1a73e8 0%, #1557b0 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(26, 115, 232, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
    gap: '1.25rem',
    marginBottom: '2rem',
  },
  statCard: {
    background: '#ffffff',
    borderRadius: '14px',
    padding: '1.5rem',
    boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  statLabel: {
    color: '#64748b',
    fontSize: '0.88rem',
    fontWeight: '600',
  },
  statNumber: {
    fontSize: '2.2rem',
    fontWeight: '800',
    color: '#0f172a',
    margin: '0.5rem 0 0.2rem',
  },
  statSub: {
    fontSize: '0.8rem',
    color: '#94a3b8',
  },
  controlsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.25rem',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  searchBar: {
    padding: '0.65rem 1rem',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '0.92rem',
    width: '280px',
    outline: 'none',
    background: '#ffffff',
  },
  filterPills: {
    display: 'flex',
    gap: '0.5rem',
  },
  pill: {
    padding: '0.45rem 0.9rem',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    color: '#64748b',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  pillActive: {
    background: '#eff6ff',
    borderColor: '#93c5fd',
    color: '#1a73e8',
  },
  projectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '1.5rem',
  },
  projectCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '1.6rem',
    boxShadow: '0 4px 18px rgba(0,0,0,0.04)',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
  },
  projectName: {
    margin: '0 0 0.25rem',
    fontSize: '1.2rem',
    fontWeight: '700',
    color: '#0f172a',
  },
  projectMeta: {
    fontSize: '0.82rem',
    color: '#64748b',
  },
  specsSection: {
    background: '#f8fafc',
    borderRadius: '10px',
    padding: '0.9rem 1rem',
    margin: '1rem 0',
    border: '1px solid #edf2f7',
  },
  specItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    marginBottom: '0.35rem',
  },
  cardActions: {
    display: 'flex',
    gap: '0.6rem',
    marginTop: '1rem',
    borderTop: '1px solid #f1f5f9',
    paddingTop: '1rem',
  },
  actionBtn: {
    flex: 1,
    padding: '0.55rem',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    color: '#334155',
    fontWeight: '600',
    fontSize: '0.84rem',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.15s',
  },
  actionBtnPrimary: {
    background: '#eff6ff',
    borderColor: '#bfdbfe',
    color: '#1a73e8',
  },
  actionBtnDelete: {
    flex: 'none',
    padding: '0.55rem 0.75rem',
    background: '#fff',
    borderColor: '#fecaca',
    color: '#dc2626',
  },
  emptyState: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '4rem 2rem',
    textAlign: 'center',
    border: '2px dashed #e2e8f0',
    maxWidth: '520px',
    margin: '2rem auto',
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modalContent: {
    background: '#ffffff',
    borderRadius: '20px',
    padding: '2.2rem',
    maxWidth: '540px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  modalTitle: {
    margin: 0,
    fontSize: '1.3rem',
    fontWeight: '700',
    color: '#0f172a',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#64748b',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    border: '1.5px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.95rem',
    boxSizing: 'border-box',
    outline: 'none',
    marginBottom: '1rem',
  },
  modalSubmitBtn: {
    width: '100%',
    padding: '0.85rem',
    background: 'linear-gradient(135deg, #1a73e8 0%, #1557b0 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  specRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem',
    borderRadius: '8px',
    background: '#f8fafc',
    marginBottom: '0.5rem',
    border: '1px solid #e2e8f0',
  },
  collabRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem',
    borderRadius: '8px',
    background: '#f8fafc',
    marginBottom: '0.5rem',
    border: '1px solid #e2e8f0',
  },
};

const Dashboard = () => {
  const { user, token, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // State
  const [stats, setStats] = useState({ totalProjects: 0, ownedProjects: 0, collaborations: 0, totalSpecs: 0 });
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, owned, shared

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newMaxWeight, setNewMaxWeight] = useState('');
  const [newTargetCost, setNewTargetCost] = useState('');

  // Specs Modal
  const [activeProjectForSpecs, setActiveProjectForSpecs] = useState(null);
  const [specWeight, setSpecWeight] = useState('');
  const [specCost, setSpecCost] = useState('');

  // Collaborators Modal
  const [activeProjectForCollabs, setActiveProjectForCollabs] = useState(null);
  const [collabEmail, setCollabEmail] = useState('');
  const [collabPerm, setCollabPerm] = useState('read');
  const [collabMsg, setCollabMsg] = useState('');

  // Fetch Data
  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, projRes] = await Promise.all([
        axios.get('/api/projects/stats', { headers }),
        axios.get('/api/projects', { headers }),
      ]);
      setStats(statsRes.data);
      setProjects(projRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Create Project
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      await axios.post(
        '/api/projects',
        {
          name: newProjectName.trim(),
          max_weight: newMaxWeight,
          target_cost: newTargetCost,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNewProjectName('');
      setNewMaxWeight('');
      setNewTargetCost('');
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating project');
    }
  };

  // Delete Project
  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to permanently delete this project and its material specs?')) {
      return;
    }
    try {
      await axios.delete(`/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting project');
    }
  };

  // Open Specs Modal
  const handleOpenSpecs = async (project) => {
    try {
      const res = await axios.get(`/api/projects/${project.project_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setActiveProjectForSpecs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Add Spec inside Modal
  const handleAddSpec = async (e) => {
    e.preventDefault();
    if (!activeProjectForSpecs) return;

    try {
      await axios.post(
        `/api/projects/${activeProjectForSpecs.project_id}/specs`,
        { max_weight: specWeight, target_cost: specCost },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSpecWeight('');
      setSpecCost('');
      handleOpenSpecs(activeProjectForSpecs); // reload specs modal
      fetchData(); // refresh dashboard stats
    } catch (err) {
      alert(err.response?.data?.message || 'Error adding material spec');
    }
  };

  // Delete Spec
  const handleDeleteSpec = async (specId) => {
    try {
      await axios.delete(`/api/projects/${activeProjectForSpecs.project_id}/specs/${specId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      handleOpenSpecs(activeProjectForSpecs);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error removing spec');
    }
  };

  // Open Collaborators Modal
  const handleOpenCollabs = async (project) => {
    try {
      const res = await axios.get(`/api/projects/${project.project_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setActiveProjectForCollabs(res.data);
      setCollabMsg('');
    } catch (err) {
      console.error(err);
    }
  };

  // Add Collaborator
  const handleAddCollaborator = async (e) => {
    e.preventDefault();
    if (!activeProjectForCollabs || !collabEmail.trim()) return;

    try {
      const res = await axios.post(
        `/api/projects/${activeProjectForCollabs.project_id}/collaborators`,
        { email: collabEmail.trim(), permission_level: collabPerm },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCollabMsg(res.data.message || 'Collaborator added!');
      setCollabEmail('');
      handleOpenCollabs(activeProjectForCollabs);
      fetchData();
    } catch (err) {
      setCollabMsg(err.response?.data?.message || 'Failed to add collaborator');
    }
  };

  // Remove Collaborator
  const handleRemoveCollaborator = async (userId) => {
    try {
      await axios.delete(
        `/api/projects/${activeProjectForCollabs.project_id}/collaborators/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      handleOpenCollabs(activeProjectForCollabs);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error removing collaborator');
    }
  };

  // Filter projects
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.owner_email.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === 'owned') return p.user_role === 'owner';
    if (filter === 'shared') return p.user_role !== 'owner';
    return true;
  });

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const initial = displayName.charAt(0).toUpperCase();
  const roleStyle = roleBadgeColor[user?.role] || roleBadgeColor.viewer;

  return (
    <div style={styles.page}>
      {/* Top Header */}
      <div style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.brandIcon}>⚙️</div>
          <h1 style={styles.title}>Material Optimization DBMS</h1>
        </div>
        <div style={styles.nav}>
          <Link to="/dashboard" style={{ ...styles.navLink, ...styles.navLinkActive }}>Dashboard</Link>
          <Link to="/profile" style={styles.navLink}>Profile</Link>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      <div style={styles.main}>
        {/* Welcome Card with New Project CTA */}
        <div style={styles.welcomeCard}>
          <div style={styles.welcomeLeft}>
            <div style={styles.avatar}>{initial}</div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
                Welcome, {displayName}!
                <span style={{ ...styles.badge, ...roleStyle }}>{user?.role}</span>
              </div>
              <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                Material design optimization & project collaboration workspace
              </div>
            </div>
          </div>
          <button onClick={() => setShowCreateModal(true)} style={styles.newProjectBtn}>
            <span>＋</span> Create Project
          </button>
        </div>

        {/* Live Metrics Grid */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total Accessible Projects</div>
            <div style={styles.statNumber}>{stats.totalProjects}</div>
            <div style={styles.statSub}>Owned & Collaborating</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Projects Owned</div>
            <div style={styles.statNumber}>{stats.ownedProjects}</div>
            <div style={styles.statSub}>Created by your account</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Shared Collaborations</div>
            <div style={styles.statNumber}>{stats.collaborations}</div>
            <div style={styles.statSub}>Shared projects with team</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Material Specs Defined</div>
            <div style={{ ...styles.statNumber, color: '#1a73e8' }}>{stats.totalSpecs}</div>
            <div style={styles.statSub}>Weight & Cost constraint specs</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div style={styles.controlsRow}>
          <input
            type="text"
            style={styles.searchBar}
            placeholder="Search projects by name or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div style={styles.filterPills}>
            <button
              style={{ ...styles.pill, ...(filter === 'all' ? styles.pillActive : {}) }}
              onClick={() => setFilter('all')}
            >
              All ({projects.length})
            </button>
            <button
              style={{ ...styles.pill, ...(filter === 'owned' ? styles.pillActive : {}) }}
              onClick={() => setFilter('owned')}
            >
              My Projects ({stats.ownedProjects})
            </button>
            <button
              style={{ ...styles.pill, ...(filter === 'shared' ? styles.pillActive : {}) }}
              onClick={() => setFilter('shared')}
            >
              Shared with Me ({stats.collaborations})
            </button>
          </div>
        </div>

        {/* Projects Cards View */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            Loading optimization projects...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📂</div>
            <h3 style={{ margin: '0 0 0.5rem', color: '#0f172a' }}>No projects found</h3>
            <p style={{ color: '#64748b', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
              {search || filter !== 'all'
                ? 'Try adjusting your search criteria or filters.'
                : 'Get started by creating your first material optimization project.'}
            </p>
            <button onClick={() => setShowCreateModal(true)} style={styles.newProjectBtn}>
              <span>＋</span> Create Your First Project
            </button>
          </div>
        ) : (
          <div style={styles.projectsGrid}>
            {filteredProjects.map((p) => {
              const isOwner = p.user_role === 'owner';
              const rolePill = isOwner ? roleBadgeColor.owner : roleBadgeColor[p.user_role] || roleBadgeColor.read;

              return (
                <div key={p.project_id} style={styles.projectCard}>
                  <div>
                    <div style={styles.cardTop}>
                      <div>
                        <h3 style={styles.projectName}>{p.name}</h3>
                        <div style={styles.projectMeta}>
                          Created by: {p.owner_name || p.owner_email}
                        </div>
                      </div>
                      <span style={{ ...styles.badge, ...rolePill, margin: 0 }}>
                        {isOwner ? 'Owner' : `Collab: ${p.user_role}`}
                      </span>
                    </div>

                    {/* Material Specs Snippet */}
                    <div style={styles.specsSection}>
                      <div style={styles.specItem}>
                        <span style={{ color: '#64748b', fontWeight: '500' }}>Specifications:</span>
                        <span style={{ fontWeight: '700', color: '#1a73e8' }}>
                          {p.specs_count} {p.specs_count === 1 ? 'spec' : 'specs'} defined
                        </span>
                      </div>
                      <div style={styles.specItem}>
                        <span style={{ color: '#64748b', fontWeight: '500' }}>Collaborators:</span>
                        <span style={{ fontWeight: '600' }}>{p.collaborators_count} members</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div style={styles.cardActions}>
                    <button
                      onClick={() => handleOpenSpecs(p)}
                      style={{ ...styles.actionBtn, ...styles.actionBtnPrimary }}
                    >
                      ⚙️ Specs ({p.specs_count})
                    </button>
                    <button
                      onClick={() => handleOpenCollabs(p)}
                      style={styles.actionBtn}
                    >
                      👥 Team ({p.collaborators_count})
                    </button>
                    {isOwner && (
                      <button
                        onClick={() => handleDeleteProject(p.project_id)}
                        style={{ ...styles.actionBtn, ...styles.actionBtnDelete }}
                        title="Delete project"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE PROJECT MODAL */}
      {showCreateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Create New Project</h3>
              <button style={styles.closeBtn} onClick={() => setShowCreateModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateProject}>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.4rem', fontSize: '0.88rem' }}>
                Project Name *
              </label>
              <input
                type="text"
                style={styles.input}
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g. Carbon-Fiber Chassis Optimization"
                required
                autoFocus
              />

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', marginBottom: '1.2rem', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: '600', fontSize: '0.88rem', color: '#0f172a', marginBottom: '0.3rem' }}>
                  Initial Material Specification (Optional)
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.8rem' }}>
                  You can set target weight and cost constraints now, or add multiple specs later.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                      Max Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      style={{ ...styles.input, marginBottom: 0 }}
                      value={newMaxWeight}
                      onChange={(e) => setNewMaxWeight(e.target.value)}
                      placeholder="e.g. 250.0"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                      Target Cost ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      style={{ ...styles.input, marginBottom: 0 }}
                      value={newTargetCost}
                      onChange={(e) => setNewTargetCost(e.target.value)}
                      placeholder="e.g. 15000.0"
                    />
                  </div>
                </div>
              </div>

              <button type="submit" style={styles.modalSubmitBtn}>
                Create Project
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MATERIAL SPECS MODAL */}
      {activeProjectForSpecs && (
        <div style={styles.modalOverlay} onClick={() => setActiveProjectForSpecs(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>{activeProjectForSpecs.name}</h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Material Specifications</span>
              </div>
              <button style={styles.closeBtn} onClick={() => setActiveProjectForSpecs(null)}>✕</button>
            </div>

            {/* List of Specs */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: '600', fontSize: '0.88rem', marginBottom: '0.6rem' }}>
                Defined Constraints ({activeProjectForSpecs.specs?.length || 0})
              </div>

              {(!activeProjectForSpecs.specs || activeProjectForSpecs.specs.length === 0) ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', color: '#64748b', fontSize: '0.9rem' }}>
                  No specifications defined yet for this project.
                </div>
              ) : (
                activeProjectForSpecs.specs.map((spec) => (
                  <div key={spec.spec_id} style={styles.specRow}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                        ⚖️ Max: {spec.max_weight} kg &nbsp;|&nbsp; 💵 Target: ${spec.target_cost}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Spec #{spec.spec_id} &bull; Added {new Date(spec.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {activeProjectForSpecs.can_write && (
                      <button
                        onClick={() => handleDeleteSpec(spec.spec_id)}
                        style={{ ...styles.actionBtn, ...styles.actionBtnDelete, padding: '0.3rem 0.6rem' }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add Spec Form */}
            {activeProjectForSpecs.can_write && (
              <form onSubmit={handleAddSpec} style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.2rem' }}>
                <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.8rem' }}>
                  ＋ Add New Material Specification
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '0.8rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                      Max Weight (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      style={{ ...styles.input, marginBottom: 0 }}
                      placeholder="e.g. 320.5"
                      value={specWeight}
                      onChange={(e) => setSpecWeight(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                      Target Cost ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      style={{ ...styles.input, marginBottom: 0 }}
                      placeholder="e.g. 8500.0"
                      value={specCost}
                      onChange={(e) => setSpecCost(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <button type="submit" style={styles.modalSubmitBtn}>
                  Save Specification
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* COLLABORATORS MODAL */}
      {activeProjectForCollabs && (
        <div style={styles.modalOverlay} onClick={() => setActiveProjectForCollabs(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>{activeProjectForCollabs.name}</h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Project Team & Permissions</span>
              </div>
              <button style={styles.closeBtn} onClick={() => setActiveProjectForCollabs(null)}>✕</button>
            </div>

            {collabMsg && (
              <div style={{ padding: '0.65rem', borderRadius: '8px', background: '#eff6ff', color: '#1e40af', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {collabMsg}
              </div>
            )}

            {/* List Collaborators */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: '600', fontSize: '0.88rem', marginBottom: '0.6rem' }}>
                Collaborators ({activeProjectForCollabs.collaborators?.length || 0})
              </div>

              {(!activeProjectForCollabs.collaborators || activeProjectForCollabs.collaborators.length === 0) ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', color: '#64748b', fontSize: '0.9rem' }}>
                  No external collaborators added yet.
                </div>
              ) : (
                activeProjectForCollabs.collaborators.map((collab) => (
                  <div key={collab.user_id} style={styles.collabRow}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.92rem' }}>
                        {collab.name || collab.email}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {collab.email} &bull; <strong style={{ textTransform: 'capitalize' }}>{collab.permission_level}</strong>
                      </div>
                    </div>
                    {activeProjectForCollabs.user_role === 'owner' && (
                      <button
                        onClick={() => handleRemoveCollaborator(collab.user_id)}
                        style={{ ...styles.actionBtn, ...styles.actionBtnDelete, padding: '0.3rem 0.6rem' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add Collaborator Form (Owner only) */}
            {activeProjectForCollabs.user_role === 'owner' && (
              <form onSubmit={handleAddCollaborator} style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.2rem' }}>
                <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.8rem' }}>
                  ＋ Add Team Collaborator
                </div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                  User Email Address *
                </label>
                <input
                  type="email"
                  style={styles.input}
                  placeholder="collaborator@company.com"
                  value={collabEmail}
                  onChange={(e) => setCollabEmail(e.target.value)}
                  required
                />

                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                  Permission Level
                </label>
                <select
                  style={{ ...styles.input, background: '#fff', cursor: 'pointer' }}
                  value={collabPerm}
                  onChange={(e) => setCollabPerm(e.target.value)}
                >
                  <option value="read">Read Only (View Specs)</option>
                  <option value="write">Write (Add/Delete Specs)</option>
                  <option value="admin">Admin (Full Project Management)</option>
                </select>

                <button type="submit" style={styles.modalSubmitBtn}>
                  Assign Collaborator
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
