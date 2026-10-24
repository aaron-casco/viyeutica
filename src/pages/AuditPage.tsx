import { useMemo, useState } from 'react'
import {
  AlertTriangle, CheckCircle2, ClipboardCheck, Info, SearchCheck, ShieldAlert,
} from 'lucide-react'
import { auditGeneration } from '../domain/auditEngine'
import {
  isGenerationProposalValid,
  uniqueGenerationRuns,
  type AuditIssue,
  type ViyeuticaProject,
  type Weekday,
} from '../domain/project'

const dayLabels:Record<Weekday,string>={
  L:'Lunes',M:'Martes',X:'Miércoles',J:'Jueves',V:'Viernes',S:'Sábado',
}

export function AuditPage({
  project,
  navigate,
}:{
  project:ViyeuticaProject
  navigate:(path:string)=>void
}) {
  const runs=uniqueGenerationRuns(project.generationRuns).filter(run=>isGenerationProposalValid(project,run))
  const latest=runs[runs.length-1]??null
  const [runId,setRunId]=useState(latest?.id??'')
  const run=runs.find(item=>item.id===runId)??latest

  const result=useMemo(()=>run?auditGeneration(project,run):null,[project,run])

  if(!run||!result){
    return <section className="empty-state-card">
      <SearchCheck size={34}/>
      <h1>No hay una propuesta que auditar</h1>
      <p>Genera primero un horario para poder comprobarlo de forma independiente.</p>
      <button className="btn primary" onClick={()=>navigate('/generacion')}>Ir a Generación</button>
    </section>
  }

  const errors=result.issues.filter(issue=>issue.severity==='error')
  const warnings=result.issues.filter(issue=>issue.severity==='warning')
  const infos=result.issues.filter(issue=>issue.severity==='info')
  const categories=[...new Set(result.issues.map(issue=>issue.category))]

  return <div className="audit-page">
    <section className="wizard-intro">
      <div>
        <h1 className="wizard-page-title"><SearchCheck size={28}/> Auditoría</h1>
        <p>Revisa el horario generado con comprobaciones independientes del solver para detectar conflictos, incumplimientos y cargas incoherentes.</p>
      </div>
      <div className={'audit-status '+(result.passed?'passed':'failed')}>
        {result.passed?<CheckCircle2 size={20}/>:<ShieldAlert size={20}/>}
        <span>
          <strong>{result.passed?'Auditoría superada':'Auditoría con incidencias'}</strong>
          <small>{result.errors} errores · {result.warnings} advertencias</small>
        </span>
      </div>
    </section>

    <section className="audit-controls">
      <label>
        <span className="panel-kicker">Propuesta auditada</span>
        <select value={run.id} onChange={event=>setRunId(event.target.value)}>
          {[...runs].reverse().map((item,index)=><option key={item.id} value={item.id}>
            Propuesta {runs.length-index} · {item.status==='complete'?'completa':item.status==='partial'?'parcial':'fallida'}
          </option>)}
        </select>
      </label>
      <div className="audit-engine-note">
        <ClipboardCheck size={18}/>
        <span><strong>Comprobación independiente</strong><small>La auditoría recalcula el resultado y no confía únicamente en el estado devuelto por Generación.</small></span>
      </div>
    </section>

    <section className="structure-summary">
      <Summary label="Errores" value={String(result.errors)} detail="bloquean validación"/>
      <Summary label="Advertencias" value={String(result.warnings)} detail="requieren revisión"/>
      <Summary label="Categorías afectadas" value={String(categories.length)} detail={categories.length?categories.join(' · '):'sin incidencias'}/>
      <Summary label="Resultado" value={result.passed?'Apto':'No apto'} detail="auditoría independiente"/>
    </section>

    {result.passed&&<section className="audit-success">
      <CheckCircle2 size={22}/>
      <div><strong>El horario ha superado las comprobaciones automáticas</strong><p>No se han detectado errores en solapes, disponibilidad, franjas fijas, cobertura ni cargas semanales evaluables.</p></div>
      <button className="btn primary" onClick={()=>navigate('/exportaciones')}>Ir a Exportaciones</button>
    </section>}

    <section className="audit-sections">
      <AuditSection title="Errores" description="Conflictos que impiden considerar válido el horario." issues={errors} project={project} navigate={navigate}/>
      <AuditSection title="Advertencias" description="Situaciones que requieren revisión pero no invalidan automáticamente." issues={warnings} project={project} navigate={navigate}/>
      {infos.length>0&&<AuditSection title="Información" description="Observaciones adicionales de la auditoría." issues={infos} project={project} navigate={navigate}/>}
    </section>
  </div>
}

