'use client'

import React, { useState, useEffect } from 'react'
import { supabase, signIn, signUp, signOut, getProfile, getFines } from '@/lib/supabase'

/* ── Types ── */
interface User {
  id: string
  email: string
  phone: string
  name: string
  license_plate: string
}

type FineStatus = 'ubetalt' | 'pending' | 'betalt'

interface Fine {
  id: string
  loc: string
  area: string
  amount: number
  date: string
  deadline: string
  status: FineStatus
  plate: string
  ref: string
}

type Tab = 'hjem' | 'boter' | 'profil'
type Screen = 'login' | 'register' | 'dash'

/* ── Sample data ── */
const SAMPLE_FINES: Fine[] = [
  { id:'1', loc:'Karl Johans gt.', area:'Sentrum, Oslo',   amount:900, date:'15. sep 2026', deadline:'28. sep 2026',       status:'ubetalt', plate:'AB 12345', ref:'PB-2026-001' },
  { id:'2', loc:'Grünerløkka',     area:'Oslo',            amount:750, date:'10. sep 2026', deadline:'10. okt 2026',       status:'ubetalt', plate:'AB 12345', ref:'PB-2026-002' },
  { id:'3', loc:'Vippetangen',     area:'Bjørvika, Oslo',  amount:750, date:'5. sep 2026',  deadline:'Under behandling',   status:'pending', plate:'AB 12345', ref:'PB-2026-003' },
  { id:'4', loc:'Majorstuen',      area:'Oslo',            amount:600, date:'12. aug 2026', deadline:'Betalt',             status:'betalt',  plate:'AB 12345', ref:'PB-2026-004' },
]

const CHART_DATA = [
  { month:'apr', val:1 }, { month:'mai', val:2 }, { month:'jun', val:0 },
  { month:'jul', val:1 }, { month:'aug', val:1 }, { month:'sep', val:3 },
]

/* ── Helpers ── */
function sColor(s: FineStatus) { return s==='ubetalt'?'red':s==='pending'?'orange':'green' }
function sIcon(s: FineStatus)  { return s==='ubetalt'?'🔴':s==='pending'?'🟡':'🟢' }
function sLabel(s: FineStatus) { return s==='ubetalt'?'Ubetalt':s==='pending'?'Under behandling':'Betalt' }

