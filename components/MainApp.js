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

    // Stan filtrowania po uzytkowniku
    const [selectedMemberFilter, setSelectedMemberFilter] = useState(null);

    // Stan Kalendarza
    const [calendarVisible, setCalendarVisible] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 1));
    const [selectedDayVisits, setSelectedDayVisits] = useState(null);
    const [selectedDayTitle, setSelectedDayTitle] = useState('');

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
        cost: ''
    });

    // Stan ładowania formularza
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch danych z Supabase
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

    useEffect(() => {
        fetchVisits();
    }, []);

    // Obsługa kliknięcia w kafelek członka rodziny
    const handleMemberCardClick = (key) => {
        if (selectedMemberFilter === key) {
            setSelectedMemberFilter(null); // drugie kliknięcie - resetujemy filtr
        } else {
            setSelectedMemberFilter(key); // pierwsze kliknięcie - filtrujemy po wybranym
        }
    };

    // Przefiltrowana lista wizyt na podstawie wybranego kafelka
    const filteredVisits = selectedMemberFilter
        ? visits.filter(v => v.member_key === selectedMemberFilter)
        : visits;

    // Obsługa formularza (dodawanie / edycja)
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
            notes: ''
        };

        try {
            if (editId) {
                const { error } = await supabase.from('visits').update(payload).eq('id', editId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('visits').insert([payload]);
                if (error) throw error;

                // Wywołanie API do wysyłki e-maila po dodaniu nowego wpisu
                fetch('/api/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        doctor: payload.doctor,
                        memberName: memberNames[payload.member_key],
                        date: payload.date,
                        time: payload.time,
                        location: payload.location,
                        cost: payload.cost,
                    }),
                })
                    .then(res => res.json())
                    .then(data => console.log('Odpowiedź z Resend:', data))
                    .catch((err) => console.error('Błąd wysyłania e-maila:', err));
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
            location: '', street: '', postalCode: '', city: '', phone: '', cost: ''
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
            cost: item.cost || ''
        });
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditId(null);
    };

    // Funkcja usuwania wydarzenia z bazy Supabase
    const handleDelete = async (item) => {
        const confirmed = window.confirm('Czy na pewno chcesz usunąć to wydarzenie?');
        if (!confirmed) return;

        try {
            // 1. Usunięcie z bazy Supabase
            const { error } = await supabase.from('visits').delete().eq('id', item.id);
            if (error) throw error;

            // 2. Wysłanie powiadomienia e-mail o usunięciu
            fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    doctor: item.doctor,
                    memberName: memberNames[item.member_key],
                    date: item.date,
                    time: item.time,
                    location: item.location,
                    type: 'delete'
                }),
            })
                .then(res => res.json())
                .then(data => console.log('Odpowiedź Resend (usuwanie):', data))
                .catch(err => console.error('Błąd wysyłania e-maila o usunięciu:', err));

            if (selectedDayVisits) {
                setSelectedDayVisits(selectedDayVisits.filter(v => v.id !== item.id));
            }

            fetchVisits();
        } catch (err) {
            console.error('Błąd usuwania:', err);
            alert('Nie udało się usunąć wydarzenia: ' + err.message);
        }
    };

    // Logika Kalendarza
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const handleDayClick = (day, visitsForDay) => {
        setSelectedDayTitle(`Plan dnia: ${day} ${monthNamesPL[month]} ${year}`);
        setSelectedDayVisits(visitsForDay);
    };

    return (
        <div className="app-shell">
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
                    <button className="btn-app btn-primary" onClick={openFormForAdd}>
                        <span className="material-symbols-outlined">add</span>
                        <span>Nowe wydarzenie</span>
                    </button>
                    <button className="btn-app btn-secondary" onClick={() => supabase.auth.signOut()}>
                        <span className="material-symbols-outlined">logout</span>
                    </button>
                </div>
            </header>

            {/* FAMILY GRID */}
            <section className="family-grid">
                {['mom', 'dad', 'child1', 'child2'].map((key) => {
                    const isSelected = selectedMemberFilter === key;
                    return (
                        <div
                            key={key}
                            className={`member-card ${key} ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleMemberCardClick(key)}
                            style={{ cursor: 'pointer', border: isSelected ? '2px solid var(--primary, #3b82f6)' : undefined }}
                        >
                            <div className="member-avatar">{key === 'mom' ? 'M' : key === 'dad' ? 'T' : key === 'child1' ? 'C1' : 'C2'}</div>
                            <div className="member-info">
                                <span className="member-name">{memberNames[key]}</span>
                                <span className="member-status">
                                    {visits.filter(v => v.member_key === key).length} zaplanowanych
                                </span>
                            </div>
                        </div>
                    );
                })}
            </section>

            {/* KALENDARZ */}
            {calendarVisible && (
                <section className="calendar-section visible">
                    <div className="glass-card">
                        <div className="calendar-header">
                            <div className="calendar-nav">
                                <button className="icon-btn" onClick={() => setCurrentDate(new Date(year - 1, month, 1))}>
                                    <span className="material-symbols-outlined">first_page</span>
                                </button>
                                <button className="icon-btn" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>
                                    <span className="material-symbols-outlined">chevron_left</span>
                                </button>
                            </div>
                            <h2 className="month-title">{monthNamesPL[month]} {year}</h2>
                            <div className="calendar-nav">
                                <button className="icon-btn" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>
                                    <span className="material-symbols-outlined">chevron_right</span>
                                </button>
                                <button className="icon-btn" onClick={() => setCurrentDate(new Date(year + 1, month, 1))}>
                                    <span className="material-symbols-outlined">last_page</span>
                                </button>
                            </div>
                        </div>

                        <div className="calendar-grid-header">
                            <span>Pn</span><span>Wt</span><span>Śr</span><span>Cz</span><span>Pt</span><span>So</span><span>Nd</span>
                        </div>

                        <div className="calendar-days-grid">
                            {Array.from({ length: firstDayIndex }).map((_, i) => (
                                <div key={`prev-${i}`} className="cal-day-cell disabled">
                                    <span>{prevMonthDays - firstDayIndex + i + 1}</span>
                                </div>
                            ))}

                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const visitsForDay = filteredVisits.filter(v => v.is_multi_day ? (formattedDate >= v.date && formattedDate <= v.end_date) : v.date === formattedDate);

                                return (
                                    <div key={day} className="cal-day-cell" onClick={() => handleDayClick(day, visitsForDay)}>
                                        <span>{day}</span>
                                        {visitsForDay.length > 0 && <div className="count-badge">{visitsForDay.length}</div>}
                                    </div>
                                );
                            })}
                        </div>

                        {/* PANEL DNIOWY */}
                        {selectedDayVisits && (
                            <div className="day-schedule-panel">
                                <div className="schedule-header">
                                    <h4>{selectedDayTitle}</h4>
                                    <button className="icon-btn-close" onClick={() => setSelectedDayVisits(null)}>&times;</button>
                                </div>
                                <div className="schedule-items-list">
                                    {selectedDayVisits.length === 0 ? (
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Brak wydarzeń na ten dzień.</div>
                                    ) : (
                                        selectedDayVisits.map(v => (
                                            <div key={v.id} className="schedule-item">
                                                <div>
                                                    <strong>{v.doctor}</strong>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                        {memberNames[v.member_key]} {v.location ? `• ${v.location}` : ''}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <button className="action-icon-btn" onClick={() => openFormForEdit(v)}>
                                                        <span className="material-symbols-outlined">edit</span>
                                                    </button>
                                                    <button className="action-icon-btn" onClick={() => handleDelete(v)} style={{ color: '#ef4444' }}>
                                                        <span className="material-symbols-outlined">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
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
                                <label>Uczestnik / Pacjent</label>
                                <select value={formData.memberKey} onChange={e => setFormData({ ...formData, memberKey: e.target.value })}>
                                    <option value="mom">Nataliia</option>
                                    <option value="dad">Sebastian</option>
                                    <option value="child1">Kamila</option>
                                    <option value="child2">Emilia</option>
                                    <option value="all">Wszyscy</option>
                                </select>
                            </div>

                            <div className="input-group">
                                <label>Nazwa wydarzenia</label>
                                <input type="text" required placeholder="np. Stomatolog" value={formData.doctor} onChange={e => setFormData({ ...formData, doctor: e.target.value })} />
                            </div>

                            <div className="input-group span-2 checkbox-group">
                                <label className="switch-label">
                                    <input type="checkbox" checked={isMultiDay} onChange={e => setIsMultiDay(e.target.checked)} />
                                    <span>Wydarzenie wielodniowe</span>
                                </label>
                            </div>

                            {!isMultiDay ? (
                                <div className="input-group span-2">
                                    <label>Data i godzina</label>
                                    <input type="datetime-local" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                                </div>
                            ) : (
                                <>
                                    <div className="input-group">
                                        <label>Data początkowa</label>
                                        <input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                                    </div>
                                    <div className="input-group">
                                        <label>Data końcowa</label>
                                        <input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
                                    </div>
                                </>
                            )}

                            <div className="input-group span-2">
                                <label>Miejsce i adres</label>
                                <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label>Telefon</label>
                                <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label>Koszt (zł)</label>
                                <input type="number" step="0.01" value={formData.cost} onChange={e => setFormData({ ...formData, cost: e.target.value })} />
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="submit" disabled={isSubmitting} className="btn-app btn-primary btn-full">
                                {isSubmitting ? (
                                    <span className="btn-loading-content">
                                        <span className="spinner"></span> Zapisywanie...
                                    </span>
                                ) : (
                                    editId ? 'Zapisz zmiany' : 'Zapisz w terminarzu'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </section>

            {/* TIMELINE LIST */}
            <section className="timeline-section">
                <div className="section-title-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>
                        {selectedMemberFilter
                            ? `Wydarzenia: ${memberNames[selectedMemberFilter]}`
                            : 'Nadchodzące wydarzenia i wizyty'}
                    </h2>
                    {selectedMemberFilter && (
                        <button
                            onClick={() => setSelectedMemberFilter(null)}
                            style={{ background: 'none', border: 'none', color: 'var(--primary, #3b82f6)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
                        >
                            Pokaż wszystkich
                        </button>
                    )}
                </div>

                {loadingVisits ? (
                    <p>Wczytywanie wydarzeń z bazy danych...</p>
                ) : filteredVisits.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>Brak zaplanowanych wydarzeń. Dodaj pierwsze!</p>
                ) : (
                    <div className="timeline-list">
                        {filteredVisits.Item ? filteredVisits.map((item) => (
                            <div key={item.id} className={`appointment-card tag-${item.member_key}`}>
                                <div className="appointment-time-badge">
                                    <span className="time-hour">{item.is_multi_day ? 'Wielodniowe' : item.time}</span>
                                    <span className="time-date">{item.date}</span>
                                </div>
                                <div className="appointment-main">
                                    <span className={`badge-tag ${item.member_key}`}>{memberNames[item.member_key]}</span>
                                    <h4>{item.doctor}</h4>
                                    <div className="appointment-details">
                                        {item.location && <div className="detail-line"><span className="material-symbols-outlined">location_on</span> <strong>{item.location}</strong></div>}
                                        {item.phone && <div className="detail-line"><span className="material-symbols-outlined">call</span> <a href={`tel:${item.phone}`} className="phone-link">{item.phone}</a></div>}
                                    </div>
                                </div>
                                <div className="appointment-meta">
                                    <span className={`cost-price ${!item.cost ? 'free' : ''}`}>
                                        {!item.cost || item.cost === 0 ? '0 zł' : `${item.cost} zł`}
                                    </span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="action-icon-btn" onClick={() => openFormForEdit(item)} title="Edytuj">
                                            <span className="material-symbols-outlined">edit</span>
                                        </button>
                                        <button className="action-icon-btn" onClick={() => handleDelete(item)} title="Usuń" style={{ color: '#ef4444' }}>
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )) : filteredVisits.map((item) => (
                            <div key={item.id} className={`appointment-card tag-${item.member_key}`}>
                                <div className="appointment-time-badge">
                                    <span className="time-hour">{item.is_multi_day ? 'Wielodniowe' : item.time}</span>
                                    <span className="time-date">{item.date}</span>
                                </div>
                                <div className="appointment-main">
                                    <span className={`badge-tag ${item.member_key}`}>{memberNames[item.member_key]}</span>
                                    <h4>{item.doctor}</h4>
                                    <div className="appointment-details">
                                        {item.location && <div className="detail-line"><span className="material-symbols-outlined">location_on</span> <strong>{item.location}</strong></div>}
                                        {item.phone && <div className="detail-line"><span className="material-symbols-outlined">call</span> <a href={`tel:${item.phone}`} className="phone-link">{item.phone}</a></div>}
                                    </div>
                                </div>
                                <div className="appointment-meta">
                                    <span className={`cost-price ${!item.cost ? 'free' : ''}`}>
                                        {!item.cost || item.cost === 0 ? '0 zł' : `${item.cost} zł`}
                                    </span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="action-icon-btn" onClick={() => openFormForEdit(item)} title="Edytuj">
                                            <span className="material-symbols-outlined">edit</span>
                                        </button>
                                        <button className="action-icon-btn" onClick={() => handleDelete(item)} title="Usuń" style={{ color: '#ef4444' }}>
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* PRZYPIĘTE MENU DOLNE DLA MOBILES */}
            <nav className="mobile-bottom-nav">
                <button className="mobile-nav-btn" onClick={() => setCalendarVisible(!calendarVisible)}>
                    <span className="material-symbols-outlined">calendar_month</span>
                    <span>Kalendarz</span>
                </button>
                <button className="mobile-nav-btn primary" onClick={openFormForAdd}>
                    <span className="material-symbols-outlined">add</span>
                </button>
                <button className="mobile-nav-btn" onClick={() => supabase.auth.signOut()}>
                    <span className="material-symbols-outlined">logout</span>
                    <span>Wyloguj</span>
                </button>
            </nav>
        </div>
    );
}