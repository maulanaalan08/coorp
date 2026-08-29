import React, { useState, useEffect } from 'react';
import styles from '../styles/ProjectBoard.module.css';
import { 
  Search, Bell, Grid, Filter, ChevronDown, Plus, MoreHorizontal, Calendar 
} from 'lucide-react';
import CreateProjectModal from '../components/CreateProjectModal';
import { projectService } from '../services/projectService';

const ProjectBoard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadProjects = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const result = await projectService.getAll();
      const projectsList = Array.isArray(result) ? result : result?.data || [];
      setData(projectsList);
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <div className={styles.boardWrapper}>
      {/* TOP NAVBAR KHUSUS BOARD */}
      <header className={styles.boardNavbar}>
        <h2>PROJECT WORKSPACE BOARD</h2>
        <div className={styles.boardActions}>
          <div className={styles.searchBox}>
            <Search size={16} className={styles.textGray} />
            <input type="text" placeholder="Search projects..." />
          </div>
          <button className={`${styles.iconBtn} style-position-relative`} type="button">
            <Bell size={20} />
            <span className={styles.dotIndicator}></span>
          </button>
          <button className={styles.iconBtn} type="button"><Grid size={20} /></button>
          <img src="https://i.pravatar.cc/150?img=11" alt="User" className={styles.avatar} />
        </div>
      </header>

      {/* TOOLBAR (Filter & Create) */}
      <div className={styles.boardToolbar}>
        <div className={styles.filterGroup}>
          <button className={styles.toolbarBtn} type="button">
            <Filter size={14} /> Filter By: Active Status
          </button>
          <button className={styles.toolbarBtn} type="button">
            Sort: Deadline <ChevronDown size={14} />
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

      {/* KANBAN COLUMNS */}
      <div className={styles.kanbanContainer}>
        {/* Kolom 1: Design & Planning */}
        <div className={styles.kanbanColumn}>
          <div className={styles.columnHeader}>
            <h3>DESIGN & PLANNING <span className={styles.count}>4</span></h3>
            <MoreHorizontal size={16} className={`${styles.textGray} ${styles.cursorPointer}`} />
          </div>
          
          <div className={styles.kanbanCard}>
            <div 
              className={styles.cardImage} 
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500')` }}
            />
            <div className={styles.cardBody}>
              <span className={`${styles.badge} ${styles.badgeResidential}`}>RESIDENTIAL</span>
              <h4>Veridian Heights Phase II</h4>
              <p className={styles.clientText}>Client: Skyline Properties</p>
              <div className={styles.progressBarContainer}>
                <div className={styles.progressInfo}>
                  <span>PROGRESS</span>
                  <span>45%</span>
                </div>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: '45%' }}></div>
                </div>
              </div>
            </div>
            <div className={styles.cardFooter}>
              <span className={styles.date}><Calendar size={12} /> Aug 2026</span>
              <img src="https://i.pravatar.cc/150?img=12" alt="Assignee" className={styles.assigneeAvatar} />
            </div>
          </div>

          <div className={styles.kanbanCard}>
            <div 
              className={styles.cardImage} 
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1497366216548-37526070297c?w=500')` }}
            />
            <div className={styles.cardBody}>
              <span className={`${styles.badge} ${styles.badgeCommercial}`}>COMMERCIAL</span>
              <h4>Axis Tech Headquarters</h4>
              <p className={styles.clientText}>Client: Axis Global Corp</p>
              <div className={styles.progressBarContainer}>
                <div className={styles.progressInfo}>
                  <span>PROGRESS</span>
                  <span>12%</span>
                </div>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: '12%' }}></div>
                </div>
              </div>
            </div>
            <div className={styles.cardFooter}>
              <span className={styles.date}><Calendar size={12} /> Dec 2026</span>
              <img src="https://i.pravatar.cc/150?img=12" alt="Assignee" className={styles.assigneeAvatar} />
            </div>
          </div>

          <button className={styles.addTaskBtn} type="button"><Plus size={14} /> Add Task</button>
        </div>

        {/* Kolom 2: Procurement */}
        <div className={styles.kanbanColumn}>
          <div className={styles.columnHeader}>
            <h3>PROCUREMENT <span className={styles.count}>3</span></h3>
            <MoreHorizontal size={16} className={`${styles.textGray} ${styles.cursorPointer}`} />
          </div>
          
          <div className={styles.kanbanCard}>
            <div 
              className={styles.cardImage} 
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=500')` }}
            />
            <div className={styles.cardBody}>
              <span className={`${styles.badge} ${styles.badgeCommercial}`}>COMMERCIAL</span>
              <h4>Grand Plaza Materials</h4>
              <p className={styles.clientText}>Client: Metropolis Dev</p>
              <div className={styles.progressBarContainer}>
                <div className={styles.progressInfo}>
                  <span>PROGRESS</span>
                  <span>80%</span>
                </div>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: '80%' }}></div>
                </div>
              </div>
            </div>
            <div className={styles.cardFooter}>
              <span className={styles.date}><Calendar size={12} /> Oct 2025</span>
              <img src="https://i.pravatar.cc/150?img=33" alt="Assignee" className={styles.assigneeAvatar} />
            </div>
          </div>
        </div>

        {/* Kolom 3: Construction */}
        <div className={styles.kanbanColumn}>
          <div className={styles.columnHeader}>
            <h3>CONSTRUCTION <span className={styles.count}>5</span></h3>
            <MoreHorizontal size={16} className={`${styles.textGray} ${styles.cursorPointer}`} />
          </div>
          
          <div className={`${styles.kanbanCard} ${styles.highlightedCard}`}>
            <div 
              className={styles.cardImage} 
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1541888081-3051405e320d?w=500')` }}
            />
            <div className={styles.cardBody}>
              <span className={`${styles.badge} ${styles.badgeCommercial}`}>COMMERCIAL</span>
              <h4>Central Hub Foundation</h4>
              <p className={styles.clientText}>Client: Federal Infrastructure</p>
              <div className={styles.progressBarContainer}>
                <div className={styles.progressInfo}>
                  <span>PROGRESS</span>
                  <span>32%</span>
                </div>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: '32%' }}></div>
                </div>
              </div>
            </div>
            <div className={styles.cardFooter}>
              <span className={styles.date}><Calendar size={12} /> Jan 2026</span>
              <img src="https://i.pravatar.cc/150?img=47" alt="Assignee" className={styles.assigneeAvatar} />
            </div>
          </div>

          <div className={styles.kanbanCard}>
            <div 
              className={styles.cardImage} 
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500')` }}
            />
            <div className={styles.cardBody}>
              <span className={`${styles.badge} ${styles.badgeResidential}`}>RESIDENTIAL</span>
              <h4>Skyline Towers B1</h4>
              <p className={styles.clientText}>Client: Elite Realty Group</p>
              <div className={styles.progressBarContainer}>
                <div className={styles.progressInfo}>
                  <span>PROGRESS</span>
                  <span>68%</span>
                </div>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: '68%' }}></div>
                </div>
              </div>
            </div>
            <div className={styles.cardFooter}>
              <span className={styles.date}><Calendar size={12} /> Mar 2026</span>
              <img src="https://i.pravatar.cc/150?img=47" alt="Assignee" className={styles.assigneeAvatar} />
            </div>
          </div>
        </div>

        {/* Kolom 4: Finishing */}
        <div className={styles.kanbanColumn}>
          <div className={styles.columnHeader}>
            <h3>FINISHING <span className={styles.count}>2</span></h3>
            <MoreHorizontal size={16} className={`${styles.textGray} ${styles.cursorPointer}`} />
          </div>
          
          <div className={styles.kanbanCard}>
            <div 
              className={styles.cardImage} 
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500')` }}
            />
            <div className={styles.cardBody}>
              <span className={`${styles.badge} ${styles.badgeResidential}`}>RESIDENTIAL</span>
              <h4>The Onyx Penthouse</h4>
              <p className={styles.clientText}>Client: Private Investor</p>
              <div className={styles.progressBarContainer}>
                <div className={styles.progressInfo}>
                  <span>PROGRESS</span>
                  <span>98%</span>
                </div>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: '98%' }}></div>
                </div>
              </div>
            </div>
            <div className={styles.cardFooter}>
              <span className={styles.date}><Calendar size={12} /> Sep 2024</span>
              <img src="https://i.pravatar.cc/150?img=11" alt="Assignee" className={styles.assigneeAvatar} />
            </div>
          </div>
        </div>
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