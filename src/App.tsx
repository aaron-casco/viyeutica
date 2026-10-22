import { useEffect, useMemo, useState } from 'react'
import {
  Bell, BookOpen, CalendarClock, CalendarDays, ChevronDown, ClipboardCheck,
  FileOutput, Gauge, GraduationCap, LayoutGrid, Menu, PanelLeftClose, Settings,
  ShieldCheck, SlidersHorizontal, Sparkles, Users, X,
} from 'lucide-react'
import { Logo } from './components/Logo'
import { PlaceholderPage } from './components/PlaceholderPage'
import { ThemeToggle } from './components/ThemeToggle'
import { Dashboard } from './pages/Dashboard'
import { SetupWizard } from './pages/SetupWizard'
import { GroupsPage } from './pages/GroupsPage'
import { SchedulePage } from './pages/SchedulePage'
import { useProject } from './hooks/useProject'
import { useTheme } from './hooks/useTheme'

const navigation = [
  { path: '/', label: 'Inicio', icon: Gauge },
  { path: '/centro', label: 'Centro', icon: GraduationCap },
  { path: '/cursos', label: 'Curso académico', icon: CalendarDays },
  { path: '/profesorado', label: 'Profesorado', icon: Users },
  { path: '/grupos', label: 'Grupos', icon: LayoutGrid },
  { path: '/jornada', label: 'Jornada y sesiones', icon: CalendarClock },
  { path: '/materias', label: 'Materias', icon: BookOpen },
  { path: '/disponibilidad', label: 'Disponibilidad', icon: CalendarClock },
  { path: '/reglas', label: 'Reglas', icon: SlidersHorizontal },
  { path: '/horarios', label: 'Horarios', icon: ClipboardCheck },
  { path: '/generacion', label: 'Generación', icon: Sparkles },
  { path: '/auditoria', label: 'Auditoría', icon: ShieldCheck },
  { path: '/exportaciones', label: 'Exportaciones', icon: FileOutput },
  { path: '/configuracion', label: 'Configuración', icon: Settings },
]

const descriptions: Record<string,string> = {
  '/cursos': 'Creación, histórico y estado de los cursos académicos.',
  '/profesorado': 'Plantilla docente, especialidades, jornadas, cargos y reducciones.',
  '/materias': 'Plan de estudios, cargas horarias y requisitos docentes.',
  '/disponibilidad': 'Franjas disponibles, itinerancias, bloqueos y preferencias.',
  '/reglas': 'Restricciones legales, reglas del centro y preferencias ponderadas.',
  '/horarios': 'Vista semanal por grupos, profesores y recursos.',
  '/generacion': 'Prevalidación, generación y comparación de propuestas.',
  '/auditoria': 'Comprobación independiente de coherencia, cargas y conflictos.',
  '/exportaciones': 'Excel, PDF e informes del horario y su auditoría.',
}

const getRoute = () => {
  const raw = window.location.hash.replace(/^#/,'') || '/'
  return raw.startsWith('/') ? raw : '/' + raw
}

export default function App() {
  const project = useProject()
  const {theme,toggleTheme} = useTheme()
  const [route,setRoute] = useState(getRoute)
  const [sidebarOpen,setSidebarOpen] = useState(false)
  const [collapsed,setCollapsed] = useState(false)

  useEffect(() => {
    const fn = () => { setRoute(getRoute()); setSidebarOpen(false) }
    window.addEventListener('hashchange',fn)
    return () => window.removeEventListener('hashchange',fn)
  },[])

  const active = useMemo(() => {
    if (route === '/configuracion') return { path: route, label: 'Configuración', icon: Settings }
    return navigation.find(x => x.path === route) ?? navigation[0]
  },[route])

  const go = (path:string) => { window.location.hash = path }
  const centerName = project.center.name.trim() || 'Centro sin configurar'

  const renderContent = () => {
    if (route === '/') return <Dashboard navigate={go} project={project}/>
    if (route === '/centro' || route === '/configuracion') return <SetupWizard project={project} navigate={go}/>
    if (route === '/grupos') return <GroupsPage project={project} navigate={go}/>
    if (route === '/jornada') return <SchedulePage project={project} navigate={go}/>
    return <PlaceholderPage title={active.label} description={descriptions[route] ?? 'Módulo preparado para su implementación.'}/>
  }

  return (
    <div className={'app-shell ' + (collapsed ? 'is-collapsed' : '')}>
      <div className={'mobile-overlay ' + (sidebarOpen ? 'show' : '')} onClick={() => setSidebarOpen(false)} />
      <aside className={'sidebar ' + (sidebarOpen ? 'mobile-open' : '')}>
        <div className="sidebar-brand">
          <Logo compact={collapsed}/>
          <button className="icon-button collapse-button" onClick={() => setCollapsed(v => !v)} aria-label="Contraer navegación"><PanelLeftClose size={19}/></button>
          <button className="icon-button mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Cerrar"><X size={19}/></button>
        </div>
        <nav className="nav-list">
          {navigation.map(item => {
            const Icon=item.icon
            const isActive = route === item.path || (route === '/configuracion' && item.path === '/configuracion')
            return <button key={item.path} className={'nav-item ' + (isActive?'active':'')} onClick={() => go(item.path)} title={collapsed?item.label:undefined}><Icon size={19}/><span>{item.label}</span></button>
          })}
        </nav>
        <div className="sidebar-user"><span className="avatar">AD</span><div><strong>Administrador</strong><small>{centerName}</small></div><ChevronDown size={16}/></div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Abrir navegación"><Menu size={21}/></button>
            <div><span className="topbar-context">{centerName}</span><strong>{active.label}</strong></div>
          </div>
          <div className="topbar-actions">
            <ThemeToggle theme={theme} onToggle={toggleTheme}/>
            <button className="course-selector"><CalendarDays size={16}/><span>{project.academicYear.label}</span><ChevronDown size={15}/></button>
            <button className="icon-button notification-button" aria-label="Notificaciones"><Bell size={19}/><span className="notification-dot"/></button>
            <span className="top-avatar">AD</span>
          </div>
        </header>
        <div className="content-area">{renderContent()}</div>
      </main>
      <nav className="mobile-bottom-nav">
        <button className={route==='/'?'active':''} onClick={() => go('/')}><Gauge size={20}/><span>Inicio</span></button>
        <button className={route==='/grupos'||route==='/jornada'?'active':''} onClick={() => go('/jornada')}><CalendarClock size={20}/><span>Jornada</span></button>
        <button className="mobile-plus" onClick={() => go('/configuracion')}><Sparkles size={23}/></button>
        <button className={route==='/horarios'?'active':''} onClick={() => go('/horarios')}><ClipboardCheck size={20}/><span>Horarios</span></button>
        <button className={route==='/configuracion'?'active':''} onClick={() => go('/configuracion')}><Settings size={20}/><span>Ajustes</span></button>
      </nav>
    </div>
  )
}
