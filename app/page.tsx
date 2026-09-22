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
  reason: string
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
  const [appealReason, setAppealReason] = useState('')

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
    {
      id: 4,
      license_plate: 'EF56789',
      amount: 1200,
      date: '2026-09-01',
      time: '16:20',
      location: 'Torggata 15',
      municipality: 'Oslo kommune',
      paid: false,
      created_at: '2026-09-01T16:20:00Z',
    },
  ]

  const translations = {
    no: {
      // Login
      loginTitle: 'Parkering Bot',
      bankidLogin: 'BankID Innlogging',
      newUser: 'Ny bruker',
      existingUser: 'Logg inn',
      toggleNewUser: 'Jeg har ikke BankID ennå',
      toggleExistingUser: 'Jeg har allerede konto',
      name: 'Navn',
      email: 'E-post',
      phone: 'Telefon',
      licensePlate: 'Registreringsnummer',
      password: 'Passord',
      confirmPassword: 'Bekreft passord',
      loginButton: 'Logg inn',
      registerButton: 'Registrer',
      passwordMismatch: 'Passordene stemmer ikke',
      fillAllFields: 'Vennligst fyll ut alle feltene',
      
      // Dashboard
      dashboard: 'Mine bøter',
      totalAmount: 'Totalt beløp',
      unpaidFines: 'Ubetalte bøter',
      noFines: 'Ingen parkingsbøter funnet',
      payNow: 'Betale nå',
      appeal: 'Anke boten',
      
      // Fine Details
      date: 'Dato',
      time: 'Tid',
      location: 'Sted',
      municipality: 'Kommune',
      status: 'Status',
      paid: 'Betalt',
      unpaid: 'Ubetalt',
      
      // Payment History
      paymentHistory: 'Betalingshistorikk',
      transactionId: 'Transaksjon-ID',
      paidAt: 'Betalt',
      notifications: 'Notifikasjoner',
      
      // Appeals
      appeals: 'Ankeoversikt',
      submitAppeal: 'Bekreft anke',
      appealReason: 'Grunn for anke',
      appealStatus: 'Status',
      pending: 'Avventer',
      approved: 'Godkjent',
      rejected: 'Avslått',
      
      // Admin
      admin: 'Adminpanel',
      adminPassword: 'Admin-passord',
      totalFines: 'Totale bøter',
      totalRevenue: 'Totalinntekt',
      paymentPercentage: 'Betalingsprosent',
      recentPayments: 'Siste betalinger',
      
      // Profile
      profile: 'Min profil',
      settings: 'Innstillinger',
      language: 'Språk',
      darkMode: 'Mørk modus',
      logout: 'Logg ut',
      
      // Buttons
      back: 'Tilbake',
      close: 'Lukk',
      submit: 'Send',
      cancel: 'Avbryt',
    },
    en: {
      // Login
      loginTitle: 'Parking Bot',
      bankidLogin: 'BankID Login',
      newUser: 'New User',
      existingUser: 'Existing User',
      toggleNewUser: 'I don\'t have BankID yet',
      toggleExistingUser: 'I already have an account',
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      licensePlate: 'License Plate',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      loginButton: 'Login',
      registerButton: 'Register',
      passwordMismatch: 'Passwords do not match',
      fillAllFields: 'Please fill in all fields',
      
      // Dashboard
      dashboard: 'My Fines',
      totalAmount: 'Total Amount',
      unpaidFines: 'Unpaid Fines',
      noFines: 'No parking fines found',
      payNow: 'Pay Now',
      appeal: 'Appeal Fine',
      
      // Fine Details
      date: 'Date',
      time: 'Time',
      location: 'Location',
      municipality: 'Municipality',
      status: 'Status',
      paid: 'Paid',
      unpaid: 'Unpaid',
      
      // Payment History
      paymentHistory: 'Payment History',
      transactionId: 'Transaction ID',
      paidAt: 'Paid',
      notifications: 'Notifications',
      
      // Appeals
      appeals: 'Appeal Overview',
      submitAppeal: 'Confirm Appeal',
      appealReason: 'Reason for Appeal',
      appealStatus: 'Status',
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      
      // Admin
      admin: 'Admin Panel',
      adminPassword: 'Admin Password',
      totalFines: 'Total Fines',
      totalRevenue: 'Total Revenue',
      paymentPercentage: 'Payment Percentage',
      recentPayments: 'Recent Payments',
      
      // Profile
      profile: 'My Profile',
      settings: 'Settings',
      language: 'Language',
      darkMode: 'Dark Mode',
      logout: 'Logout',
      
      // Buttons
      back: 'Back',
      close: 'Close',
      submit: 'Submit',
      cancel: 'Cancel',
    },
  }

  const t = (key: string): string => {
    return (translations[language] as any)[key] || key
  }

  // Load user data with fines
  const loadUserData = (email: string, licensePlate: string) => {
    // First check demo fines for matching license plate
    const userFines = demoFines.filter((f) => f.license_plate === licensePlate)
    
    if (userFines.length > 0) {
      setFines(userFines)
      
      // Generate payment history
      const paidFines = userFines.filter((f) => f.paid)
      const history = paidFines.map((fine) => ({
        id: `pay-${fine.id}`,
        fine_id: fine.id,
        amount: fine.amount,
        status: 'completed',
        paid_at: new Date(fine.date).toISOString(),
      }))
      setPaymentHistory(history)
      
      // Generate mock notifications
      const notifs: Notification[] = history.map((h) => ({
        id: `notif-${h.id}`,
        type: 'email',
        subject: 'Betaling registrert',
        message: `Betaling på NOK ${h.amount} er registrert for fine ${h.fine_id}`,
        sent_at: h.paid_at,
        status: 'sent',
      }))
      setNotifications(notifs)
      setSearchError('')
      return true
    }
    
    setSearchError('Ingen parkingsbøter funnet')
    return false
  }

  const handleBankidLogin = () => {
    const form = bankidForm
    
    if (!form.licensePlate || !form.email || !form.name || !form.phone) {
      setSearchError('Vennligst fyll ut alle feltene')
      return
    }
    
    if (form.isNewUser && form.password !== form.confirmPassword) {
      setSearchError('Passordene stemmer ikke')
      return
    }
    
    const user: User = {
      id: Math.random().toString(36),
      email: form.email,
      phone: form.phone,
      name: form.name,
      license_plate: form.licensePlate.toUpperCase(),
    }
    
    setCurrentUser(user)
    
    if (loadUserData(user.email, user.license_plate)) {
      setScreen('dashboard')
    }
    
    setBankidForm({
      name: '',
      email: '',
      phone: '',
      licensePlate: '',
      password: '',
      confirmPassword: '',
      isNewUser: false,
    })
  }

  const handlePayFine = (fineId: number) => {
    const fine = fines.find((f) => f.id === fineId)
    if (!fine) return
    
    // Initiate payment
    window.location.href = `/api/payments/initiate?fineId=${fineId}&amount=${fine.amount}`
  }

  const handleAppealSubmit = () => {
    if (!selectedFineForAppeal || !appealReason.trim()) {
      setSearchError('Vennligst fyll ut alle feltene')
      return
    }
    
    const appeal: Appeal = {
      id: Math.random().toString(36),
      fine_id: selectedFineForAppeal,
      reason: appealReason,
      status: 'pending',
      created_at: new Date().toISOString(),
    }
    
    setAppeals([...appeals, appeal])
    
    // Add notification
    const notif: Notification = {
      id: Math.random().toString(36),
      type: 'email',
      subject: 'Anke mottatt',
      message: `Din anke for fine ${selectedFineForAppeal} har blitt mottatt og vurderes`,
      sent_at: new Date().toISOString(),
      status: 'sent',
    }
    
    setNotifications([...notifications, notif])
    
    setSelectedFineForAppeal(null)
    setAppealReason('')
    setSearchError('')
  }

  // Login Screen
  if (screen === 'bankid') {
    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : ''}`}>
        <div className={styles.loginBox}>
          <h1>{t('loginTitle')}</h1>
          <p className={styles.tagline}>{t('bankidLogin')}</p>
          
          <div className={styles.loginSection}>
            <h2>{bankidForm.isNewUser ? t('newUser') : t('existingUser')}</h2>
            
            <div className={styles.formGroup}>
              <label>{t('licensePlate')}</label>
              <input
                type="text"
                placeholder="AB12345"
                value={bankidForm.licensePlate}
                onChange={(e) => setBankidForm({ ...bankidForm, licensePlate: e.target.value })}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>{t('name')}</label>
              <input
                type="text"
                placeholder="Ola Nordmann"
                value={bankidForm.name}
                onChange={(e) => setBankidForm({ ...bankidForm, name: e.target.value })}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>{t('email')}</label>
              <input
                type="email"
                placeholder="ola@example.no"
                value={bankidForm.email}
                onChange={(e) => setBankidForm({ ...bankidForm, email: e.target.value })}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>{t('phone')}</label>
              <input
                type="tel"
                placeholder="98765432"
                value={bankidForm.phone}
                onChange={(e) => setBankidForm({ ...bankidForm, phone: e.target.value })}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>{t('password')}</label>
              <input
                type="password"
                value={bankidForm.password}
                onChange={(e) => setBankidForm({ ...bankidForm, password: e.target.value })}
              />
            </div>
            
            {bankidForm.isNewUser && (
              <div className={styles.formGroup}>
                <label>{t('confirmPassword')}</label>
                <input
                  type="password"
                  value={bankidForm.confirmPassword}
                  onChange={(e) => setBankidForm({ ...bankidForm, confirmPassword: e.target.value })}
                />
              </div>
            )}
            
            <button className={styles.btnPrimary} onClick={handleBankidLogin}>
              {bankidForm.isNewUser ? t('registerButton') : t('loginButton')}
            </button>
            
            <button
              className={styles.btnSecondary}
              onClick={() => setBankidForm({ ...bankidForm, isNewUser: !bankidForm.isNewUser })}
            >
              {bankidForm.isNewUser ? t('toggleExistingUser') : t('toggleNewUser')}
            </button>
            
            {searchError && <div className={styles.error}>{searchError}</div>}
          </div>
          
          {/* Admin Login */}
          <div className={styles.adminSection}>
            <h3>{t('admin')}</h3>
            <div className={styles.formGroup}>
              <label>{t('adminPassword')}</label>
              <input
                type="password"
                placeholder="admin123"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </div>
            <button
              className={styles.btnSecondary}
              onClick={() => {
                if (adminPassword === 'admin123') {
                  setIsAdmin(true)
                  setScreen('admin')
                  setAdminPassword('')
                } else {
                  setSearchError('Feil admin-passord')
                }
              }}
            >
              {t('admin')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Dashboard
  if (screen === 'dashboard' && currentUser && !isAdmin) {
    const totalAmount = fines.reduce((sum, f) => sum + (f.paid ? 0 : f.amount), 0)
    const unpaidCount = fines.filter((f) => !f.paid).length

    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : ''}`}>
        <div className={styles.dashboard}>
          <div className={styles.header}>
            <div>
              <h1>{t('dashboard')}</h1>
              <p className={styles.subtitle}>{currentUser.name}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className={styles.btnLogout} onClick={() => setScreen('profile')}>
                {t('profile')}
              </button>
              <button className={styles.btnLogout} onClick={() => setScreen('history')}>
                {t('paymentHistory')}
              </button>
              <button className={styles.btnLogout} onClick={() => setScreen('appeals')}>
                {t('appeals')}
              </button>
              <button className={styles.btnLogout} onClick={() => { setScreen('bankid'); setCurrentUser(null); }}>
                {t('logout')}
              </button>
            </div>
          </div>

          <div className={styles.summary}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>{t('totalAmount')}</div>
              <div className={styles.summaryValue}>NOK {totalAmount}</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>{t('unpaidFines')}</div>
              <div className={styles.summaryValue}>{unpaidCount}</div>
            </div>
          </div>

          {fines.length === 0 ? (
            <div className={styles.noFines}>
              <p>{t('noFines')}</p>
            </div>
          ) : (
            <div className={styles.finesList}>
              {fines.map((fine) => (
                <div key={fine.id} className={styles.fineCard}>
                  <div className={styles.fineHeader}>
                    <div>
                      <div className={styles.fineAmount}>NOK {fine.amount}</div>
                      <div className={styles.fineDate}>
                        {fine.date} {fine.time}
                      </div>
                    </div>
                    <span className={`${styles.status} ${fine.paid ? styles.paid : styles.unpaid}`}>
                      {fine.paid ? t('paid') : t('unpaid')}
                    </span>
                  </div>
                  <div className={styles.fineDetail}>{fine.location}</div>
                  <div className={styles.fineDetail}>{fine.municipality}</div>
                  {!fine.paid && (
                    <>
                      <button className={styles.btnPay} onClick={() => handlePayFine(fine.id)}>
                        {t('payNow')}
                      </button>
                      <button
                        className={styles.btnSecondary}
                        style={{ marginTop: '8px', width: '100%' }}
                        onClick={() => {
                          setSelectedFineForAppeal(fine.id)
                          setScreen('appeals')
                        }}
                      >
                        {t('appeal')}
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Payment History
  if (screen === 'history' && currentUser) {
    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : ''}`}>
        <div className={styles.dashboard}>
          <div className={styles.header}>
            <h1>{t('paymentHistory')}</h1>
            <button className={styles.btnLogout} onClick={() => setScreen('dashboard')}>
              {t('back')}
            </button>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ marginBottom: '20px' }}>{t('notifications')}</h2>
            {notifications.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>Ingen notifikasjoner</p>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  style={{
                    padding: '15px',
                    background: 'var(--bg-secondary)',
                    marginBottom: '10px',
                    borderRadius: '6px',
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '5px' }}>{notif.subject}</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {notif.message}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px' }}>
                    {new Date(notif.sent_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>

          <div>
            <h2 style={{ marginBottom: '20px' }}>{t('paymentHistory')}</h2>
            {paymentHistory.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>Ingen betalinger</p>
            ) : (
              paymentHistory.map((payment) => (
                <div
                  key={payment.id}
                  style={{
                    padding: '15px',
                    background: 'var(--bg-secondary)',
                    marginBottom: '10px',
                    borderRadius: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '600' }}>Fine ID: {payment.fine_id}</span>
                    <span style={{ color: 'var(--success)', fontWeight: '600' }}>NOK {payment.amount}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {t('transactionId')}: {payment.id}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {t('paidAt')}: {new Date(payment.paid_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  // Appeals
  if (screen === 'appeals' && currentUser) {
    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : ''}`}>
        <div className={styles.dashboard}>
          <div className={styles.header}>
            <h1>{t('appeals')}</h1>
            <button className={styles.btnLogout} onClick={() => setScreen('dashboard')}>
              {t('back')}
            </button>
          </div>

          {selectedFineForAppeal === null ? (
            <div>
              {appeals.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>
                  Ingen ankeoversendelser ennå
                </p>
              ) : (
                <div className={styles.finesList}>
                  {appeals.map((appeal) => (
                    <div key={appeal.id} className={styles.fineCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ fontWeight: '600' }}>Fine ID: {appeal.fine_id}</span>
                        <span
                          className={`${styles.status} ${
                            appeal.status === 'pending'
                              ? styles.unpaid
                              : appeal.status === 'approved'
                                ? styles.paid
                                : styles.unpaid
                          }`}
                        >
                          {appeal.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                        {appeal.reason}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {new Date(appeal.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px' }}>
              <h2 style={{ marginBottom: '15px' }}>Anke fine #{selectedFineForAppeal}</h2>
              <div className={styles.formGroup}>
                <label>{t('appealReason')}</label>
                <textarea
                  rows={5}
                  placeholder="Beskriv hvorfor du mener boten burde ankeres..."
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontFamily: 'inherit',
                    fontSize: '16px',
                    color: 'var(--text-primary)',
                    background: 'var(--bg-primary)',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button className={styles.btnPay} style={{ flex: 1 }} onClick={handleAppealSubmit}>
                  {t('submitAppeal')}
                </button>
                <button
                  className={styles.btnSecondary}
                  style={{ flex: 1 }}
                  onClick={() => {
                    setSelectedFineForAppeal(null)
                    setAppealReason('')
                  }}
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Profile
  if (screen === 'profile' && currentUser) {
    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : ''}`}>
        <div className={styles.dashboard}>
          <div className={styles.header}>
            <h1>{t('profile')}</h1>
            <button className={styles.btnLogout} onClick={() => setScreen('dashboard')}>
              {t('back')}
            </button>
          </div>

          <div className={styles.adminInfo} style={{ marginBottom: '30px' }}>
            <p>
              <strong>{t('name')}:</strong> {currentUser.name}
            </p>
            <p>
              <strong>{t('email')}:</strong> {currentUser.email}
            </p>
            <p>
              <strong>{t('phone')}:</strong> {currentUser.phone}
            </p>
            <p>
              <strong>{t('licensePlate')}:</strong> {currentUser.license_plate}
            </p>
          </div>

          <div className={styles.adminInfo}>
            <h2 style={{ marginBottom: '15px' }}>{t('settings')}</h2>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ marginRight: '10px' }}>{t('language')}:</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'no' | 'en')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="no">Norsk</option>
                <option value="en">English</option>
              </select>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label>
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={() => setDarkMode(!darkMode)}
                  style={{ marginRight: '10px' }}
                />
                {t('darkMode')}
              </label>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Admin Panel
  if (screen === 'admin' && isAdmin) {
    const totalFinesCount = demoFines.length
    const totalRevenue = demoFines
      .filter((f) => f.paid)
      .reduce((sum, f) => sum + f.amount, 0)
    const paymentPercent = totalFinesCount > 0
      ? Math.round((demoFines.filter((f) => f.paid).length / totalFinesCount) * 100)
      : 0

    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : ''}`}>
        <div className={styles.adminPanel}>
          <div className={styles.header}>
            <h1>{t('admin')}</h1>
            <button
              className={styles.btnLogout}
              onClick={() => {
                setIsAdmin(false)
                setScreen('bankid')
              }}
            >
              {t('logout')}
            </button>
          </div>

          <div className={styles.adminInfo}>
            <p>
              <strong>{t('totalFines')}:</strong> {totalFinesCount}
            </p>
            <p>
              <strong>{t('totalRevenue')}:</strong> NOK {totalRevenue}
            </p>
            <p>
              <strong>{t('paymentPercentage')}:</strong> {paymentPercent}%
            </p>
          </div>

          <h3 style={{ marginTop: '30px', marginBottom: '20px' }}>{t('recentPayments')}</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {demoFines
              .filter((f) => f.paid)
              .map((fine) => (
                <div
                  key={fine.id}
                  style={{
                    padding: '12px',
                    background: 'var(--bg-secondary)',
                    marginBottom: '8px',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Fine ID: {fine.id}</span>
                    <span style={{ color: 'var(--success)', fontWeight: '600' }}>
                      NOK {fine.amount}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>
                    {fine.date}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    )
  }

  return null
}
