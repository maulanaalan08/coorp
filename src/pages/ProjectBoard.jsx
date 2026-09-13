import React, { useState } from 'react';
import styles from '../styles/ProjectBoard.module.css';
import {
  Search, Bell, Grid, Filter, ChevronDown, Plus, Calendar, MoreHorizontal
} from 'lucide-react';
import CreateProjectModal from '../components/CreateProjectModal';
import { useProjects } from '../hooks/useProjects';

const ProjectBoard = ({ onProjectClick }) => {
  const { projects, loading, error, refresh: loadProjects } = useProjects();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = projects.filter(p =>
    !searchQuery ||
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.client?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderCard = (project) => {
    const imageSeed = project.id ? project.id.substring(0, 5) : 'arch';
    // Proyek baru bersifat campuran/general.
    const isInterior = project.discipline === 'INTERIOR';
    const isSipil = project.discipline === 'SIPIL';
    const imageUrl = isInterior
      ? `https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=500&sig=${imageSeed}`
      : isSipil
      ? `https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&sig=${imageSeed}`
      : `https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=500&sig=${imageSeed}`;

    return (
      <div
        key={project.id}
        className={`${styles.kanbanCard} cursor-pointer hover:ring-2 hover:ring-[#d4af37] transition-all`}
        onClick={() => onProjectClick && onProjectClick(project.id)}
      >
        <div
          className={styles.cardImage}
          style={{ backgroundImage: `url('${imageUrl}')` }}
        />
        <div className={styles.cardBody}>
          <span className={`${styles.badge} ${isInterior ? styles.badgeResidential : isSipil ? styles.badgeCommercial : styles.badgeCommercial}`}>
            {project.discipline || 'GENERAL'}
          </span>
          <h4>{project.name}</h4>
          <p className={styles.clientText}>Client: {project.client?.name || '-'}</p>
          <p className={styles.clientText} style={{ marginBottom: '4px' }}>
            📍 {project.location || '-'}
          </p>
          {(project.interiorGrade || project.sipilGrade) && (
            <p className={styles.clientText} style={{ marginBottom: '8px', fontSize: 11 }}>
              {project.interiorGrade && `Interior: ${project.interiorGrade}`}
              {project.interiorGrade && project.sipilGrade ? ' · ' : ''}
              {project.sipilGrade && `Sipil: ${project.sipilGrade}`}
            </p>
          )}
          <div className={styles.progressBarContainer}>
            <div className={styles.progressInfo}>
              <span>PROGRESS</span>
              <span>{project.progress ?? 0}%</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${project.progress ?? 0}%` }}></div>
            </div>
          </div>
        </div>
        <div className={styles.cardFooter}>
          <span className={styles.date}><Calendar size={12} /> {project.hspkPeriod}</span>
          <img src={`https://i.pravatar.cc/150?u=${project.id}`} alt="Assignee" className={styles.assigneeAvatar} />
        </div>
      </div>
    );
  };

  return (
    <div className={styles.boardWrapper}>
      {/* TOP NAVBAR */}
      <header className={styles.boardNavbar}>
        <h2>PROJECT WORKSPACE BOARD</h2>
        <div className={styles.boardActions}>
          <div className={styles.searchBox}>
            <Search size={16} className={styles.textGray} />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className={styles.iconBtn} type="button">
            <Bell size={20} />
          </button>
          <button className={styles.iconBtn} type="button"><Grid size={20} /></button>
          <img src="https://i.pravatar.cc/150?img=11" alt="User" className={styles.avatar} />
        </div>
      </header>

      {/* TOOLBAR */}
      <div className={styles.boardToolbar}>
        <div className={styles.filterGroup}>
          <button className={styles.toolbarBtn} type="button">
            <Filter size={14} /> Filter By: All
          </button>
          <button className={styles.toolbarBtn} type="button">
            Sort: Latest <ChevronDown size={14} />
          </button>
        </div>
        <button
          className={styles.createNewBtn}
          onClick={() => setIsModalOpen(true)}
          type="button"
        >
          <Plus size={16} /> CREATE NEW PROJECT
        </button>
      </div>

      {/* GRID PROJECTS — 3 kolom, mengalir ke bawah */}
      <div className={styles.gridContainer}>
        {loading ? (
          <div className={styles.emptyState}>
            <MoreHorizontal size={32} className={styles.textGray} />
            <p className={styles.textGray}>Memuat projects...</p>
          </div>
        ) : error ? (
          <div className={styles.emptyState}>
            <p style={{ color: '#ef4444' }}>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <Plus size={32} className={styles.textGray} />
            <p className={styles.textGray}>
              {searchQuery ? 'Tidak ada project yang cocok.' : 'Belum ada project. Klik "Create New Project" untuk mulai.'}
            </p>
          </div>
        ) : (
          filtered.map(renderCard)
        )}
      </div>

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onProjectCreated={loadProjects}
      />
    </div>
  );
};

export default ProjectBoard;