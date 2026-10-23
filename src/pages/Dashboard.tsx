import {
  AlertTriangle, ArrowRight, BookOpenCheck, CalendarClock, CalendarDays, CheckCircle2,
  Clock3, GraduationCap, LayoutGrid, ShieldCheck, Sparkles, Users,
} from 'lucide-react'
import { isCenterComplete, isStructureComplete, isScheduleComplete, isStudyPlanComplete, isStaffComplete, isAssignmentsComplete, isRulesComplete, isPrevalidationComplete, isGenerationComplete, type ViyeuticaProject } from '../domain/project'

export function Dashboard({
  navigate,
  project,
}: {
  navigate:(path:string)=>void
  project: ViyeuticaProject
}) {
  const centerDone = isCenterComplete(project.center)
  const structureDone = isStructureComplete(project)
  const scheduleDone = isScheduleComplete(project)
  const studyPlanDone = isStudyPlanComplete(project)
  const staffDone = isStaffComplete(project)
  const assignmentsDone = isAssignmentsComplete(project)
  const rulesDone = isRulesComplete(project)
  const prevalidationDone = isPrevalidationComplete(project)
  const generationDone = isGenerationComplete(project)
  const activeGroups = project.groups.filter(group => group.active)
  const students = activeGroups.reduce((sum,group) => sum + (group.students ?? 0),0)
  const teachingSessions = project.schedule.blocks.filter(block => block.active && block.type === 'teaching').length

  const setup = [
    ['Centro', centerDone ? 'done' : 'progress'],
    ['Estructura y grupos', structureDone ? 'done' : centerDone ? 'progress' : 'pending'],
    ['Jornada y sesiones', scheduleDone ? 'done' : structureDone ? 'progress' : 'pending'],
    ['Plan de estudios', studyPlanDone ? 'done' : scheduleDone ? 'progress' : 'pending'],
    ['Profesorado', staffDone ? 'done' : studyPlanDone ? 'progress' : 'pending'],
    ['Asignaciones', assignmentsDone ? 'done' : staffDone ? 'progress' : 'pending'],
    ['Reglas', rulesDone ? 'done' : assignmentsDone ? 'progress' : 'pending'],
    ['Prevalidación', prevalidationDone ? 'done' : rulesDone ? 'progress' : 'pending'],
    ['Generación', generationDone ? 'done' : prevalidationDone ? 'progress' : 'pending'],
  ] as const

  const progress = generationDone ? 100 : prevalidationDone ? 88 : rulesDone ? 77 : assignmentsDone ? 66 : staffDone ? 55 : studyPlanDone ? 44 : scheduleDone ? 33 : structureDone ? 22 : centerDone ? 11 : 0
  const nextRoute = !centerDone ? '/centro' : !structureDone ? '/grupos' : !scheduleDone ? '/jornada' : !studyPlanDone ? '/materias' : !staffDone ? '/profesorado' : !assignmentsDone ? '/asignaciones' : !rulesDone ? '/reglas' : !prevalidationDone ? '/prevalidacion' : '/generacion'

  return <div className="dashboard-stack">
    <section className="hero-card">
      <div>
        <span className="eyebrow"><Sparkles size={15}/> Viyeutica 0.4</span>
        <h1>{generationDone ? 'El horario ya tiene una propuesta completa.' : prevalidationDone ? 'El proyecto ha superado la prevalidación.' : rulesDone ? 'Las reglas del generador ya están preparadas.' : assignmentsDone ? 'Las responsabilidades docentes ya están asignadas.' : staffDone ? 'La plantilla docente ya está preparada.' : studyPlanDone ? 'El plan de estudios ya está definido.' : scheduleDone ? 'La rejilla temporal del centro ya está lista.' : structureDone ? 'Ahora toca definir la jornada escolar.' : centerDone ? 'Ahora toca construir la estructura académica.' : 'Configura el centro antes de construir el horario.'}</h1>
        <p>{generationDone
          ? `${project.center.name} · propuesta de horario completa generada y lista para revisión.`
          : prevalidationDone
          ? `${project.center.name} · configuración lista para iniciar la generación del horario.`
          : rulesDone
          ? `${project.center.name} · ${project.rules.filter(rule=>rule.active).length} reglas activas listas para prevalidación.`
          : assignmentsDone
          ? `${project.center.name} · ${project.assignments.filter(assignment=>assignment.active).length} asignaciones docentes activas listas para aplicar reglas.`
          : staffDone
          ? `${project.center.name} · ${project.teachers.filter(teacher=>teacher.active).length} docentes activos preparados para asignaciones.`
          : studyPlanDone
          ? `${project.center.name} · plan de estudios configurado para ${activeGroups.length} grupos activos.`
          : scheduleDone
          ? `${project.center.name} · ${activeGroups.length} grupos · ${teachingSessions} sesiones lectivas diarias configuradas.`
          : structureDone
            ? 'Define días lectivos, sesiones, recreos y duraciones. Esa será la base temporal del generador.'
            : centerDone
              ? 'Define niveles, líneas y grupos reales. Viyeutica utilizará esta estructura para jornada, materias, profesorado y solver.'
              : 'Introduce los datos maestros del centro. Viyeutica los conservará en este navegador y los reutilizará en todo el flujo.'}</p>
        <div className="hero-actions">
          <button className="btn primary" onClick={() => navigate(nextRoute)}>{generationDone ? 'Revisar generación' : 'Continuar configuración'} <ArrowRight size={17}/></button>
          <button className="btn secondary" onClick={() => navigate('/horarios')}>Ver módulo de horarios</button>
        </div>
      </div>
      <div className="hero-mark hero-logo-full"><img src="./brand/viyeutica-logo.svg" alt="Logo de Viyeutica"/></div>
    </section>

    <section className="metric-grid metric-grid-five">
      <Metric icon={<LayoutGrid/>} label="Grupos" value={activeGroups.length ? String(activeGroups.length) : '—'} detail={activeGroups.length ? 'unidades activas' : 'pendientes de configurar'}/>
      <Metric icon={<Users/>} label="Alumnado" value={students ? String(students) : '—'} detail={students ? 'total agregado' : 'datos opcionales por grupo'}/>
      <Metric icon={<CalendarClock/>} label="Sesiones" value={teachingSessions ? String(teachingSessions) : '—'} detail={teachingSessions ? 'tramos lectivos diarios' : 'jornada pendiente'}/>
      <Metric icon={<BookOpenCheck/>} label="Plan" value={project.studyPlan.filter(entry=>entry.active).length ? String(project.studyPlan.filter(entry=>entry.active).length) : '—'} detail="cargas grupo + materia"/>
      <Metric icon={<CalendarDays/>} label="Curso" value={project.academicYear.label} detail="curso académico activo"/>
    </section>

    <section className="dashboard-grid">
      <article className="panel">
        <div className="panel-heading"><div><span className="panel-kicker">Preparación</span><h2>Configuración del curso</h2></div><span className="status-pill warning">{progress}%</span></div>
        <div className="progress-track"><span style={{width:progress+'%'}}/></div>
        <div className="setup-list">{setup.map(([label,state]) => <div className="setup-row" key={label}><span className={'setup-dot '+state}>{state==='done'?<CheckCircle2 size={16}/>:state==='progress'?<Clock3 size={16}/>:<span/>}</span><span>{label}</span><span className={'setup-state '+state}>{state==='done'?'Completo':state==='progress'?'En progreso':'Pendiente'}</span></div>)}</div>
        <button className="text-action" onClick={() => navigate(nextRoute)}>Continuar configuración <ArrowRight size={16}/></button>
      </article>

      <article className="panel">
        <div className="panel-heading"><div><span className="panel-kicker">Control</span><h2>Estado de auditoría</h2></div><ShieldCheck className="panel-heading-icon" size={24}/></div>
        <div className="audit-score"><div className="score-ring"><span>—</span></div><div><strong>Aún no ejecutada</strong><p>Se habilitará cuando exista un horario completo.</p></div></div>
        <div className="audit-mini-grid"><div><strong>0</strong><span>errores HARD</span></div><div><strong>0</strong><span>advertencias</span></div></div>
        <button className="btn ghost" onClick={() => navigate('/auditoria')}>Abrir auditoría</button>
      </article>

      <article className="panel">
        <div className="panel-heading"><div><span className="panel-kicker">Siguiente paso</span><h2>{!centerDone ? 'Completar los datos del centro' : !structureDone ? 'Definir grupos y unidades' : !scheduleDone ? 'Configurar jornada y sesiones' : !studyPlanDone ? 'Preparar el plan de estudios' : !staffDone ? 'Configurar profesorado' : !assignmentsDone ? 'Configurar asignaciones' : !rulesDone ? 'Definir reglas' : !prevalidationDone ? 'Ejecutar prevalidación' : !generationDone ? 'Generar horario' : 'Revisar horario generado'}</h2></div><GraduationCap className="panel-heading-icon" size={24}/></div>
        <p className="panel-copy">{!centerDone
          ? 'Primero necesitamos identificar el centro, su ubicación y las etapas que imparte.'
          : !structureDone
            ? 'Crea la estructura real por etapas, niveles y líneas.'
            : !scheduleDone
              ? 'Define los días lectivos y todos los tramos temporales, incluyendo sesiones y recreos.'
              : !studyPlanDone
                ? 'Relaciona cada grupo con sus materias, cargas semanales y requisitos docentes.'
                : !staffDone
                  ? 'Configura la plantilla docente, especialidades, jornadas, cargos y reducciones.'
                  : !assignmentsDone
                    ? 'Relaciona profesorado, grupos y materias, incluyendo apoyos, codocencias y disponibilidades.'
                    : !rulesDone
                      ? 'Define restricciones HARD/SOFT, reglas del centro y reglas procedentes de normativa.'
                      : !prevalidationDone
                        ? 'Comprueba la coherencia completa antes de permitir la generación.'
                        : !generationDone
                          ? 'Genera y compara propuestas utilizando las reglas HARD y SOFT activas.'
                          : 'La propuesta generada puede revisarse ahora en Horarios y posteriormente auditarse.'}</p>
        <div className="notice amber"><AlertTriangle size={17}/><span>{generationDone ? 'Los 9 pasos de configuración y generación están completos.' : 'Completa este paso antes de seguir.'}</span></div>
        <button className="btn primary wide" onClick={() => navigate(nextRoute)}>{generationDone ? 'Revisar generación' : 'Continuar'} <ArrowRight size={16}/></button>
      </article>

      <article className="panel">
        <div className="panel-heading"><div><span className="panel-kicker">Accesos</span><h2>Trabajo frecuente</h2></div></div>
        <div className="quick-grid">
          <Quick icon={<Users/>} label="Profesorado" onClick={() => navigate('/profesorado')}/>
          <Quick icon={<LayoutGrid/>} label="Estructura y grupos" onClick={() => navigate('/grupos')}/>
          <Quick icon={<CalendarClock/>} label="Jornada y sesiones" onClick={() => navigate('/jornada')}/>
          <Quick icon={<ShieldCheck/>} label="Auditoría" onClick={() => navigate('/auditoria')}/>
        </div>
      </article>
    </section>
  </div>
}

function Metric({icon,label,value,detail}:{icon:React.ReactNode;label:string;value:string;detail:string}) {
  return <article className="metric-card"><span className="metric-icon">{icon}</span><div><strong>{value}</strong><span>{label}</span><small>{detail}</small></div></article>
}
function Quick({icon,label,onClick}:{icon:React.ReactNode;label:string;onClick:()=>void}) {
  return <button className="quick-button" onClick={onClick}><span>{icon}</span><strong>{label}</strong></button>
}
