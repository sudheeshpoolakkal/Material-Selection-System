// pages/Materials.js
import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

// Color themes for material categories
const categoryThemes = {
  Metal: {
    bg: '#eff6ff',
    text: '#1d4ed8',
    border: '#bfdbfe',
    badgeBg: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    icon: '🔩',
    accent: '#2563eb'
  },
  Composite: {
    bg: '#faf5ff',
    text: '#7e22ce',
    border: '#e9d5ff',
    badgeBg: 'linear-gradient(135deg, #6b21a8 0%, #9333ea 100%)',
    icon: '🧬',
    accent: '#9333ea'
  },
  Polymer: {
    bg: '#f0fdf4',
    text: '#15803d',
    border: '#bbf7d0',
    badgeBg: 'linear-gradient(135deg, #166534 0%, #22c55e 100%)',
    icon: '🧪',
    accent: '#16a34a'
  },
  Ceramic: {
    bg: '#fffbeb',
    text: '#b45309',
    border: '#fde68a',
    badgeBg: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)',
    icon: '🧱',
    accent: '#d97706'
  },
  Default: {
    bg: '#f8fafc',
    text: '#475569',
    border: '#e2e8f0',
    badgeBg: 'linear-gradient(135deg, #334155 0%, #64748b 100%)',
    icon: '📦',
    accent: '#64748b'
  }
};

// Application-specific configurations
const applicationConfig = {
  'All': {
    title: 'All Engineering Domains',
    icon: '🌐',
    tagline: 'Cross-industry catalog comparison with unified multi-variable property filtering.',
    accentColor: '#2563eb',
    accentBg: '#eff6ff',
    heroStatKey: 'rating',
    heroStatLabel: 'Community Rating',
    primaryFilters: ['density', 'tensile', 'specificStrength', 'thermal', 'corrosion', 'cost'],
    benchmarks: {
      minDensity: 1,
      maxDensity: 25,
      minTensile: 0,
      minSpecificStrength: 0,
      minThermal: 0,
      minServiceTemp: 0,
      corrosion: 'All',
      costTier: 'All'
    }
  },
  'Aerospace & Defense': {
    title: 'Aerospace & Defense',
    icon: '🚀',
    tagline: 'Extreme specific strength (high strength-to-weight), low density ceiling, and cyclic fatigue endurance.',
    accentColor: '#0284c7',
    accentBg: '#f0f9ff',
    heroStatKey: 'specificStrength',
    heroStatLabel: 'Strength-to-Weight (kN·m/kg)',
    primaryFilters: ['specificStrength', 'maxDensity', 'tensile', 'corrosion', 'cost'],
    benchmarks: {
      minSpecificStrength: 100,
      maxDensity: 5.0,
      minTensile: 350,
      minThermal: 0,
      minServiceTemp: 0,
      corrosion: 'All',
      costTier: 'All'
    }
  },
  'Automotive Lightweighting': {
    title: 'Automotive Lightweighting',
    icon: '🏎️',
    tagline: 'Chassis & body mass reduction, crash energy dissipation, and high-volume cost feasibility.',
    accentColor: '#ea580c',
    accentBg: '#fff7ed',
    heroStatKey: 'specificStrength',
    heroStatLabel: 'Mass Efficiency (kN·m/kg)',
    primaryFilters: ['maxDensity', 'tensile', 'specificStrength', 'cost', 'corrosion'],
    benchmarks: {
      maxDensity: 3.5,
      minTensile: 250,
      minSpecificStrength: 75,
      minThermal: 0,
      minServiceTemp: 0,
      corrosion: 'Good',
      costTier: 'All'
    }
  },
  'Marine & Offshore': {
    title: 'Marine & Offshore',
    icon: '🚢',
    tagline: 'Severe chloride pitting immunity, anti-fouling, and stress corrosion cracking resilience.',
    accentColor: '#0d9488',
    accentBg: '#f0fdfa',
    heroStatKey: 'corrosionResistance',
    heroStatLabel: 'Corrosion Endurance',
    primaryFilters: ['corrosion', 'tensile', 'maxDensity', 'cost'],
    benchmarks: {
      corrosion: 'Excellent',
      minTensile: 220,
      maxDensity: 25,
      minSpecificStrength: 0,
      minThermal: 0,
      minServiceTemp: 0,
      costTier: 'All'
    }
  },
  'Thermal Management & Heat Sinks': {
    title: 'Thermal Management & Heat Sinks',
    icon: '❄️',
    tagline: 'High thermal conductivity (> 100 W/m·K) for rapid heat spreading in power electronics & processors.',
    accentColor: '#0891b2',
    accentBg: '#ecfeff',
    heroStatKey: 'thermalConductivity',
    heroStatLabel: 'Thermal Cond. (W/m·K)',
    primaryFilters: ['thermal', 'maxDensity', 'serviceTemp', 'cost'],
    benchmarks: {
      minThermal: 100,
      minServiceTemp: 0,
      maxDensity: 25,
      minTensile: 0,
      minSpecificStrength: 0,
      corrosion: 'All',
      costTier: 'All'
    }
  },
  'Biomedical & Surgical': {
    title: 'Biomedical & Surgical',
    icon: '🩺',
    tagline: 'Biological inertness, non-toxicity, zero ion leeching, and bone-matching elastic modulus.',
    accentColor: '#7c3aed',
    accentBg: '#f5f3ff',
    heroStatKey: 'density',
    heroStatLabel: 'Biocompatible Density (g/cm³)',
    primaryFilters: ['corrosion', 'maxDensity', 'tensile', 'specificStrength'],
    benchmarks: {
      corrosion: 'Excellent',
      maxDensity: 4.8,
      minTensile: 100,
      minSpecificStrength: 50,
      minThermal: 0,
      minServiceTemp: 0,
      costTier: 'All'
    }
  },
  'Chemical & Petrochemical': {
    title: 'Chemical & Petrochemical',
    icon: '🧪',
    tagline: 'Resistance to aggressive acidic/alkaline media, sour gas (H2S), and high pressure vessels.',
    accentColor: '#c026d3',
    accentBg: '#fdf4ff',
    heroStatKey: 'corrosionResistance',
    heroStatLabel: 'Chemical Passivation',
    primaryFilters: ['corrosion', 'tensile', 'serviceTemp', 'cost'],
    benchmarks: {
      corrosion: 'Excellent',
      minTensile: 350,
      minServiceTemp: 200,
      maxDensity: 25,
      minSpecificStrength: 0,
      minThermal: 0,
      costTier: 'All'
    }
  },
  'Electronics & Electrical': {
    title: 'Electronics & Electrical',
    icon: '⚡',
    tagline: 'High electrical & thermal conductivity, EMI shielding, precision formability, and low resistance.',
    accentColor: '#d97706',
    accentBg: '#fefce8',
    heroStatKey: 'thermalConductivity',
    heroStatLabel: 'Thermal & EMI Shielding',
    primaryFilters: ['thermal', 'maxDensity', 'cost'],
    benchmarks: {
      minThermal: 80,
      maxDensity: 25,
      minTensile: 0,
      minSpecificStrength: 0,
      minServiceTemp: 0,
      corrosion: 'Good',
      costTier: 'All'
    }
  },
  'High-Temperature & Turbines': {
    title: 'High-Temperature & Turbines',
    icon: '🔥',
    tagline: 'Creep rupture resistance, thermal shock endurance, and mechanical stability above 600°C.',
    accentColor: '#dc2626',
    accentBg: '#fef2f2',
    heroStatKey: 'maxServiceTemp',
    heroStatLabel: 'Continuous Service Temp (°C)',
    primaryFilters: ['serviceTemp', 'tensile', 'thermal', 'cost'],
    benchmarks: {
      minServiceTemp: 400,
      minTensile: 400,
      maxDensity: 25,
      minSpecificStrength: 0,
      minThermal: 0,
      corrosion: 'Excellent',
      costTier: 'All'
    }
  },
  'Structural & Heavy Machinery': {
    title: 'Structural & Heavy Machinery',
    icon: '🏗️',
    tagline: 'High yield and fatigue strength, impact damping, and cost-effective bulk manufacturing.',
    accentColor: '#475569',
    accentBg: '#f8fafc',
    heroStatKey: 'tensileStrength',
    heroStatLabel: 'Tensile Strength (MPa)',
    primaryFilters: ['tensile', 'maxDensity', 'cost'],
    benchmarks: {
      minTensile: 400,
      maxDensity: 25,
      minSpecificStrength: 0,
      minThermal: 0,
      minServiceTemp: 0,
      corrosion: 'All',
      costTier: 'Low'
    }
  }
};

