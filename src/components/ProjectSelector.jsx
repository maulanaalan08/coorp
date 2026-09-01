import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';

export default function ProjectSelector({ projectId, projectList, loading, onChange, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef(null);

  const selectedProject = projectList.find(p => p.id === projectId);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filteredProjects = projectList.filter(p => {
    const term = search.toLowerCase();
    const nameMatch = p.name?.toLowerCase().includes(term);
    const displayMatch = p.displayName?.toLowerCase().includes(term);
    return nameMatch || displayMatch;
  });

  const handleSelect = (id) => {
    onChange({ target: { value: id } }); // Mock event to match existing handlers
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div style={{
      background: '#161513',
      border: '1px solid #363024',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '24px'
    }}>
      <div style={{
        fontSize: '11px',
        fontWeight: '700',
        color: '#d4af37',
        letterSpacing: '1px',
        marginBottom: '8px',
        textTransform: 'uppercase'
      }}>
        PILIH PROJECT
      </div>
      <div 
        ref={wrapperRef}
        style={{ position: 'relative', width: '100%', maxWidth: '450px' }}
      >
        <div 
          style={{ 
            width: '100%',
            background: '#0c0b09',
            border: '1px solid #4a4231',
            color: '#e5e7eb',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            userSelect: 'none'
          }}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <span>
            {loading ? "Memuat project..." : 
              selectedProject ? (selectedProject.displayName || selectedProject.name) : "-- Pilih Project --"}
          </span>
          <ChevronDown size={16} style={{ color: '#d4af37' }} />
        </div>

        {isOpen && !disabled && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: '#161513',
            border: '1px solid #363024',
            borderRadius: '6px',
            zIndex: 50,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ padding: '8px', borderBottom: '1px solid #363024' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input 
                  type="text"
                  placeholder="Cari project..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0c0b09',
                    border: '1px solid #4a4231',
                    color: '#e5e7eb',
                    padding: '6px 8px 6px 28px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                  autoFocus
                />
              </div>
            </div>
            
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {filteredProjects.length === 0 ? (
                <div style={{ padding: '8px 12px', fontSize: '13px', color: '#9ca3af', textAlign: 'center' }}>
                  Tidak ada project ditemukan
                </div>
              ) : (
                filteredProjects.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => handleSelect(p.id)}
                    style={{
                      padding: '8px 12px',
                      fontSize: '13px',
                      color: p.id === projectId ? '#d4af37' : '#e5e7eb',
                      background: p.id === projectId ? '#1e1c18' : 'transparent',
                      cursor: 'pointer',
                      borderBottom: '1px solid #222'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#1e1c18'}
                    onMouseLeave={(e) => e.currentTarget.style.background = p.id === projectId ? '#1e1c18' : 'transparent'}
                  >
                    {p.displayName || p.name}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
