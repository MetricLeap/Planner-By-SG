'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login({ onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setErrorMsg('Niepoprawny e-mail lub hasło.');
            setLoading(false);
        } else {
            onLoginSuccess(data.session);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '24px' }}>
            <div className="glass-card" style={{
                width: '100%',
                maxWidth: '420px',
                padding: '40px 32px',
                borderRadius: '24px',
                boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.07)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
                {/* Logo i Nagłówek */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div className="brand-logo" style={{ margin: '0 auto 16px' }}>
                        <span className="material-symbols-outlined">medical_services</span>
                    </div>

                    <h2 style={{ fontSize: '26px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px', letterSpacing: '-0.5px' }}>
                        Planner By SG
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
                        Zaloguj się, aby uzyskać dostęp do terminarza
                    </p>
                </div>

                {/* Formularz */}
                <form onSubmit={handleLogin} className="app-form" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Pole Email */}
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label className="form-label" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                            E-mail
                        </label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span className="material-symbols-outlined" style={{
                                position: 'absolute',
                                left: '14px',
                                fontSize: '20px',
                                color: 'var(--text-muted)',
                                pointerEvents: 'none'
                            }}>
                                mail
                            </span>
                            <input
                                type="email"
                                className="form-control"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="rodzina@example.com"
                                style={{
                                    width: '100%',
                                    padding: '12px 14px 12px 44px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(0, 0, 0, 0.1)',
                                    outline: 'none',
                                    fontSize: '14px',
                                    color: 'var(--text-main)',
                                    transition: 'all 0.2s ease'
                                }}
                            />
                        </div>
                    </div>

                    {/* Pole Hasło */}
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label className="form-label" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                            Hasło
                        </label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span className="material-symbols-outlined" style={{
                                position: 'absolute',
                                left: '14px',
                                fontSize: '20px',
                                color: 'var(--text-muted)',
                                pointerEvents: 'none'
                            }}>
                                lock
                            </span>
                            <input
                                type="password"
                                className="form-control"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                style={{
                                    width: '100%',
                                    padding: '12px 14px 12px 44px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(0, 0, 0, 0.1)',
                                    outline: 'none',
                                    fontSize: '14px',
                                    color: 'var(--text-main)',
                                    transition: 'all 0.2s ease'
                                }}
                            />
                        </div>
                    </div>

                    {/* Komunikat o błędzie */}
                    {errorMsg && (
                        <div style={{
                            color: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '10px',
                            padding: '10px 14px',
                            fontSize: '13px',
                            textAlign: 'center',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                        }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
                            {errorMsg}
                        </div>
                    )}

                    {/* Przycisk */}
                    <button
                        type="submit"
                        className="btn-app btn-primary"
                        disabled={loading}
                        style={{
                            width: '100%',
                            marginTop: '8px',
                            padding: '12px 20px',
                            borderRadius: '12px',
                            fontWeight: '600',
                            fontSize: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'transform 0.1s ease, filter 0.2s ease'
                        }}
                    >
                        {loading ? 'Logowanie...' : 'Zaloguj się'}
                    </button>
                </form>
            </div>
        </div>
    );
}