const Materials = () => {
  const { user, token, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Primary State
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // View Modes & Layout
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Active Application Domain Filter
  const [application, setApplication] = useState('All');

  // Search & Basic Filters
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('All');
  const [minRating, setMinRating] = useState('');
  const [sortBy, setSortBy] = useState('rating_desc');

  // Numeric Constraints
  const [minDensity, setMinDensity] = useState(1);
  const [maxDensity, setMaxDensity] = useState(25);
  const [minTensile, setMinTensile] = useState(0);
  const [minSpecificStrength, setMinSpecificStrength] = useState(0);
  const [minThermal, setMinThermal] = useState(0);
  const [minServiceTemp, setMinServiceTemp] = useState(0);
  const [corrosion, setCorrosion] = useState('All');
  const [costTier, setCostTier] = useState('All');

  // Comparison State
  const [compareList, setCompareList] = useState([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Material Details & Review Modal
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('specs'); // 'specs', 'reviews', 'project'

  // Review Form State
  const [newRating, setNewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [newAppTested, setNewAppTested] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState('');

  // Add-to-Project State
  const [isAddToProjectModalOpen, setIsAddToProjectModalOpen] = useState(false);
  const [projectTargetMaterial, setProjectTargetMaterial] = useState(null);
  const [userProjects, setUserProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectMaxWeight, setProjectMaxWeight] = useState('');
  const [projectTargetCost, setProjectTargetCost] = useState('');
  const [submittingProjectSpec, setSubmittingProjectSpec] = useState(false);
  const [projectSuccessMsg, setProjectSuccessMsg] = useState('');
  const [projectErrorMsg, setProjectErrorMsg] = useState('');

  // Sync URL query params if linked from Dashboard
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const appQuery = params.get('application');
    if (appQuery && applicationConfig[appQuery]) {
      setApplication(appQuery);
    }
  }, [location.search]);

  // Fetch materials
  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = {};
      if (application !== 'All') params.application = application;
      if (category !== 'All') params.category = category;
      if (keyword.trim()) params.keyword = keyword.trim();
      if (minRating) params.minRating = minRating;
      if (sortBy) params.sortBy = sortBy;
      if (minDensity > 1) params.minDensity = minDensity;
      if (maxDensity < 25) params.maxDensity = maxDensity;
      if (minTensile > 0) params.minTensileStrength = minTensile;
      if (minSpecificStrength > 0) params.minSpecificStrength = minSpecificStrength;
      if (minThermal > 0) params.minThermalConductivity = minThermal;
      if (minServiceTemp > 0) params.minServiceTemp = minServiceTemp;
      if (corrosion !== 'All') params.corrosionResistance = corrosion;
      if (costTier !== 'All') {
        params.minCost = costTier;
        params.maxCost = costTier;
      }

      const res = await axios.get('/api/materials/search', { params });
      setMaterials(res.data.materials || []);
    } catch (err) {
      console.error('Error querying materials:', err);
      setError('Unable to load materials. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  }, [application, category, keyword, minRating, sortBy, minDensity, maxDensity, minTensile, minSpecificStrength, minThermal, minServiceTemp, corrosion, costTier]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMaterials();
    }, 120);
    return () => clearTimeout(timer);
  }, [fetchMaterials]);

  // Fetch user projects for the "Add to Project" feature
  const fetchUserProjects = useCallback(async () => {
    const authToken = token || localStorage.getItem('token');
    if (!authToken) return;
    try {
      const res = await axios.get('/api/projects', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setUserProjects(res.data || []);
      if (res.data && res.data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(res.data[0].project_id);
      }
    } catch (err) {
      console.warn('Could not fetch projects list:', err.message);
    }
  }, [token, selectedProjectId]);

  useEffect(() => {
    fetchUserProjects();
  }, [fetchUserProjects]);

  // Apply Benchmark Presets for active application
  const handleApplyPreset = (appKey) => {
    const conf = applicationConfig[appKey];
    if (!conf || !conf.benchmarks) return;
    const b = conf.benchmarks;
    if (b.minDensity !== undefined) setMinDensity(b.minDensity);
    if (b.maxDensity !== undefined) setMaxDensity(b.maxDensity);
    if (b.minTensile !== undefined) setMinTensile(b.minTensile);
    if (b.minSpecificStrength !== undefined) setMinSpecificStrength(b.minSpecificStrength);
    if (b.minThermal !== undefined) setMinThermal(b.minThermal);
    if (b.minServiceTemp !== undefined) setMinServiceTemp(b.minServiceTemp);
    if (b.corrosion !== undefined) setCorrosion(b.corrosion);
    if (b.costTier !== undefined) setCostTier(b.costTier);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setKeyword('');
    setCategory('All');
    setMinRating('');
    setSortBy('rating_desc');
    setMinDensity(1);
    setMaxDensity(25);
    setMinTensile(0);
    setMinSpecificStrength(0);
    setMinThermal(0);
    setMinServiceTemp(0);
    setCorrosion('All');
    setCostTier('All');
  };

  // Active filters list for dismissible chips
  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (keyword.trim()) {
      chips.push({ id: 'keyword', label: `Search: "${keyword}"`, onRemove: () => setKeyword('') });
    }
    if (category !== 'All') {
      chips.push({ id: 'category', label: `Class: ${category}`, onRemove: () => setCategory('All') });
    }
    if (application !== 'All') {
      chips.push({ id: 'application', label: `Domain: ${application}`, onRemove: () => setApplication('All') });
    }
    if (maxDensity < 25) {
      chips.push({ id: 'density', label: `Density ≤ ${maxDensity} g/cm³`, onRemove: () => setMaxDensity(25) });
    }
    if (minTensile > 0) {
      chips.push({ id: 'tensile', label: `Tensile ≥ ${minTensile} MPa`, onRemove: () => setMinTensile(0) });
    }
    if (minSpecificStrength > 0) {
      chips.push({ id: 'specStrength', label: `Spec. Strength ≥ ${minSpecificStrength}`, onRemove: () => setMinSpecificStrength(0) });
    }
    if (minThermal > 0) {
      chips.push({ id: 'thermal', label: `Thermal ≥ ${minThermal} W/m·K`, onRemove: () => setMinThermal(0) });
    }
    if (minServiceTemp > 0) {
      chips.push({ id: 'temp', label: `Temp ≥ ${minServiceTemp} °C`, onRemove: () => setMinServiceTemp(0) });
    }
    if (corrosion !== 'All') {
      chips.push({ id: 'corrosion', label: `Corrosion: ${corrosion}`, onRemove: () => setCorrosion('All') });
    }
    if (costTier !== 'All') {
      chips.push({ id: 'cost', label: `Cost: ${costTier}`, onRemove: () => setCostTier('All') });
    }
    if (minRating) {
      chips.push({ id: 'rating', label: `Rating ≥ ${minRating}★`, onRemove: () => setMinRating('') });
    }
    return chips;
  }, [keyword, category, application, maxDensity, minTensile, minSpecificStrength, minThermal, minServiceTemp, corrosion, costTier, minRating]);

  // Comparison toggle handler (Max 4)
  const handleToggleCompare = (material) => {
    setCompareList((prev) => {
      const exists = prev.some((m) => m.id === material.id);
      if (exists) {
        return prev.filter((m) => m.id !== material.id);
      }
      if (prev.length >= 4) {
        alert('You can compare a maximum of 4 materials simultaneously.');
        return prev;
      }
      return [...prev, material];
    });
  };

  const handleRemoveCompare = (id) => {
    setCompareList((prev) => prev.filter((m) => m.id !== id));
  };

  const handleClearCompare = () => {
    setCompareList([]);
  };

  // Open "Add to Project" Dialog
  const handleOpenAddToProject = (material) => {
    setProjectTargetMaterial(material);
    setProjectSuccessMsg('');
    setProjectErrorMsg('');
    
    // Suggest intelligent values based on material density and cost tier
    const estWeight = material.properties?.density ? (material.properties.density * 1.5).toFixed(1) : '10.0';
    const estCost = material.properties?.cost === 'Low' ? '500' : material.properties?.cost === 'Moderate' ? '1500' : '3500';
    setProjectMaxWeight(estWeight);
    setProjectTargetCost(estCost);
    setIsAddToProjectModalOpen(true);
  };

  // Submit Add to Project Spec
  const handleSaveToProject = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) {
      setProjectErrorMsg('Please select or create an engineering project first.');
      return;
    }
    const authToken = token || localStorage.getItem('token');
    if (!authToken) {
      setProjectErrorMsg('Session expired. Please log in to attach specifications.');
      return;
    }

    setSubmittingProjectSpec(true);
    setProjectErrorMsg('');
    setProjectSuccessMsg('');

    try {
      await axios.post(
        `/api/projects/${selectedProjectId}/specs`,
        {
          max_weight: projectMaxWeight,
          target_cost: projectTargetCost,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      setProjectSuccessMsg(`Successfully attached ${projectTargetMaterial?.name || 'material'} specification to your project!`);
      setTimeout(() => {
        setIsAddToProjectModalOpen(false);
      }, 1400);
    } catch (err) {
      console.error('Add to project failed:', err);
      setProjectErrorMsg(err.response?.data?.message || 'Failed to attach specification to project.');
    } finally {
      setSubmittingProjectSpec(false);
    }
  };

  // Submit Review Handler
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMaterial || !newComment.trim()) return;

    setSubmittingReview(true);
    setReviewSuccess('');

    try {
      const payload = {
        rating: newRating,
        comment: newComment.trim(),
        userName: user?.name || 'Verified Engineer',
        role: user?.role ? `${user.role.toUpperCase()} Engineer` : 'Materials Engineer',
        applicationTested: newAppTested.trim() || (application !== 'All' ? application : 'General Mechanical')
      };

      const res = await axios.post(`/api/materials/${selectedMaterial.id}/ratings`, payload);
      
      const updatedMat = res.data.material;
      setSelectedMaterial(updatedMat);
      setMaterials((prev) => prev.map((m) => (m.id === updatedMat.id ? updatedMat : m)));
      setNewComment('');
      setNewAppTested('');
      setReviewSuccess('Review successfully verified and posted to database!');
    } catch (err) {
      console.error('Error posting review:', err);
      // Local optimistic fallback
      const fallbackReview = {
        reviewId: 'rev-' + Date.now(),
        userName: user?.name || 'Verified Engineer',
        role: 'Materials Engineer',
        rating: newRating,
        applicationTested: newAppTested.trim() || application,
        comment: newComment.trim(),
        date: new Date().toISOString().split('T')[0]
      };
      const updatedReviews = [fallbackReview, ...(selectedMaterial.reviews || [])];
      const newAvg = Number((updatedReviews.reduce((acc, r) => acc + r.rating, 0) / updatedReviews.length).toFixed(1));
      const updatedMat = { ...selectedMaterial, reviews: updatedReviews, rating: newAvg, reviewCount: updatedReviews.length };
      setSelectedMaterial(updatedMat);
      setMaterials((prev) => prev.map((m) => (m.id === updatedMat.id ? updatedMat : m)));
      setNewComment('');
      setNewAppTested('');
      setReviewSuccess('Review saved locally in catalog session!');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentAppConfig = applicationConfig[application] || applicationConfig['All'];

  // Comparison Matrix Winner Calculation Helper
  const getComparisonWinnerId = (metricKey, isLowestBetter = false) => {
    if (!compareList || compareList.length < 2) return null;
    let bestVal = isLowestBetter ? Infinity : -Infinity;
    let winnerId = null;

    compareList.forEach((m) => {
      let val = null;
      if (metricKey === 'density') val = m.properties?.density;
      else if (metricKey === 'tensileStrength') val = m.properties?.tensileStrength;
      else if (metricKey === 'specificStrength') val = m.properties?.specificStrength || (m.properties?.tensileStrength / m.properties?.density);
      else if (metricKey === 'thermalConductivity') val = m.properties?.thermalConductivity;
      else if (metricKey === 'maxServiceTemp') val = m.properties?.maxServiceTemp;
      else if (metricKey === 'rating') val = m.rating;

      if (val !== null && val !== undefined && !isNaN(val)) {
        if (isLowestBetter) {
          if (val < bestVal) {
            bestVal = val;
            winnerId = m.id;
          }
        } else {
          if (val > bestVal) {
            bestVal = val;
            winnerId = m.id;
          }
        }
      }
    });

    return winnerId;
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      color: '#0f172a',
      paddingBottom: '5rem'
    }}>
      {/* 1. TOP NAVIGATION BAR */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e2e8f0',
        padding: '0.75rem 1.75rem',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
      }}>
        <div style={{
          maxWidth: '1440px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
        }}>
          {/* Logo & System Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
            }}>
              ⚙️
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#0f172a' }}>
                  Material Selection Studio
                </span>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px',
                  background: '#dbeafe',
                  color: '#1d4ed8'
                }}>
                  v2.0
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b', fontWeight: '500' }}>
                Multi-Objective Optimization & Engineering Database
              </p>
            </div>
          </div>

          {/* Navigation & User Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Link
              to="/dashboard"
              style={{
                textDecoration: 'none',
                color: '#475569',
                fontWeight: '600',
                fontSize: '0.86rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              📊 Dashboard
            </Link>

            <Link
              to="/materials"
              style={{
                textDecoration: 'none',
                color: '#2563eb',
                background: '#eff6ff',
                fontWeight: '700',
                fontSize: '0.86rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #bfdbfe'
              }}
            >
              🔬 Materials Catalog
            </Link>

            <Link
              to="/profile"
              style={{
                textDecoration: 'none',
                color: '#475569',
                fontWeight: '600',
                fontSize: '0.86rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
              }}
            >
              👤 Profile
            </Link>

            {/* Compare Counter Button */}
            {compareList.length > 0 && (
              <button
                onClick={() => setIsCompareModalOpen(true)}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.84rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                }}
              >
                ⚖️ Compare ({compareList.length})
              </button>
            )}

            <button
              onClick={handleLogout}
              style={{
                background: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: '600',
                cursor: 'pointer',
                marginLeft: '0.35rem'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* 2. COMPACT ENGINEERING STUDIO HERO STRIP */}
      <section style={{
        maxWidth: '1440px',
        margin: '1.25rem auto 1.5rem',
        padding: '0 1.75rem',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #1e3a8a 100%)',
          borderRadius: '20px',
          padding: '1.5rem 2rem',
          color: '#ffffff',
          boxShadow: '0 12px 30px -10px rgba(15, 23, 42, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle Ambient Glow Effect */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-30px',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ maxWidth: '720px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '999px', padding: '0.2rem 0.75rem', fontSize: '0.74rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#7dd3fc', marginBottom: '0.5rem' }}>
              <span>{currentAppConfig.icon}</span> {currentAppConfig.title} Context
            </div>
            <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.65rem', fontWeight: '800', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
              Material Selection & Constraint Optimization
            </h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.5 }}>
              {currentAppConfig.tagline}
            </p>
          </div>

          {/* Quick Metrics & Preset Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '14px',
              padding: '0.65rem 1.15rem',
              textAlign: 'center',
              minWidth: '100px'
            }}>
              <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#38bdf8' }}>{materials.length}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Candidates</div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '14px',
              padding: '0.65rem 1.15rem',
              textAlign: 'center',
              minWidth: '100px'
            }}>
              <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#fbbf24' }}>
                {materials.length > 0 ? (materials.reduce((acc, m) => acc + (m.rating || 0), 0) / materials.length).toFixed(1) : '4.7'}★
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Score</div>
            </div>

            {application !== 'All' && (
              <button
                onClick={() => handleApplyPreset(application)}
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.7rem 1.15rem',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                }}
              >
                ⚡ Apply {currentAppConfig.icon} Benchmarks
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 3. TWO-COLUMN STUDIO WORKSPACE */}
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '0 1.75rem',
        display: 'grid',
        gridTemplateColumns: sidebarOpen ? '320px 1fr' : '1fr',
        gap: '1.75rem',
        alignItems: 'start',
      }}>
        {/* ===================================================================== */}
        {/* LEFT COLUMN: STICKY FILTER & CONSTRAINT SIDEBAR                       */}
        {/* ===================================================================== */}
        {sidebarOpen && (
          <aside style={{
            position: 'sticky',
            top: '72px',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            padding: '1.4rem',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
            maxHeight: 'calc(100vh - 90px)',
            overflowY: 'auto',
          }}>
            {/* Sidebar Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🎛️</span>
                <span style={{ fontWeight: '800', fontSize: '1rem', color: '#0f172a' }}>
                  Filter Constraints
                </span>
              </div>
              <button
                onClick={handleResetFilters}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '6px',
                }}
                title="Reset all filter parameters"
              >
                ↺ Reset All
              </button>
            </div>

            {/* Quick Keyword Search */}
            <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                Keyword or Alloy Name
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="e.g. Titanium, Inconel, 6061..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 2rem 0.6rem 2.2rem',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.86rem',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box',
                    backgroundColor: '#f8fafc'
                  }}
                />
                <span style={{ position: 'absolute', left: '0.75rem', top: '0.62rem', color: '#94a3b8', fontSize: '0.9rem' }}>🔍</span>
                {keyword && (
                  <button
                    onClick={() => setKeyword('')}
                    style={{
                      position: 'absolute',
                      right: '0.65rem',
                      top: '0.55rem',
                      background: '#e2e8f0',
                      border: 'none',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Application Domain Selector Dropdown */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                Engineering Domain
              </label>
              <select
                value={application}
                onChange={(e) => {
                  const val = e.target.value;
                  setApplication(val);
                  if (val !== 'All') handleApplyPreset(val);
                }}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: '0.86rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {Object.keys(applicationConfig).map((appKey) => (
                  <option key={appKey} value={appKey}>
                    {applicationConfig[appKey].icon} {applicationConfig[appKey].title}
                  </option>
                ))}
              </select>
            </div>

            {/* Material Category Segmented Pills */}
            <div style={{ marginBottom: '1.4rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.45rem' }}>
                Material Classification
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
                {['All', 'Metal', 'Composite', 'Polymer', 'Ceramic'].map((cat) => {
                  const isSelected = category === cat;
                  const theme = categoryThemes[cat] || categoryThemes.Default;
                  return (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      style={{
                        padding: '0.5rem 0.65rem',
                        borderRadius: '9px',
                        border: isSelected ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                        background: isSelected ? '#eff6ff' : '#f8fafc',
                        color: isSelected ? '#1d4ed8' : '#475569',
                        fontSize: '0.8rem',
                        fontWeight: isSelected ? '800' : '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        transition: 'all 0.12s ease'
                      }}
                    >
                      <span>{cat === 'All' ? '🌐' : theme.icon}</span>
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PROPERTY RANGE SLIDERS */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.15rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.9rem' }}>
                Quantitative Bounds
              </div>

              {/* Slider 1: Specific Strength */}
              <div style={{ marginBottom: '1.1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: '700', marginBottom: '0.3rem' }}>
                  <span style={{ color: '#334155' }}>🚀 Min Specific Strength</span>
                  <span style={{ color: '#16a34a', fontWeight: '800', background: '#f0fdf4', padding: '0.1rem 0.45rem', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                    ≥ {minSpecificStrength} kN·m/kg
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="25"
                  value={minSpecificStrength}
                  onChange={(e) => setMinSpecificStrength(parseInt(e.target.value))}
                />
              </div>

              {/* Slider 2: Mass Density Ceiling */}
              <div style={{ marginBottom: '1.1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: '700', marginBottom: '0.3rem' }}>
                  <span style={{ color: '#334155' }}>🪶 Mass Density Ceiling</span>
                  <span style={{ color: '#0284c7', fontWeight: '800', background: '#f0f9ff', padding: '0.1rem 0.45rem', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                    ≤ {maxDensity} g/cm³
                  </span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="25.0"
                  step="0.2"
                  value={maxDensity}
                  onChange={(e) => setMaxDensity(parseFloat(e.target.value))}
                />
              </div>

              {/* Slider 3: Tensile Strength */}
              <div style={{ marginBottom: '1.1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: '700', marginBottom: '0.3rem' }}>
                  <span style={{ color: '#334155' }}>💪 Min Tensile Strength</span>
                  <span style={{ color: '#2563eb', fontWeight: '800', background: '#eff6ff', padding: '0.1rem 0.45rem', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                    ≥ {minTensile} MPa
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1600"
                  step="25"
                  value={minTensile}
                  onChange={(e) => setMinTensile(parseInt(e.target.value))}
                />
              </div>

              {/* Slider 4: Thermal Conductivity */}
              <div style={{ marginBottom: '1.1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: '700', marginBottom: '0.3rem' }}>
                  <span style={{ color: '#334155' }}>❄️ Min Thermal Cond.</span>
                  <span style={{ color: '#0891b2', fontWeight: '800', background: '#ecfeff', padding: '0.1rem 0.45rem', borderRadius: '6px', border: '1px solid #a5f3fc' }}>
                    ≥ {minThermal} W/m·K
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="400"
                  step="10"
                  value={minThermal}
                  onChange={(e) => setMinThermal(parseInt(e.target.value))}
                />
              </div>

              {/* Slider 5: Max Service Temp */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: '700', marginBottom: '0.3rem' }}>
                  <span style={{ color: '#334155' }}>🔥 Continuous Service Temp</span>
                  <span style={{ color: '#dc2626', fontWeight: '800', background: '#fef2f2', padding: '0.1rem 0.45rem', borderRadius: '6px', border: '1px solid #fecaca' }}>
                    ≥ {minServiceTemp} °C
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1500"
                  step="50"
                  value={minServiceTemp}
                  onChange={(e) => setMinServiceTemp(parseInt(e.target.value))}
                />
              </div>

              {/* Qualitative Filter: Corrosion Resistance */}
              <div style={{ marginBottom: '1.1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                  🛡️ Corrosion Resistance
                </label>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  {['All', 'Good', 'Excellent'].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setCorrosion(lvl)}
                      style={{
                        flex: 1,
                        padding: '0.45rem 0.2rem',
                        borderRadius: '8px',
                        border: corrosion === lvl ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                        background: corrosion === lvl ? '#f0fdf4' : '#f8fafc',
                        color: corrosion === lvl ? '#15803d' : '#475569',
                        fontWeight: corrosion === lvl ? '800' : '600',
                        fontSize: '0.76rem',
                        cursor: 'pointer',
                      }}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Qualitative Filter: Cost Tier */}
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                  💰 Target Cost Tier
                </label>
                <select
                  value={costTier}
                  onChange={(e) => setCostTier(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.82rem',
                    background: '#f8fafc',
                    color: '#1e293b',
                    outline: 'none',
                  }}
                >
                  <option value="All">All Cost Tiers</option>
                  <option value="Low">Low Cost (Bulk Commodity)</option>
                  <option value="Moderate">Moderate (Engineering Alloys)</option>
                  <option value="High">High (Titanium / Advanced)</option>
                  <option value="Very High">Very High (Superalloys / Ceramics)</option>
                </select>
              </div>
            </div>
          </aside>
        )}

        {/* ===================================================================== */}
        {/* RIGHT COLUMN: INTERACTIVE STAGE & CATALOG RESULTS                     */}
        {/* ===================================================================== */}
        <main style={{ minWidth: 0 }}>
          {/* Top Stage Control Bar: View Toggle, Sort, and Search Counter */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '1rem 1.4rem',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.85rem',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
          }}>
            {/* Left: Counter & Sidebar Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
                title={sidebarOpen ? 'Hide Constraints Sidebar' : 'Show Constraints Sidebar'}
              >
                <span>{sidebarOpen ? '◀' : '▶'}</span>
                <span>{sidebarOpen ? 'Hide Filters' : 'Show Filters'}</span>
              </button>

              <div>
                <span style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                  {materials.length} Materials
                </span>
                <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '0.45rem' }}>
                  in current selection
                </span>
              </div>
            </div>

            {/* Right: Sorter & View Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {/* Sort Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontWeight: '700',
                    fontSize: '0.82rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="rating_desc">⭐ Highest Community Rating</option>
                  <option value="specificstrength_desc">🚀 Specific Strength (Strength/Weight)</option>
                  <option value="density_asc">🪶 Lowest Density (Lightest)</option>
                  <option value="tensile_desc">💪 Highest Tensile Strength</option>
                  <option value="thermal_desc">❄️ Highest Thermal Conductivity</option>
                  <option value="cost_asc">💰 Lowest Raw Material Cost</option>
                </select>
              </div>

              {/* View Switcher: Grid vs Table */}
              <div style={{ display: 'flex', border: '1.5px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                <button
                  onClick={() => setViewMode('grid')}
                  style={{
                    padding: '0.4rem 0.75rem',
                    border: 'none',
                    background: viewMode === 'grid' ? '#2563eb' : '#ffffff',
                    color: viewMode === 'grid' ? '#ffffff' : '#64748b',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  🎛️ Cards
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  style={{
                    padding: '0.4rem 0.75rem',
                    border: 'none',
                    background: viewMode === 'table' ? '#2563eb' : '#ffffff',
                    color: viewMode === 'table' ? '#ffffff' : '#64748b',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  📊 Data Table
                </button>
              </div>
            </div>
          </div>

          {/* ACTIVE FILTER DISMISSIBLE CHIPS BAR */}
          {activeFilterChips.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.45rem',
              marginBottom: '1.25rem',
              padding: '0.5rem 0.85rem',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
            }}>
              <span style={{ fontSize: '0.74rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '0.25rem' }}>
                Active Constraints:
              </span>
              {activeFilterChips.map((chip) => (
                <span
                  key={chip.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #bfdbfe',
                    borderRadius: '999px',
                    padding: '0.25rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                  }}
                >
                  <span>{chip.label}</span>
                  <button
                    onClick={chip.onRemove}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: '800',
                      fontSize: '0.8rem',
                      lineHeight: 1
                    }}
                  >
                    ✕
                  </button>
                </span>
              ))}

              <button
                onClick={handleResetFilters}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  marginLeft: 'auto',
                  textDecoration: 'underline'
                }}
              >
                Clear All Constraints
              </button>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: '600' }}>
              ⚠️ {error}
            </div>
          )}

          {/* LOADING STATE */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4.5rem 2rem', background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', animation: 'pulseGlow 2s infinite' }}>⚙️</div>
              <div style={{ fontWeight: '800', fontSize: '1.15rem', color: '#0f172a' }}>Evaluating Candidate Materials...</div>
              <p style={{ fontSize: '0.86rem', color: '#64748b', marginTop: '0.35rem' }}>Calculating multi-objective strength-to-weight & domain constraint parameters</p>
            </div>
          ) : materials.length === 0 ? (
            /* EMPTY RESULTS STATE */
            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#ffffff', borderRadius: '20px', border: '1.5px dashed #cbd5e1' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.65rem' }}>🔍</div>
              <h3 style={{ margin: '0 0 0.5rem', color: '#0f172a', fontSize: '1.3rem', fontWeight: '800' }}>
                No materials match current constraints
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 1.5rem', lineHeight: 1.55 }}>
                Try relaxing density ceilings, lowering tensile thresholds, or clearing the keyword search to evaluate broader candidate alloys.
              </p>
              <button
                onClick={handleResetFilters}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.65rem 1.5rem',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)'
                }}
              >
                Reset Filter Constraints
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* ================================================================= */
            /* VIEW MODE 1: VISUAL MATERIAL CARD GRID                            */
            /* ================================================================= */
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '1.4rem',
            }}>
              {materials.map((m) => {
                const catTheme = categoryThemes[m.category] || categoryThemes.Default;
                const isCompared = compareList.some((c) => c.id === m.id);

                // Benchmark calculations for visual progress bars
                const density = m.properties?.density || 1;
                const tensile = m.properties?.tensileStrength || 0;
                const specificStrength = m.properties?.specificStrength || (tensile / density);
                const thermal = m.properties?.thermalConductivity || 0;

                const densityBarPercent = Math.min(100, Math.max(8, (density / 22) * 100));
                const tensileBarPercent = Math.min(100, Math.max(8, (tensile / 1400) * 100));
                const specBarPercent = Math.min(100, Math.max(8, (specificStrength / 600) * 100));

                return (
                  <div
                    key={m.id}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '18px',
                      border: isCompared ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      boxShadow: isCompared
                        ? '0 10px 25px -5px rgba(37, 99, 235, 0.15)'
                        : '0 4px 16px -2px rgba(15, 23, 42, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative'
                    }}
                  >
                    {/* Card Header: Category Badge + Compare Checkbox */}
                    <div style={{
                      padding: '1.15rem 1.25rem 0.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '999px',
                          background: catTheme.bg,
                          color: catTheme.text,
                          border: `1px solid ${catTheme.border}`,
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                        }}>
                          {catTheme.icon} {m.category}
                        </span>

                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          background: m.rank === 1 ? '#fef3c7' : m.rank === 2 ? '#f1f5f9' : m.rank === 3 ? '#ffedd5' : '#f8fafc',
                          color: m.rank === 1 ? '#b45309' : m.rank === 2 ? '#334155' : m.rank === 3 ? '#9a3412' : '#64748b',
                          border: '1px solid #e2e8f0',
                        }}>
                          {m.rank === 1 ? '🥇 #1' : m.rank === 2 ? '🥈 #2' : m.rank === 3 ? '🥉 #3' : `#${m.rank}`}
                        </span>
                      </div>

                      {/* Compare Checkbox */}
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        color: isCompared ? '#2563eb' : '#64748b',
                        cursor: 'pointer',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        background: isCompared ? '#eff6ff' : 'transparent',
                      }}>
                        <input
                          type="checkbox"
                          checked={isCompared}
                          onChange={() => handleToggleCompare(m)}
                          style={{ cursor: 'pointer', accentColor: '#2563eb' }}
                        />
                        <span>Compare</span>
                      </label>
                    </div>

                    {/* Title & Ratings */}
                    <div style={{ padding: '0 1.25rem' }}>
                      <h4 style={{
                        margin: '0.35rem 0 0.25rem',
                        fontSize: '1.2rem',
                        fontWeight: '800',
                        color: '#0f172a',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.3
                      }}>
                        {m.name}
                      </h4>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.65rem' }}>
                        <span style={{ color: '#f59e0b', fontSize: '0.95rem' }}>
                          {'★'.repeat(Math.round(m.rating || 4))}
                          {'☆'.repeat(5 - Math.round(m.rating || 4))}
                        </span>
                        <span style={{ fontWeight: '800', fontSize: '0.88rem', color: '#0f172a' }}>
                          {m.rating ? m.rating.toFixed(1) : '4.5'}
                        </span>
                        <span
                          onClick={() => {
                            setSelectedMaterial(m);
                            setActiveModalTab('reviews');
                          }}
                          style={{ fontSize: '0.76rem', color: '#2563eb', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          ({m.reviewCount || (m.reviews ? m.reviews.length : 0)} reviews)
                        </span>
                      </div>

                      {/* Short Description */}
                      <p style={{
                        margin: '0 0 0.85rem',
                        fontSize: '0.82rem',
                        color: '#475569',
                        lineHeight: 1.45,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        height: '2.4rem'
                      }}>
                        {m.description}
                      </p>
                    </div>

                    {/* VISUAL BENCHMARK GAUGES (PROGRESS METERS) */}
                    <div style={{
                      padding: '0.75rem 1.25rem',
                      background: '#f8fafc',
                      borderTop: '1px solid #f1f5f9',
                      borderBottom: '1px solid #f1f5f9',
                    }}>
                      {/* Metric 1: Specific Strength */}
                      <div style={{ marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: '700', marginBottom: '0.2rem' }}>
                          <span style={{ color: '#475569' }}>Strength-to-Weight</span>
                          <span style={{ color: '#16a34a', fontWeight: '800' }}>{Math.round(specificStrength)} kN·m/kg</span>
                        </div>
                        <div style={{ height: '6px', width: '100%', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${specBarPercent}%`, background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)', borderRadius: '999px' }} />
                        </div>
                      </div>

                      {/* Metric 2: Tensile Strength */}
                      <div style={{ marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: '700', marginBottom: '0.2rem' }}>
                          <span style={{ color: '#475569' }}>Tensile Strength</span>
                          <span style={{ color: '#2563eb', fontWeight: '800' }}>{tensile} MPa</span>
                        </div>
                        <div style={{ height: '6px', width: '100%', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${tensileBarPercent}%`, background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)', borderRadius: '999px' }} />
                        </div>
                      </div>

                      {/* Metric 3: Mass Density */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: '700', marginBottom: '0.2rem' }}>
                          <span style={{ color: '#475569' }}>Mass Density</span>
                          <span style={{ color: '#0284c7', fontWeight: '800' }}>{density} g/cm³</span>
                        </div>
                        <div style={{ height: '6px', width: '100%', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${densityBarPercent}%`, background: 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)', borderRadius: '999px' }} />
                        </div>
                      </div>
                    </div>

                    {/* Qualitative Badges Row */}
                    <div style={{ padding: '0.65rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem' }}>
                      <span style={{ color: '#64748b' }}>
                        Corrosion: <strong style={{ color: m.properties?.corrosionResistance === 'Excellent' ? '#15803d' : '#0f172a' }}>{m.properties?.corrosionResistance}</strong>
                      </span>
                      <span style={{ color: '#64748b' }}>
                        Cost: <strong style={{ color: '#0284c7' }}>{m.properties?.cost}</strong>
                      </span>
                    </div>

                    {/* Card Actions Footer */}
                    <div style={{
                      marginTop: 'auto',
                      padding: '0.75rem 1.25rem',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr auto',
                      gap: '0.45rem',
                      background: '#ffffff',
                      borderTop: '1px solid #f1f5f9'
                    }}>
                      <button
                        onClick={() => {
                          setSelectedMaterial(m);
                          setActiveModalTab('specs');
                        }}
                        style={{
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          borderRadius: '8px',
                          padding: '0.45rem',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        🔬 Specs
                      </button>

                      <button
                        onClick={() => handleOpenAddToProject(m)}
                        style={{
                          background: '#f0fdf4',
                          color: '#15803d',
                          border: '1px solid #bbf7d0',
                          borderRadius: '8px',
                          padding: '0.45rem',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        ➕ Project
                      </button>

                      <button
                        onClick={() => {
                          setSelectedMaterial(m);
                          setActiveModalTab('reviews');
                        }}
                        style={{
                          background: '#fffbeb',
                          color: '#b45309',
                          border: '1px solid #fde68a',
                          borderRadius: '8px',
                          padding: '0.45rem 0.65rem',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                        title="Rate & Review Material"
                      >
                        ⭐ Rate
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ================================================================= */
            /* VIEW MODE 2: HIGH-DENSITY ENGINEERING DATA TABLE MATRIX           */
            /* ================================================================= */
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)',
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '0.75rem 1rem', width: '50px' }}>Comp</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Rank</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Material Alloy</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Class</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Density (g/cm³)</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Tensile (MPa)</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Spec. Str.</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Thermal (W/mK)</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Corrosion</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Cost</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Rating</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((m) => {
                      const isCompared = compareList.some((c) => c.id === m.id);
                      const catTheme = categoryThemes[m.category] || categoryThemes.Default;
                      const specStr = Math.round(m.properties?.specificStrength || (m.properties?.tensileStrength / m.properties?.density));

                      return (
                        <tr
                          key={m.id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: isCompared ? '#eff6ff' : 'transparent',
                            transition: 'background 0.1s ease',
                          }}
                        >
                          <td style={{ padding: '0.65rem 1rem' }}>
                            <input
                              type="checkbox"
                              checked={isCompared}
                              onChange={() => handleToggleCompare(m)}
                              style={{ cursor: 'pointer', accentColor: '#2563eb' }}
                            />
                          </td>
                          <td style={{ padding: '0.65rem 1rem', fontWeight: '800', color: m.rank <= 3 ? '#b45309' : '#64748b' }}>
                            #{m.rank}
                          </td>
                          <td style={{ padding: '0.65rem 1rem', fontWeight: '800', color: '#0f172a' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span>{m.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '0.65rem 1rem' }}>
                            <span style={{
                              padding: '0.15rem 0.5rem',
                              borderRadius: '6px',
                              background: catTheme.bg,
                              color: catTheme.text,
                              fontWeight: '700',
                              fontSize: '0.72rem'
                            }}>
                              {catTheme.icon} {m.category}
                            </span>
                          </td>
                          <td style={{ padding: '0.65rem 1rem', fontWeight: '700', color: '#0284c7' }}>
                            {m.properties?.density}
                          </td>
                          <td style={{ padding: '0.65rem 1rem', fontWeight: '700', color: '#2563eb' }}>
                            {m.properties?.tensileStrength}
                          </td>
                          <td style={{ padding: '0.65rem 1rem', fontWeight: '800', color: '#16a34a' }}>
                            {specStr}
                          </td>
                          <td style={{ padding: '0.65rem 1rem', color: '#0891b2', fontWeight: '700' }}>
                            {m.properties?.thermalConductivity}
                          </td>
                          <td style={{ padding: '0.65rem 1rem', fontWeight: '600' }}>
                            <span style={{ color: m.properties?.corrosionResistance === 'Excellent' ? '#15803d' : '#64748b' }}>
                              {m.properties?.corrosionResistance}
                            </span>
                          </td>
                          <td style={{ padding: '0.65rem 1rem', color: '#475569', fontWeight: '600' }}>
                            {m.properties?.cost}
                          </td>
                          <td style={{ padding: '0.65rem 1rem', fontWeight: '800', color: '#f59e0b' }}>
                            {m.rating ? m.rating.toFixed(1) : '4.5'}★
                          </td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                              <button
                                onClick={() => {
                                  setSelectedMaterial(m);
                                  setActiveModalTab('specs');
                                }}
                                style={{
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  border: '1px solid #bfdbfe',
                                  borderRadius: '6px',
                                  padding: '0.3rem 0.55rem',
                                  fontSize: '0.74rem',
                                  fontWeight: '700',
                                  cursor: 'pointer'
                                }}
                              >
                                Specs
                              </button>
                              <button
                                onClick={() => handleOpenAddToProject(m)}
                                style={{
                                  background: '#f0fdf4',
                                  color: '#15803d',
                                  border: '1px solid #bbf7d0',
                                  borderRadius: '6px',
                                  padding: '0.3rem 0.55rem',
                                  fontSize: '0.74rem',
                                  fontWeight: '700',
                                  cursor: 'pointer'
                                }}
                              >
                                ➕ Project
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ======================================================================= */}
      {/* 4. FLOATING COMPARISON DOCK BAR (WHEN MATERIALS ARE CHECKED)            */}
      {/* ======================================================================= */}
      {compareList.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          background: 'rgba(15, 23, 42, 0.94)',
          backdropFilter: 'blur(16px)',
          border: '1.5px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '20px',
          padding: '0.85rem 1.4rem',
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          color: '#ffffff',
          maxWidth: '900px',
          width: 'calc(100% - 40px)',
          animation: 'slideUpFade 0.25s ease forwards'
        }}>
          {/* Selected chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flex: 1, overflowX: 'auto' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Compare ({compareList.length}/4):
            </span>
            {compareList.map((m) => (
              <span
                key={m.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '999px',
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  color: '#ffffff',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>{m.name}</span>
                <button
                  onClick={() => handleRemoveCompare(m.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#cbd5e1',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '0.75rem',
                    fontWeight: '800'
                  }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              onClick={handleClearCompare}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Clear
            </button>

            <button
              onClick={() => setIsCompareModalOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '0.6rem 1.25rem',
                fontWeight: '800',
                fontSize: '0.86rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                whiteSpace: 'nowrap'
              }}
            >
              ⚖️ Open Comparison Matrix →
            </button>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 5. SIDE-BY-SIDE MATERIAL COMPARISON MATRIX MODAL                        */}
      {/* ======================================================================= */}
      {isCompareModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
          }}
          onClick={() => setIsCompareModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              maxWidth: '1100px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.4rem 1.75rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#2563eb', fontWeight: '800', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <span>⚖️</span> Side-by-Side Evaluation
                </div>
                <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.4rem', fontWeight: '800', color: '#0f172a' }}>
                  Candidate Material Comparison Matrix
                </h3>
              </div>
              <button
                onClick={() => setIsCompareModalOpen(false)}
                style={{
                  background: '#e2e8f0',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '800',
                  color: '#475569'
                }}
              >
                ✕
              </button>
            </div>

            {/* Comparison Table Body */}
            <div style={{ padding: '1.5rem', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '1rem', width: '220px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                      Property Metric
                    </th>
                    {compareList.map((m) => {
                      const catTheme = categoryThemes[m.category] || categoryThemes.Default;
                      return (
                        <th key={m.id} style={{ padding: '1rem', minWidth: '200px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '999px',
                            background: catTheme.bg,
                            color: catTheme.text,
                            fontSize: '0.7rem',
                            fontWeight: '800',
                            marginBottom: '0.3rem'
                          }}>
                            {m.category}
                          </span>
                          <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                            {m.name}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: '700', marginTop: '0.2rem' }}>
                            ★ {m.rating ? m.rating.toFixed(1) : '4.5'} ({m.reviewCount || m.reviews?.length || 0} reviews)
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {/* Row: Density */}
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: '700', color: '#475569' }}>
                      Mass Density (g/cm³)
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 'normal' }}>Lower is lighter</div>
                    </td>
                    {compareList.map((m) => {
                      const isWinner = m.id === getComparisonWinnerId('density', true);
                      return (
                        <td key={m.id} style={{ padding: '0.85rem 1rem', background: isWinner ? '#f0fdf4' : 'transparent' }}>
                          <span style={{ fontWeight: '800', color: isWinner ? '#15803d' : '#0f172a', fontSize: '0.95rem' }}>
                            {m.properties?.density} g/cm³
                          </span>
                          {isWinner && <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', background: '#dcfce7', color: '#166534', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: '800' }}>🏆 Lightest</span>}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row: Tensile Strength */}
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: '700', color: '#475569' }}>
                      Tensile Strength (MPa)
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 'normal' }}>Higher is stronger</div>
                    </td>
                    {compareList.map((m) => {
                      const isWinner = m.id === getComparisonWinnerId('tensileStrength', false);
                      return (
                        <td key={m.id} style={{ padding: '0.85rem 1rem', background: isWinner ? '#f0fdf4' : 'transparent' }}>
                          <span style={{ fontWeight: '800', color: isWinner ? '#15803d' : '#0f172a', fontSize: '0.95rem' }}>
                            {m.properties?.tensileStrength} MPa
                          </span>
                          {isWinner && <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', background: '#dcfce7', color: '#166534', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: '800' }}>🏆 Highest Yield</span>}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row: Specific Strength */}
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: '700', color: '#475569' }}>
                      Specific Strength (kN·m/kg)
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 'normal' }}>Strength per unit mass</div>
                    </td>
                    {compareList.map((m) => {
                      const ss = Math.round(m.properties?.specificStrength || (m.properties?.tensileStrength / m.properties?.density));
                      const isWinner = m.id === getComparisonWinnerId('specificStrength', false);
                      return (
                        <td key={m.id} style={{ padding: '0.85rem 1rem', background: isWinner ? '#f0fdf4' : 'transparent' }}>
                          <span style={{ fontWeight: '800', color: isWinner ? '#15803d' : '#0f172a', fontSize: '0.95rem' }}>
                            {ss} kN·m/kg
                          </span>
                          {isWinner && <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', background: '#dcfce7', color: '#166534', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: '800' }}>🏆 Most Efficient</span>}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row: Thermal Conductivity */}
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: '700', color: '#475569' }}>
                      Thermal Cond. (W/m·K)
                    </td>
                    {compareList.map((m) => {
                      const isWinner = m.id === getComparisonWinnerId('thermalConductivity', false);
                      return (
                        <td key={m.id} style={{ padding: '0.85rem 1rem', background: isWinner ? '#f0fdf4' : 'transparent' }}>
                          <span style={{ fontWeight: '800', color: isWinner ? '#15803d' : '#0f172a' }}>
                            {m.properties?.thermalConductivity} W/m·K
                          </span>
                          {isWinner && <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', background: '#dcfce7', color: '#166534', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: '800' }}>🏆 Best Heat Spread</span>}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row: Corrosion Resistance */}
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: '700', color: '#475569' }}>
                      Corrosion Grade
                    </td>
                    {compareList.map((m) => (
                      <td key={m.id} style={{ padding: '0.85rem 1rem', fontWeight: '700' }}>
                        <span style={{ color: m.properties?.corrosionResistance === 'Excellent' ? '#16a34a' : '#475569' }}>
                          {m.properties?.corrosionResistance}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Row: Cost Tier */}
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: '700', color: '#475569' }}>
                      Raw Cost Tier
                    </td>
                    {compareList.map((m) => (
                      <td key={m.id} style={{ padding: '0.85rem 1rem', fontWeight: '700', color: '#0284c7' }}>
                        {m.properties?.cost}
                      </td>
                    ))}
                  </tr>

                  {/* Row: Continuous Service Temp */}
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: '700', color: '#475569' }}>
                      Continuous Service Temp
                    </td>
                    {compareList.map((m) => (
                      <td key={m.id} style={{ padding: '0.85rem 1rem', fontWeight: '700' }}>
                        {m.properties?.maxServiceTemp ? `${m.properties.maxServiceTemp} °C` : 'N/A'}
                      </td>
                    ))}
                  </tr>

                  {/* Row: Action CTAs */}
                  <tr>
                    <td style={{ padding: '1.25rem 1rem', fontWeight: '800', color: '#475569' }}>
                      Project Assignment
                    </td>
                    {compareList.map((m) => (
                      <td key={m.id} style={{ padding: '1.25rem 1rem' }}>
                        <button
                          onClick={() => {
                            setIsCompareModalOpen(false);
                            handleOpenAddToProject(m);
                          }}
                          style={{
                            width: '100%',
                            background: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.55rem',
                            fontWeight: '700',
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                          }}
                        >
                          ➕ Add to Project
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 6. "ADD TO PROJECT" WORKFLOW MODAL                                     */}
      {/* ======================================================================= */}
      {isAddToProjectModalOpen && projectTargetMaterial && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
          }}
          onClick={() => setIsAddToProjectModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              maxWidth: '540px',
              width: '100%',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
              padding: '1.75rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Project Optimization Link
                </span>
                <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.35rem', fontWeight: '800', color: '#0f172a' }}>
                  Attach Material to Project
                </h3>
              </div>
              <button
                onClick={() => setIsAddToProjectModalOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '800'
                }}
              >
                ✕
              </button>
            </div>

            {/* Selected Material Summary Card */}
            <div style={{
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '14px',
              padding: '0.9rem 1.1rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ fontWeight: '800', fontSize: '1.05rem', color: '#0f172a' }}>
                {projectTargetMaterial.name}
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.35rem', fontSize: '0.78rem', color: '#64748b' }}>
                <span>Density: <strong>{projectTargetMaterial.properties?.density} g/cm³</strong></span>
                <span>Tensile: <strong>{projectTargetMaterial.properties?.tensileStrength} MPa</strong></span>
                <span>Cost: <strong>{projectTargetMaterial.properties?.cost}</strong></span>
              </div>
            </div>

            {projectSuccessMsg && (
              <div style={{ padding: '0.75rem', background: '#dcfce7', color: '#15803d', borderRadius: '8px', marginBottom: '1rem', fontWeight: '700', fontSize: '0.85rem' }}>
                ✓ {projectSuccessMsg}
              </div>
            )}

            {projectErrorMsg && (
              <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '1rem', fontWeight: '700', fontSize: '0.85rem' }}>
                ⚠️ {projectErrorMsg}
              </div>
            )}

            <form onSubmit={handleSaveToProject}>
              {/* Project Dropdown */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                  Select Engineering Project *:
                </label>
                {userProjects.length > 0 ? (
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.88rem',
                      fontWeight: '600'
                    }}
                  >
                    {userProjects.map((p) => (
                      <option key={p.project_id} value={p.project_id}>
                        {p.name} ({p.application || 'General'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: '8px', fontSize: '0.82rem', color: '#92400e' }}>
                    No active projects found. Head to the <Link to="/dashboard" style={{ fontWeight: '800', color: '#b45309' }}>Dashboard</Link> to create your first project!
                  </div>
                )}
              </div>

              {/* Max Weight */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                  Target Component Mass / Max Weight (kg) *:
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="e.g. 12.5"
                  value={projectMaxWeight}
                  onChange={(e) => setProjectMaxWeight(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Target Cost */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                  Target Budget / Target Cost ($) *:
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  placeholder="e.g. 2400"
                  value={projectTargetCost}
                  onChange={(e) => setProjectTargetCost(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsAddToProjectModalOpen(false)}
                  style={{
                    padding: '0.6rem 1.2rem',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontWeight: '700',
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    color: '#475569'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProjectSpec || userProjects.length === 0}
                  style={{
                    padding: '0.6rem 1.4rem',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '800',
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                    opacity: submittingProjectSpec ? 0.7 : 1
                  }}
                >
                  {submittingProjectSpec ? 'Attaching...' : 'Confirm Attachment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 7. COMPREHENSIVE SPECIFICATIONS & REVIEWS MODAL                         */}
      {/* ======================================================================= */}
      {selectedMaterial && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '1.25rem',
          }}
          onClick={() => setSelectedMaterial(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '90vh',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.4rem 1.75rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              background: '#f8fafc',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.3rem' }}>
                  <span style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    background: (categoryThemes[selectedMaterial.category] || categoryThemes.Default).bg,
                    color: (categoryThemes[selectedMaterial.category] || categoryThemes.Default).text,
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                  }}>
                    {selectedMaterial.category}
                  </span>
                  <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>ID #{selectedMaterial.id}</span>
                </div>
                <h3 style={{ margin: 0, fontSize: '1.45rem', fontWeight: '800', color: '#0f172a' }}>
                  {selectedMaterial.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedMaterial(null)}
                style={{
                  background: '#e2e8f0',
                  border: 'none',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  color: '#475569',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Navigation Tabs Header */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 1.75rem' }}>
              <button
                onClick={() => setActiveModalTab('specs')}
                style={{
                  padding: '0.75rem 1.25rem',
                  border: 'none',
                  background: 'none',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  borderBottom: activeModalTab === 'specs' ? '3px solid #2563eb' : '3px solid transparent',
                  color: activeModalTab === 'specs' ? '#2563eb' : '#64748b',
                }}
              >
                🔬 Technical Specs & Applications
              </button>
              <button
                onClick={() => setActiveModalTab('reviews')}
                style={{
                  padding: '0.75rem 1.25rem',
                  border: 'none',
                  background: 'none',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  borderBottom: activeModalTab === 'reviews' ? '3px solid #2563eb' : '3px solid transparent',
                  color: activeModalTab === 'reviews' ? '#2563eb' : '#64748b',
                }}
              >
                ⭐ Verified Reviews ({selectedMaterial.reviews?.length || 0})
              </button>
            </div>

            {/* Modal Content Body */}
            <div style={{ padding: '1.75rem', overflowY: 'auto', flex: 1 }}>
              {activeModalTab === 'specs' ? (
                <>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Material Description
                    </span>
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.92rem', color: '#334155', lineHeight: 1.55 }}>
                      {selectedMaterial.description}
                    </p>
                  </div>

                  {/* Applications */}
                  {selectedMaterial.applications && selectedMaterial.applications.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Validated Engineering Applications
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.45rem' }}>
                        {selectedMaterial.applications.map((app, i) => (
                          <span
                            key={i}
                            style={{
                              padding: '0.3rem 0.75rem',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              borderRadius: '999px',
                              fontSize: '0.78rem',
                              fontWeight: '600',
                            }}
                          >
                            ✓ {app}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Complete Property Table */}
                  <span style={{ display: 'block', fontSize: '0.74rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                    Engineering Property Sheet
                  </span>
                  <div style={{ borderTop: '1px solid #e2e8f0' }}>
                    {[
                      { label: 'Density', val: `${selectedMaterial.properties?.density} g/cm³` },
                      { label: 'Tensile Strength', val: `${selectedMaterial.properties?.tensileStrength} MPa` },
                      { label: 'Specific Strength (Strength/Weight)', val: `${selectedMaterial.properties?.specificStrength || Math.round(selectedMaterial.properties?.tensileStrength / selectedMaterial.properties?.density)} kN·m/kg`, highlight: '#16a34a' },
                      { label: 'Thermal Conductivity', val: `${selectedMaterial.properties?.thermalConductivity} W/m·K` },
                      { label: 'Corrosion Resistance', val: selectedMaterial.properties?.corrosionResistance },
                      { label: 'Hardness', val: selectedMaterial.properties?.hardness ?? 'N/A' },
                      { label: 'Melting Point', val: typeof selectedMaterial.properties?.meltingPoint === 'number' ? `${selectedMaterial.properties?.meltingPoint} °C` : selectedMaterial.properties?.meltingPoint },
                      { label: 'Max Continuous Service Temp', val: selectedMaterial.properties?.maxServiceTemp ? `${selectedMaterial.properties.maxServiceTemp} °C` : 'N/A' },
                      { label: 'Relative Raw Material Cost Tier', val: selectedMaterial.properties?.cost, highlight: '#0284c7' },
                    ].map((row, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '0.65rem 0',
                          borderBottom: '1px solid #f1f5f9',
                          fontSize: '0.86rem',
                        }}
                      >
                        <span style={{ color: '#64748b', fontWeight: '500' }}>{row.label}</span>
                        <span style={{ fontWeight: '700', color: row.highlight || '#0f172a' }}>{row.val}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
                    <button
                      onClick={() => {
                        setSelectedMaterial(null);
                        handleOpenAddToProject(selectedMaterial);
                      }}
                      style={{
                        background: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '0.6rem 1.4rem',
                        fontWeight: '800',
                        fontSize: '0.86rem',
                        cursor: 'pointer'
                      }}
                    >
                      ➕ Add to Project Specifications
                    </button>
                  </div>
                </>
              ) : (
                /* REVIEWS TAB */
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <h4 style={{ margin: '0 0 0.2rem', fontSize: '1.05rem', color: '#0f172a', fontWeight: '800' }}>
                        Community Rating & Experience
                      </h4>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Operational field observations submitted by materials engineers
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#f59e0b', lineHeight: 1 }}>
                        {selectedMaterial.rating ? selectedMaterial.rating.toFixed(1) : '4.5'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>out of 5.0 stars</div>
                    </div>
                  </div>

                  {/* List of Reviews */}
                  {selectedMaterial.reviews && selectedMaterial.reviews.length > 0 ? (
                    selectedMaterial.reviews.map((rev, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '14px',
                          padding: '1rem',
                          marginBottom: '0.85rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                          <div>
                            <span style={{ fontWeight: '800', fontSize: '0.88rem', color: '#0f172a' }}>{rev.userName}</span>
                            <span style={{ fontSize: '0.76rem', color: '#64748b', marginLeft: '0.5rem' }}>
                              • {rev.role || 'Materials Engineer'}
                            </span>
                          </div>
                          <span style={{ color: '#f59e0b', fontSize: '0.9rem' }}>
                            {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                          </span>
                        </div>

                        {rev.applicationTested && (
                          <div style={{ fontSize: '0.76rem', color: '#1d4ed8', fontWeight: '700', marginBottom: '0.4rem' }}>
                            Tested Domain: {rev.applicationTested}
                          </div>
                        )}

                        <p style={{ margin: 0, fontSize: '0.86rem', color: '#334155', lineHeight: 1.5 }}>
                          "{rev.comment}"
                        </p>

                        {rev.date && (
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.4rem', textAlign: 'right' }}>
                            Verified on {rev.date}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      No community reviews recorded yet. Share your experience below!
                    </div>
                  )}

                  {/* Interactive Review Form */}
                  <div style={{
                    background: '#eff6ff',
                    border: '1.5px solid #bfdbfe',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    marginTop: '1.5rem',
                  }}>
                    <h4 style={{ margin: '0 0 0.35rem', fontSize: '0.95rem', color: '#1e3a8a', fontWeight: '800' }}>
                      ✍️ Submit Operational Rating & Experience
                    </h4>

                    {reviewSuccess && (
                      <div style={{ padding: '0.65rem', background: '#dcfce7', color: '#15803d', borderRadius: '8px', marginBottom: '0.85rem', fontWeight: '700', fontSize: '0.82rem' }}>
                        {reviewSuccess}
                      </div>
                    )}

                    <form onSubmit={handleReviewSubmit}>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              type="button"
                              key={star}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              onClick={() => setNewRating(star)}
                              style={{
                                fontSize: '1.5rem',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: (hoverRating || newRating) >= star ? '#f59e0b' : '#cbd5e1',
                                padding: 0,
                              }}
                            >
                              ★
                            </button>
                          ))}
                          <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0f172a', marginLeft: '0.5rem' }}>
                            {hoverRating || newRating} / 5 Stars
                          </span>
                        </div>
                      </div>

                      <div style={{ marginBottom: '0.75rem' }}>
                        <input
                          type="text"
                          placeholder="Application Tested (e.g. UAV Wing Spar, High Pressure Valve...)"
                          value={newAppTested}
                          onChange={(e) => setNewAppTested(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.6rem 0.8rem',
                            borderRadius: '8px',
                            border: '1.5px solid #cbd5e1',
                            fontSize: '0.84rem',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: '0.85rem' }}>
                        <textarea
                          rows={3}
                          placeholder="Engineering observations, machining notes, or corrosion resistance notes..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          required
                          style={{
                            width: '100%',
                            padding: '0.6rem 0.8rem',
                            borderRadius: '8px',
                            border: '1.5px solid #cbd5e1',
                            fontSize: '0.84rem',
                            resize: 'vertical',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submittingReview}
                        style={{
                          background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '0.6rem 1.4rem',
                          fontWeight: '800',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                          opacity: submittingReview ? 0.7 : 1,
                        }}
                      >
                        {submittingReview ? 'Submitting Review...' : 'Post Verified Review'}
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Materials;