function AuditSection({
  title,description,issues,project,navigate,
}:{
  title:string
  description:string
  issues:AuditIssue[]
  project:ViyeuticaProject
  navigate:(path:string)=>void
}) {
  return <section className="audit-card">
    <div className="audit-card-heading">
      <div><span className="panel-kicker">{title}</span><h2>{issues.length} {issues.length===1?'incidencia':'incidencias'}</h2><p>{description}</p></div>
    </div>
    {issues.length===0
      ? <div className="audit-empty"><CheckCircle2 size={18}/><span>Sin incidencias</span></div>
      : <div className="audit-list">{issues.map(issue=><article key={issue.id}>
          <div className={'audit-icon '+issue.severity}>{issue.severity==='error'?<ShieldAlert size={17}/>:issue.severity==='warning'?<AlertTriangle size={17}/>:<Info size={17}/>}</div>
          <div className="audit-main">
            <div className="audit-meta"><span>{issue.category}</span></div>
            <strong>{issue.message}</strong>
            <p>{describeIssue(issue,project)}</p>
            {issue.detail&&<small>{issue.detail}</small>}
            <p className="audit-guidance"><strong>Qué hacer:</strong> {auditGuidance(issue)}</p>
          </div>
          <button className="btn ghost-inline" onClick={()=>navigate(routeForIssue(issue))}>{issue.severity==='error'?'Corregir':'Revisar'}</button>
        </article>)}</div>}
  </section>
}

function auditGuidance(issue:AuditIssue){
  if(issue.code==='SOLAPE_GRUPO')return 'Revisa las asignaciones principales del grupo en esa franja y deja una única docencia principal.'
  if(issue.code==='SOLAPE_DOCENTE')return 'Revisa las actividades del docente en esa franja y elimina el solape.'
  if(issue.code==='DOCENTE_NO_DISPONIBLE')return 'Corrige la disponibilidad del docente o mueve la sesión a una franja compatible.'
  if(issue.code==='FRANJA_FIJA_INCUMPLIDA')return 'Revisa la franja fijada de la asignación y vuelve a generar el horario.'
  if(issue.code==='HUECO_LECTIVO_GRUPO')return 'Revisa la carga del grupo y sus asignaciones; falta una docencia principal en esa franja.'
  if(issue.code==='SESIONES_INCOMPLETAS')return 'Revisa la carga semanal y las restricciones de la asignación; faltan sesiones por colocar.'
  if(issue.code==='SESIONES_EXCESIVAS')return 'Comprueba la carga configurada y elimina sesiones sobrantes o corrige el número de sesiones esperado.'
  if(issue.code==='PLAN_SIN_PRESENCIA')return 'Comprueba que la materia tenga una asignación activa y carga suficiente para aparecer en el horario.'
  if(issue.category==='Reglas')return 'Abre la regla afectada, revisa sus filtros, comparación y valor, y vuelve a generar para comprobar el resultado.'
  if(issue.category==='Integridad')return 'Vuelve a Prevalidación y corrige la referencia inexistente o inactiva antes de regenerar.'
  return 'Revisa los datos relacionados con esta incidencia y vuelve a generar o auditar el horario.'
}

function describeIssue(issue:AuditIssue,project:ViyeuticaProject){
  const parts:string[]=[]
  const teacher=issue.teacherId?project.teachers.find(item=>item.id===issue.teacherId):undefined
  const group=issue.groupId?project.groups.find(item=>item.id===issue.groupId):undefined
  const subject=issue.subjectId?project.subjects.find(item=>item.id===issue.subjectId):undefined
  const block=issue.sessionId?project.schedule.blocks.find(item=>item.id===issue.sessionId):undefined
  if(group)parts.push(group.name)
  if(subject)parts.push(subject.name)
  if(teacher)parts.push(teacher.name)
  if(issue.day)parts.push(dayLabels[issue.day])
  if(block)parts.push(block.label)
  return parts.length?parts.join(' · '):'Incidencia general del horario.'
}

function routeForIssue(issue:AuditIssue){
  const params=new URLSearchParams()
  if(issue.teacherId)params.set('teacherId',issue.teacherId)
  if(issue.groupId)params.set('groupId',issue.groupId)
  if(issue.subjectId)params.set('subjectId',issue.subjectId)
  if(issue.day)params.set('day',issue.day)
  if(issue.sessionId)params.set('sessionId',issue.sessionId)
  if(issue.code)params.set('auditCode',issue.code)
  const query=params.toString()
  if(issue.category==='Disponibilidad'||issue.category==='Franjas fijas'||issue.category==='Cobertura'||issue.category==='Carga semanal')return '/asignaciones'+(query?'?'+query:'')
  if(issue.category==='Reglas')return '/reglas'+(query?'?'+query:'')
  if(issue.category==='Integridad')return '/prevalidacion'+(query?'?'+query:'')
  return '/horarios'+(query?'?'+query:'')
}

function Summary({label,value,detail}:{label:string;value:string;detail:string}) {
  return <article className="structure-summary-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}
