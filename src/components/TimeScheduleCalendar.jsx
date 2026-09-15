import React, { useState, useMemo } from 'react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday
} from 'date-fns';
import { id } from 'date-fns/locale';

// Predefined elegant dark-theme friendly color palette
const COLOR_PALETTE = [
  '#8b5a2b', // Bronze
  '#556b2f', // Olive
  '#b8860b', // Dark Gold
  '#708090', // Slate Gray
  '#800020', // Burgundy
  '#2f4f4f', // Muted Teal
  '#b7410e', // Rust/Copper
  '#483d8b', // Dark Slate Blue
  '#003153', // Prussian Blue
  '#8b0000', // Dark Red
  '#5c4033', // Dark Brown
  '#4a5d23', // Army Green
];

const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
};

const getGroupColor = (groupName) => {
  if (!groupName) return '#2f4f4f';
  const name = groupName.toUpperCase();
  if (name.includes('SIPIL')) return '#b7410e'; // Rust for Sipil
  if (name.includes('INTERIOR')) return '#556b2f'; // Olive for Interior
  if (name.includes('MEP')) return '#003153'; // Blue for MEP
  return stringToColor(groupName);
};

export default function TimeScheduleCalendar({ items, discipline, projectStartDate }) {
  const { minDate } = useMemo(() => {
    let min = null;
    items.forEach(item => {
      if (item.startDate) {
        const s = new Date(item.startDate);
        if (!min || s < min) min = s;
      }
    });
    if (!min && projectStartDate) min = new Date(projectStartDate);
    return { minDate: min || new Date() };
  }, [items, projectStartDate]);

  const [currentMonth, setCurrentMonth] = useState(startOfMonth(minDate));
  const [popupData, setPopupData] = useState(null);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  
  const goToToday = () => setCurrentMonth(startOfMonth(new Date()));

  const handleMonthChange = (e) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(parseInt(e.target.value, 10));
    setCurrentMonth(newMonth);
  };

  const handleYearChange = (e) => {
    const newMonth = new Date(currentMonth);
    newMonth.setFullYear(parseInt(e.target.value, 10));
    setCurrentMonth(newMonth);
  };

  const currentYearBase = new Date().getFullYear();
  const years = Array.from({length: 21}, (_, i) => currentYearBase - 10 + i);
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getItemColor = (item) => {
    if (discipline === 'General') {
      return getGroupColor(item.groupName);
    } else {
      return stringToColor(item.name || item.rabItemId);
    }
  };

  const eventsMap = useMemo(() => {
    const map = new Map(); 
    items.forEach(item => {
      if (!item.startDate || !item.endDate) return;
      const s = new Date(item.startDate);
      s.setHours(0,0,0,0);
      const e = new Date(item.endDate);
      e.setHours(23,59,59,999);
      
      const intervalDays = eachDayOfInterval({ start: s, end: e });
      intervalDays.forEach(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        if (!map.has(dayStr)) map.set(dayStr, []);
        map.get(dayStr).push(item);
      });
    });
    return map;
  }, [items]);

  const handleOpenPopup = (day, dayEvents) => {
    setPopupData({ day, events: dayEvents });
  };

  const projectStartStr = projectStartDate ? format(new Date(projectStartDate), 'yyyy-MM-dd') : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#161513', padding: '16px', borderRadius: '12px', border: '1px solid #363024' }}>
      
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '0 8px' }}>
        <button 
          onClick={prevMonth} 
          style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #4a4231', backgroundColor: '#0c0b09', color: '#e5e7eb', fontWeight: 'bold' }}
        >
          &#8592; Sebelumnya
        </button>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
          <select 
            value={currentMonth.getMonth()} 
            onChange={handleMonthChange}
            style={{ padding: '4px 8px', fontSize: '20px', borderRadius: '6px', border: '1px solid transparent', backgroundColor: 'transparent', color: '#d4af37', fontFamily: 'Fraunces, serif', cursor: 'pointer', outline: 'none' }}
          >
            {months.map((m, i) => <option key={i} value={i} style={{backgroundColor: '#0c0b09', color: '#d4af37', fontFamily: 'sans-serif', fontSize: '15px'}}>{m}</option>)}
          </select>
          <select 
            value={currentMonth.getFullYear()} 
            onChange={handleYearChange}
            style={{ padding: '4px 8px', fontSize: '20px', borderRadius: '6px', border: '1px solid transparent', backgroundColor: 'transparent', color: '#d4af37', fontFamily: 'Fraunces, serif', cursor: 'pointer', outline: 'none' }}
          >
            {years.map(y => <option key={y} value={y} style={{backgroundColor: '#0c0b09', color: '#d4af37', fontFamily: 'sans-serif', fontSize: '15px'}}>{y}</option>)}
          </select>
          <button 
            onClick={goToToday} 
            style={{ padding: '6px 10px', cursor: 'pointer', borderRadius: '6px', border: '1px solid #d4af37', backgroundColor: 'rgba(212, 175, 55, 0.1)', color: '#d4af37', fontWeight: 'bold', fontSize: '11px', marginLeft: '4px' }}
            title="Kembali ke Hari Ini"
          >
            Hari Ini
          </button>
        </div>

        <button 
          onClick={nextMonth} 
          style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #4a4231', backgroundColor: '#0c0b09', color: '#e5e7eb', fontWeight: 'bold' }}
        >
          Selanjutnya &#8594;
        </button>
      </div>

      {/* Calendar Grid Container (Responsive Scroll) */}
      <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          minWidth: '800px', // Forces horizontal scroll on small screens
          border: '1px solid #363024',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#0c0b09'
        }}>
          {/* Days of week header */}
          {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day, i) => (
            <div key={day} style={{
              padding: '12px 8px',
              textAlign: 'center',
              fontWeight: 'bold',
              borderBottom: '1px solid #363024',
              borderRight: i < 6 ? '1px solid #363024' : 'none',
              backgroundColor: '#161513',
              color: '#d4af37',
              fontSize: '14px'
            }}>
              {day}
            </div>
          ))}

          {/* Calendar Cells */}
          {calendarDays.map((day, i) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsMap.get(dayStr) || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isWeekend = [0, 6].includes(day.getDay());
            const isProjectStart = dayStr === projectStartStr;
            
            const visibleEvents = dayEvents.slice(0, 3);
            const hiddenCount = Math.max(0, dayEvents.length - 3);

            return (
              <div 
                key={dayStr} 
                onClick={() => handleOpenPopup(day, dayEvents)}
                style={{
                  minHeight: '120px',
                  padding: '8px',
                  borderBottom: '1px solid #363024',
                  borderRight: (i + 1) % 7 !== 0 ? '1px solid #363024' : 'none',
                  backgroundColor: isCurrentMonth ? (isWeekend ? '#110f0b' : '#0c0b09') : '#1a1815',
                  border: isProjectStart ? '2px solid #d4af37' : undefined,
                  opacity: isCurrentMonth ? 1 : 0.6,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = isCurrentMonth ? '#1a1815' : '#221f1b'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = isCurrentMonth ? (isWeekend ? '#110f0b' : '#0c0b09') : '#1a1815'; }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '4px'
                }}>
                  <span style={{ 
                    fontWeight: isToday(day) ? 'bold' : 'normal',
                    color: isCurrentMonth ? (isWeekend ? '#f87171' : '#e5e7eb') : '#6b7280',
                    backgroundColor: isToday(day) ? '#d4af37' : 'transparent',
                    color: isToday(day) ? '#0c0b09' : (isCurrentMonth ? '#e5e7eb' : '#6b7280'),
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px'
                  }}>
                    {format(day, 'd')}
                  </span>
                  {isProjectStart && (
                    <span style={{ fontSize: '10px', background: '#d4af37', color: '#0c0b09', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>START</span>
                  )}
                </div>

                {/* Events List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flexGrow: 1 }}>
                  {visibleEvents.map((ev, idx) => (
                    <div key={idx} style={{
                      backgroundColor: getItemColor(ev),
                      color: '#fff',
                      fontSize: '11px',
                      padding: '3px 6px',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    }} title={ev.name}>
                      {ev.name}
                    </div>
                  ))}

                  {hiddenCount > 0 && (
                    <div style={{
                      color: '#d4af37',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      padding: '2px 0',
                      textAlign: 'left',
                      marginTop: 'auto'
                    }}>
                      + {hiddenCount} Lainnya
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Popup / Modal */}
      {popupData && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }} onClick={() => setPopupData(null)}>
          <div style={{
            backgroundColor: '#161513',
            border: '1px solid #363024',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#d4af37' }}>
                Jadwal: {format(popupData.day, 'dd MMMM yyyy', { locale: id })}
              </h3>
              <button 
                onClick={() => setPopupData(null)}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#9ca3af' }}
              >
                &times;
              </button>
            </div>
            
            {popupData.events.length === 0 ? (
              <div style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>Tidak ada jadwal di hari ini.</div>
            ) : (
              <div style={{ overflowY: 'auto', flexGrow: 1, paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {popupData.events.map((ev, idx) => (
                  <div key={idx} style={{
                    padding: '12px',
                    borderRadius: '8px',
                    borderLeft: `4px solid ${getItemColor(ev)}`,
                    backgroundColor: '#0c0b09',
                    borderTop: '1px solid #2a261e',
                    borderRight: '1px solid #2a261e',
                    borderBottom: '1px solid #2a261e',
                  }}>
                    <div style={{ fontWeight: 'bold', color: '#e5e7eb', fontSize: '14px', marginBottom: '4px' }}>
                      {ev.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span>Group: <strong style={{color: '#d4af37'}}>{ev.groupName || '-'}</strong></span>
                      <span>Durasi: {format(new Date(ev.startDate), 'dd/MM/yy')} - {format(new Date(ev.endDate), 'dd/MM/yy')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
