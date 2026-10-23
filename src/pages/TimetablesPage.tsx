import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, CalendarDays, CheckCircle2, ExternalLink, GraduationCap, Plus, Sparkles, UserRound,
} from 'lucide-react'
import {
  latestGeneration,
  uniqueGenerationRuns,
  type GenerationRun,
  type TeachingAssignment,
  type ViyeuticaProject,
  type Weekday,
} from '../domain/project'
import { saveProject } from '../store/projectStorage'
import { AppModal } from '../components/AppModal'

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
  const runs=uniqueGenerationRuns(project.generationRuns)
  const latest=latestGeneration(project)
  const [runId]=useState(project.selectedGenerationRunId??latest?.id??'')
  const [mode,setMode]=useState<ViewMode>('group')
  const [selectedEntityIds,setSelectedEntityIds]=useState<string[]>(['all'])
  const [focusSlot,setFocusSlot]=useState<{day:string;sessionId:string}|null>(null)
  const [auditFocus,setAuditFocus]=useState('')
  const [emptySlot,setEmptySlot]=useState<{groupId:string;day:Weekday;sessionId:string}|null>(null)
  const [slotMessage,setSlotMessage]=useState('')

  const run=runs.find(item=>item.id===runId)??runs.find(item=>item.id===project.selectedGenerationRunId)??latest
  const runNumber=run?Math.max(1,runs.findIndex(item=>item.id===run.id)+1):0
  const groups=project.groups.filter(group=>group.active)
  const teachers=project.teachers.filter(teacher=>teacher.active)
  const teachingBlocks=project.schedule.blocks.filter(block=>block.active&&block.type==='teaching')

  useEffect(()=>{
    const raw=window.location.hash.split('?')[1]
    if(!raw)return
    const params=new URLSearchParams(raw)
    const teacherId=params.get('teacherId')
    const groupId=params.get('groupId')
    const day=params.get('day')
    const sessionId=params.get('sessionId')
    const auditCode=params.get('auditCode')
    if(groupId){
      setMode('group')
      setSelectedEntityIds([groupId])
    }else if(teacherId){
      setMode('teacher')
      setSelectedEntityIds([teacherId])
    }
    if(day&&sessionId)setFocusSlot({day,sessionId})
    if(auditCode)setAuditFocus('Vista abierta desde Auditoría · '+auditCode)
  },[])

  const options=mode==='group'
    ? groups.map(group=>({id:group.id,label:group.name}))
    : teachers.map(teacher=>({id:teacher.id,label:teacher.name}))

  const selectedIds=selectedEntityIds.includes('all')
    ? options.map(option=>option.id)
    : selectedEntityIds.filter(id=>options.some(option=>option.id===id))

  const toggleEntity=(id:string)=>{
    if(id==='all'){
      setSelectedEntityIds(['all'])
      return
    }
    setSelectedEntityIds(current=>{
      const withoutAll=current.filter(item=>item!=='all')
      const exists=withoutAll.includes(id)
      const next=exists?withoutAll.filter(item=>item!==id):[...withoutAll,id]
      return next.length?next:['all']
    })
  }

  const selectedEntries=useMemo(()=>{
    if(!run)return []
    const allowed=new Set(selectedIds)
    return run.entries.filter(entry=>mode==='group'?allowed.has(entry.groupId):allowed.has(entry.teacherId))
  },[run,mode,selectedIds.join('|')])

  const occupiedCells=new Set(selectedEntries.map(entry=>entry.day+'|'+entry.sessionId+'|'+(mode==='group'?entry.groupId:entry.teacherId))).size
  const totalCells=project.schedule.activeDays.length*teachingBlocks.length*Math.max(1,selectedIds.length)
  const subjects=new Set(selectedEntries.map(entry=>entry.subjectId)).size
  const relatedEntities=new Set(selectedEntries.map(entry=>mode==='group'?entry.teacherId:entry.groupId)).size

  const slotCandidates=emptySlot?getEmptySlotCandidates(project,run,emptySlot):[]

  const applySlotCandidate=(assignment:TeachingAssignment)=>{
    if(!emptySlot)return
    const fixedSlots=[...(assignment.fixedSlots??[])]
    if(!fixedSlots.some(item=>item.day===emptySlot.day&&item.session===emptySlot.sessionId)){
      fixedSlots.push({day:emptySlot.day,session:emptySlot.sessionId})
    }
    const assignments=project.assignments.map(item=>item.id===assignment.id?{...item,fixedSlots}:item)
    const teacherAvailability=[
      ...project.teacherAvailability.filter(item=>!(
        item.teacherId===assignment.teacherId &&
        item.day===emptySlot.day &&
        item.session===emptySlot.sessionId
      )),
      {
        teacherId:assignment.teacherId,
        day:emptySlot.day,
        session:emptySlot.sessionId,
        status:'assigned' as const,
        detail:'Franja fijada desde Horarios para cubrir un hueco.',
      },
    ]
    saveProject({...project,assignments,teacherAvailability})
    const subject=project.subjects.find(item=>item.id===assignment.subjectId)?.name??'Materia'
    const teacher=project.teachers.find(item=>item.id===assignment.teacherId)?.name??'Docente'
    setSlotMessage(subject+' · '+teacher+' se ha fijado en esta franja. Regenera la propuesta para aplicar el cambio.')
    setEmptySlot(null)
  }

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

    <section className="timetable-controls timetable-controls-stacked">
      <div className="timetable-controls-main">
        <div className="timetable-control-block timetable-active-proposal">
          <span className="panel-kicker">Propuesta</span>
          <div className="timetable-proposal-value">
            <strong>Propuesta {runNumber}</strong>
            <small>{run.status==='complete'?'completa':run.status==='partial'?'parcial':'fallida'}</small>
            <button type="button" title="Cambiar propuesta en Generación" aria-label="Cambiar propuesta en Generación" onClick={()=>navigate('/generacion')}>
              <ExternalLink size={16}/>
            </button>
          </div>
        </div>

        <div className="timetable-view-switch">
          <button className={mode==='group'?'active':''} onClick={()=>{
            setMode('group')
            setSelectedEntityIds(['all'])
          }}><GraduationCap size={16}/> Por grupo</button>
          <button className={mode==='teacher'?'active':''} onClick={()=>{
            setMode('teacher')
            setSelectedEntityIds(['all'])
          }}><UserRound size={16}/> Por docente</button>
        </div>
      </div>

      <div className="timetable-control-block entity timetable-entity-tags-block timetable-tags-row">
        <span className="panel-kicker">{mode==='group'?'Grupos':'Docentes'}</span>
        <div className="timetable-entity-tags">
          <button
            type="button"
            className={selectedEntityIds.includes('all')?'active':''}
            onClick={()=>toggleEntity('all')}
          >Todos</button>
          {options.map(option=><button
            key={option.id}
            type="button"
            className={!selectedEntityIds.includes('all')&&selectedEntityIds.includes(option.id)?'active':''}
            onClick={()=>toggleEntity(option.id)}
          >{option.label}</button>)}
        </div>
      </div>
    </section>

    {auditFocus&&<section className="template-result audit-context-banner"><CheckCircle2 size={16}/><span>{auditFocus}</span></section>}
    {slotMessage&&<section className="template-result audit-context-banner"><CheckCircle2 size={16}/><span>{slotMessage}</span><button className="btn ghost-inline" onClick={()=>navigate('/generacion')}>Regenerar</button></section>}

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
          <span className="panel-kicker">{mode==='group'?'Horarios de grupo':'Horarios docentes'}</span>
          <h2>{selectedEntityIds.includes('all')?'Todos':selectedIds.length+' seleccionados'}</h2>
        </div>
        <button className="btn ghost-inline" onClick={()=>navigate('/auditoria')}>Ir a Auditoría</button>
      </div>
      <div className="timetable-multi-list">
        {selectedIds.map(entityId=>{
          const label=options.find(option=>option.id===entityId)?.label??'Sin selección'
          const entries=run.entries.filter(entry=>mode==='group'?entry.groupId===entityId:entry.teacherId===entityId)
          return <section className="timetable-entity-section" key={entityId}>
            <div className="timetable-entity-heading"><strong>{label}</strong></div>
            <div className="generated-schedule-wrap">
              <table className="generated-schedule timetables-full">
                <thead><tr><th>Sesión</th>{project.schedule.activeDays.map(day=><th key={day}>{dayLabels[day]}</th>)}</tr></thead>
                <tbody>{teachingBlocks.map(block=><tr key={block.id}>
                  <th><strong>{block.label}</strong><small>{block.start}–{block.end}</small></th>
                  {project.schedule.activeDays.map(day=>{
                    const cell=entries.filter(entry=>entry.day===day&&entry.sessionId===block.id)
                    const focused=focusSlot?.day===day&&focusSlot?.sessionId===block.id
                    if(!cell.length){
                      if(mode==='group'){
                        return <td key={day} className={'empty-slot timetable-empty-problem '+(focused?'audit-slot-focus':'')}>
                          <button
                            className="timetable-empty-plus"
                            title="Resolver hueco"
                            aria-label={'Resolver hueco de '+label+' · '+dayLabels[day]+' · '+block.label}
                            onClick={()=>{setSlotMessage('');setEmptySlot({groupId:entityId,day,sessionId:block.id})}}
                          ><Plus size={24}/></button>
                        </td>
                      }
                      return <td key={day} className={'empty-slot '+(focused?'audit-slot-focus':'')}><span>Libre</span></td>
                    }
                    if(mode==='group'){
                      const primary=cell[0]
                      const subject=project.subjects.find(item=>item.id===primary.subjectId)
                      const teacherNames=[...new Set(cell.map(entry=>project.teachers.find(item=>item.id===entry.teacherId)?.name).filter(Boolean))]
                      return <td key={day} className={focused?'audit-slot-focus':''}><strong>{subject?.name??'Materia'}</strong><small>{teacherNames.join(' + ')}</small></td>
                    }
                    return <td key={day} className={focused?'audit-slot-focus':''}>
                      {cell.map(entry=>{
                        const subject=project.subjects.find(item=>item.id===entry.subjectId)
                        const group=project.groups.find(item=>item.id===entry.groupId)
                        return <div className="teacher-cell-entry" key={entry.id}><strong>{subject?.name??'Materia'}</strong><small>{group?.name??'Grupo'}</small></div>
                      })}
                    </td>
                  })}
                </tr>)}</tbody>
              </table>
            </div>
          </section>
        })}
      </div>
    </section>

    {emptySlot&&<AppModal
      title="Completar hueco del horario"
      icon={<Plus size={22}/>}
      onClose={()=>setEmptySlot(null)}
      wide
      footer={<button className="btn secondary-light" onClick={()=>setEmptySlot(null)}>Cerrar</button>}
    >
      <EmptySlotModalContent
        project={project}
        run={run}
        slot={emptySlot}
        candidates={slotCandidates}
        onSelect={applySlotCandidate}
      />
    </AppModal>}
  </div>
}

