'use client'

import React, { useState } from 'react'
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
  transaction_id?: string
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

// B2B interfaces
interface Employee {
  id: string
  name: string
  email: string
  phone: string
  licensePlates: string[]
  fineCount: number
}

interface CompanyVehicle {
  id: string
  licensePlate: string
  make: string
  model: string
  year: number
  assignedTo: string | null
  fineCount: number
}

interface CompanyFine {
  id: number
  licensePlate: string
  amount: number
  date: string
  time: string
  location: string
  municipality: string
  paid: boolean
  driverName: string
  employeeId: string
}

interface RentalAgreement {
  id: string
  vehicleLicensePlate: string
  renterName: string
  renterEmail: string
  renterPhone: string
  startDate: string
  endDate: string
  status: 'active' | 'completed' | 'upcoming'
}

interface RentalVehicle {
  id: string
  licensePlate: string
  make: string
  model: string
  year: number
  status: 'ledig' | 'utleid' | 'service'
}

type RentalFineStatus = 'Ny' | 'Kobling funnet' | 'Behandles' | 'Betalt' | 'Krevd videre'

interface RentalFine {
  id: number
  licensePlate: string
  amount: number
  date: string
  time: string
  location: string
  municipality: string
  status: RentalFineStatus
  matchedRenterName: string | null
  matchedAgreementId: string | null
}

type AccountType = 'private' | 'company' | 'rental' | null
type B2BCompanyTab = 'boter' | 'ansatte' | 'firmabiler' | 'betaling' | 'rapporter'
type B2BRentalTab = 'boter' | 'leieavtaler' | 'kjoretoy' | 'saksbehandling' | 'rapporter'
type Screen = 'bankid' | 'account-select' | 'dashboard' | 'admin' | 'profile' | 'history' | 'appeals' | 'notifications' | 'b2b-company' | 'b2b-rental'

// ── Mock B2B data ──────────────────────────────────────────────────────────

const mockEmployees: Employee[] = [
  { id: 'e1', name: 'Lars Eriksen', email: 'lars@firma.no', phone: '91234567', licensePlates: ['EL12345'], fineCount: 2 },
  { id: 'e2', name: 'Marte Olsen', email: 'marte@firma.no', phone: '98765432', licensePlates: ['FK98765'], fineCount: 1 },
  { id: 'e3', name: 'Jonas Berg', email: 'jonas@firma.no', phone: '40123456', licensePlates: ['PQ55432'], fineCount: 1 },
]

const mockCompanyVehicles: CompanyVehicle[] = [
  { id: 'cv1', licensePlate: 'EL12345', make: 'Tesla', model: 'Model 3', year: 2023, assignedTo: 'Lars Eriksen', fineCount: 2 },
  { id: 'cv2', licensePlate: 'FK98765', make: 'Volkswagen', model: 'ID.4', year: 2022, assignedTo: 'Marte Olsen', fineCount: 1 },
  { id: 'cv3', licensePlate: 'PQ55432', make: 'Toyota', model: 'RAV4', year: 2021, assignedTo: 'Jonas Berg', fineCount: 1 },
]

const mockCompanyFines: CompanyFine[] = [
  { id: 101, licensePlate: 'EL12345', amount: 900, date: '2026-09-10', time: '08:15', location: 'Storgata 5', municipality: 'Oslo kommune', paid: false, driverName: 'Lars Eriksen', employeeId: 'e1' },
  { id: 102, licensePlate: 'EL12345', amount: 660, date: '2026-08-30', time: '17:45', location: 'Grünerløkka', municipality: 'Oslo kommune', paid: true, driverName: 'Lars Eriksen', employeeId: 'e1' },
  { id: 103, licensePlate: 'FK98765', amount: 750, date: '2026-09-14', time: '11:00', location: 'Bryggen 2', municipality: 'Bergen kommune', paid: false, driverName: 'Marte Olsen', employeeId: 'e2' },
  { id: 104, licensePlate: 'PQ55432', amount: 500, date: '2026-09-01', time: '14:30', location: 'Sandvika sentrum', municipality: 'Bærum kommune', paid: false, driverName: 'Jonas Berg', employeeId: 'e3' },
]

const mockRentalVehicles: RentalVehicle[] = [
  { id: 'rv1', licensePlate: 'UT11111', make: 'Kia', model: 'EV6', year: 2024, status: 'utleid' },
  { id: 'rv2', licensePlate: 'UT22222', make: 'Hyundai', model: 'Ioniq 5', year: 2023, status: 'ledig' },
  { id: 'rv3', licensePlate: 'UT33333', make: 'Peugeot', model: '208', year: 2022, status: 'service' },
]

const mockRentalAgreements: RentalAgreement[] = [
  {
    id: 'ra1',
    vehicleLicensePlate: 'UT11111',
    renterName: 'Sofie Andersen',
    renterEmail: 'sofie@example.com',
    renterPhone: '99887766',
    startDate: '2026-09-08',
    endDate: '2026-09-18',
    status: 'active',
  },
  {
    id: 'ra2',
    vehicleLicensePlate: 'UT22222',
    renterName: 'Henrik Dahl',
    renterEmail: 'henrik@example.com',
    renterPhone: '92345678',
    startDate: '2026-08-20',
    endDate: '2026-08-31',
    status: 'completed',
  },
]

