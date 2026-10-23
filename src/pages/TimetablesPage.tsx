import { useMemo, useState } from 'react'
import {
  AlertTriangle, CalendarDays, CheckCircle2, GraduationCap, Sparkles, UserRound,
} from 'lucide-react'
import {
  latestGeneration,
  type GenerationRun,
  type ViyeuticaProject,
  type Weekday,
} from '../domain/project'

const dayLabels:Record<Weekday,string>={
  L:'Lunes',M:'Martes',X:'Miércoles',J:'Jueves',V:'Viernes',S:'Sábado',
}

type ViewMode='group'|'teacher'

export function TimetablesPage({
  project,
  navigate,
}:{
  project:ViyeuticaProject
  navigate:(path:string)=>void
}) {
  const runs=project.generationRuns
  const latest=latestGeneration(project)
  const [runId,setRunId]=useState(latest?.id??'')
  const [mode,setMode]=useState<ViewMode>('group')
  const [entityId,setEntityId]=useState(project.groups.find(group=>group.active)?.id??'')

  const run=runs.find(item=>item.id===runId)??latest
  const groups=project.groups.filter(group=>group.active)
  const teachers=project.teachers.filter(teacher=>teacher.active)
  const teachingBlocks=project.schedule.blocks.filter(block=>block.active&&block.type==='teaching')

  const options=mode==='group'
    ? groups.map(group=>({id:group.id,label:group.name}))
    : teachers.map(teacher=>({id:teacher.id,label:teacher.name}))

  const normalizedEntityId=options.some(option=>option.id===entityId)
    ? entityId
    : options[0]?.id??''

  const entries=useMemo(()=>{
    if(!run)return []
    return run.entries.filter(entry=>
      mode==='group'
        ? entry.groupId===normalizedEntityId
        : entry.teacherId===normalizedEntityId
    )
  },[run,mode,normalizedEntityId])

  const occupiedCells=new Set(entries.map(entry=>entry.day+'|'+entry.sessionId)).size
  const totalCells=project.schedule.activeDays.length*teachingBlocks.length
  const subjects=new Set(entries.map(entry=>entry.subjectId)).size
  const relatedEntities=new Set(entries.map(entry=>mode==='group'?entry.teacherId:entry.groupId)).size

  if(!run){
    return <section className="empty-state-card">
      <CalendarDays size={34}/>
      <h1>Todavía no hay horarios generados</h1>
      <p>Primero genera una propuesta para poder revisarla por grupo o profesorado.</p>
      <button className="btn primary" onClick={()=>navigate('/generacion')}><Sparkles size={16}/> Ir a Generación</button>
    </section>
  }

  return <div className="timetables-page">
    <section className="wizard-intro">
      <div>
        <span className="eyebrow dark"><CalendarDays size={15}/> Revisión del resultado</span>
        <h1>Horarios</h1>
        <p>Consulta la propuesta generada por grupo o por docente antes de realizar la auditoría final.</p>
      </div>
      <div className={'timetable-status '+run.status}>
        {run.status==='complete'?<CheckCircle2 size={18}/>:<AlertTriangle size={18}/>}
        <span><strong>{run.status==='complete'?'Propuesta completa':run.status==='partial'?'Propuesta parcial':'Propuesta fallida'}</strong><small>HARD {run.hardViolations} · SOFT {run.softPenalty}</small></span>
      </div>
    </section>

    <section className="timetable-controls">
      <div className="timetable-control-block">
        <span className="panel-kicker">Propuesta</span>
        <select value={run.id} onChange={event=>setRunId(event.target.value)}>
          {[...runs].reverse().map((item,index)=><option key={item.id} value={item.id}>
            Propuesta {runs.length-index} · {item.status==='complete'?'completa':item.status==='partial'?'parcial':'fallida'}
          </option>)}
        </select>
      </div>

      <div className="timetable-view-switch">
        <button className={mode==='group'?'active':''} onClick={()=>{
          setMode('group')
          setEntityId(groups[0]?.id??'')
        }}><GraduationCap size={16}/> Por grupo</button>
        <button className={mode==='teacher'?'active':''} onClick={()=>{
          setMode('teacher')
          setEntityId(teachers[0]?.id??'')
        }}><UserRound size={16}/> Por docente</button>
      </div>

      <div className="timetable-control-block entity">
        <span className="panel-kicker">{mode==='group'?'Grupo':'Docente'}</span>
        <select value={normalizedEntityId} onChange={event=>setEntityId(event.target.value)}>
          {options.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </div>
    </section>

    <section className="structure-summary">
      <Summary label="Sesiones ocupadas" value={String(occupiedCells)} detail={`de ${totalCells} franjas`}/>
      <Summary label="Materias" value={String(subjects)} detail={mode==='group'?'en este grupo':'impartidas'}/>
      <Summary label={mode==='group'?'Docentes':'Grupos'} value={String(relatedEntities)} detail="implicados"/>
      <Summary label="Puntuación" value={String(run.score)} detail="propuesta seleccionada"/>
    </section>

    {run.status!=='complete'&&<section className="timetable-warning">
      <AlertTriangle size={18}/>
      <div><strong>Este horario no está completo</strong><p>La tabla puede contener huecos porque la propuesta tiene {run.hardViolations} incidencias HARD. Revísalas en Generación antes de dar el horario por definitivo.</p></div>
      <button className="btn secondary-light" onClick={()=>navigate('/generacion')}>Volver a Generación</button>
    </section>}

    <section className="timetable-board">
      <div className="groups-table-heading">
        <div>
          <span className="panel-kicker">{mode==='group'?'Horario de grupo':'Horario docente'}</span>
          <h2>{options.find(option=>option.id===normalizedEntityId)?.label??'Sin selección'}</h2>
        </div>
        <button className="btn ghost-inline" onClick={()=>navigate('/auditoria')}>Ir a Auditoría</button>
      </div>
      <div className="generated-schedule-wrap">
        <table className="generated-schedule timetables-full">
          <thead><tr><th>Sesión</th>{project.schedule.activeDays.map(day=><th key={day}>{dayLabels[day]}</th>)}</tr></thead>
          <tbody>{teachingBlocks.map(block=><tr key={block.id}>
            <th><strong>{block.label}</strong><small>{block.start}–{block.end}</small></th>
            {project.schedule.activeDays.map(day=>{
              const cell=entries.filter(entry=>entry.day===day&&entry.sessionId===block.id)
              if(!cell.length)return <td key={day} className="empty-slot"><span>Libre</span></td>
              if(mode==='group'){
                const primary=cell[0]
                const subject=project.subjects.find(item=>item.id===primary.subjectId)
                const teacherNames=[...new Set(cell.map(entry=>project.teachers.find(item=>item.id===entry.teacherId)?.name).filter(Boolean))]
                return <td key={day}><strong>{subject?.name??'Materia'}</strong><small>{teacherNames.join(' + ')}</small></td>
              }
              return <td key={day}>
                {cell.map(entry=>{
                  const subject=project.subjects.find(item=>item.id===entry.subjectId)
                  const group=project.groups.find(item=>item.id===entry.groupId)
                  return <span className="teacher-slot-item" key={entry.id}><strong>{subject?.name??'Materia'}</strong><small>{group?.name??'Grupo'}</small></span>
                })}
              </td>
            })}
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  </div>
}

function Summary({label,value,detail}:{label:string;value:string;detail:string}) {
  return <article className="structure-summary-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}
