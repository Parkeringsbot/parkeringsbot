'use client'

import React, { useState, useEffect } from 'react'
import { isSupabaseConfigured, supabase, ParkingFine } from '@/lib/supabase'
import styles from './page.module.css'

export default function Home() {
  const [screen, setScreen] = useState<'login' | 'search' | 'dashboard' | 'admin'>('login')
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [fines, setFines] = useState<ParkingFine[]>([])
  const [searchError, setSearchError] = useState('')
  const [user, setUser] = useState<{ plate: string; name: string } | null>(null)

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

  const testUsers = [
    { plate: 'AB12345', name: 'Ola Nordmann' },
    { plate: 'CD98765', name: 'Kari Hansen' },
    { plate: 'EF54321', name: 'Per Larsen' },
  ]

  const handleLogin = async (plate: string) => {
    if (!plate.trim()) {
      setSearchError('Vennligst skriv inn registreringsnummeret')
      return
    }
    
    const testUser = testUsers.find((u) => u.plate === plate)
    const user = testUser || { plate: plate.toUpperCase(), name: `Kjøretøy ${plate.toUpperCase()}` }
    
    setUser(user)
    setLicensePlate(plate)
    await searchFines(plate)
    setScreen('dashboard')
  }

  const searchFines = async (plate: string) => {
    if (!isSupabaseConfigured || !supabase) {
      setFines(demoFines.filter((fine) => fine.license_plate === plate.toUpperCase()))
      setSearchError('')
      return
    }

    try {
      const { data, error } = await supabase
        .from('parking_fines')
        .select('*')
        .eq('license_plate', plate.toUpperCase())
        .order('date', { ascending: false })

      if (error) {
        console.error('Error:', error)
        setSearchError('Feil ved henting av bøter')
        return
      }

      setFines(data || [])
      setSearchError('')
    } catch (err) {
      console.error(err)
      setSearchError('Noe gikk galt')
    }
  }

  const handleAdminLogin = async () => {
    const correctPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123'
    if (adminPassword === correctPassword) {
      setIsAdmin(true)
      setScreen('admin')
      setAdminPassword('')
    } else {
      setSearchError('Feil passord')
    }
  }

  const handlePayFine = async (fineId: number) => {
    if (!isSupabaseConfigured || !supabase) {
      setFines((currentFines) =>
        currentFines.map((fine) => (fine.id === fineId ? { ...fine, paid: true } : fine)),
      )
      return
    }

    try {
      const { error } = await supabase
        .from('parking_fines')
        .update({ paid: true })
        .eq('id', fineId)

      if (error) throw error

      setFines(fines.map((f) => (f.id === fineId ? { ...f, paid: true } : f)))
      alert('Betaling registrert!')
    } catch (err) {
      console.error(err)
      alert('Feil ved betaling')
    }
  }

  const handleLogout = () => {
    setScreen('login')
    setUser(null)
    setFines([])
    setLicensePlate('')
  }

  const handleAdminLogout = () => {
    setIsAdmin(false)
    setScreen('login')
  }

  if (screen === 'login') {
    return (
      <div className={styles.container}>
        <div className={styles.loginBox}>
          <h1>Parkeringsbot</h1>
          <p className={styles.tagline}>Administrer dine parkingsbøter</p>

          <div className={styles.loginSection}>
            <h2>Søk etter dine bøter</h2>
            <div className={styles.formGroup}>
              <label>Registreringsnummer</label>
              <input
                type="text"
                placeholder="f.eks. AB12345"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
              />
            </div>
            <button
              className={styles.btnPrimary}
              onClick={() => handleLogin(licensePlate)}
            >
              Søk
            </button>
            {searchError && <p className={styles.error}>{searchError}</p>}
          </div>

          <div className={styles.divider}>eller</div>

          <div className={styles.adminSection}>
            <h3>Admin-innlogging</h3>
            <div className={styles.formGroup}>
              <label>Passord</label>
              <input
                type="password"
                placeholder="Passord"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </div>
            <button
              className={styles.btnSecondary}
              onClick={handleAdminLogin}
            >
              Logg inn som admin
            </button>
          </div>

          <div className={styles.testUsers}>
            <p className={styles.testLabel}>Test-kjøretøyer:</p>
            <div className={styles.testGrid}>
              {testUsers.map((user) => (
                <button
                  key={user.plate}
                  className={styles.testBtn}
                  onClick={() => handleLogin(user.plate)}
                >
                  {user.plate}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (screen === 'dashboard' && user) {
    const totalAmount = fines.reduce((sum, f) => sum + f.amount, 0)
    const unpaidCount = fines.filter((f) => !f.paid).length

    return (
      <div className={styles.container}>
        <div className={styles.dashboard}>
          <div className={styles.header}>
            <div>
              <h1>Mine parkingsbøter</h1>
              <p className={styles.subtitle}>Kjøretøy: {user.plate}</p>
            </div>
            <button
              className={styles.btnLogout}
              onClick={handleLogout}
            >
              Logg ut
            </button>
          </div>

          <div className={styles.summary}>
            <div className={styles.summaryCard}>
              <p className={styles.summaryLabel}>Totalt beløp</p>
              <p className={styles.summaryValue}>kr {totalAmount}</p>
            </div>
            <div className={styles.summaryCard}>
              <p className={styles.summaryLabel}>Ubetalt</p>
              <p className={styles.summaryValue}>{unpaidCount}</p>
            </div>
          </div>

          {fines.length === 0 ? (
            <div className={styles.noFines}>
              <p>Ingen parkingsbøter funnet for dette kjøretøyet</p>
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
                      className={`${styles.status} ${
                        fine.paid ? styles.paid : styles.unpaid
                      }`}
                    >
                      {fine.paid ? 'Betalt' : 'Ubetalt'}
                    </span>
                  </div>
                  <p className={styles.fineDetail}>{fine.location}</p>
                  <p className={styles.fineDetail}>{fine.municipality}</p>

                  {!fine.paid && (
                    <button
                      className={styles.btnPay}
                      onClick={() => handlePayFine(fine.id)}
                    >
                      Betale nå
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (screen === 'admin' && isAdmin) {
    return (
      <div className={styles.container}>
        <div className={styles.adminPanel}>
          <div className={styles.header}>
            <h1>Admin Panel</h1>
            <button
              className={styles.btnLogout}
              onClick={handleAdminLogout}
            >
              Logg ut
            </button>
          </div>

          <div className={styles.adminInfo}>
            <p>Du er nå logget inn som admin. Du kan se og administrere alle parkingsbøter.</p>
            <p>
              Gå til:{' '}
              <a href={process.env.NEXT_PUBLIC_SUPABASE_URL} target="_blank" rel="noopener noreferrer">
                Supabase Dashboard
              </a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}
