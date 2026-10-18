/* Delt mellom serveren (layout) og nettleseren (temavalg). */
export const THEME_KEY = 'parkeringsbot-tema'

/** Kjøres i <head> før siden tegnes, så det ikke blinker feil farge. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='lys'||t==='mork')document.documentElement.setAttribute('data-theme',t)}catch(e){}`