export default function App() {
  const [screen, setScreen]   = useState<Screen>('login')
  const [loading, setLoading]   = useState(false)
  const [authError, setAuthError] = useState('')
  const [tab, setTab]         = useState<Tab>('hjem')
  const [filter, setFilter]   = useState<string>('alle')
  const [fines, setFines]     = useState<Fine[]>(SAMPLE_FINES)
  const [toast, setToast]     = useState<string>('')
  const [toastVisible, setToastVisible] = useState(false)
  const [time, setTime]       = useState('')
  const [user, setUser]       = useState({ name:'Khadar Ahmed', email:'khadar@epost.no', plate:'AB 12345' })

  // Login form
  const [plate, setPlate]     = useState('AB 12345')
  const [loginEmail, setLoginEmail] = useState('')
  const [pass, setPass]       = useState('')
  // Register form
  const [regName, setRegName]   = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPlate, setRegPlate] = useState('')

  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setTime(d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0'))
    }
    tick()
    const iv = setInterval(tick, 30000)
    return () => clearInterval(iv)
  }, [])

  function showToast(msg: string) {
    setToast(msg); setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2200)
  }

  async function doLogin() {
    setLoading(true); setAuthError('')
    const { data, error } = await signIn(loginEmail, pass)
    if (error) { setAuthError('Feil e-post eller passord'); setLoading(false); return }
    const profile = await getProfile(data.user!.id)
    const dbFines = await getFines(data.user!.id)
    setUser({
      name: profile?.full_name || data.user!.email?.split('@')[0] || 'Bruker',
      email: data.user!.email || '',
      plate: plate.toUpperCase() || ''
    })
    if (dbFines.length > 0) {
      setFines(dbFines.map(f => ({
        id: f.id, loc: f.location||'Ukjent', area: f.area||'', amount: f.amount,
        date: f.issue_date||'', deadline: f.deadline||'', status: f.status,
        plate: f.plate, ref: f.reference||''
      })))
    }
    setLoading(false); setScreen('dash'); setTab('hjem')
  }

  async function doRegister() {
    if (!regName || !regEmail || !pass || !regPlate) { setAuthError('Fyll ut alle felt'); return }
    setLoading(true); setAuthError('')
    const { data, error } = await signUp(regEmail, pass, regName, regPhone)
    if (error) { setAuthError(error.message); setLoading(false); return }
    if (data.user) {
      await supabase.from('vehicles').insert({ user_id: data.user.id, plate: regPlate.toUpperCase() })
    }
    setUser({ name: regName, email: regEmail, plate: regPlate.toUpperCase() })
    setLoading(false); setScreen('dash'); setTab('hjem')
  }

  async function doLogout() { await signOut(); setScreen('login'); setFines(SAMPLE_FINES) }

  function payFine(id: string) {
    setFines(f => f.map(x => x.id===id ? {...x, status:'betalt', deadline:'Betalt'} : x))
    showToast('Betaling registrert ✓')
  }

  const filtered    = filter==='alle' ? fines : fines.filter(f => f.status===filter)
  const totalUnpaid = fines.filter(f=>f.status==='ubetalt').reduce((s,f)=>s+f.amount,0)
  const unpaidCount = fines.filter(f=>f.status==='ubetalt').length
  const totalPaid   = fines.filter(f=>f.status==='betalt').reduce((s,f)=>s+f.amount,0)
  const pendingCount= fines.filter(f=>f.status==='pending').length
  const initials    = user.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  const maxVal      = Math.max(...CHART_DATA.map(d=>d.val), 1)
  const urgentFine  = fines.find(f=>f.status==='ubetalt')

  /* ════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════ */
  return (
    <div style={S.app}>
      <div style={S.phone}>

        {/* ── LOGIN ── */}
        {screen==='login' && (
          <div style={S.authBg}>
            <div style={S.authLogo}>🅿️</div>
            <div style={S.authTitle}>Parkeringsbot</div>
            <div style={S.authSub}>Administrer parkeringsbøter enkelt og sikkert</div>
            <div style={S.authCard}>
              <div style={S.authLabel}>E-post</div>
              <input style={S.authInput} type="email" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} placeholder="din@epost.no" autoComplete="email" />
              <div style={S.authLabel}>Passord</div>
              <input style={S.authInput} type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" />
              {authError && <div style={{color:'#EF4444',fontSize:13,marginBottom:8}}>{authError}</div>}
              <button style={{...S.btnPrimary, opacity: loading?0.6:1}} onClick={doLogin} disabled={loading}>{loading?'Logger inn…':'Logg inn'}</button>
              <div style={S.bankidBadge}>
                <div style={S.bankidDot} />
                <span style={S.bankidText}>Sikker innlogging · Data kryptert</span>
              </div>
              <div style={{textAlign:'center',marginTop:12,fontSize:12,color:'#9CA3AF'}}>
                Ved å logge inn godtar du vår{' '}
                <a href="/personvern" target="_blank" style={{color:'#254FEB'}}>personvernerklæring</a>
              </div>
            </div>
            <div style={S.authLink}>Ikke konto? <span style={S.authLinkSpan} onClick={()=>setScreen('register')}>Opprett konto gratis</span></div>
          </div>
        )}

        {/* ── REGISTER ── */}
        {screen==='register' && (
          <div style={S.authBg}>
            <div style={S.authLogo}>🅿️</div>
            <div style={S.authTitle}>Opprett konto</div>
            <div style={S.authSub}>Kom i gang på under ett minutt</div>
            <div style={S.authCard}>
              <div style={S.authLabel}>Fullt navn</div>
              <input style={S.authInput} value={regName} onChange={e=>setRegName(e.target.value)} placeholder="Khadar Ahmed" />
              <div style={S.authLabel}>E-post</div>
              <input style={S.authInput} type="email" value={regEmail} onChange={e=>setRegEmail(e.target.value)} placeholder="khadar@epost.no" />
              <div style={S.authLabel}>Telefon</div>
              <input style={S.authInput} type="tel" value={regPhone} onChange={e=>setRegPhone(e.target.value)} placeholder="+47 900 00 000" />
              <div style={S.authLabel}>Registreringsnummer</div>
              <input style={S.authInput} value={regPlate} onChange={e=>setRegPlate(e.target.value)} placeholder="AB 12345" />
              <div style={S.authLabel}>Passord</div>
              <input style={S.authInput} type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Minst 8 tegn" />
              {authError && <div style={{color:'#EF4444',fontSize:13,marginBottom:8}}>{authError}</div>}
              <button style={{...S.btnPrimary, opacity: loading?0.6:1}} onClick={doRegister} disabled={loading}>{loading?'Oppretter…':'Opprett konto'}</button>
              <div style={{textAlign:'center',marginTop:12,fontSize:12,color:'#9CA3AF'}}>
                Ved registrering godtar du vår{' '}
                <a href="/personvern" target="_blank" style={{color:'#254FEB'}}>personvernerklæring</a>
              </div>
            </div>
            <div style={S.authLink}>Har du konto? <span style={S.authLinkSpan} onClick={()=>setScreen('login')}>Logg inn</span></div>
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {screen==='dash' && (
          <div style={S.dash}>
            {/* Status bar */}
            <div style={S.statusbar}>
              <span style={S.sbTime}>{time}</span>
              <span style={S.sbIcons}>▲ ● ▌▌</span>
            </div>

            {/* ── HJEM ── */}
            {tab==='hjem' && (
              <div style={S.scroll}>
                {/* Hero */}
                <div style={S.hjemHero}>
                  <div style={S.hjemGreeting}>God dag 👋</div>
                  <div style={S.hjemName}>{user.name}</div>
                  <div style={S.hjemPlate}>{user.plate}</div>
                </div>

                {/* Big summary */}
                <div style={S.summaryCard}>
                  <div style={S.summaryLabel}>Ubetalt</div>
                  <div style={S.summaryAmount}>{totalUnpaid} kr</div>
                  <div style={S.summaryMeta}>{unpaidCount} {unpaidCount===1?'bot':'bøter'} venter på betaling</div>
                  <button style={S.summaryBtn} onClick={()=>setTab('boter')}>Se mine bøter →</button>
                </div>

                {/* Status row */}
                <div style={S.statusRow}>
                  <div style={S.statusItem}>
                    <div style={{...S.statusDot,background:'#EF4444'}}/>
                    <div><div style={S.statusNum}>{unpaidCount}</div><div style={S.statusLbl}>Ubetalt</div></div>
                  </div>
                  <div style={S.statusDivider}/>
                  <div style={S.statusItem}>
                    <div style={{...S.statusDot,background:'#F97316'}}/>
                    <div><div style={S.statusNum}>{pendingCount}</div><div style={S.statusLbl}>Behandles</div></div>
                  </div>
                  <div style={S.statusDivider}/>
                  <div style={S.statusItem}>
                    <div style={{...S.statusDot,background:'#22C55E'}}/>
                    <div><div style={S.statusNum}>{fines.filter(f=>f.status==='betalt').length}</div><div style={S.statusLbl}>Betalt</div></div>
                  </div>
                </div>
              </div>
            )}

            {/* ── BØTER ── */}
            {tab==='boter' && (
              <div style={S.scroll}>
                <div style={S.boterTopbar}>
                  <div style={{color:'#fff',fontSize:21,fontWeight:800}}>Mine bøter</div>
                  <div style={{color:'rgba(255,255,255,.55)',fontSize:13,marginTop:2}}>{fines.length} bøter totalt · {unpaidCount} krever handling</div>
                </div>
                <div style={S.filterRow}>
                  {[
                    {key:'alle',  label:`Alle (${fines.length})`},
                    {key:'ubetalt', label:`Ubetalt (${fines.filter(f=>f.status==='ubetalt').length})`},
                    {key:'pending', label:`Under behandling (${pendingCount})`},
                    {key:'betalt',  label:`Betalt (${fines.filter(f=>f.status==='betalt').length})`},
                  ].map(c => (
                    <button key={c.key} onClick={()=>setFilter(c.key)}
                      style={{...S.chip, ...(filter===c.key ? S.chipActive : {})}}>
                      {c.label}
                    </button>
                  ))}
                </div>
                <div style={{paddingBottom:16}}>
                  {filtered.length===0
                    ? <div style={{textAlign:'center',padding:'48px 16px',color:'#6B7280',fontSize:14}}>Ingen bøter funnet</div>
                    : filtered.map(f => (
                      <div key={f.id} style={S.fineCard}>
                        <div style={{height:3,background:f.status==='ubetalt'?'#EF4444':f.status==='pending'?'#F97316':'#22C55E'}} />
                        <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px 12px'}}>
                          <div style={{width:46,height:46,borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0,
                            background:f.status==='ubetalt'?'#FEF2F2':f.status==='pending'?'#FFF7ED':'#F0FDF4'}}>
                            {sIcon(f.status)}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:15,fontWeight:700,color:'#374151'}}>{f.loc}</div>
                            <div style={{fontSize:12,color:'#6B7280',marginTop:2}}>{f.area} · {f.date}</div>
                            <div style={{marginTop:6}}>
                              <span style={{borderRadius:6,padding:'3px 8px',fontSize:11,fontWeight:700,
                                background:f.status==='ubetalt'?'#FEF2F2':f.status==='pending'?'#FFF7ED':'#F0FDF4',
                                color:f.status==='ubetalt'?'#EF4444':f.status==='pending'?'#F97316':'#22C55E'}}>
                                {sLabel(f.status)}
                              </span>
                            </div>
                          </div>
                          <div style={{fontSize:22,fontWeight:800,color:'#374151',flexShrink:0}}>{f.amount} kr</div>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',borderTop:'1px solid #E5E7EB'}}>
                          <div style={{padding:'10px 16px',borderRight:'1px solid #E5E7EB'}}>
                            <div style={{fontSize:10,color:'#6B7280',fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em'}}>Forfallsdato</div>
                            <div style={{fontSize:13,fontWeight:600,color:f.status==='ubetalt'?'#EF4444':'#6B7280',marginTop:2}}>{f.deadline}</div>
                          </div>
                          <div style={{padding:'10px 16px'}}>
                            <div style={{fontSize:10,color:'#6B7280',fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em'}}>Referanse</div>
                            <div style={{fontSize:13,fontWeight:600,color:'#374151',marginTop:2}}>{f.ref}</div>
                          </div>
                        </div>
                        <div style={{display:'flex',gap:8,padding:'12px 16px 14px',borderTop:'1px solid #E5E7EB'}}>
                          {f.status!=='betalt'
                            ? <button style={S.btnPay} onClick={()=>payFine(f.id)}>Betal {f.amount} kr</button>
                            : <button style={{...S.btnPay,background:'#F0FDF4',color:'#22C55E',boxShadow:'none'}} disabled>Betalt ✓</button>
                          }
                          <button style={S.btnDetail} onClick={()=>showToast(`Detaljer for ${f.ref}`)}>Detaljer</button>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {/* ── PROFIL ── */}
            {tab==='profil' && (
              <div style={S.scroll}>
                <div style={S.profileHeader}>
                  <div style={S.avatarLg}>{initials}</div>
                  <div style={{color:'#fff',fontSize:20,fontWeight:800,marginTop:12}}>{user.name}</div>
                  <div style={{color:'rgba(255,255,255,.6)',fontSize:13,marginTop:4,display:'flex',alignItems:'center',gap:6}}>
                    Registrert: <span style={{background:'rgba(255,255,255,.12)',borderRadius:6,padding:'2px 8px',fontSize:12,fontWeight:700,color:'#fff',letterSpacing:'.05em'}}>{user.plate}</span>
                  </div>
                </div>
                <div style={{display:'flex',gap:12,padding:'0 16px',marginTop:-18}}>
                  <div style={S.statCard}><div style={S.statVal}>{fines.length}</div><div style={S.statLbl}>Totalt bøter</div></div>
                  <div style={S.statCard}><div style={S.statVal}>{totalPaid} kr</div><div style={S.statLbl}>Betalt totalt</div></div>
                </div>

                {[
                  { title:'Kjøretøy', rows:[
                    { icon:'🚗', label:'Registreringsnummer', val:user.plate },
                    { icon:'➕', label:'Legg til kjøretøy',   val:'' },
                  ]},
                  { title:'Kontaktinformasjon', rows:[
                    { icon:'✉️', label:'E-post',  val:user.email },
                    { icon:'📱', label:'Telefon', val:'+47 900 00 000' },
                  ]},
                  { title:'Innstillinger', rows:[
                    { icon:'🔔', label:'Varsler',    val:'På' },
                    { icon:'🔒', label:'Personvern', val:'' },
                    { icon:'🏦', label:'BankID',     val:'Tilkoblet' },
                  ]},
                ].map(section => (
                  <div key={section.title} style={S.settingsSection}>
                    <div style={S.sectionTitle}>{section.title}</div>
                    {section.rows.map((row,i,arr) => (
                      <div key={row.label} onClick={()=>showToast(row.label)}
                        style={{...S.settingsRow,borderBottom:i<arr.length-1?'1px solid #E5E7EB':'none'}}>
                        <span style={{fontSize:20,marginRight:12}}>{row.icon}</span>
                        <span style={{flex:1,fontSize:15,color:'#374151',fontWeight:500}}>{row.label}</span>
                        {row.val && <span style={{fontSize:13,color:'#6B7280',marginRight:8}}>{row.val}</span>}
                        <span style={{color:'#D1D5DB',fontSize:12}}>›</span>
                      </div>
                    ))}
                  </div>
                ))}

                <button style={S.btnLogout} onClick={doLogout}>Logg ut</button>
                <div style={{height:20}} />
              </div>
            )}

            {/* Tab bar */}
            <div style={S.tabbar}>
              {([['hjem','🏠','Hjem'],['boter','🅿️','Bøter'],['profil','👤','Profil']] as const).map(([t,icon,label]) => (
                <button key={t} style={S.tabItem} onClick={()=>setTab(t)}>
                  <span style={{fontSize:22,lineHeight:1}}>{icon}</span>
                  <span style={{fontSize:10,fontWeight:tab===t?700:500,color:tab===t?'#254FEB':'#6B7280'}}>{label}</span>
                  <div style={{width:5,height:5,borderRadius:'50%',background:'#254FEB',visibility:tab===t?'visible':'hidden'}} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Toast */}
        <div style={{...S.toast,opacity:toastVisible?1:0}}>{toast}</div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   STYLES (inline — no CSS modules needed)
════════════════════════════════════════════ */
const NAVY  = '#0A1628'
const NAVY2 = '#0F1E38'
const BLUE  = '#254FEB'
const BLUE3 = '#1E3AAF'

const S: Record<string,React.CSSProperties> = {
  app:        { display:'flex',justifyContent:'center',alignItems:'flex-start',minHeight:'100vh',background:'#d8dce8',padding:'24px 16px',fontFamily:"'Inter',system-ui,sans-serif" },
  phone:      { width:'100%',maxWidth:430,minHeight:'min(812px,90svh)',display:'flex',flexDirection:'column',background:'#F1F3F7',overflow:'hidden',borderRadius:40,boxShadow:'0 40px 80px rgba(0,0,0,.3)',position:'relative' },

  // Auth
  authBg:     { flex:1,background:NAVY,display:'flex',flexDirection:'column',alignItems:'center',padding:'0 28px 36px',overflowY:'auto' },
  authLogo:   { marginTop:60,width:72,height:72,background:BLUE,borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center',fontSize:36,boxShadow:'0 8px 24px rgba(37,79,235,.4)' },
  authTitle:  { color:'#fff',fontSize:26,fontWeight:800,marginTop:20,letterSpacing:'-.5px' },
  authSub:    { color:'rgba(255,255,255,.55)',fontSize:14,marginTop:6,textAlign:'center' },
  authCard:   { background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:20,padding:24,width:'100%',marginTop:32 },
  authLabel:  { color:'rgba(255,255,255,.7)',fontSize:12,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8 },
  authInput:  { width:'100%',background:'rgba(255,255,255,.08)',border:'1.5px solid rgba(255,255,255,.15)',borderRadius:12,color:'#fff',fontSize:15,padding:'13px 16px',outline:'none',fontFamily:'inherit',marginBottom:16,display:'block' },
  bankidBadge:{ display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.12)',borderRadius:10,padding:'10px 14px',marginTop:16 },
  bankidDot:  { width:8,height:8,borderRadius:'50%',background:'#22C55E',flexShrink:0 },
  bankidText: { color:'rgba(255,255,255,.6)',fontSize:12 },
  authLink:   { color:'rgba(255,255,255,.55)',fontSize:14,marginTop:20,textAlign:'center',cursor:'pointer' },
  authLinkSpan:{ color:BLUE,fontWeight:600,textDecoration:'underline' },

  btnPrimary: { width:'100%',background:`linear-gradient(135deg,${BLUE} 0%,${BLUE3} 100%)`,color:'#fff',border:'none',borderRadius:14,fontSize:15,fontWeight:700,padding:15,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 16px rgba(37,79,235,.4)',display:'block' },

  // Dashboard
  dash:       { flex:1,display:'flex',flexDirection:'column',overflow:'hidden' },
  scroll:     { flex:1,overflowY:'auto' },
  statusbar:  { background:NAVY,height:44,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 20px',flexShrink:0 },
  sbTime:     { color:'#fff',fontSize:15,fontWeight:600 },
  sbIcons:    { color:'#fff',fontSize:12 },

  // Hjem
  hjemHero:     { background:`linear-gradient(160deg,${NAVY} 0%,${NAVY2} 100%)`,padding:'28px 24px 36px' },
  hjemGreeting: { color:'rgba(255,255,255,.5)',fontSize:13,marginBottom:4 },
  hjemName:     { color:'#fff',fontSize:26,fontWeight:800,letterSpacing:'-.3px' },
  hjemPlate:    { color:'rgba(255,255,255,.4)',fontSize:13,marginTop:6,fontWeight:500 },
  summaryCard:  { margin:'20px 16px 0',background:'#fff',borderRadius:20,padding:'32px 24px',boxShadow:'0 4px 20px rgba(0,0,0,.07)',border:'1px solid #E5E7EB',textAlign:'center' as const },
  summaryLabel: { fontSize:12,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'.08em',color:'#9CA3AF' },
  summaryAmount:{ fontSize:52,fontWeight:800,color:'#EF4444',letterSpacing:'-1.5px',margin:'8px 0 6px',lineHeight:1 },
  summaryMeta:  { fontSize:14,color:'#6B7280',marginBottom:24 },
  summaryBtn:   { width:'100%',background:`linear-gradient(135deg,${BLUE} 0%,${BLUE3} 100%)`,color:'#fff',border:'none',borderRadius:14,fontSize:15,fontWeight:700,padding:'14px',cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 16px rgba(37,79,235,.3)' },
  statusRow:    { display:'flex',alignItems:'center',background:'#fff',borderRadius:16,margin:'12px 16px 0',border:'1px solid #E5E7EB',overflow:'hidden' },
  statusItem:   { flex:1,display:'flex',alignItems:'center',gap:10,padding:'16px',justifyContent:'center' },
  statusDot:    { width:10,height:10,borderRadius:'50%',flexShrink:0 },
  statusNum:    { fontSize:18,fontWeight:800,color:'#374151' },
  statusLbl:    { fontSize:11,color:'#9CA3AF',fontWeight:500,marginTop:1 },
  statusDivider:{ width:1,height:40,background:'#E5E7EB',flexShrink:0 },

  // Bøter
  boterTopbar:{ background:NAVY,padding:'14px 20px 16px' },
  filterRow:  { display:'flex',gap:8,padding:'14px 16px 10px',overflowX:'auto' },
  chip:       { flexShrink:0,padding:'7px 14px',borderRadius:20,fontSize:13,fontWeight:600,cursor:'pointer',border:'1.5px solid #D1D5DB',background:'#fff',color:'#6B7280',fontFamily:'inherit' },
  chipActive: { background:BLUE,borderColor:BLUE,color:'#fff' },
  fineCard:   { background:'#fff',borderRadius:18,margin:'0 16px 12px',border:'1px solid #E5E7EB',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.06)' },
  btnPay:     { flex:1,background:`linear-gradient(135deg,${BLUE} 0%,${BLUE3} 100%)`,color:'#fff',border:'none',borderRadius:12,fontSize:14,fontWeight:700,padding:11,cursor:'pointer',fontFamily:'inherit' },
  btnDetail:  { padding:'11px 16px',border:'1.5px solid #D1D5DB',borderRadius:12,fontSize:14,fontWeight:600,color:'#6B7280',background:'none',cursor:'pointer',fontFamily:'inherit' },

  // Profil
  profileHeader:{ background:`linear-gradient(180deg,${NAVY} 0%,${NAVY2} 100%)`,padding:'24px 16px 32px',display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center' },
  avatarLg:   { width:76,height:76,borderRadius:'50%',background:`linear-gradient(135deg,${BLUE} 0%,${BLUE3} 100%)`,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:28,border:'3px solid rgba(255,255,255,.2)',boxShadow:'0 8px 20px rgba(0,0,0,.3)' },
  statCard:   { flex:1,background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 4px 16px rgba(0,0,0,.1)',border:'1px solid #E5E7EB' },
  statVal:    { fontSize:22,fontWeight:800,color:'#374151' },
  statLbl:    { fontSize:11,color:'#6B7280',fontWeight:500,marginTop:2 },
  settingsSection:{ margin:'20px 16px 0',background:'#fff',borderRadius:16,border:'1px solid #E5E7EB',overflow:'hidden' },
  sectionTitle:{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'#6B7280',padding:'12px 16px 4px' },
  settingsRow:{ display:'flex',alignItems:'center',padding:'14px 16px',cursor:'pointer' },
  btnLogout:  { width:'calc(100% - 32px)',margin:'16px 16px 4px',background:'#FEF2F2',border:'1.5px solid #FECACA',color:'#EF4444',borderRadius:14,fontSize:15,fontWeight:700,padding:15,cursor:'pointer',fontFamily:'inherit' },

  // Tabbar
  tabbar:     { display:'flex',background:'#fff',borderTop:'1px solid #E5E7EB',flexShrink:0 },
  tabItem:    { flex:1,display:'flex',flexDirection:'column',alignItems:'center',padding:'10px 4px 8px',cursor:'pointer',border:'none',background:'none',fontFamily:'inherit',gap:3 },

  // Toast
  toast:      { position:'fixed',bottom:100,left:'50%',transform:'translateX(-50%)',background:'#1F2937',color:'#fff',padding:'10px 20px',borderRadius:30,fontSize:13,fontWeight:600,transition:'opacity .3s',pointerEvents:'none',whiteSpace:'nowrap',zIndex:999 },
}
