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
    const activeCategories = (project.workCategories || [])
      .filter((entry) => entry.isActive !== false && entry.workCategory?.isActive !== false)
      .map((entry) => ({
        code: String(entry.workCategory?.code || '').toUpperCase(),
        grade: entry.grade || null,
      }))
      .filter((entry) => entry.code && entry.code !== 'GENERAL');
    const categoryLabel = activeCategories.map((entry) => entry.code).join(' · ') || 'BELUM DIATUR';
    const gradeLabel = activeCategories
      .filter((entry) => entry.grade)
      .map((entry) => `${entry.code}: ${entry.grade}`)
      .join(' · ');
    const imageUrl = `https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=500&sig=${imageSeed}`;

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
          <span className={`${styles.badge} ${styles.badgeCommercial}`}>
            {categoryLabel}
          </span>
          <h4>{project.name}</h4>
          <p className={styles.clientText}>Klien: {project.client?.name || '-'}</p>
          <p className={styles.clientText} style={{ marginBottom: '4px' }}>
            📍 {project.location || '-'}
          </p>
          {gradeLabel && (
            <p className={styles.clientText} style={{ marginBottom: '8px', fontSize: 11 }}>
              {gradeLabel}
            </p>
          )}
          <div className={styles.progressBarContainer}>
            <div className={styles.progressInfo}>
              <span>PROGRES</span>
              <span>{project.progress ?? 0}%</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${project.progress ?? 0}%` }}></div>
            </div>
          </div>
        </div>
        <div className={styles.cardFooter}>
          <span className={styles.date}><Calendar size={12} /> {project.hspkPeriod}</span>
          <img src={`https://i.pravatar.cc/150?u=${project.id}`} alt="Penanggung Jawab" className={styles.assigneeAvatar} />
        </div>
      </div>
    );
  };

  return (
    <div className={styles.boardWrapper}>
      {/* TOP NAVBAR */}
      <header className={styles.boardNavbar}>
        <h2>PAPAN KERJA PROYEK</h2>
        <div className={styles.boardActions}>
          <div className={styles.searchBox}>
            <Search size={16} className={styles.textGray} />
            <input
              type="text"
              placeholder="Cari proyek..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className={styles.iconBtn} type="button">
            <Bell size={20} />
          </button>
          <button className={styles.iconBtn} type="button"><Grid size={20} /></button>
          <img src="https://i.pravatar.cc/150?img=11" alt="Pengguna" className={styles.avatar} />
        </div>
      </header>

      {/* TOOLBAR */}
      <div className={styles.boardToolbar}>
        <div className={styles.filterGroup}>
          <button className={styles.toolbarBtn} type="button">
            <Filter size={14} /> Filter: Semua
          </button>
          <button className={styles.toolbarBtn} type="button">
            Urutkan: Terbaru <ChevronDown size={14} />
          </button>
        </div>
        <button
          className={styles.createNewBtn}
          onClick={() => setIsModalOpen(true)}
          type="button"
        >
          <Plus size={16} /> BUAT PROYEK BARU
        </button>
      </div>

      {/* GRID PROJECTS — 3 kolom, mengalir ke bawah */}
      <div className={styles.gridContainer}>
        {loading ? (
          <div className={styles.emptyState}>
            <MoreHorizontal size={32} className={styles.textGray} />
            <p className={styles.textGray}>Memuat proyek...</p>
          </div>
        ) : error ? (
          <div className={styles.emptyState}>
            <p style={{ color: '#ef4444' }}>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <Plus size={32} className={styles.textGray} />
            <p className={styles.textGray}>
              {searchQuery ? 'Tidak ada project yang cocok.' : 'Belum ada proyek. Klik "Buat Proyek Baru" untuk mulai.'}
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