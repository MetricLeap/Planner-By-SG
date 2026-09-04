'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const memberNames = {
    mom: 'Nataliia',
    dad: 'Sebastian',
    child1: 'Kamila',
    child2: 'Emilia',
    all: 'Wszyscy'
};

const monthNamesPL = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

export default function MainApp() {
    const [visits, setVisits] = useState([]);
    const [loadingVisits, setLoadingVisits] = useState(true);

    // Stan miejsc (baza użytkownika)
    const [savedPlaces, setSavedPlaces] = useState([]);
    const [isPlacesModalOpen, setIsPlacesModalOpen] = useState(false);
    const [newPlace, setNewPlace] = useState({ name: '', address: '', phone: '' });
    const [editPlaceId, setEditPlaceId] = useState(null);

    // Stan rozwijania notatek na kartach
    const [expandedNotes, setExpandedNotes] = useState({});

    // Stan filtrowania po uzytkowniku
    const [selectedMemberFilter, setSelectedMemberFilter] = useState(null);

    // Stan Kalendarza
    const [calendarVisible, setCalendarVisible] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 1));
    const [selectedDayVisits, setSelectedDayVisits] = useState(null);
    const [selectedDayTitle, setSelectedDayTitle] = useState('');
    const [selectedDayRawDate, setSelectedDayRawDate] = useState('');

    // Stan Formularza
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [isMultiDay, setIsMultiDay] = useState(false);

    const [formData, setFormData] = useState({
        memberKey: 'mom',
        doctor: '',
        date: '',
        startDate: '',
        endDate: '',
        location: '',
        street: '',
        postalCode: '',
        city: '',
        phone: '',
        cost: '',
        notes: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchVisits = async () => {
        setLoadingVisits(true);
        const { data, error } = await supabase.from('visits').select('*').order('date', { ascending: true });
        if (error) {
            console.error('Błąd pobierania wizyt:', error);
        } else {
            setVisits(data || []);
        }
        setLoadingVisits(false);
    };

    const fetchPlaces = async () => {
        const { data, error } = await supabase.from('saved_places').select('*').order('name', { ascending: true });
        if (error) {
            console.error('Błąd pobierania miejsc:', error);
        } else {
            setSavedPlaces(data || []);
        }
    };

    useEffect(() => {
        fetchVisits();
        fetchPlaces();
    }, []);

    const toggleNoteExpansion = (id) => {
        setExpandedNotes(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleSavePlace = async (e) => {
        e.preventDefault();
        if (!newPlace.name) return;

        if (editPlaceId) {
            const { error } = await supabase.from('saved_places').update(newPlace).eq('id', editPlaceId);
            if (error) {
                alert('Błąd aktualizacji miejsca: ' + error.message);
            } else {
                setNewPlace({ name: '', address: '', phone: '' });
                setEditPlaceId(null);
                fetchPlaces();
            }
        } else {
            const { error } = await supabase.from('saved_places').insert([newPlace]);
            if (error) {
                alert('Błąd zapisu miejsca: ' + error.message);
            } else {
                setNewPlace({ name: '', address: '', phone: '' });
                fetchPlaces();
            }
        }
    };

    const handleEditPlaceClick = (p) => {
        setEditPlaceId(p.id);
        setNewPlace({ name: p.name, address: p.address || '', phone: p.phone || '' });
    };

    const handleDeletePlace = async (id) => {
        const { error } = await supabase.from('saved_places').delete().eq('id', id);
        if (error) {
            alert('Błąd usuwania miejsca: ' + error.message);
        } else {
            if (editPlaceId === id) {
                setEditPlaceId(null);
                setNewPlace({ name: '', address: '', phone: '' });
            }
            fetchPlaces();
        }
    };

    const handleSelectPlaceChange = (e) => {
        const selectedName = e.target.value;
        if (!selectedName) {
            setFormData({ ...formData, location: '', phone: '' });
            return;
        }
        const found = savedPlaces.find(p => p.name === selectedName);
        if (found) {
            setFormData({
                ...formData,
                location: found.name + (found.address ? ` (${found.address})` : ''),
                phone: found.phone || formData.phone
            });
        }
    };

    const handleMemberCardClick = (key) => {
        if (selectedMemberFilter === key) {
            setSelectedMemberFilter(null);
        } else {
            setSelectedMemberFilter(key);
        }
    };

    const filteredVisits = selectedMemberFilter
        ? visits.filter(v => v.member_key === selectedMemberFilter)
        : visits;

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        let dateVal = formData.date;
        let timeVal = '00:00';
        if (!isMultiDay && formData.date && formData.date.includes('T')) {
            const [d, t] = formData.date.split('T');
            dateVal = d;
            timeVal = t || '00:00';
        }

        const payload = {
            member_key: formData.memberKey,
            doctor: formData.doctor,
            is_multi_day: isMultiDay,
            date: isMultiDay ? formData.startDate : dateVal,
            end_date: isMultiDay ? formData.endDate : null,
            time: isMultiDay ? 'Wielodniowe' : timeVal,
            location: formData.location || '',
            street: formData.street || '',
            phone: formData.phone || '',
            cost: parseFloat(formData.cost) || 0,
            notes: formData.notes || ''
        };

        try {
            if (editId) {
                const { error } = await supabase.from('visits').update(payload).eq('id', editId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('visits').insert([payload]);
                if (error) throw error;
            }

            closeForm();
            fetchVisits();
        } catch (err) {
            console.error('Błąd Supabase:', err);
            alert('Błąd zapisu: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const openFormForAdd = () => {
        setEditId(null);
        setIsMultiDay(false);
        setFormData({
            memberKey: 'mom', doctor: '', date: '', startDate: '', endDate: '',
            location: '', street: '', postalCode: '', city: '', phone: '', cost: '', notes: ''
        });
        setIsFormOpen(true);
    };

    const openFormForDate = (dateStr) => {
        setEditId(null);
        setIsMultiDay(false);
        setFormData({
            memberKey: 'mom',
            doctor: '',
            date: `${dateStr}T09:00`,
            startDate: dateStr,
            endDate: dateStr,
            location: '',
            street: '',
            postalCode: '',
            city: '',
            phone: '',
            cost: '',
            notes: ''
        });
        setIsFormOpen(true);
    };

    const openFormForEdit = (item) => {
        setEditId(item.id);
        setIsMultiDay(item.is_multi_day || false);
        setFormData({
            memberKey: item.member_key,
            doctor: item.doctor || '',
            date: item.time && item.time !== 'Wielodniowe' ? `${item.date}T${item.time}` : item.date,
            startDate: item.date || '',
            endDate: item.end_date || '',
            location: item.location || '',
            street: item.street || '',
            postalCode: item.postal_code || '',
            city: item.city || '',
            phone: item.phone || '',
            cost: item.cost || '',
            notes: item.notes || ''
        });
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditId(null);
    };

    const handleDelete = async (item) => {
        const confirmed = window.confirm('Czy na pewno chcesz usunąć to wydarzenie?');
        if (!confirmed) return;

        try {
            const { error } = await supabase.from('visits').delete().eq('id', item.id);
            if (error) throw error;

            if (selectedDayVisits) {
                setSelectedDayVisits(selectedDayVisits.filter(v => v.id !== item.id));
            }

            fetchVisits();
        } catch (err) {
            alert('Nie udało się usunąć wydarzenia: ' + err.message);
        }
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const handleDayClick = (day, visitsForDay, formattedDate) => {
        setSelectedDayTitle(`Plan dnia: ${day} ${monthNamesPL[month]} ${year}`);
        setSelectedDayVisits(visitsForDay);
        setSelectedDayRawDate(formattedDate);
    };

    return (
        <div className="app-shell" style={{ paddingBottom: '90px' }}>
            {/* HEADER */}
            <header className="app-header">
                <div className="header-brand">
                    <div className="brand-logo">
                        <span className="material-symbols-outlined">medical_services</span>
                    </div>
                    <div className="brand-text">
                        <h1>Planner by SG</h1>
                        <p>Nasz terminarz | Rodzina Gąsior</p>
                    </div>
                </div>

                <div className="header-actions desktop-only">
                    <button className="btn-app btn-secondary" onClick={() => setCalendarVisible(!calendarVisible)}>
                        <span className="material-symbols-outlined">calendar_month</span>
                        <span>Kalendarz</span>
                    </button>
                    <button className="btn-app btn-secondary" onClick={() => setIsPlacesModalOpen(true)}>
                        <span className="material-symbols-outlined">place</span>
                        <span>Miejsca</span>
                    </button>
                    <button className="btn-app btn-primary" onClick={openFormForAdd}>
                        <span className="material-symbols-outlined">add</span>
                        <span>Nowe wydarzenie</span>
                    </button>
                    <button
                        className="btn-app btn-secondary"
                        onClick={() => { fetchVisits(); fetchPlaces(); }}
                        title="Odśwież dane"
                    >
                        <span className="material-symbols-outlined">refresh</span>
                    </button>
                    <button className="btn-app btn-secondary" onClick={() => supabase.auth.signOut()}>
                        <span className="material-symbols-outlined">logout</span>
                    </button>
                </div>
            </header>

            {/* MODAL MIEJSC */}
            {isPlacesModalOpen && (
                <div className="form-drawer open" style={{ zIndex: 1100, padding: '10px' }}>
                    <div className="glass-card form-card" style={{ maxWidth: '500px', width: '100%', margin: 'auto' }}>
                        <div className="form-card-header">
                            <h3>{editPlaceId ? 'Edytuj miejsce' : 'Moje zapisane miejsca'}</h3>
                            <button type="button" className="icon-btn-close" onClick={() => { setIsPlacesModalOpen(false); setEditPlaceId(null); setNewPlace({ name: '', address: '', phone: '' }); }}>&times;</button>
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <form onSubmit={handleSavePlace} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div className="input-group">
                                    <label>Nazwa miejsca</label>
                                    <input type="text" required placeholder="np. LuxMed" value={newPlace.name} onChange={e => setNewPlace({ ...newPlace, name: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label>Adres</label>
                                    <input type="text" placeholder="np. ul. Długa 5" value={newPlace.address} onChange={e => setNewPlace({ ...newPlace, address: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label>Telefon</label>
                                    <input type="tel" placeholder="np. 33 123 45 67" value={newPlace.phone} onChange={e => setNewPlace({ ...newPlace, phone: e.target.value })} />
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button type="submit" className="btn-app btn-primary" style={{ flex: 1 }}>
                                        {editPlaceId ? 'Zapisz zmiany' : 'Dodaj miejsce'}
                                    </button>
                                    {editPlaceId && (
                                        <button type="button" className="btn-app btn-secondary" onClick={() => { setEditPlaceId(null); setNewPlace({ name: '', address: '', phone: '' }); }}>
                                            Anuluj
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>

                        <div className="schedule-items-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            <h4 style={{ fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)' }}>Zapisane lokalizacje:</h4>
                            {savedPlaces.length === 0 ? (
                                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Brak zapisanych miejsc.</p>
                            ) : (
                                savedPlaces.map(p => (
                                    <div key={p.id} className="schedule-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ overflow: 'hidden', paddingRight: '8px' }}>
                                            <strong style={{ fontSize: '0.9rem', display: 'block' }}>{p.name}</strong>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{p.address} {p.phone ? `• ${p.phone}` : ''}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                            <button className="action-icon-btn" onClick={() => handleEditPlaceClick(p)} title="Edytuj">
                                                <span className="material-symbols-outlined">edit</span>
                                            </button>
                                            <button className="action-icon-btn" onClick={() => handleDeletePlace(p.id)} title="Usuń" style={{ color: '#ef4444' }}>
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* FAMILY GRID */}
            <section className="family-grid" style={{ gap: '8px', marginBottom: '15px' }}>
                {['mom', 'dad', 'child1', 'child2'].map((key) => {
                    const isSelected = selectedMemberFilter === key;
                    return (
                        <div
                            key={key}
                            className={`member-card ${key} ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleMemberCardClick(key)}
                            style={{ cursor: 'pointer', border: isSelected ? '2px solid var(--primary, #3b82f6)' : undefined, padding: '10px' }}
                        >
                            <div className="member-avatar" style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}>{key === 'mom' ? 'M' : key === 'dad' ? 'T' : key === 'child1' ? 'C1' : 'C2'}</div>
                            <div className="member-info">
                                <span className="member-name" style={{ fontSize: '0.85rem' }}>{memberNames[key]}</span>
                                <span className="member-status" style={{ fontSize: '0.7rem' }}>
                                    {visits.filter(v => v.member_key === key).length} zaplanowanych
                                </span>
                            </div>
                        </div>
                    );
                })}
            </section>

            {/* KALENDARZ */}
            {calendarVisible && (
                <section className="calendar-section visible" style={{ marginBottom: '15px' }}>
                    <div className="glass-card" style={{ padding: '12px' }}>
                        <div className="calendar-header" style={{ marginBottom: '10px' }}>
                            <div className="calendar-nav">
                                <button className="icon-btn" onClick={() => setCurrentDate(new Date(year - 1, month, 1))}>
                                    <span className="material-symbols-outlined">first_page</span>
                                </button>
                                <button className="icon-btn" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>
                                    <span className="material-symbols-outlined">chevron_left</span>
                                </button>
                            </div>
                            <h2 className="month-title" style={{ fontSize: '1rem' }}>{monthNamesPL[month]} {year}</h2>
                            <div className="calendar-nav">
                                <button className="icon-btn" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>
                                    <span className="material-symbols-outlined">chevron_right</span>
                                </button>
                                <button className="icon-btn" onClick={() => setCurrentDate(new Date(year + 1, month, 1))}>
                                    <span className="material-symbols-outlined">last_page</span>
                                </button>
                            </div>
                        </div>

                        <div className="calendar-grid-header" style={{ fontSize: '0.75rem', marginBottom: '5px' }}>
                            <span>Pn</span><span>Wt</span><span>Śr</span><span>Cz</span><span>Pt</span><span>So</span><span>Nd</span>
                        </div>

                        <div className="calendar-days-grid" style={{ gap: '2px' }}>
                            {Array.from({ length: firstDayIndex }).map((_, i) => (
                                <div key={`prev-${i}`} className="cal-day-cell disabled" style={{ minHeight: '36px' }}>
                                    <span style={{ fontSize: '0.75rem' }}>{prevMonthDays - firstDayIndex + i + 1}</span>
                                </div>
                            ))}

                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const visitsForDay = filteredVisits.filter(v => v.is_multi_day ? (formattedDate >= v.date && formattedDate <= v.end_date) : v.date === formattedDate);

                                return (
                                    <div key={day} className="cal-day-cell" onClick={() => handleDayClick(day, visitsForDay, formattedDate)} style={{ minHeight: '36px', padding: '2px' }}>
                                        <span style={{ fontSize: '0.8rem' }}>{day}</span>
                                        {visitsForDay.length > 0 && <div className="count-badge" style={{ fontSize: '0.65rem', padding: '1px 4px' }}>{visitsForDay.length}</div>}
                                    </div>
                                );
                            })}
                        </div>

                        {selectedDayVisits && (
                            <div className="day-schedule-panel" style={{ marginTop: '12px', padding: '10px' }}>
                                <div className="schedule-header">
                                    <h4 style={{ fontSize: '0.9rem' }}>{selectedDayTitle}</h4>
                                    <button className="icon-btn-close" onClick={() => setSelectedDayVisits(null)}>&times;</button>
                                </div>
                                <div className="schedule-items-list" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                                    {selectedDayVisits.length === 0 ? (
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', padding: '6px 0' }}>Brak wydarzeń na ten dzień.</div>
                                    ) : (
                                        selectedDayVisits.map(v => (
                                            <div key={v.id} className="schedule-item" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '8px', marginBottom: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                                    <div>
                                                        <strong style={{ fontSize: '0.85rem' }}>{v.doctor}</strong>
                                                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                                            {memberNames[v.member_key]} {v.location ? `• ${v.location}` : ''}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                                        <button className="action-icon-btn" onClick={() => openFormForEdit(v)} style={{ padding: '2px' }}>
                                                            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>edit</span>
                                                        </button>
                                                        <button className="action-icon-btn" onClick={() => handleDelete(v)} style={{ color: '#ef4444', padding: '2px' }}>
                                                            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                    <button
                                        className="btn-app btn-primary btn-full"
                                        style={{ fontSize: '0.8rem', padding: '8px' }}
                                        onClick={() => openFormForDate(selectedDayRawDate)}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>add</span>
                                        <span>Dodaj wydarzenie</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* FORMULARZ (DRAWER) */}
            <section className={`form-drawer ${isFormOpen ? 'open' : ''}`} style={{ padding: '0' }}>
                <div className="glass-card form-card" style={{ height: '100%', maxHeight: '100vh', overflowY: 'auto', borderRadius: '0', display: 'flex', flexDirection: 'column' }}>
                    <div className="form-card-header" style={{ padding: '12px 16px' }}>
                        <h3 style={{ fontSize: '1rem' }}>{editId ? 'Edytuj wydarzenie' : 'Zaplanuj wydarzenie'}</h3>
                        <button type="button" className="icon-btn-close" onClick={closeForm}>&times;</button>
                    </div>
                    <form className="app-form" onSubmit={handleFormSubmit} style={{ padding: '12px 16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div className="form-grid" style={{ gap: '10px' }}>
                            <div className="input-group">
                                <label style={{ fontSize: '0.75rem' }}>Uczestnik</label>
                                <select value={formData.memberKey} onChange={e => setFormData({ ...formData, memberKey: e.target.value })} style={{ fontSize: '0.85rem', padding: '8px' }}>
                                    <option value="mom">Nataliia</option>
                                    <option value="dad">Sebastian</option>
                                    <option value="child1">Kamila</option>
                                    <option value="child2">Emilia</option>
                                    <option value="all">Wszyscy</option>
                                </select>
                            </div>

                            <div className="input-group">
                                <label style={{ fontSize: '0.75rem' }}>Nazwa wydarzenia</label>
                                <input type="text" required placeholder="np. Stomatolog" value={formData.doctor} onChange={e => setFormData({ ...formData, doctor: e.target.value })} style={{ fontSize: '0.85rem', padding: '8px' }} />
                            </div>

                            <div className="input-group span-2 checkbox-group" style={{ margin: '2px 0' }}>
                                <label className="switch-label" style={{ fontSize: '0.8rem' }}>
                                    <input type="checkbox" checked={isMultiDay} onChange={e => setIsMultiDay(e.target.checked)} />
                                    <span>Wydarzenie wielodniowe</span>
                                </label>
                            </div>

                            {!isMultiDay ? (
                                <div className="input-group span-2">
                                    <label style={{ fontSize: '0.75rem' }}>Data i godzina</label>
                                    <input type="datetime-local" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} style={{ fontSize: '0.85rem', padding: '8px' }} />
                                </div>
                            ) : (
                                <>
                                    <div className="input-group">
                                        <label style={{ fontSize: '0.75rem' }}>Data początkowa</label>
                                        <input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} style={{ fontSize: '0.85rem', padding: '8px' }} />
                                    </div>
                                    <div className="input-group">
                                        <label style={{ fontSize: '0.75rem' }}>Data końcowa</label>
                                        <input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} style={{ fontSize: '0.85rem', padding: '8px' }} />
                                    </div>
                                </>
                            )}

                            <div className="input-group span-2">
                                <label style={{ fontSize: '0.75rem' }}>Wybierz zapisane miejsce</label>
                                <select onChange={handleSelectPlaceChange} defaultValue="" style={{ fontSize: '0.85rem', padding: '8px' }}>
                                    <option value="">-- Wybierz z listy --</option>
                                    {savedPlaces.map(p => (
                                        <option key={p.id} value={p.name}>{p.name} ({p.address})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="input-group span-2">
                                <label style={{ fontSize: '0.75rem' }}>Miejsce i adres</label>
                                <input type="text" placeholder="np. ul. Przykładowa 1" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} style={{ fontSize: '0.85rem', padding: '8px' }} />
                            </div>
                            <div className="input-group">
                                <label style={{ fontSize: '0.75rem' }}>Telefon</label>
                                <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} style={{ fontSize: '0.85rem', padding: '8px' }} />
                            </div>
                            <div className="input-group">
                                <label style={{ fontSize: '0.75rem' }}>Koszt (zł)</label>
                                <input type="number" step="0.01" value={formData.cost} onChange={e => setFormData({ ...formData, cost: e.target.value })} style={{ fontSize: '0.85rem', padding: '8px' }} />
                            </div>

                            {/* Poprawione, wycentrowane i dopasowane pole notatki */}
                            <div className="input-group span-2" style={{ display: 'flex', flexDirection: 'column', width: '110%', margin: '0 auto', boxSizing: 'border-box' }}>
                                <label style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Komentarz / Notatka</label>
                                <textarea
                                    rows="3"
                                    placeholder="Dodatkowe informacje..."
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    style={{
                                        width: '100%',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        color: 'inherit',
                                        resize: 'vertical',
                                        fontSize: '0.85rem',
                                        boxSizing: 'border-box',
                                        outline: 'none',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>
                        </div>

                        <div className="form-actions" style={{ marginTop: '15px' }}>
                            <button type="submit" disabled={isSubmitting} className="btn-app btn-primary btn-full" style={{ padding: '10px', fontSize: '0.9rem' }}>
                                {isSubmitting ? 'Zapisywanie...' : (editId ? 'Zapisz zmiany' : 'Dodaj wydarzenie')}
                            </button>
                        </div>
                    </form>
                </div>
            </section>

            {/* TIMELINE LIST */}
            <section className="timeline-section">
                <div className="section-title-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h2 style={{ fontSize: '0.95rem' }}>
                        {selectedMemberFilter
                            ? `Wydarzenia: ${memberNames[selectedMemberFilter]}`
                            : 'Najbliższe wydarzenia'}
                    </h2>
                    {selectedMemberFilter && (
                        <button
                            onClick={() => setSelectedMemberFilter(null)}
                            style={{ background: 'none', border: 'none', color: 'var(--primary, #3b82f6)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500 }}
                        >
                            Pokaż wszystkich
                        </button>
                    )}
                </div>

                {loadingVisits ? (
                    <p style={{ fontSize: '0.85rem' }}>Wczytywanie wydarzeń...</p>
                ) : filteredVisits.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Brak zaplanowanych wydarzeń.</p>
                ) : (
                    <div className="timeline-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {filteredVisits.map((item) => {
                            const isExpanded = !!expandedNotes[item.id];
                            return (
                                <div key={item.id} className={`appointment-card tag-${item.member_key}`} style={{ display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box', padding: '12px' }}>

                                    {/* Górna część karty: Data/Godzina oraz Tag i Tytuł */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                                        <div className="appointment-time-badge" style={{ flexShrink: 0, padding: '4px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', textAlign: 'center' }}>
                                            <span className="time-hour" style={{ fontSize: '0.8rem', display: 'block', fontWeight: 'bold' }}>{item.is_multi_day ? 'Wielodniowe' : item.time}</span>
                                            <span className="time-date" style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block' }}>{item.date}</span>
                                        </div>

                                        <div className="appointment-main" style={{ flex: 1, minWidth: 0 }}>
                                            <span className={`badge-tag ${item.member_key}`} style={{ fontSize: '0.65rem', padding: '2px 6px', marginBottom: '2px', display: 'inline-block' }}>{memberNames[item.member_key]}</span>
                                            <h4 style={{ fontSize: '0.95rem', margin: 0, wordBreak: 'break-word' }}>{item.doctor}</h4>
                                        </div>

                                        <span className={`cost-price ${!item.cost ? 'free' : ''}`} style={{ fontSize: '0.8rem', fontWeight: 600, flexShrink: 0 }}>
                                            {!item.cost || item.cost === 0 ? '0 zł' : `${item.cost} zł`}
                                        </span>
                                    </div>

                                    {/* Środkowá sekcja: lokalizacja, telefon */}
                                    <div className="appointment-details" style={{ fontSize: '0.8rem', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {item.location && (
                                            <div className="detail-line" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: '#94a3b8' }}>location_on</span>
                                                <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ color: 'inherit', textDecoration: 'underline', wordBreak: 'break-word' }}
                                                >
                                                    <strong>{item.location}</strong>
                                                </a>
                                            </div>
                                        )}
                                        {item.phone && (
                                            <div className="detail-line" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: '#94a3b8' }}>call</span>
                                                <a href={`tel:${item.phone}`} className="phone-link">{item.phone}</a>
                                            </div>
                                        )}
                                    </div>

                                    {/* Sekcja notatki i ikony edycji/usuwania wyraźnie na dole */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px', marginTop: '2px' }}>
                                        <div
                                            onClick={() => item.notes && toggleNoteExpansion(item.id)}
                                            style={{
                                                fontSize: '0.75rem',
                                                color: item.notes ? 'var(--text-muted, #94a3b8)' : 'rgba(148, 163, 184, 0.4)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                cursor: item.notes ? 'pointer' : 'default',
                                                fontStyle: item.notes ? 'normal' : 'italic',
                                                userSelect: 'none',
                                                flex: 1,
                                                paddingRight: '8px',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '0.85rem' }}>comment</span>
                                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                {item.notes ? (isExpanded ? 'Ukryj notatkę' : 'Notatka (kliknij aby rozwijać)') : 'Brak notatek'}
                                            </span>
                                        </div>

                                        {/* Przyciski Edycji i Usuwania przypięte stabilnie po prawej na dole */}
                                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                            <button className="action-icon-btn" onClick={() => openFormForEdit(item)} title="Edytuj" style={{ padding: '4px' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>edit</span>
                                            </button>
                                            <button className="action-icon-btn" onClick={() => handleDelete(item)} title="Usuń" style={{ color: '#ef4444', padding: '4px' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>delete</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Rozwinięta treść notatki */}
                                    {isExpanded && item.notes && (
                                        <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '0.8rem', color: 'inherit', borderLeft: '2px solid var(--primary, #3b82f6)', width: '100%', boxSizing: 'border-box', wordBreak: 'break-word' }}>
                                            {item.notes}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* PRZYPIĘTE MENU DOLNE DLA MOBILES */}
            <nav className="mobile-bottom-nav">
                <button className="mobile-nav-btn" onClick={() => setCalendarVisible(!calendarVisible)}>
                    <span className="material-symbols-outlined">calendar_month</span>
                    <span>Kalendarz</span>
                </button>
                <button className="mobile-nav-btn" onClick={() => setIsPlacesModalOpen(true)}>
                    <span className="material-symbols-outlined">place</span>
                    <span>Miejsca</span>
                </button>
                <button className="mobile-nav-btn primary" onClick={openFormForAdd}>
                    <span className="material-symbols-outlined">add</span>
                </button>
                <button className="mobile-nav-btn" onClick={() => { fetchVisits(); fetchPlaces(); }} title="Odśwież">
                    <span className="material-symbols-outlined">refresh</span>
                    <span>Odśwież</span>
                </button>
                <button className="mobile-nav-btn" onClick={() => supabase.auth.signOut()}>
                    <span className="material-symbols-outlined">logout</span>
                    <span>Wyloguj</span>
                </button>
            </nav>
        </div>
    );
}