// Bot på UT11111 den 2026-09-12 — Sofie Andersen hadde avtale ra1 (08.–18. sept) → automatisk match
const mockRentalFines: RentalFine[] = [
  {
    id: 201,
    licensePlate: 'UT11111',
    amount: 900,
    date: '2026-09-12',
    time: '10:20',
    location: 'Jernbanetorget',
    municipality: 'Oslo kommune',
    status: 'Kobling funnet',
    matchedRenterName: 'Sofie Andersen',
    matchedAgreementId: 'ra1',
  },
  {
    id: 202,
    licensePlate: 'UT22222',
    amount: 660,
    date: '2026-08-25',
    time: '14:00',
    location: 'Aker Brygge',
    municipality: 'Oslo kommune',
    status: 'Krevd videre',
    matchedRenterName: 'Henrik Dahl',
    matchedAgreementId: 'ra2',
  },
  {
    id: 203,
    licensePlate: 'UT33333',
    amount: 750,
    date: '2026-09-20',
    time: '09:05',
    location: 'Torggata 3',
    municipality: 'Oslo kommune',
    status: 'Ny',
    matchedRenterName: null,
    matchedAgreementId: null,
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────

const statusBadge = (label: string, color: 'green' | 'orange' | 'red' | 'blue' | 'grey') => {
  const bg: Record<string, string> = {
    green: '#d1fae5',
    orange: '#fef3c7',
    red: '#fee2e2',
    blue: '#dbeafe',
    grey: '#f3f4f6',
  }
  const fg: Record<string, string> = {
    green: '#065f46',
    orange: '#92400e',
    red: '#991b1b',
    blue: '#1e40af',
    grey: '#374151',
  }
  return (
    <span style={{
      padding: '3px 10px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 600,
      background: bg[color],
      color: fg[color],
      display: 'inline-block',
    }}>{label}</span>
  )
}

const rentalFineStatusColor = (status: RentalFineStatus): 'green' | 'orange' | 'red' | 'blue' | 'grey' => {
  switch (status) {
    case 'Betalt': return 'green'
    case 'Kobling funnet': return 'blue'
    case 'Behandles': return 'orange'
    case 'Krevd videre': return 'grey'
    case 'Ny': return 'red'
  }
}

const vehicleStatusColor = (status: RentalVehicle['status']): 'green' | 'orange' | 'red' => {
  if (status === 'ledig') return 'green'
  if (status === 'utleid') return 'orange'
  return 'red'
}

const tabBtn = (label: string, active: boolean, onClick: () => void) => (
  <button
    key={label}
    onClick={onClick}
    style={{
      padding: '10px 20px',
      background: active ? 'var(--accent)' : '#f0f0f0',
      color: active ? 'white' : '#333',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: active ? 700 : 400,
      fontSize: '14px',
    }}
  >
    {label}
  </button>
)

// ── Main component ─────────────────────────────────────────────────────────

export default function Home() {
  const [screen, setScreen] = useState<Screen>('bankid')
  const [accountType, setAccountType] = useState<AccountType>(null)
  const [b2bCompanyTab, setB2bCompanyTab] = useState<B2BCompanyTab>('boter')
  const [b2bRentalTab, setB2bRentalTab] = useState<B2BRentalTab>('boter')
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

  // Notification preferences state
  const [notificationPrefs, setNotificationPrefs] = useState({
    email: true,
    sms: false,
    payment: true,
    appeal: true,
  })
  const [notifEmail, setNotifEmail] = useState('')
  const [notifPhone, setNotifPhone] = useState('')
  const [notifSaveStatus, setNotifSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Rental fine state for saksbehandling
  const [rentalFines, setRentalFines] = useState<RentalFine[]>(mockRentalFines)
  const [selectedRentalFineId, setSelectedRentalFineId] = useState<number | null>(null)

  // BankID Mock Login State
  const [bankidForm, setBankidForm] = useState({
    name: '',
    firstName: '',
    lastName: '',
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

  // Mock BankID Login Handler — now routes to account-select
  const handleBankIDLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (bankidForm.isNewUser) {
      if (!bankidForm.firstName || !bankidForm.lastName || !bankidForm.email || !bankidForm.phone || !bankidForm.licensePlate) {
        setSearchError('Alle felt må fylles ut')
        return
      }
    } else {
      if (!bankidForm.licensePlate || !bankidForm.password) {
        setSearchError('Registreringsnummer og BankID-kode er påkrevd')
        return
      }
    }

    const fullName = bankidForm.isNewUser
      ? `${bankidForm.firstName} ${bankidForm.lastName}`
      : 'Bruker'

    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      email: bankidForm.email || 'bruker@example.com',
      phone: bankidForm.phone || '',
      name: fullName,
      license_plate: bankidForm.licensePlate.toUpperCase(),
    }

    setCurrentUser(user)
    await loadUserData(user)
    setScreen('dashboard')
    setBankidForm({
      name: '',
      firstName: '',
      lastName: '',
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
    setNotifEmail(user.email)
    const userFines = demoFines.filter((fine) => fine.license_plate === user.license_plate)
    setFines(userFines)

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
    setAccountType(null)
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

  const handleRentalFineAction = (fineId: number, action: 'Krevd videre' | 'Betalt' | 'Behandles') => {
    setRentalFines(prev =>
      prev.map(f => f.id === fineId ? { ...f, status: action as RentalFineStatus } : f)
    )
    setSelectedRentalFineId(null)
  }

  // ── SCREEN: BankID ────────────────────────────────────────────────────────

  if (screen === 'bankid') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a1628',
        padding: '20px',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div style={{
            fontSize: '28px',
            fontWeight: 800,
            color: 'white',
            letterSpacing: '-0.5px',
          }}>
            Parkeringsbot
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '48px 40px',
          width: '100%',
          maxWidth: '440px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px', textAlign: 'center', color: '#111' }}>
            {bankidForm.isNewUser ? 'Opprett konto' : 'Velkommen'}
          </h2>
          {bankidForm.isNewUser && (
            <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', marginBottom: '28px' }}>
              Fyll inn informasjonen din for å komme i gang
            </p>
          )}
          {!bankidForm.isNewUser && <div style={{ marginBottom: '32px' }} />}

          {bankidForm.isNewUser ? (
            <form onSubmit={handleBankIDLogin}>
              {/* Navn */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="Fornavn"
                  value={bankidForm.firstName}
                  onChange={(e) => setBankidForm({ ...bankidForm, firstName: e.target.value })}
                  style={{ flex: 1, padding: '14px 16px', fontSize: '16px', border: '1.5px solid #d0d5dd', borderRadius: '8px', outline: 'none', boxSizing: 'border-box', color: '#111' }}
                />
                <input
                  type="text"
                  placeholder="Etternavn"
                  value={bankidForm.lastName}
                  onChange={(e) => setBankidForm({ ...bankidForm, lastName: e.target.value })}
                  style={{ flex: 1, padding: '14px 16px', fontSize: '16px', border: '1.5px solid #d0d5dd', borderRadius: '8px', outline: 'none', boxSizing: 'border-box', color: '#111' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="email"
                  placeholder="E-postadresse"
                  value={bankidForm.email}
                  onChange={(e) => setBankidForm({ ...bankidForm, email: e.target.value })}
                  style={{ width: '100%', padding: '14px 16px', fontSize: '16px', border: '1.5px solid #d0d5dd', borderRadius: '8px', outline: 'none', boxSizing: 'border-box', color: '#111' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="tel"
                  placeholder="Telefonnummer"
                  value={bankidForm.phone}
                  onChange={(e) => setBankidForm({ ...bankidForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '14px 16px', fontSize: '16px', border: '1.5px solid #d0d5dd', borderRadius: '8px', outline: 'none', boxSizing: 'border-box', color: '#111' }}
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <input
                  type="text"
                  placeholder="Registreringsnummer (f.eks. AB12345)"
                  value={bankidForm.licensePlate}
                  onChange={(e) => setBankidForm({ ...bankidForm, licensePlate: e.target.value.toUpperCase() })}
                  style={{ width: '100%', padding: '14px 16px', fontSize: '16px', border: '1.5px solid #d0d5dd', borderRadius: '8px', outline: 'none', boxSizing: 'border-box', color: '#111' }}
                />
              </div>
              <button
                type="submit"
                style={{ width: '100%', padding: '15px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}
              >
                Opprett konto
              </button>
              {searchError && (
                <p style={{ marginTop: '16px', color: '#dc2626', fontSize: '14px', textAlign: 'center' }}>{searchError}</p>
              )}
              <div style={{ textAlign: 'center', margin: '20px 0', color: '#999', fontSize: '14px' }}>eller</div>
              <button
                onClick={() => setBankidForm({ ...bankidForm, isNewUser: false })}
                style={{ width: '100%', padding: '15px', background: 'transparent', color: '#2563eb', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}
              >
                Logg inn i stedet
              </button>
            </form>
          ) : (
            <form onSubmit={handleBankIDLogin}>
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="Registreringsnummer (f.eks. AB12345)"
                  value={bankidForm.licensePlate}
                  onChange={(e) => setBankidForm({ ...bankidForm, licensePlate: e.target.value.toUpperCase() })}
                  style={{ width: '100%', padding: '14px 16px', fontSize: '16px', border: '1.5px solid #d0d5dd', borderRadius: '8px', outline: 'none', boxSizing: 'border-box', color: '#111' }}
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <input
                  type="password"
                  placeholder="BankID-kode"
                  value={bankidForm.password}
                  onChange={(e) => setBankidForm({ ...bankidForm, password: e.target.value })}
                  style={{ width: '100%', padding: '14px 16px', fontSize: '16px', border: '1.5px solid #d0d5dd', borderRadius: '8px', outline: 'none', boxSizing: 'border-box', color: '#111' }}
                />
              </div>
              <button
                type="submit"
                style={{ width: '100%', padding: '15px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.2px' }}
              >
                Fortsett
              </button>
              {searchError && (
                <p style={{ marginTop: '16px', color: '#dc2626', fontSize: '14px', textAlign: 'center' }}>{searchError}</p>
              )}
              <div style={{ textAlign: 'center', margin: '20px 0', color: '#999', fontSize: '14px' }}>eller</div>
              <button
                onClick={() => setBankidForm({ ...bankidForm, isNewUser: true })}
                style={{ width: '100%', padding: '15px', background: 'transparent', color: '#2563eb', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}
              >
                Opprett konto gratis
              </button>
            </form>
          )}
        </div>

        {/* Admin hidden */}
        <div style={{ marginTop: '32px' }}>
          <details>
            <summary style={{ cursor: 'pointer', color: '#ffffff44', fontSize: '12px', textAlign: 'center', listStyle: 'none' }}>
              Admin
            </summary>
            <div style={{ marginTop: '12px', padding: '16px', background: '#ffffff11', borderRadius: '8px' }}>
              <input
                type="password"
                placeholder="Admin-passord"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                style={{
                  width: '100%', padding: '12px', fontSize: '14px', marginBottom: '8px',
                  border: '1px solid #444', borderRadius: '6px', background: '#1a2a3a',
                  color: 'white', boxSizing: 'border-box',
                }}
              />
              <button
                onClick={handleAdminLogin}
                style={{
                  width: '100%', padding: '10px', background: '#2563eb',
                  color: 'white', border: 'none', borderRadius: '6px',
                  fontSize: '14px', cursor: 'pointer',
                }}
              >
                Admin-innlogging
              </button>
            </div>
          </details>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '32px', fontSize: '12px', color: '#ffffff44', textAlign: 'center' }}>
          Vilkar | Personvern
        </div>
      </div>
    )
  }

  // ── SCREEN: Velg kontotype ─────────────────────────────────────────────────

  if (screen === 'account-select' && currentUser) {
    const cardStyle = (selected: boolean): React.CSSProperties => ({
      background: selected ? '#e8f0fc' : '#fff',
      border: `2px solid ${selected ? 'var(--accent)' : '#e0e0e0'}`,
      borderRadius: '12px',
      padding: '28px 24px',
      cursor: 'pointer',
      textAlign: 'left',
      width: '100%',
      marginBottom: '14px',
      transition: 'border-color 0.15s',
    })

    const options: { type: AccountType; icon: string; title: string; desc: string }[] = [
      { type: 'private', icon: '', title: 'Privat', desc: 'For privatpersoner med egne biler og egne bøter.' },
    ]

    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : ''}`}>
        <div className={styles.loginBox}>
          <div style={{ marginBottom: '8px' }}>
            <h1 style={{ fontSize: '22px', marginBottom: '4px' }}>Velg kontotype</h1>
            <p style={{ color: '#666', fontSize: '14px' }}>Hei, {currentUser.name}! Hvordan vil du bruke Parkeringsbot?</p>
          </div>

          <div style={{ marginTop: '24px' }}>
            {options.map(({ type, icon, title, desc }) => (
              <button
                key={type}
                style={cardStyle(accountType === type)}
                onClick={() => setAccountType(type)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '16px', color: '#003366', marginBottom: '4px' }}>{title}</div>
                    <div style={{ fontSize: '13px', color: '#555' }}>{desc}</div>
                  </div>
                  {accountType === type && (
                    <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontSize: '20px' }}>✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setScreen('dashboard')}
            style={{
              width: '100%',
              marginTop: '10px',
              padding: '14px',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Fortsett →
          </button>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              marginTop: '10px',
              padding: '10px',
              background: 'transparent',
              color: '#888',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Avbryt og logg ut
          </button>
        </div>
      </div>
    )
  }

  // ── SCREEN: B2B Bedrift ───────────────────────────────────────────────────

  if (screen === 'b2b-company' && currentUser) {
    const unpaidFines = mockCompanyFines.filter(f => !f.paid)
    const totalUnpaid = unpaidFines.reduce((s, f) => s + f.amount, 0)
    const totalAll = mockCompanyFines.reduce((s, f) => s + f.amount, 0)

    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : ''}`}>
        <div className={styles.dashboard}>
          {/* Header */}
          <div className={styles.header}>
            <div>
              <h1 style={{ marginBottom: '2px' }}>Bedriftsdashboard</h1>
              <p className={styles.subtitle}>{currentUser.name} • Firma-konto</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                style={{ padding: '8px 16px', background: '#f0f0f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                onClick={() => setScreen('account-select')}
              >
                Bytt kontotype
              </button>
              <button className={styles.btnLogout} onClick={handleLogout}>{t.logout}</button>
            </div>
          </div>

          {/* Tab nav */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {([
              ['boter', 'Bøter'],
              ['ansatte', 'Ansatte'],
              ['firmabiler', 'Firmabiler'],
              ['betaling', 'Betaling'],
              ['rapporter', 'Rapporter'],
            ] as [B2BCompanyTab, string][]).map(([key, label]) =>
              tabBtn(label, b2bCompanyTab === key, () => setB2bCompanyTab(key))
            )}
          </div>

          {/* Tab: Bøter */}
          {b2bCompanyTab === 'boter' && (
            <div>
              <h2 style={{ marginBottom: '16px' }}>Firmabøter</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5' }}>
                      {['Regnr', 'Beløp', 'Dato', 'Sted', 'Hvem kjørte', 'Status', 'Handling'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e0e0e0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mockCompanyFines.map(fine => (
                      <tr key={fine.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{fine.licensePlate}</td>
                        <td style={{ padding: '10px 12px' }}>kr {fine.amount}</td>
                        <td style={{ padding: '10px 12px' }}>{fine.date} {fine.time}</td>
                        <td style={{ padding: '10px 12px' }}>{fine.location}, {fine.municipality}</td>
                        <td style={{ padding: '10px 12px' }}>{fine.driverName}</td>
                        <td style={{ padding: '10px 12px' }}>
                          {fine.paid ? statusBadge('Betalt', 'green') : statusBadge('Ubetalt', 'red')}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {!fine.paid && (
                            <button style={{
                              padding: '5px 12px', background: 'var(--accent)', color: 'white',
                              border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px',
                            }}>
                              Betal
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab: Ansatte */}
          {b2bCompanyTab === 'ansatte' && (
            <div>
              <h2 style={{ marginBottom: '16px' }}>Ansatte</h2>
              <div style={{ display: 'grid', gap: '12px' }}>
                {mockEmployees.map(emp => (
                  <div key={emp.id} style={{
                    background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px',
                    padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '20px',
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: 'var(--accent)', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '18px', flexShrink: 0,
                    }}>
                      {emp.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, marginBottom: '2px' }}>{emp.name}</div>
                      <div style={{ fontSize: '13px', color: '#666' }}>{emp.email} • {emp.phone}</div>
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
                        Biler: {emp.licensePlates.join(', ')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: emp.fineCount > 1 ? '#dc2626' : '#003366' }}>{emp.fineCount}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>bøter</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab: Firmabiler */}
          {b2bCompanyTab === 'firmabiler' && (
            <div>
              <h2 style={{ marginBottom: '16px' }}>Flåteoversikt</h2>
              <div style={{ display: 'grid', gap: '12px' }}>
                {mockCompanyVehicles.map(v => (
                  <div key={v.id} style={{
                    background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px',
                    padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{v.licensePlate}</div>
                      <div style={{ fontSize: '13px', color: '#666' }}>{v.year} {v.make} {v.model}</div>
                      {v.assignedTo && (
                        <div style={{ fontSize: '13px', color: '#555', marginTop: '2px' }}>Tildelt: {v.assignedTo}</div>
                      )}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: v.fineCount > 1 ? '#dc2626' : '#003366' }}>{v.fineCount}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>bøter</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab: Betaling */}
          {b2bCompanyTab === 'betaling' && (
            <div>
              <h2 style={{ marginBottom: '8px' }}>Betaling</h2>
              <div style={{ display: 'grid', gap: '14px', marginBottom: '24px' }}>
                <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '20px' }}>
                  <p style={{ color: '#666', marginBottom: '4px', fontSize: '13px' }}>Totalt ubetalte bøter</p>
                  <p style={{ fontSize: '28px', fontWeight: 700, color: '#dc2626' }}>kr {totalUnpaid}</p>
                  <p style={{ fontSize: '13px', color: '#666' }}>{unpaidFines.length} bøter</p>
                  <button style={{
                    marginTop: '12px', padding: '12px 24px', background: 'var(--accent)', color: 'white',
                    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700,
                  }}>
                    Betal alle ({unpaidFines.length}) →
                  </button>
                </div>
              </div>
              <h3 style={{ marginBottom: '12px' }}>Enkeltbøter</h3>
              {unpaidFines.map(fine => (
                <div key={fine.id} style={{
                  background: '#fff', border: '1px solid #e8e8e8', borderRadius: '8px',
                  padding: '14px 18px', marginBottom: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{fine.licensePlate} — kr {fine.amount}</div>
                    <div style={{ fontSize: '13px', color: '#666' }}>{fine.date} • {fine.driverName}</div>
                  </div>
                  <button style={{
                    padding: '8px 16px', background: 'var(--accent)', color: 'white',
                    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
                  }}>
                    Betal
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Tab: Rapporter */}
          {b2bCompanyTab === 'rapporter' && (
            <div>
              <h2 style={{ marginBottom: '16px' }}>Rapporter</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                {[
                  { label: 'Totalt antall bøter', value: mockCompanyFines.length.toString(), color: '#003366' },
                  { label: 'Totalt beløp', value: `kr ${totalAll}`, color: '#003366' },
                  { label: 'Ubetalt beløp', value: `kr ${totalUnpaid}`, color: '#dc2626' },
                  { label: 'Betalt beløp', value: `kr ${totalAll - totalUnpaid}`, color: '#065f46' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '18px' }}>
                    <p style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>{label}</p>
                    <p style={{ fontSize: '22px', fontWeight: 700, color }}>{value}</p>
                  </div>
                ))}
              </div>
              <h3 style={{ marginBottom: '12px' }}>Mest bøter — ansatt</h3>
              {[...mockEmployees].sort((a, b) => b.fineCount - a.fineCount).map(emp => (
                <div key={emp.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px', background: '#fff', border: '1px solid #e8e8e8',
                  borderRadius: '8px', marginBottom: '6px',
                }}>
                  <span style={{ fontWeight: 600 }}>{emp.name}</span>
                  {statusBadge(`${emp.fineCount} bøter`, emp.fineCount > 1 ? 'red' : 'orange')}
                </div>
              ))}
              <h3 style={{ marginTop: '20px', marginBottom: '12px' }}>Mest bøter — kjøretøy</h3>
              {[...mockCompanyVehicles].sort((a, b) => b.fineCount - a.fineCount).map(v => (
                <div key={v.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px', background: '#fff', border: '1px solid #e8e8e8',
                  borderRadius: '8px', marginBottom: '6px',
                }}>
                  <span style={{ fontWeight: 600 }}>{v.licensePlate} — {v.make} {v.model}</span>
                  {statusBadge(`${v.fineCount} bøter`, v.fineCount > 1 ? 'red' : 'orange')}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── SCREEN: B2B Bilutleie ─────────────────────────────────────────────────

  if (screen === 'b2b-rental' && currentUser) {
    const selectedRentalFine = rentalFines.find(f => f.id === selectedRentalFineId)

    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : ''}`}>
        <div className={styles.dashboard}>
          {/* Header */}
          <div className={styles.header}>
            <div>
              <h1 style={{ marginBottom: '2px' }}>Bilutleie-dashboard</h1>
              <p className={styles.subtitle}>{currentUser.name} • Utleie-konto</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                style={{ padding: '8px 16px', background: '#f0f0f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                onClick={() => setScreen('account-select')}
              >
                Bytt kontotype
              </button>
              <button className={styles.btnLogout} onClick={handleLogout}>{t.logout}</button>
            </div>
          </div>

          {/* Tab nav */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {([
              ['boter', 'Bøter'],
              ['leieavtaler', 'Leieavtaler'],
              ['kjoretoy', 'Kjøretøy'],
              ['saksbehandling', 'Saksbehandling'],
              ['rapporter', 'Rapporter'],
            ] as [B2BRentalTab, string][]).map(([key, label]) =>
              tabBtn(label, b2bRentalTab === key, () => { setB2bRentalTab(key); setSelectedRentalFineId(null) })
            )}
          </div>

          {/* Tab: Bøter */}
          {b2bRentalTab === 'boter' && (
            <div>
              <h2 style={{ marginBottom: '16px' }}>Bøter</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5' }}>
                      {['Regnr', 'Beløp', 'Dato', 'Sted', 'Status'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e0e0e0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rentalFines.map(fine => (
                      <tr key={fine.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{fine.licensePlate}</td>
                        <td style={{ padding: '10px 12px' }}>kr {fine.amount}</td>
                        <td style={{ padding: '10px 12px' }}>{fine.date} {fine.time}</td>
                        <td style={{ padding: '10px 12px' }}>{fine.location}</td>
                        <td style={{ padding: '10px 12px' }}>
                          {statusBadge(fine.status, rentalFineStatusColor(fine.status))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab: Leieavtaler */}
          {b2bRentalTab === 'leieavtaler' && (
            <div>
              <h2 style={{ marginBottom: '16px' }}>Leieavtaler</h2>
              <div style={{ display: 'grid', gap: '12px' }}>
                {mockRentalAgreements.map(ra => (
                  <div key={ra.id} style={{
                    background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '18px 20px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '16px' }}>{ra.renterName}</div>
                        <div style={{ fontSize: '13px', color: '#666' }}>{ra.renterEmail} • {ra.renterPhone}</div>
                      </div>
                      {statusBadge(
                        ra.status === 'active' ? 'Aktiv' : ra.status === 'completed' ? 'Avsluttet' : 'Kommende',
                        ra.status === 'active' ? 'green' : ra.status === 'completed' ? 'grey' : 'blue'
                      )}
                    </div>
                    <div style={{ fontSize: '14px', color: '#555', borderTop: '1px solid #f0f0f0', paddingTop: '10px', marginTop: '4px' }}>
                      <span style={{ marginRight: '20px' }}>{ra.vehicleLicensePlate}</span>
                      <span>{ra.startDate} → {ra.endDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab: Kjøretøy */}
          {b2bRentalTab === 'kjoretoy' && (
            <div>
              <h2 style={{ marginBottom: '16px' }}>Kjøretøyflåte</h2>
              <div style={{ display: 'grid', gap: '12px' }}>
                {mockRentalVehicles.map(v => (
                  <div key={v.id} style={{
                    background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px',
                    padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{v.licensePlate}</div>
                      <div style={{ fontSize: '13px', color: '#666' }}>{v.year} {v.make} {v.model}</div>
                    </div>
                    {statusBadge(
                      v.status.charAt(0).toUpperCase() + v.status.slice(1),
                      vehicleStatusColor(v.status)
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab: Saksbehandling */}
          {b2bRentalTab === 'saksbehandling' && (
            <div>
              <h2 style={{ marginBottom: '16px' }}>Saksbehandling</h2>

              {selectedRentalFine ? (
                <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '12px', padding: '24px' }}>
                  <button
                    onClick={() => setSelectedRentalFineId(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', marginBottom: '16px', fontSize: '14px' }}
                  >
                    ← Tilbake til liste
                  </button>
                  <h3 style={{ marginBottom: '4px' }}>Bot #{selectedRentalFine.id} — {selectedRentalFine.licensePlate}</h3>
                  <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                    {selectedRentalFine.date} {selectedRentalFine.time} • {selectedRentalFine.location} • kr {selectedRentalFine.amount}
                  </p>

                  {selectedRentalFine.matchedRenterName ? (
                    <div style={{
                      background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px',
                      padding: '16px', marginBottom: '20px',
                    }}>
                      <div style={{ fontWeight: 600, color: '#1e40af', marginBottom: '4px' }}>
                        Leietaker identifisert automatisk
                      </div>
                      <div style={{ fontSize: '14px', color: '#1d4ed8' }}>
                        {selectedRentalFine.matchedRenterName} hadde bilen på bot-datoen
                        {selectedRentalFine.matchedAgreementId && ` (leieavtale ${selectedRentalFine.matchedAgreementId})`}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      background: '#fef9c3', border: '1px solid #fde68a', borderRadius: '8px',
                      padding: '16px', marginBottom: '20px',
                    }}>
                      <div style={{ fontWeight: 600, color: '#92400e' }}>Ingen aktiv leieavtale funnet for denne datoen</div>
                    </div>
                  )}

                  <p style={{ fontWeight: 600, marginBottom: '12px' }}>Velg handling:</p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {selectedRentalFine.matchedRenterName && (
                      <button
                        onClick={() => handleRentalFineAction(selectedRentalFine.id, 'Krevd videre')}
                        style={{
                          padding: '10px 20px', background: 'var(--accent)', color: 'white',
                          border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
                        }}
                      >
                        Krev videre til {selectedRentalFine.matchedRenterName}
                      </button>
                    )}
                    <button
                      onClick={() => handleRentalFineAction(selectedRentalFine.id, 'Betalt')}
                      style={{
                        padding: '10px 20px', background: '#065f46', color: 'white',
                        border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
                      }}
                    >
                      Betal selv
                    </button>
                    <button
                      onClick={() => handleRentalFineAction(selectedRentalFine.id, 'Behandles')}
                      style={{
                        padding: '10px 20px', background: '#92400e', color: 'white',
                        border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
                      }}
                    >
                      Anke boten
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {rentalFines.map(fine => (
                    <div key={fine.id} style={{
                      background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px',
                      padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px',
                      cursor: 'pointer',
                    }}
                      onClick={() => setSelectedRentalFineId(fine.id)}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, marginBottom: '2px' }}>
                          {fine.licensePlate} — kr {fine.amount}
                        </div>
                        <div style={{ fontSize: '13px', color: '#666' }}>
                          {fine.date} • {fine.location}
                        </div>
                        {fine.matchedRenterName && (
                          <div style={{ fontSize: '13px', color: '#1d4ed8', marginTop: '2px' }}>
                            Leietaker: {fine.matchedRenterName}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {statusBadge(fine.status, rentalFineStatusColor(fine.status))}
                        <span style={{ color: '#999', fontSize: '18px' }}>›</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Rapporter (rental) */}
          {b2bRentalTab === 'rapporter' && (
            <div>
              <h2 style={{ marginBottom: '16px' }}>Rapporter</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                {[
                  { label: 'Totalt bøter', value: rentalFines.length.toString(), color: '#003366' },
                  { label: 'Totalt beløp', value: `kr ${rentalFines.reduce((s, f) => s + f.amount, 0)}`, color: '#003366' },
                  { label: 'Krevd videre', value: rentalFines.filter(f => f.status === 'Krevd videre').length.toString(), color: '#065f46' },
                  { label: 'Ubehandlet', value: rentalFines.filter(f => f.status === 'Ny').length.toString(), color: '#dc2626' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '18px' }}>
                    <p style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>{label}</p>
                    <p style={{ fontSize: '22px', fontWeight: 700, color }}>{value}</p>
                  </div>
                ))}
              </div>
              <h3 style={{ marginBottom: '12px' }}>Statusfordeling</h3>
              {(['Ny', 'Kobling funnet', 'Behandles', 'Betalt', 'Krevd videre'] as RentalFineStatus[]).map(s => {
                const count = rentalFines.filter(f => f.status === s).length
                return (
                  <div key={s} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 16px', background: '#fff', border: '1px solid #e8e8e8',
                    borderRadius: '8px', marginBottom: '6px',
                  }}>
                    {statusBadge(s, rentalFineStatusColor(s))}
                    <span style={{ fontWeight: 600 }}>{count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── SCREEN: Private dashboard ──────────────────────────────────────────────

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
            <button
              onClick={() => setScreen('notifications')}
              style={{
                padding: '10px 20px',
                background: (screen as string) === 'notifications' ? 'var(--accent)' : '#f0f0f0',
                color: (screen as string) === 'notifications' ? 'white' : 'var(--text-primary)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Varsler
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
                {[1, 2].map(s => (
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

              {appealStep === 2 && (
                <>
                  <h3 style={{ marginBottom: '4px' }}>Dokumentasjon</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                    Last opp bilder eller dokumenter som støtter klagen din
                  </p>

                  {[
                    { label: 'Bilde av skilt', key: 'skilt' },
                    { label: 'Bilde av bilen', key: 'bil' },
                    { label: 'Bilde av parkeringsplassen', key: 'plass' },
                    { label: 'Andre dokumenter', key: 'annet' },
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

          {appealStep === 3 && (
            <div className={styles.fineCard} style={{ marginTop: '20px', textAlign: 'center', padding: '30px' }}>
              <div style={{ marginBottom: '12px' }}></div>
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

  if (screen === 'notifications' && currentUser) {
    const anyEnabled = notificationPrefs.email || notificationPrefs.payment || notificationPrefs.appeal

    const handleSaveNotifications = async () => {
      setNotifSaveStatus('saving')
      try {
        const res = await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_fine',
            userId: currentUser.id,
            email: notificationPrefs.email ? notifEmail : undefined,
            phone: notificationPrefs.sms ? notifPhone : undefined,
            fine: { amount: 0, location: 'Test', date: new Date().toISOString().slice(0, 10) },
          }),
        })
        if (res.ok) {
          setNotifSaveStatus('saved')
        } else {
          setNotifSaveStatus('error')
        }
      } catch {
        setNotifSaveStatus('error')
      }
      setTimeout(() => setNotifSaveStatus('idle'), 3000)
    }

    const toggleStyle = (active: boolean): React.CSSProperties => ({
      display: 'inline-block',
      width: 44,
      height: 24,
      borderRadius: 12,
      background: active ? '#003366' : '#ccc',
      position: 'relative',
      cursor: 'pointer',
      transition: 'background 0.2s',
      flexShrink: 0,
    })

    const knobStyle = (active: boolean): React.CSSProperties => ({
      position: 'absolute',
      top: 3,
      left: active ? 23 : 3,
      width: 18,
      height: 18,
      borderRadius: '50%',
      background: 'white',
      transition: 'left 0.2s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    })

    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : ''}`}>
        <div className={styles.dashboard}>
          <div className={styles.header}>
            <div>
              <h1>Varsler</h1>
              <p className={styles.subtitle}>{currentUser.name}</p>
            </div>
            <button className={styles.btnLogout} onClick={handleLogout}>{t.logout}</button>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {(['dashboard', 'history', 'appeals', 'notifications'] as Screen[]).map((s) => {
              const labels: Record<string, string> = {
                dashboard: t.myFines,
                history: t.paymentHistory,
                appeals: t.appeals,
                notifications: 'Varsler',
              }
              return (
                <button
                  key={s}
                  onClick={() => setScreen(s)}
                  style={{
                    padding: '10px 20px',
                    background: screen === s ? 'var(--accent)' : '#f0f0f0',
                    color: screen === s ? 'white' : 'var(--text-primary)',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  {labels[s]}
                </button>
              )
            })}
          </div>

          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '28px', maxWidth: 560 }}>
            <h2 style={{ marginTop: 0, marginBottom: '6px', color: '#003366' }}>Varslingsinnstillinger</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
              Velg hvilke varsler du ønsker å motta på e-post og SMS.
            </p>

            {/* Status */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '8px 14px', borderRadius: '20px', marginBottom: '24px',
              background: anyEnabled ? '#d1fae5' : '#fef3c7',
              color: anyEnabled ? '#065f46' : '#92400e',
              fontSize: '13px', fontWeight: 600,
            }}>
              {anyEnabled ? 'Varsler er aktivert' : 'Varsler er ikke satt opp'}
            </div>

            {/* Kanalvalg */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Varslingskanal</div>
              {[
                { key: 'email' as const, icon: '', label: 'E-post', desc: 'Varsel sendes til din e-postadresse' },
                { key: 'sms' as const, icon: '', label: 'SMS', desc: 'Varsel sendes som tekstmelding til mobilen' },
              ].map(({ key, icon, label, desc }) => (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px', marginBottom: '8px', borderRadius: '10px',
                  border: `2px solid ${notificationPrefs[key] ? '#003366' : 'var(--border-color)'}`,
                  background: notificationPrefs[key] ? (darkMode ? '#1a2a3a' : '#f0f4ff') : 'transparent',
                  cursor: 'pointer', transition: 'all 0.2s',
                }} onClick={() => setNotificationPrefs(prev => ({ ...prev, [key]: !prev[key] }))}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '2px' }}>{label}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{desc}</div>
                    </div>
                  </div>
                  <div style={toggleStyle(notificationPrefs[key])} role="switch" aria-checked={notificationPrefs[key]}>
                    <div style={knobStyle(notificationPrefs[key])} />
                  </div>
                </div>
              ))}
            </div>

            {/* Hva varsles om */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Hva vil du varsles om?</div>
              {[
                { key: 'payment' as const, label: 'Ny parkeringsbot', desc: 'Øyeblikkelig varsel når du mottar en bot' },
                { key: 'appeal' as const, label: 'Forfall og påminnelser', desc: 'Påminnelse 3 dager før betalingsfristen' },
              ].map(({ key, label, desc }) => (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 0', borderBottom: '1px solid var(--border-color)',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '2px' }}>{label}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{desc}</div>
                  </div>
                  <div
                    style={toggleStyle(notificationPrefs[key])}
                    onClick={() => setNotificationPrefs(prev => ({ ...prev, [key]: !prev[key] }))}
                    role="switch"
                    aria-checked={notificationPrefs[key]}
                  >
                    <div style={knobStyle(notificationPrefs[key])} />
                  </div>
                </div>
              ))}
            </div>

            {/* E-post */}
            {notificationPrefs.email && (
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>E-postadresse</label>
                <input
                  type="email"
                  value={notifEmail}
                  placeholder="din@epost.no"
                  onChange={(e) => setNotifEmail(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px',
                    border: '1px solid var(--border-color)', background: 'var(--card-bg)',
                    color: 'var(--text-primary)', fontSize: '15px', boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            {/* SMS / Telefon */}
            {notificationPrefs.sms && (
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>Mobilnummer</label>
                <input
                  type="tel"
                  value={notifPhone}
                  placeholder="+47 900 00 000"
                  onChange={(e) => setNotifPhone(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px',
                    border: '1px solid var(--border-color)', background: 'var(--card-bg)',
                    color: 'var(--text-primary)', fontSize: '15px', boxSizing: 'border-box',
                  }}
                />
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  Inkluder landkode, f.eks. +47 for Norge
                </p>
              </div>
            )}

            {/* Lagre */}
            <button
              onClick={handleSaveNotifications}
              disabled={notifSaveStatus === 'saving'}
              style={{
                marginTop: '8px', padding: '12px 28px',
                background: notifSaveStatus === 'saving' ? '#ccc' : '#003366',
                color: 'white', border: 'none', borderRadius: '8px',
                fontWeight: 700, fontSize: '15px', cursor: notifSaveStatus === 'saving' ? 'not-allowed' : 'pointer',
                width: '100%',
              }}
            >
              {notifSaveStatus === 'saving' ? 'Lagrer...' : 'Lagre og test varsler'}
            </button>

            {notifSaveStatus === 'saved' && (
              <p style={{ marginTop: '12px', color: '#065f46', fontWeight: 600 }}>
                Lagret! {notificationPrefs.email && notifEmail ? 'Test-e-post sendt.' : ''} {notificationPrefs.sms && notifPhone ? 'Test-SMS sendt.' : ''}
              </p>
            )}
            {notifSaveStatus === 'error' && (
              <p style={{ marginTop: '12px', color: '#dc2626', fontWeight: 600 }}>Kunne ikke lagre — sjekk kontaktinfo og prøv igjen.</p>
            )}
          </div>
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