function Summary({label,value,detail}:{label:string;value:string;detail:string}) {
  return <article className="structure-summary-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}


function getEmptySlotCandidates(
  project:ViyeuticaProject,
  run:GenerationRun,
  slot:{groupId:string;day:Weekday;sessionId:string},
){
  const entries=project.studyPlan.filter(entry=>entry.active&&entry.groupId===slot.groupId)
  const result:{assignment:TeachingAssignment;missing:number}[]=[]
  for(const entry of entries){
    const assignments=project.assignments.filter(assignment=>
      assignment.active &&
      assignment.assignmentType==='main' &&
      assignment.groupId===slot.groupId &&
      assignment.subjectId===entry.subjectId
    )
    for(const assignment of assignments){
      const expected=(assignment.weeklySessions??0)>0
        ? assignment.weeklySessions!
        : entry.weeklySessions
      const placed=run.entries.filter(item=>item.assignmentId===assignment.id).length
      const missing=Math.max(0,expected-placed)
      if(missing<=0)continue

      const unavailable=project.teacherAvailability.some(item=>
        item.teacherId===assignment.teacherId &&
        item.day===slot.day &&
        item.session===slot.sessionId &&
        (item.status==='unavailable'||item.status==='travel')
      )
      if(unavailable)continue

      const teacherBusy=run.entries.some(item=>
        item.teacherId===assignment.teacherId &&
        item.day===slot.day &&
        item.sessionId===slot.sessionId
      )
      if(teacherBusy)continue

      result.push({assignment,missing})
    }
  }
  return result
}

function EmptySlotModalContent({
  project,run,slot,candidates,onSelect,
}:{
  project:ViyeuticaProject
  run:GenerationRun
  slot:{groupId:string;day:Weekday;sessionId:string}
  candidates:{assignment:TeachingAssignment;missing:number}[]
  onSelect:(assignment:TeachingAssignment)=>void
}){
  const group=project.groups.find(item=>item.id===slot.groupId)
  const block=project.schedule.blocks.find(item=>item.id===slot.sessionId)
  return <div className="empty-slot-modal">
    <div className="empty-slot-context">
      <strong>{group?.name??'Grupo'} · {dayLabels[slot.day]} · {block?.label??'Sesión'}</strong>
      <p>Solo se muestran cargas ya previstas en el Plan de estudios que aún tienen sesiones pendientes y cuyo docente está disponible.</p>
    </div>
    {candidates.length===0
      ? <div className="empty-slot-no-options">
          <AlertTriangle size={20}/>
          <div>
            <strong>No hay opciones automáticas compatibles</strong>
            <p>Este hueco no puede rellenarse sin modificar el Plan de estudios, una asignación o la disponibilidad docente. Revísalo antes de añadir una carga nueva.</p>
          </div>
        </div>
      : <div className="empty-slot-options">
          {candidates.map(({assignment,missing})=>{
            const subject=project.subjects.find(item=>item.id===assignment.subjectId)
            const teacher=project.teachers.find(item=>item.id===assignment.teacherId)
            return <button key={assignment.id} onClick={()=>onSelect(assignment)}>
              <span><strong>{subject?.name??'Materia'}</strong><small>{teacher?.name??'Docente'} · {missing} sesión{missing===1?'':'es'} pendiente{missing===1?'':'s'}</small></span>
              <Plus size={18}/>
            </button>
          })}
        </div>}
    <div className="empty-slot-footnote">
      <CheckCircle2 size={16}/>
      <span>Al elegir una opción, Viyeutica registra la franja fija en Asignaciones y la marca como asignada en la disponibilidad docente. Después debe regenerarse el horario.</span>
    </div>
  </div>
}
