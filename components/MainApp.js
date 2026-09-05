'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import '../app/globals.css';

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
    const [savedPlaces, setSavedPlaces] = useState([]);
    const [isPlacesModalOpen, setIsPlacesModalOpen] = useState(false);
    const [newPlace, setNewPlace] = useState({ name: '', address: '', phone: '' });
    const [editPlaceId, setEditPlaceId] = useState(null);
    const [expandedNotes, setExpandedNotes] = useState({});
    const [selectedMemberFilter, setSelectedMemberFilter] = useState(null);
    const [calendarVisible, setCalendarVisible] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 1));
    const [selectedDayVisits, setSelectedDayVisits] = useState(null);
    const [selectedDayTitle, setSelectedDayTitle] = useState('');
    const [selectedDayRawDate, setSelectedDayRawDate] = useState('');
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
        if (error) console.error('Błąd pobierania wizyt:', error);
        else setVisits(data || []);
        setLoadingVisits(false);
    };

    const fetchPlaces = async () => {
        const { data, error } = await supabase.from('saved_places').select('*').order('name', { ascending: true });
        if (error) console.error('Błąd pobierania miejsc:', error);
        else setSavedPlaces(data || []);
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
            if (error) alert('Błąd aktualizacji miejsca: ' + error.message);
            else {
                setNewPlace({ name: '', address: '', phone: '' });
                setEditPlaceId(null);
                fetchPlaces();
            }
        } else {
            const { error } = await supabase.from('saved_places').insert([newPlace]);
            if (error) alert('Błąd zapisu miejsca: ' + error.message);
            else {
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
        if (error) alert('Błąd usuwania miejsca: ' + error.message);
        else {
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
        setSelectedMemberFilter(selectedMemberFilter === key ? null : key);
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

        // Przygotowanie wartości daty do maila
        const dateForEmail = isMultiDay
            ? `${formData.startDate} do ${formData.endDate}`
            : formData.date;

        try {
            if (editId) {
                const { error } = await supabase.from('visits').update(payload).eq('id', editId);
                if (error) throw error;

                // WYŚLIJ MAIL: DODANIE
                await fetch('/api/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'updated',
                        doctor: payload.doctor,
                        date: dateForEmail,
                        time: payload.time,
                        memberKey: memberNames[payload.member_key],
                        location: payload.location,
                        notes: payload.notes,
                        cost: payload.cost // <-- dodane
                    })
                });

            } else {
                const { error } = await supabase.from('visits').insert([payload]);
                if (error) throw error;

                await fetch('/api/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'created',
                        doctor: payload.doctor,
                        date: dateForEmail,
                        time: payload.time,
                        memberKey: memberNames[payload.member_key],
                        location: payload.location,
                        notes: payload.notes,
                        cost: payload.cost
                    })
                });
            }
            closeForm();
            fetchVisits();
        } catch (err) {
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
            memberKey: 'mom', doctor: '', date: `${dateStr}T09:00`,
            startDate: dateStr, endDate: dateStr, location: '', street: '',
            postalCode: '', city: '', phone: '', cost: '', notes: ''
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

        // Automatyczne przewinięcie do góry strony
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditId(null);
    };

    const handleDelete = async (item) => {
        if (!window.confirm('Czy na pewno chcesz usunąć to wydarzenie?')) return;
        const { error } = await supabase.from('visits').delete().eq('id', item.id);
        if (error) {
            alert('Nie udało się usunąć: ' + error.message);
        } else {
            const dateForEmail = item.is_multi_day ? `${item.date} do ${item.end_date}` : item.date;

            try {
                await fetch('/api/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'deleted',
                        doctor: item.doctor,
                        date: dateForEmail,
                        time: item.time,
                        memberKey: memberNames[item.member_key],
                        cost: item.cost
                    })
                });
            } catch (mailErr) {
                console.error('Błąd wysyłania maila o usunięciu:', mailErr);
            }


            if (selectedDayVisits) setSelectedDayVisits(selectedDayVisits.filter(v => v.id !== item.id));
            fetchVisits();
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
            <header className="app-header">
                <div className="header-brand">
                    <div className="brand-logo"><span className="material-symbols-outlined">medical_services</span></div>
                    <div className="brand-text">
                        <h1>Planner by SG</h1>
                        <p>Nasz terminarz | Rodzina Gąsior</p>
                    </div>
                </div>
                <div className="header-actions desktop-only">
                    <button className="btn-app btn-secondary" onClick={() => setCalendarVisible(!calendarVisible)}>
                        <span className="material-symbols-outlined">calendar_month</span><span>Kalendarz</span>
                    </button>
                    <button className="btn-app btn-secondary" onClick={() => setIsPlacesModalOpen(true)}>
                        <span className="material-symbols-outlined">place</span><span>Miejsca</span>
                    </button>
                    <button className="btn-app btn-primary" onClick={openFormForAdd}>
                        <span className="material-symbols-outlined">add</span><span>Nowe wydarzenie</span>
                    </button>
                    <button className="btn-app btn-secondary" onClick={() => { fetchVisits(); fetchPlaces(); }}>
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
                        <form onSubmit={handleSavePlace} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
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
                                <button type="submit" className="btn-app btn-primary" style={{ flex: 1 }}>{editPlaceId ? 'Zapisz zmiany' : 'Dodaj miejsce'}</button>
                                {editPlaceId && <button type="button" className="btn-app btn-secondary" onClick={() => { setEditPlaceId(null); setNewPlace({ name: '', address: '', phone: '' }); }}>Anuluj</button>}
                            </div>
                        </form>
                        <div className="schedule-items-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {savedPlaces.map(p => (
                                <div key={p.id} className="schedule-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div><strong>{p.name}</strong><div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.address}</div></div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button className="action-icon-btn" onClick={() => handleEditPlaceClick(p)}><span className="material-symbols-outlined">edit</span></button>
                                        <button className="action-icon-btn" onClick={() => handleDeletePlace(p.id)} style={{ color: '#ef4444' }}><span className="material-symbols-outlined">delete</span></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* FAMILY GRID */}
            <section className="family-grid" style={{ gap: '8px', marginBottom: '15px' }}>
                {['mom', 'dad', 'child1', 'child2'].map((key) => {
                    const isSelected = selectedMemberFilter === key;
                    return (
                        <div key={key} className={`member-card ${key} ${isSelected ? 'selected' : ''}`} onClick={() => handleMemberCardClick(key)} style={{ cursor: 'pointer', border: isSelected ? '2px solid var(--primary, #3b82f6)' : undefined, padding: '10px' }}>
                            <div className="member-avatar" style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}>{key === 'mom' ? 'N' : key === 'dad' ? 'S' : key === 'child1' ? 'K' : 'E'}</div>
                            <div className="member-info">
                                <span className="member-name" style={{ fontSize: '0.85rem' }}>{memberNames[key]}</span>
                                <span className="member-status" style={{ fontSize: '0.7rem' }}>{visits.filter(v => v.member_key === key).length} zaplanowanych</span>
                            </div>
                        </div>
                    );
                })}
            </section>

            {/* KALENDARZ */}
            {calendarVisible && (
                <section className="calendar-section visible" style={{ marginBottom: '15px' }}>
                    <div className="glass-card" style={{ padding: '12px' }}>
                        <div className="calendar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '4px' }}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <button className="icon-btn" onClick={() => setCurrentDate(new Date(year - 1, month, 1))} title="Poprzedni rok">
                                    <span className="material-symbols-outlined">keyboard_double_arrow_left</span>
                                </button>
                                <button className="icon-btn" onClick={() => setCurrentDate(new Date(year, month - 1, 1))} title="Poprzedni miesiąc">
                                    <span className="material-symbols-outlined">chevron_left</span>
                                </button>
                            </div>

                            <h2 className="month-title" style={{ fontSize: '0.95rem', textAlign: 'center' }}>{monthNamesPL[month]} {year}</h2>

                            <div style={{ display: 'flex', gap: '4px' }}>
                                <button className="icon-btn" onClick={() => setCurrentDate(new Date(year, month + 1, 1))} title="Następny miesiąc">
                                    <span className="material-symbols-outlined">chevron_right</span>
                                </button>
                                <button className="icon-btn" onClick={() => setCurrentDate(new Date(year + 1, month, 1))} title="Następny rok">
                                    <span className="material-symbols-outlined">keyboard_double_arrow_right</span>
                                </button>
                            </div>
                        </div>
                        <div className="calendar-grid-header" style={{ fontSize: '0.75rem', marginBottom: '5px' }}>
                            <span>Pn</span><span>Wt</span><span>Śr</span><span>Cz</span><span>Pt</span><span>So</span><span>Nd</span>
                        </div>
                        <div className="calendar-days-grid" style={{ gap: '2px' }}>
                            {Array.from({ length: firstDayIndex }).map((_, i) => (
                                <div key={`prev-${i}`} className="cal-day-cell disabled" style={{ minHeight: '36px' }}><span style={{ fontSize: '0.75rem' }}>{prevMonthDays - firstDayIndex + i + 1}</span></div>
                            ))}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const visitsForDay = filteredVisits.filter(v => v.is_multi_day ? (formattedDate >= v.date && formattedDate <= v.end_date) : v.date === formattedDate);
                                return (
                                    <div key={day} className="cal-day-cell" onClick={() => handleDayClick(day, visitsForDay, formattedDate)} style={{ minHeight: '36px', padding: '2px' }}>
                                        <span style={{ fontSize: '0.8rem' }}>{day}</span>
                                        {visitsForDay.length > 0 && <div className="count-badge" style={{ fontSize: '0.65rem' }}>{visitsForDay.length}</div>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* PANEL WYBRANEGO DNIA Z KALENDARZA */}
            {selectedDayVisits && (
                <section className="glass-card" style={{ marginBottom: '15px', padding: '12px', background: 'var(--surface-subtle, #f1f5f9)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{selectedDayTitle}</h3>
                        <button type="button" className="icon-btn-close" onClick={() => setSelectedDayVisits(null)} style={{ fontSize: '1.2rem', background: 'none', border: 'none', cursor: 'pointer' }}>&times;</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {selectedDayVisits.length === 0 ? (
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Brak zaplanowanych wydarzeń w tym dniu.</p>
                        ) : (
                            selectedDayVisits.map(item => (
                                <div key={item.id} style={{ background: 'white', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <span className={`badge-tag ${item.member_key}`} style={{ fontSize: '0.6rem', padding: '1px 4px', display: 'inline-block', marginBottom: '2px' }}>{memberNames[item.member_key]}</span>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{item.doctor}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.is_multi_day ? 'Wielodniowe' : item.time} {item.location ? `• ${item.location}` : ''}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button className="action-icon-btn" onClick={() => openFormForEdit(item)} style={{ width: '28px', height: '28px' }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '0.95rem' }}>edit</span>
                                        </button>
                                        <button className="action-icon-btn" onClick={() => handleDelete(item)} style={{ width: '28px', height: '28px', color: '#ef4444' }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '0.95rem' }}>delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                        <button
                            className="btn-app btn-primary btn-full"
                            style={{ marginTop: '6px', fontSize: '0.8rem', padding: '8px' }}
                            onClick={() => openFormForDate(selectedDayRawDate)}
                        >
                            + Dodaj wydarzenie na ten dzień
                        </button>
                    </div>
                </section>
            )}

            {/* FORMULARZ (DRAWER) */}
            <section className={`form-drawer ${isFormOpen ? 'open' : ''}`}>
                <div className="glass-card form-card">
                    <div className="form-card-header">
                        <h3>{editId ? 'Edytuj wydarzenie' : 'Zaplanuj wydarzenie'}</h3>
                        <button type="button" className="icon-btn-close" onClick={closeForm}>&times;</button>
                    </div>
                    <form className="app-form" onSubmit={handleFormSubmit}>
                        <div className="form-grid">
                            <div className="input-group">
                                <label>Uczestnik</label>
                                <select value={formData.memberKey} onChange={e => setFormData({ ...formData, memberKey: e.target.value })}>
                                    <option value="mom">Nataliia</option><option value="dad">Sebastian</option><option value="child1">Kamila</option><option value="child2">Emilia</option><option value="all">Wszyscy</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Nazwa wydarzenia</label>
                                <input type="text" required placeholder="np. Stomatolog" value={formData.doctor} onChange={e => setFormData({ ...formData, doctor: e.target.value })} />
                            </div>
                            <div className="input-group span-2 checkbox-group">
                                <label className="switch-label"><input type="checkbox" checked={isMultiDay} onChange={e => setIsMultiDay(e.target.checked)} /><span>Wydarzenie wielodniowe</span></label>
                            </div>
                            {!isMultiDay ? (
                                <div className="input-group span-2"><label>Data i godzina</label><input type="datetime-local" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} /></div>
                            ) : (
                                <>
                                    <div className="input-group"><label>Data początkowa</label><input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} /></div>
                                    <div className="input-group"><label>Data końcowa</label><input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} /></div>
                                </>
                            )}
                            <div className="input-group span-2">
                                <label>Wybierz zapisane miejsce</label>
                                <select onChange={handleSelectPlaceChange} defaultValue="">
                                    <option value="">-- Wybierz z listy --</option>
                                    {savedPlaces.map(p => <option key={p.id} value={p.name}>{p.name} ({p.address})</option>)}
                                </select>
                            </div>
                            <div className="input-group span-2"><label>Miejsce i adres</label><input type="text" placeholder="np. ul. Przykładowa 1" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} /></div>
                            <div className="input-group"><label>Telefon</label><input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
                            <div className="input-group"><label>Koszt (zł)</label><input type="number" step="0.01" value={formData.cost} onChange={e => setFormData({ ...formData, cost: e.target.value })} /></div>
                            <div className="input-group span-2">
                                <label>Komentarz / Notatka</label>
                                <textarea rows="3" placeholder="Dodatkowe informacje..." value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-actions">
                            <button type="submit" disabled={isSubmitting} className="btn-app btn-primary btn-full">{isSubmitting ? 'Zapisywanie...' : (editId ? 'Zapisz zmiany' : 'Dodaj wydarzenie')}</button>
                        </div>
                    </form>
                </div>
            </section>

            {/* TIMELINE LIST */}
            <section className="timeline-section">
                <div className="section-title-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h2 style={{ fontSize: '0.95rem' }}>{selectedMemberFilter ? `Wydarzenia: ${memberNames[selectedMemberFilter]}` : 'Najbliższe wydarzenia'}</h2>
                    {selectedMemberFilter && <button onClick={() => setSelectedMemberFilter(null)} style={{ background: 'none', border: 'none', color: 'var(--primary, #3b82f6)', cursor: 'pointer', fontSize: '0.75rem' }}>Pokaż wszystkich</button>}
                </div>

                {loadingVisits ? (
                    <p style={{ fontSize: '0.85rem' }}>Wczytywanie wydarzeń...</p>
                ) : filteredVisits.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Brak zaplanowanych wydarzeń.</p>
                ) : (
                    <div className="timeline-list">
                        {filteredVisits.map((item) => {
                            const isExpanded = !!expandedNotes[item.id];
                            return (
                                <div key={item.id} className={`appointment-card tag-${item.member_key}`}>
                                    {/* Górny rząd: Data, Tytuł, Cena oraz ikony po prawej */}
                                    <div className="appointment-header-desktop">
                                        <div className="appointment-time-badge">
                                            <span style={{ fontSize: '0.8rem', display: 'block', fontWeight: 'bold' }}>{item.is_multi_day ? 'Wielodniowe' : item.time}</span>
                                            <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block' }}>{item.date}</span>
                                        </div>

                                        <div className="appointment-main-content">
                                            <span className={`badge-tag ${item.member_key}`} style={{ fontSize: '0.65rem', padding: '2px 6px', marginBottom: '2px', display: 'inline-block' }}>{memberNames[item.member_key]}</span>
                                            <h4 style={{ fontSize: '0.95rem', margin: 0, wordBreak: 'break-word' }}>{item.doctor}</h4>
                                        </div>

                                        <div className="appointment-right-actions">
                                            <div className="appointment-cost">
                                                {!item.cost || item.cost === 0 ? '0 zł' : `${item.cost} zł`}
                                            </div>
                                            <div className="action-buttons-column">
                                                <button className="action-icon-btn" onClick={() => openFormForEdit(item)} title="Edytuj" style={{ padding: '4px' }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>edit</span>
                                                </button>
                                                <button className="action-icon-btn" onClick={() => handleDelete(item)} title="Usuń" style={{ color: '#ef4444', padding: '4px' }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Środek: lokalizacja i telefon */}
                                    <div className="appointment-details-section">
                                        {item.location && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: '#94a3b8' }}>location_on</span>
                                                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
                                                    <strong>{item.location}</strong>
                                                </a>
                                            </div>
                                        )}
                                        {item.phone && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: '#94a3b8' }}>call</span>
                                                <a href={`tel:${item.phone}`} className="phone-link">{item.phone}</a>
                                            </div>
                                        )}
                                    </div>

                                    {/* Dół karty: notatka lub informacja o braku */}
                                    <div className="appointment-footer-note">
                                        <button
                                            className="note-toggle-btn"
                                            onClick={() => item.notes && toggleNoteExpansion(item.id)}
                                            style={{ color: item.notes ? 'var(--text-muted, #94a3b8)' : 'rgba(148, 163, 184, 0.5)', cursor: item.notes ? 'pointer' : 'default', fontStyle: item.notes ? 'normal' : 'italic' }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '0.85rem' }}>comment</span>
                                            <span>{item.notes ? (isExpanded ? 'Ukryj notatkę' : 'Pokaż notatkę') : 'Brak notatek'}</span>
                                        </button>

                                        {isExpanded && item.notes && (
                                            <div style={{ marginTop: '6px', padding: '8px', background: 'rgba(0,0,0,0.02)', borderRadius: '6px', fontSize: '0.8rem', borderLeft: '2px solid var(--primary, #3b82f6)' }}>
                                                {item.notes}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* MOBILNE DOLNE MENU */}
            <nav className="mobile-bottom-nav mobile-only">
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
                <button className="mobile-nav-btn" onClick={() => { fetchVisits(); fetchPlaces(); }}>
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