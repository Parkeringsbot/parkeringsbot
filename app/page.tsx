'use client'

import React, { useState, useEffect } from 'react'
import { isSupabaseConfigured, supabase, ParkingFine } from '@/lib/supabase'
import styles from './page.module.css'

interface User {
  id: string
  email: string
  phone: string
  name: string
  license_plate: string
}

interface PaymentRecord {
  id: string
  fine_id: number
  amount: number
  status: string
  paid_at: string
}

interface Notification {
  id: string
  type: string
  subject?: string
  message: string
  sent_at: string
  status: string
}

interface Appeal {
  id: string
  fine_id: number
  category: string
  reason: string
  files: string[]
  status: string
  created_at: string
}

export default function Home() {
  const [screen, setScreen] = useState<'bankid' | 'dashboard' | 'admin' | 'profile' | 'history' | 'appeals'>('bankid')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [fines, setFines] = useState<ParkingFine[]>([])
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [appeals, setAppeals] = useState<Appeal[]>([])
  const [searchError, setSearchError] = useState('')
  const [language, setLanguage] = useState<'no' | 'en'>('no')
  const [darkMode, setDarkMode] = useState(false)
  const [showPaymentDetails, setShowPaymentDetails] = useState(false)
  const [selectedFineForAppeal, setSelectedFineForAppeal] = useState<number | null>(null)
  const [appealStep, setAppealStep] = useState<1 | 2 | 3>(1)
  const [appealCategory, setAppealCategory] = useState('')
  const [appealReason, setAppealReason] = useState('')
  const [appealFiles, setAppealFiles] = useState<string[]>([])

  // BankID Mock Login State
  const [bankidForm, setBankidForm] = useState({
    name: '',
    email: '',
    phone: '',
    licensePlate: '',
    password: '',
    confirmPassword: '',
    isNewUser: false,
  })

  const demoFines: ParkingFine[] = [
    {
      id: 1,
      license_plate: 'AB12345',
      amount: 900,
      date: '2026-09-12',
      time: '14:30',
      location: 'Storgata 12',
      municipality: 'Oslo kommune',
      paid: false,
      created_at: '2026-09-12T14:30:00Z',
    },
    {
      id: 2,
      license_plate: 'AB12345',
      amount: 660,
      date: '2026-08-21',
      time: '09:15',
      location: 'Karl Johans gate 8',
      municipality: 'Oslo kommune',
      paid: true,
      created_at: '2026-08-21T09:15:00Z',
    },
    {
      id: 3,
      license_plate: 'CD98765',
      amount: 750,
      date: '2026-09-05',
      time: '11:45',
      location: 'Bryggen',
      municipality: 'Bergen kommune',
      paid: false,
      created_at: '2026-09-05T11:45:00Z',
    },
  ]

  const translations = {
    no: {
      title: 'Parkeringsbot',
      subtitle: 'Administrer dine parkingsbøter',
      bankidLogin: 'BankID-innlogging',
      email: 'E-post',
      phone: 'Telefonnummer',
      name: 'Navn',
      licensePlate: 'Registreringsnummer',
      password: 'Passord',
      confirmPassword: 'Bekreft passord',
      login: 'Logg inn',
      register: 'Registrer ny bruker',
      logout: 'Logg ut',
      myFines: 'Mine parkingsbøter',
      totalAmount: 'Totalt beløp',
      unpaid: 'Ubetalt',
      noFines: 'Ingen parkingsbøter funnet',
      payNow: 'Betale nå',
      paid: 'Betalt',
      status: 'Status',
      paymentHistory: 'Betalingshistorikk',
      notifications: 'Notifikasjoner',
      appeals: 'Ankesaker',
      appealFine: 'Anke bot',
      reason: 'Grunn',
      submit: 'Send',
      profile: 'Profil',
      settings: 'Innstillinger',
      language: 'Språk',
      darkMode: 'Mørk modus',
      admin: 'Administrator',
      adminPanel: 'Admin-panel',
      statistics: 'Statistikk',
      totalUsers: 'Totalt brukere',
      totalFines: 'Totalt bøter',
      totalRevenue: 'Totalt inntekt',
      recentPayments: 'Nylige betalinger',
      error: 'Feil',
      success: 'Suksess',
      installments: 'Betale i avdrag',
      numberOfPayments: 'Antall avdrag',
      monthlyAmount: 'Månedlig beløp',
      setupInstallment: 'Sett opp avdrag',
    },
    en: {
      title: 'Parkingsbot',
      subtitle: 'Manage your parking fines',
      bankidLogin: 'BankID Login',
      email: 'Email',
      phone: 'Phone Number',
      name: 'Name',
      licensePlate: 'License Plate',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      login: 'Login',
      register: 'Register',
      logout: 'Logout',
      myFines: 'My Parking Fines',
      totalAmount: 'Total Amount',
      unpaid: 'Unpaid',
      noFines: 'No parking fines found',
      payNow: 'Pay Now',
      paid: 'Paid',
      status: 'Status',
      paymentHistory: 'Payment History',
      notifications: 'Notifications',
      appeals: 'Appeals',
      appealFine: 'Appeal Fine',
      reason: 'Reason',
      submit: 'Submit',
      profile: 'Profile',
      settings: 'Settings',
      language: 'Language',
      darkMode: 'Dark Mode',
      admin: 'Administrator',
      adminPanel: 'Admin Panel',
      statistics: 'Statistics',
      totalUsers: 'Total Users',
      totalFines: 'Total Fines',
      totalRevenue: 'Total Revenue',
      recentPayments: 'Recent Payments',
      error: 'Error',
      success: 'Success',
      installments: 'Pay in Installments',
      numberOfPayments: 'Number of Payments',
      monthlyAmount: 'Monthly Amount',
      setupInstallment: 'Setup Installment',
    },
  }

  const t = translations[language]

  // Mock BankID Login Handler
  const handleBankIDLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!bankidForm.email || !bankidForm.phone || !bankidForm.name || !bankidForm.licensePlate) {
      setSearchError(t.error + ': ' + 'Alle felt må fylles ut')
      return
    }

    if (!bankidForm.isNewUser && !bankidForm.password) {
      setSearchError(t.error + ': ' + 'Passord er påkrevd')
      return
    }

    if (bankidForm.isNewUser && bankidForm.password !== bankidForm.confirmPassword) {
      setSearchError(t.error + ': ' + 'Passordene stemmer ikke')
      return
    }

    // Mock user object
    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      email: bankidForm.email,
      phone: bankidForm.phone,
      name: bankidForm.name,
      license_plate: bankidForm.licensePlate.toUpperCase(),
    }

    setCurrentUser(user)
    await loadUserData(user)
    setScreen('dashboard')
    setBankidForm({
      name: '',
      email: '',
      phone: '',
      licensePlate: '',
      password: '',
      confirmPassword: '',
      isNewUser: false,
    })
    setSearchError('')
  }

  const loadUserData = async (user: User) => {
    // Load demo fines for the user
    const userFines = demoFines.filter((fine) => fine.license_plate === user.license_plate)
    setFines(userFines)

    // Mock payment history
    const mockPaymentHistory: PaymentRecord[] = [
      {
        id: '1',
        fine_id: 2,
        amount: 660,
        status: 'completed',
        paid_at: '2026-08-25T10:00:00Z',
      },
    ]
    setPaymentHistory(mockPaymentHistory)

    // Mock notifications
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'email',
        subject: 'Betaling bekreftet',
        message: 'Din betaling på kr 660 er bekreftet',
        sent_at: '2026-08-25T10:05:00Z',
        status: 'sent',
      },
      {
        id: '2',
        type: 'sms',
        message: 'Påminnelse: Du har 1 ubetalt parkingsbot',
        sent_at: '2026-09-15T09:00:00Z',
        status: 'sent',
      },
    ]
    setNotifications(mockNotifications)
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setFines([])
    setPaymentHistory([])
    setNotifications([])
    setAppeals([])
    setScreen('bankid')
  }

  const handleAdminLogin = async () => {
    const correctPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123'
    if (adminPassword === correctPassword) {
      setIsAdmin(true)
      setScreen('admin')
      setAdminPassword('')
    } else {
      setSearchError(t.error + ': ' + 'Feil passord')
    }
  }

  const handlePayFine = async (fineId: number) => {
    const fine = fines.find((f) => f.id === fineId)
    if (!fine) return

    try {
      const response = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fineId,
          amount: fine.amount,
          userEmail: currentUser?.email,
        }),
      })

      const data = await response.json()

      if (data.success && data.redirectUrl) {
        window.location.href = data.redirectUrl
      } else {
        setSearchError(t.error + ': ' + 'Kunne ikke initiere betaling')
      }
    } catch (err) {
      console.error('Payment initiation error:', err)
      setSearchError(t.error + ': ' + 'Feil ved betaling')
    }
  }

  const handleAppealSubmit = (fineId: number) => {
    if (!appealCategory) {
      setSearchError(t.error + ': ' + 'Velg en grunn')
      return
    }

    const newAppeal: Appeal = {
      id: Math.random().toString(36).substr(2, 9),
      fine_id: fineId,
      category: appealCategory,
      reason: appealReason,
      files: appealFiles,
      status: 'pending',
      created_at: new Date().toISOString(),
    }

    setAppeals([...appeals, newAppeal])
    setSelectedFineForAppeal(null)
    setAppealStep(1)
    setAppealCategory('')
    setAppealReason('')
    setAppealFiles([])

    // Mock notification
    const mockNotification: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'email',
      subject: 'Ankesak mottatt',
      message: `Din ankesak for bot ${fineId} er mottatt og vil bli vurdert innen 5 virkedager`,
      sent_at: new Date().toISOString(),
      status: 'sent',
    }
    setNotifications([...notifications, mockNotification])
    setAppealStep(3)
  }

  if (screen === 'bankid') {
    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : ''}`}>
        <div className={styles.loginBox}>
          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setLanguage(language === 'no' ? 'en' : 'no')}
              style={{
                padding: '8px 16px',
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {language === 'no' ? 'English' : 'Norsk'}
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              style={{
                padding: '8px 16px',
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>

          <h1>{t.title}</h1>
          <p className={styles.tagline}>{t.subtitle}</p>

          {/* BankID primary login */}
          <div style={{
            background: '#fff',
            border: '2px solid #e8e8e8',
            borderRadius: '12px',
            padding: '32px',
            marginBottom: '16px',
          }}>
            {/* BankID logo area */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                background: '#003087',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '20px',
                letterSpacing: '0.5px',
              }}>
                <span style={{ fontSize: '22px' }}>🔒</span>
                BankID
              </div>
              <p style={{ color: '#555', marginTop: '10px', fontSize: '14px' }}>
                {language === 'no' ? 'Logg inn sikkert med BankID' : 'Sign in securely with BankID'}
              </p>
            </div>

            <form onSubmit={handleBankIDLogin}>
              <div className={styles.formGroup}>
                <label>{t.name}</label>
                <input
                  type="text"
                  placeholder="f.eks. Ola Nordmann"
                  value={bankidForm.name}
                  onChange={(e) => setBankidForm({ ...bankidForm, name: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label>{t.phone}</label>
                <input
                  type="tel"
                  placeholder="98765432"
                  value={bankidForm.phone}
                  onChange={(e) => setBankidForm({ ...bankidForm, phone: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label>{t.email}</label>
                <input
                  type="email"
                  placeholder="ola@example.com"
                  value={bankidForm.email}
                  onChange={(e) => setBankidForm({ ...bankidForm, email: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label>{t.licensePlate}</label>
                <input
                  type="text"
                  placeholder="AB12345"
                  value={bankidForm.licensePlate}
                  onChange={(e) => setBankidForm({ ...bankidForm, licensePlate: e.target.value.toUpperCase() })}
                />
              </div>

              <div className={styles.formGroup}>
                <label>{t.password}</label>
                <input
                  type="password"
                  placeholder="BankID-kode"
                  value={bankidForm.password}
                  onChange={(e) => setBankidForm({ ...bankidForm, password: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#555' }}>
                  <input
                    type="checkbox"
                    checked={bankidForm.isNewUser}
                    onChange={(e) => setBankidForm({ ...bankidForm, isNewUser: e.target.checked })}
                  />
                  {t.register}
                </label>
              </div>

              {bankidForm.isNewUser && (
                <div className={styles.formGroup}>
                  <label>{t.confirmPassword}</label>
                  <input
                    type="password"
                    placeholder="Bekreft passord"
                    value={bankidForm.confirmPassword}
                    onChange={(e) => setBankidForm({ ...bankidForm, confirmPassword: e.target.value })}
                  />
                </div>
              )}

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#003087',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '0.3px',
                }}
              >
                {language === 'no' ? '🔒 Logg inn med BankID' : '🔒 Log in with BankID'}
              </button>
            </form>

            {searchError && <p className={styles.error}>{searchError}</p>}
          </div>

          {/* Discreet admin login */}
          <details style={{ marginTop: '8px' }}>
            <summary style={{ cursor: 'pointer', color: '#aaa', fontSize: '13px', textAlign: 'center', listStyle: 'none' }}>
              Admin
            </summary>
            <div style={{ marginTop: '12px', padding: '16px', background: '#f9f9f9', borderRadius: '8px' }}>
              <div className={styles.formGroup}>
                <input
                  type="password"
                  placeholder="Admin-passord"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
              </div>
              <button className={styles.btnSecondary} onClick={handleAdminLogin} style={{ width: '100%' }}>
                {t.admin}
              </button>
            </div>
          </details>
        </div>
      </div>
    )
  }

  if (screen === 'dashboard' && currentUser) {
    const totalAmount = fines.reduce((sum, f) => sum + f.amount, 0)
    const unpaidCount = fines.filter((f) => !f.paid).length

    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : ''}`}>
        <div className={styles.dashboard}>
          <div className={styles.header}>
            <div>
              <h1>{t.myFines}</h1>
              <p className={styles.subtitle}>{currentUser.name} • {currentUser.license_plate}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{currentUser.email} • {currentUser.phone}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              <button
                className={styles.btnLogout}
                onClick={() => setScreen('profile')}
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                {t.profile}
              </button>
              <button className={styles.btnLogout} onClick={handleLogout}>
                {t.logout}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              onClick={() => setScreen('dashboard')}
              style={{
                padding: '10px 20px',
                background: screen === 'dashboard' ? 'var(--accent)' : '#f0f0f0',
                color: screen === 'dashboard' ? 'white' : 'var(--text-primary)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {t.myFines}
            </button>
            <button
              onClick={() => setScreen('history')}
              style={{
                padding: '10px 20px',
                background: (screen as string) === 'history' ? 'var(--accent)' : '#f0f0f0',
                color: (screen as string) === 'history' ? 'white' : 'var(--text-primary)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {t.paymentHistory}
            </button>
            <button
              onClick={() => setScreen('appeals')}
              style={{
                padding: '10px 20px',
                background: (screen as string) === 'appeals' ? 'var(--accent)' : '#f0f0f0',
                color: (screen as string) === 'appeals' ? 'white' : 'var(--text-primary)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {t.appeals}
            </button>
          </div>

          <div className={styles.summary}>
            <div className={styles.summaryCard}>
              <p className={styles.summaryLabel}>{t.totalAmount}</p>
              <p className={styles.summaryValue}>kr {totalAmount}</p>
            </div>
            <div className={styles.summaryCard}>
              <p className={styles.summaryLabel}>{t.unpaid}</p>
              <p className={styles.summaryValue}>{unpaidCount}</p>
            </div>
          </div>

          {fines.length === 0 ? (
            <div className={styles.noFines}>
              <p>{t.noFines}</p>
            </div>
          ) : (
            <div className={styles.finesList}>
              {fines.map((fine) => (
                <div key={fine.id} className={styles.fineCard}>
                  <div className={styles.fineHeader}>
                    <div>
                      <p className={styles.fineAmount}>kr {fine.amount}</p>
                      <p className={styles.fineDate}>
                        {fine.date} kl. {fine.time}
                      </p>
                    </div>
                    <span
                      className={`${styles.status} ${fine.paid ? styles.paid : styles.unpaid}`}
                    >
                      {fine.paid ? t.paid : t.status}
                    </span>
                  </div>
                  <p className={styles.fineDetail}>{fine.location}</p>
                  <p className={styles.fineDetail}>{fine.municipality}</p>

                  {!fine.paid && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                      <button
                        className={styles.btnPay}
                        onClick={() => handlePayFine(fine.id)}
                        style={{ flex: 1 }}
                      >
                        {t.payNow}
                      </button>
                      <button
                        className={styles.btnSecondary}
                        onClick={() => setSelectedFineForAppeal(fine.id)}
                        style={{ flex: 1 }}
                      >
                        {t.appealFine}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {selectedFineForAppeal && appealStep !== 3 && (
            <div className={styles.fineCard} style={{ marginTop: '20px', background: 'var(--card-bg)' }}>
              {/* Step indicator */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', alignItems: 'center' }}>
                {[1,2].map(s => (
                  <React.Fragment key={s}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: appealStep >= s ? 'var(--accent)' : '#ddd',
                      color: appealStep >= s ? 'white' : '#666',
                      fontWeight: 'bold', fontSize: '13px'
                    }}>{s}</div>
                    {s < 2 && <div style={{ flex: 1, height: 2, background: appealStep > s ? 'var(--accent)' : '#ddd' }} />}
                  </React.Fragment>
                ))}
              </div>

              {/* Steg 1: Velg grunn */}
              {appealStep === 1 && (
                <>
                  <h3 style={{ marginBottom: '16px' }}>Hvorfor ønsker du å klage?</h3>
                  {[
                    'Jeg hadde betalt for parkering',
                    'Skiltingen var uklar',
                    'Parkeringsautomaten fungerte ikke',
                    'Jeg mener boten er feil',
                    'Annet',
                  ].map(cat => (
                    <label key={cat} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px', marginBottom: '8px', cursor: 'pointer',
                      border: `2px solid ${appealCategory === cat ? 'var(--accent)' : 'var(--border-color)'}`,
                      borderRadius: '8px', background: appealCategory === cat ? 'rgba(59,130,246,0.06)' : 'transparent',
                    }}>
                      <input
                        type="radio"
                        name="appealCategory"
                        value={cat}
                        checked={appealCategory === cat}
                        onChange={() => setAppealCategory(cat)}
                        style={{ accentColor: 'var(--accent)', width: 18, height: 18 }}
                      />
                      <span>{cat}</span>
                    </label>
                  ))}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                    <button
                      className={styles.btnPrimary}
                      onClick={() => { if (appealCategory) { setSearchError(''); setAppealStep(2) } else setSearchError(t.error + ': Velg en grunn') }}
                    >
                      Neste →
                    </button>
                    <button className={styles.btnSecondary} onClick={() => { setSelectedFineForAppeal(null); setAppealCategory(''); setAppealReason(''); setAppealFiles([]) }}>
                      Avbryt
                    </button>
                  </div>
                </>
              )}

              {/* Steg 2: Last opp dokumentasjon */}
              {appealStep === 2 && (
                <>
                  <h3 style={{ marginBottom: '4px' }}>Dokumentasjon</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                    Last opp bilder eller dokumenter som støtter klagen din
                  </p>

                  {/* Filopplastingsknapper */}
                  {[
                    { label: '📷 Bilde av skilt', key: 'skilt' },
                    { label: '📷 Bilde av bilen', key: 'bil' },
                    { label: '📷 Bilde av parkeringsplassen', key: 'plass' },
                    { label: '📎 Andre dokumenter', key: 'annet' },
                  ].map(({ label, key }) => {
                    const uploaded = appealFiles.includes(key)
                    return (
                      <div key={key} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px', marginBottom: '8px',
                        border: `2px solid ${uploaded ? 'var(--accent)' : 'var(--border-color)'}`,
                        borderRadius: '8px', background: uploaded ? 'rgba(59,130,246,0.06)' : 'transparent',
                      }}>
                        <span style={{ fontSize: '15px' }}>{label}</span>
                        <label style={{ cursor: 'pointer' }}>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            style={{ display: 'none' }}
                            onChange={() => {
                              if (!uploaded) setAppealFiles(prev => [...prev, key])
                            }}
                          />
                          <span style={{
                            padding: '6px 14px', borderRadius: '6px', fontSize: '13px',
                            background: uploaded ? 'var(--accent)' : '#f0f0f0',
                            color: uploaded ? 'white' : '#444',
                          }}>
                            {uploaded ? '✓ Lastet opp' : 'Last opp'}
                          </span>
                        </label>
                      </div>
                    )
                  })}

                  <textarea
                    placeholder="Tilleggsinformasjon (valgfritt) – beskriv situasjonen med egne ord"
                    value={appealReason}
                    onChange={(e) => setAppealReason(e.target.value)}
                    style={{
                      width: '100%', padding: '12px', marginTop: '12px', marginBottom: '12px',
                      border: '1px solid var(--border-color)', borderRadius: '8px', fontFamily: 'inherit',
                      background: 'var(--card-bg)', color: 'var(--text-primary)',
                    }}
                    rows={3}
                  />

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className={styles.btnSecondary} onClick={() => setAppealStep(1)}>← Tilbake</button>
                    <button className={styles.btnPrimary} onClick={() => handleAppealSubmit(selectedFineForAppeal)}>
                      Send klage
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Steg 3: Bekreftelse */}
          {appealStep === 3 && (
            <div className={styles.fineCard} style={{ marginTop: '20px', textAlign: 'center', padding: '30px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
              <h3 style={{ marginBottom: '8px' }}>Klage sendt!</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Din klage er mottatt og vil bli behandlet innen 5 virkedager. Du får svar på e-post.
              </p>
              <button className={styles.btnPrimary} onClick={() => { setAppealStep(1); setSelectedFineForAppeal(null) }}>
                Tilbake til dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (screen === 'history' && currentUser) {
    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : ''}`}>
        <div className={styles.dashboard}>
          <div className={styles.header}>
            <div>
              <h1>{t.paymentHistory}</h1>
              <p className={styles.subtitle}>{currentUser.name}</p>
            </div>
            <button className={styles.btnLogout} onClick={handleLogout}>
              {t.logout}
            </button>
          </div>

          {paymentHistory.length === 0 ? (
            <div className={styles.noFines}>
              <p>Ingen betalingshistorikk</p>
            </div>
          ) : (
            <div className={styles.finesList}>
              {paymentHistory.map((payment) => (
                <div key={payment.id} className={styles.fineCard}>
                  <div className={styles.fineHeader}>
                    <div>
                      <p className={styles.fineAmount}>kr {payment.amount}</p>
                      <p className={styles.fineDate}>{new Date(payment.paid_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`${styles.status} ${styles.paid}`}>
                      {t.paid}
                    </span>
                  </div>
                  <p className={styles.fineDetail}>Bot #{payment.fine_id}</p>
                  {payment.transaction_id && (
                    <p className={styles.fineDetail} style={{ fontSize: '12px' }}>
                      Transaksjons-ID: {payment.transaction_id}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>{t.notifications}</h3>
          {notifications.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>Ingen notifikasjoner</p>
          ) : (
            <div className={styles.finesList}>
              {notifications.map((notif) => (
                <div key={notif.id} className={styles.fineCard}>
                  <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>{notif.subject}</p>
                  <p style={{ marginBottom: '8px' }}>{notif.message}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {new Date(notif.sent_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (screen === 'appeals' && currentUser) {
    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : ''}`}>
        <div className={styles.dashboard}>
          <div className={styles.header}>
            <div>
              <h1>{t.appeals}</h1>
              <p className={styles.subtitle}>{currentUser.name}</p>
            </div>
            <button className={styles.btnLogout} onClick={handleLogout}>
              {t.logout}
            </button>
          </div>

          {appeals.length === 0 ? (
            <div className={styles.noFines}>
              <p>Ingen ankesaker</p>
            </div>
          ) : (
            <div className={styles.finesList}>
              {appeals.map((appeal) => (
                <div key={appeal.id} className={styles.fineCard}>
                  <div className={styles.fineHeader}>
                    <div>
                      <p className={styles.fineAmount}>Bot #{appeal.fine_id}</p>
                      <p className={styles.fineDate}>{new Date(appeal.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`${styles.status} ${appeal.status === 'approved' ? styles.paid : appeal.status === 'rejected' ? styles.unpaid : ''}`}>
                      {appeal.status.charAt(0).toUpperCase() + appeal.status.slice(1)}
                    </span>
                  </div>
                  <p className={styles.fineDetail}><strong>Grunn:</strong> {appeal.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (screen === 'profile' && currentUser) {
    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : ''}`}>
        <div className={styles.dashboard}>
          <div className={styles.header}>
            <h1>{t.profile}</h1>
            <button className={styles.btnLogout} onClick={() => setScreen('dashboard')}>
              Tilbake
            </button>
          </div>

          <div className={styles.adminInfo} style={{ marginBottom: '30px' }}>
            <p><strong>{t.name}:</strong> {currentUser.name}</p>
            <p><strong>{t.email}:</strong> {currentUser.email}</p>
            <p><strong>{t.phone}:</strong> {currentUser.phone}</p>
            <p><strong>{t.licensePlate}:</strong> {currentUser.license_plate}</p>
          </div>

          <h3>{t.settings}</h3>
          <div style={{ display: 'flex', gap: '15px', flexDirection: 'column' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
              />
              {t.darkMode}
            </label>
            <div>
              <label>{t.language}:</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'no' | 'en')}
                style={{
                  marginLeft: '10px',
                  padding: '8px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                }}
              >
                <option value="no">Norsk</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (screen === 'admin' && isAdmin) {
    const totalFines = demoFines.reduce((sum, f) => sum + f.amount, 0)
    const paidFines = demoFines.filter((f) => f.paid).reduce((sum, f) => sum + f.amount, 0)

    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : ''}`}>
        <div className={styles.adminPanel}>
          <div className={styles.header}>
            <h1>{t.adminPanel}</h1>
            <button
              className={styles.btnLogout}
              onClick={() => {
                setIsAdmin(false)
                setScreen('bankid')
              }}
            >
              {t.logout}
            </button>
          </div>

          <h2>{t.statistics}</h2>
          <div className={styles.summary}>
            <div className={styles.summaryCard}>
              <p className={styles.summaryLabel}>{t.totalFines}</p>
              <p className={styles.summaryValue}>{demoFines.length}</p>
            </div>
            <div className={styles.summaryCard}>
              <p className={styles.summaryLabel}>{t.totalRevenue}</p>
              <p className={styles.summaryValue}>kr {paidFines}</p>
            </div>
            <div className={styles.summaryCard}>
              <p className={styles.summaryLabel}>Innbetalt</p>
              <p className={styles.summaryValue}>{((paidFines / totalFines) * 100).toFixed(0)}%</p>
            </div>
          </div>

          <h3>{t.recentPayments}</h3>
          <div className={styles.finesList}>
            {paymentHistory.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>Ingen betalinger ennå</p>
            ) : (
              paymentHistory.map((payment) => (
                <div key={payment.id} className={styles.fineCard}>
                  <p>Bot #{payment.fine_id} - kr {payment.amount}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {new Date(payment.paid_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}
