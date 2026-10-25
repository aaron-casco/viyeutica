import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  BriefcaseBusiness, CheckCircle2, ChevronDown, Clock3, GraduationCap, Pencil, Plus,
  Save, Trash2, UserRoundCog, Users,
} from 'lucide-react'
import type { Teacher, TeacherDedication, TeacherDedicationType, ViyeuticaProject } from '../domain/project'
import { isStudyPlanComplete, validateStaff } from '../domain/project'
import { saveProject } from '../store/projectStorage'
import { WizardStepper } from '../components/WizardStepper'
import { TemplatePanel } from '../components/TemplatePanel'

type EmploymentType=Teacher['employmentType']
type TeacherStatus=Teacher['status']

interface Draft {
  name:string
  status:TeacherStatus
  employmentType:EmploymentType
  specialties:string
  roles:string
  weeklyTeachingMinutes:string
  tutorGroupIds:string[]
  dedications:TeacherDedication[]
}

interface DedicationDraft {
  type:TeacherDedicationType
  label:string
  weeklyPeriods:string
  weeklyMinutes:string
  notes:string
}

const emptyDedication:DedicationDraft={
  type:'management',
  label:'',
  weeklyPeriods:'',
  weeklyMinutes:'',
  notes:'',
}

const emptyDraft:Draft={
  name:'',
  status:'confirmed',
  employmentType:'full',
  specialties:'',
  roles:'',
  weeklyTeachingMinutes:'',
  tutorGroupIds:[],
  dedications:[],
}

const employmentLabels:Record<EmploymentType,string>={
  full:'Jornada completa',
  partial:'Jornada parcial',
  itinerant:'Itinerante',
  other:'Otra',
}

const dedicationLabels:Record<TeacherDedicationType,string>={
  management:'Cargo directivo',
  coordination:'Coordinación',
  reduction:'Reducción',
  support:'Apoyo / programa',
  other:'Otra dedicación',
}

const uid=()=> 'teacher_'+crypto.randomUUID()

function parseList(value:string){
  return value.split(',').map(item=>item.trim()).filter(Boolean)
}

export function StaffPage({
  project,
  navigate,
}:{
  project:ViyeuticaProject
  navigate:(path:string)=>void
}) {
  const [draft,setDraft]=useState<Draft>(emptyDraft)
  const [editingId,setEditingId]=useState<string|null>(null)
  const [error,setError]=useState('')
  const [templateMessage,setTemplateMessage]=useState('')
  const [dedicationDraft,setDedicationDraft]=useState<DedicationDraft>(emptyDedication)

  const teachers=project.teachers
  const activeTeachers=teachers.filter(teacher=>teacher.active)
  const confirmed=activeTeachers.filter(teacher=>teacher.status==='confirmed').length
  const pending=activeTeachers.filter(teacher=>teacher.status==='to_determine').length
  const itinerant=activeTeachers.filter(teacher=>teacher.employmentType==='itinerant').length
  const validation=useMemo(()=>validateStaff(project),[project])
  const hasName=Boolean(draft.name.trim())
  const hasSpecialties=parseList(draft.specialties).length>0
  const teacherReady=Boolean(hasName&&hasSpecialties)
  const dedicationPeriods=dedicationDraft.weeklyPeriods===''?0:Number(dedicationDraft.weeklyPeriods)
  const dedicationMinutes=dedicationDraft.weeklyMinutes===''?0:Number(dedicationDraft.weeklyMinutes)
  const dedicationReady=Boolean(
    hasSpecialties &&
    dedicationDraft.label.trim() &&
    ((Number.isFinite(dedicationPeriods)&&dedicationPeriods>0)||(Number.isFinite(dedicationMinutes)&&dedicationMinutes>0))
  )
  const teacherGuide=!hasName?'Indica el nombre del docente o un identificador provisional.'
    :!hasSpecialties?'Indica al menos una especialidad. Después podrás completar tutorías, carga objetivo, cargos y dedicaciones.'
    :'Datos mínimos completos. Puedes guardar el docente o completar, si corresponde, tutorías, carga objetivo, cargos y dedicaciones.'

  const persist=(nextTeachers:Teacher[],nextGroups=project.groups)=>saveProject({...project,teachers:nextTeachers,groups:nextGroups})

  const reset=()=>{
    setDraft(emptyDraft)
    setDedicationDraft(emptyDedication)
    setEditingId(null)
    setError('')
  }

  const addDedication=()=>{
    if(!dedicationReady)return
    const dedication:TeacherDedication={
      id:'ded_'+crypto.randomUUID(),
      type:dedicationDraft.type,
      label:dedicationDraft.label.trim(),
      weeklyPeriods:dedicationDraft.weeklyPeriods===''?null:Number(dedicationDraft.weeklyPeriods),
      weeklyMinutes:dedicationDraft.weeklyMinutes===''?null:Number(dedicationDraft.weeklyMinutes),
      notes:dedicationDraft.notes.trim(),
    }
    setDraft(current=>({...current,dedications:[...current.dedications,dedication]}))
    setDedicationDraft(emptyDedication)
  }

  const removeDedication=(id:string)=>{
    setDraft(current=>({...current,dedications:current.dedications.filter(item=>item.id!==id)}))
  }

  const submit=(event:FormEvent)=>{
    event.preventDefault()
    if(!draft.name.trim()){
      setError('Indica el nombre del docente o un identificador provisional.')
      return
    }
    const specialties=parseList(draft.specialties)
    if(!specialties.length){
      setError('Indica al menos una especialidad.')
      return
    }
    const teacherId=editingId??uid()
    const teacher:Teacher={
      id:teacherId,
      name:draft.name.trim(),
      status:draft.status,
      employmentType:draft.employmentType,
      specialties,
      roles:parseList(draft.roles),
      weeklyTeachingMinutes:draft.weeklyTeachingMinutes===''?null:Math.max(0,Number(draft.weeklyTeachingMinutes)),
      dedications:draft.dedications,
      active:true,
    }
    const nextTeachers=editingId
      ? teachers.map(item=>item.id===editingId?teacher:item)
      : [...teachers,teacher]
    const selectedTutorGroups=new Set(draft.tutorGroupIds)
    const nextGroups=project.groups.map(group=>{
      if(selectedTutorGroups.has(group.id))return {...group,tutorTeacherId:teacherId}
      if(group.tutorTeacherId===teacherId)return {...group,tutorTeacherId:null}
      return group
    })
    persist(nextTeachers,nextGroups)
    reset()
  }

  const edit=(teacher:Teacher)=>{
    setEditingId(teacher.id)
    setDraft({
      name:teacher.name,
      status:teacher.status,
      employmentType:teacher.employmentType,
      specialties:teacher.specialties.join(', '),
      roles:teacher.roles.join(', '),
      weeklyTeachingMinutes:teacher.weeklyTeachingMinutes===null?'':String(teacher.weeklyTeachingMinutes),
      tutorGroupIds:project.groups.filter(group=>group.tutorTeacherId===teacher.id).map(group=>group.id),
      dedications:teacher.dedications??[],
    })
    setError('')
    window.scrollTo({top:0,behavior:'smooth'})
  }

  const remove=(id:string)=>{
    const usedByGroup=project.groups.some(group=>group.tutorTeacherId===id)
    const usedByAssignment=project.assignments.some(assignment=>assignment.teacherId===id&&assignment.active)
    if(usedByGroup||usedByAssignment){
      setError('Este docente está vinculado a una tutoría o asignación. Desactívalo en lugar de eliminarlo, o elimina primero esas relaciones.')
      return
    }
    persist(teachers.filter(teacher=>teacher.id!==id))
  }

  const toggleActive=(id:string)=>persist(
    teachers.map(teacher=>teacher.id===id?{...teacher,active:!teacher.active}:teacher),
  )

  const applyImportedTemplate=()=>{
    const imported=project.teachers.filter(teacher=>teacher.active)
    if(!imported.length){
      setTemplateMessage('No hay una plantilla docente importada en el proyecto.')
      return
    }
    setTemplateMessage(`La plantilla importada ya contiene ${imported.length} ${imported.length===1?'docente':'docentes'}. Revísalos y actualiza altas, bajas, jornadas, cargos y especialidades para ${project.academicYear.label}.`)
  }

  if(!isStudyPlanComplete(project)){
    return <div className="wizard-page staff-page">
      <section className="wizard-intro">
        <div>
          <h1 className="wizard-page-title"><Users size={28}/> Profesorado</h1>
          <p>Define la plantilla docente que podrá participar en el horario: especialidades, tipo de jornada, cargos/reducciones e itinerancias.</p>
        </div>
        <div className="wizard-progress-summary"><strong>5 <span>de 9</span></strong><small>Profesorado</small></div>
      </section>
      <WizardStepper currentStep={5} project={project} navigate={navigate}/>
      <section className="empty-state-card">
        <Users size={34}/>
        <h1>Completa primero el Plan de estudios</h1>
        <p>El profesorado se configurará sobre las etapas, grupos y materias ya definidas.</p>
        <button className="btn primary" onClick={()=>navigate('/materias')}>Ir a Plan de estudios</button>
      </section>
    </div>
  }

  return <div className="wizard-page staff-page">
    <section className="wizard-intro">
      <div>
        <h1 className="wizard-page-title"><Users size={28}/> Profesorado</h1>
        <p>Define la plantilla docente que podrá participar en el horario: especialidades, tipo de jornada, cargos/reducciones e itinerancias.</p>
      </div>
      <div className="wizard-progress-summary"><strong>5 <span>de 9</span></strong><small>Profesorado</small></div>
    </section>

    <WizardStepper currentStep={5} project={project} navigate={navigate}/>

    <section className="structure-summary">
      <Summary label="Docentes activos" value={String(activeTeachers.length)} detail="plantilla del curso"/>
      <Summary label="Confirmados" value={String(confirmed)} detail="nombre conocido"/>
      <Summary label="Por determinar" value={String(pending)} detail="vacantes / pendientes"/>
      <Summary label="Itinerantes" value={String(itinerant)} detail="desplazamientos entre centros"/>
    </section>

    <section className="staff-layout">
      <form className="form-card" onSubmit={submit}>
        <div className="form-card-heading">
          <div className="form-card-number">05</div>
          <div>
            <span className="panel-kicker">{editingId?'Edición':'Plantilla docente'}</span>
            <h2>{editingId?'Editar docente':'Añadir docente'}</h2>
            <p>Las asignaciones concretas a grupos y materias se realizarán en el Paso 6.</p>
          </div>
        </div>

        <div className="form-grid two">
          <Field label="Nombre / identificador" required>
            <input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="Ej. María López / Inglés PDTE"/>
          </Field>
          <Field label="Estado">
            <select value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value as TeacherStatus})}>
              <option value="confirmed">Confirmado</option>
              <option value="to_determine">Por determinar</option>
            </select>
          </Field>
          <Field label="Tipo de jornada">
            <select value={draft.employmentType} onChange={e=>setDraft({...draft,employmentType:e.target.value as EmploymentType})}>
              {(Object.entries(employmentLabels) as [EmploymentType,string][]).map(([value,label])=><option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Carga lectiva semanal (min)">
            <input type="number" min="0" step="5" value={draft.weeklyTeachingMinutes} onChange={e=>setDraft({...draft,weeklyTeachingMinutes:e.target.value})} placeholder="Opcional"/>
          </Field>
          <Field label="Especialidades" required>
            <input value={draft.specialties} onChange={e=>setDraft({...draft,specialties:e.target.value})} placeholder="Primaria, Inglés, PT..."/>
          </Field>
          <Field label="Cargos / funciones">
            <input value={draft.roles} onChange={e=>setDraft({...draft,roles:e.target.value})} placeholder="Tutor 3.º, Dirección, Coordinación..."/>
          </Field>
        </div>

        {error&&<div className="inline-error">{error}</div>}
        <div className={'form-guide '+(teacherReady?'complete':'partial')}><strong>{teacherReady?'Docente listo':'Siguiente paso'}</strong><span>{teacherGuide}</span></div>

        <div className="form-actions">
          <button type="button" className="btn secondary-light" onClick={()=>navigate('/materias')}>Paso anterior</button>
          <div className="form-actions-right">
            {editingId&&<button type="button" className="btn ghost-inline" onClick={reset}>Cancelar</button>}
            <button className="btn primary" type="submit" disabled={!teacherReady}><Save size={16}/>{editingId?'Guardar cambios':'Añadir docente'}</button>
          </div>
        </div>
      </form>

      <aside className="wizard-aside">
        <article className={'aside-card validation '+(validation.length===0&&activeTeachers.length?'ready':'')}>
          <span className="panel-kicker">Prevalidación</span>
          <strong>{validation.length===0&&activeTeachers.length?'Plantilla válida':validation.length?`${validation.length} ${validation.length===1?'incidencia':'incidencias'}`:'Sin profesorado'}</strong>
          <p>{validation[0]??'Todos los docentes activos tienen al menos una especialidad.'}</p>
        </article>
        <TemplatePanel
          title="Plantilla del curso anterior"
          description="Si has importado un JSON, conserva la plantilla docente para revisar únicamente cambios de este curso."
          actions={[
            {
              id:'imported-staff',
              label:'Revisar plantilla importada',
              description:project.teachers.length?`${project.teachers.length} ${project.teachers.length===1?'docente disponible':'docentes disponibles'}`:'No hay profesorado importado',
              disabled:project.teachers.length===0,
              onApply:applyImportedTemplate,
            },
          ]}
        />
      </aside>
    </section>

    {templateMessage&&<div className="template-result"><CheckCircle2 size={16}/><span>{templateMessage}</span></div>}

    <section className="groups-table-card">
      <div className="groups-table-heading">
        <div><span className="panel-kicker">Plantilla del curso</span><h2>Profesorado</h2></div>
        <button className="btn ghost-inline" onClick={()=>{reset();window.scrollTo({top:0,behavior:'smooth'})}}><Plus size={16}/> Nuevo docente</button>
      </div>
      {teachers.length===0
        ? <div className="groups-empty"><UserRoundCog size={28}/><strong>No hay docentes todavía</strong><p>Añádelos manualmente o importa el JSON del curso anterior.</p></div>
        : <div className="groups-table-wrap">
          <table className="groups-table staff-table">
            <thead><tr><th>Docente</th><th>Estado</th><th>Jornada</th><th>Especialidades</th><th>Cargos / funciones</th><th>Carga lectiva</th><th>Estado</th><th/></tr></thead>
            <tbody>{teachers.map(teacher=><tr key={teacher.id} className={!teacher.active?'is-inactive':''}>
              <td><strong>{teacher.name}</strong></td>
              <td>{teacher.status==='confirmed'?<span className="tag">Confirmado</span>:<span className="tag amber">Por determinar</span>}</td>
              <td>{employmentLabels[teacher.employmentType]}</td>
              <td>{teacher.specialties.length?teacher.specialties.join(', '):'—'}</td>
              <td>{teacher.roles.length?teacher.roles.join(', '):'—'}</td>
              <td>{teacher.weeklyTeachingMinutes===null?'—':formatMinutes(teacher.weeklyTeachingMinutes)}</td>
              <td><button className={'status-toggle '+(teacher.active?'active':'')} onClick={()=>toggleActive(teacher.id)}>{teacher.active?'Activo':'Inactivo'}</button></td>
              <td><div className="row-actions"><button title="Editar" onClick={()=>edit(teacher)}><Pencil size={15}/></button><button title="Eliminar" className="danger" onClick={()=>remove(teacher.id)}><Trash2 size={15}/></button></div></td>
            </tr>)}</tbody>
          </table>
        </div>}
    </section>

    <section className="staff-info-grid">
      <article className="panel compact-info-panel"><BriefcaseBusiness size={22}/><div><strong>Cargos y reducciones</strong><p>De momento se registran como funciones del docente. En Reglas y Asignaciones se convertirán en restricciones temporales y reducciones de carga.</p></div></article>
      <article className="panel compact-info-panel"><Clock3 size={22}/><div><strong>Disponibilidad</strong><p>La disponibilidad detallada por día/sesión se editará en el Paso 6 junto con las asignaciones para evitar duplicar información.</p></div></article>
      <article className="panel compact-info-panel"><GraduationCap size={22}/><div><strong>Tutorías</strong><p>Las tutorías existentes en el JSON se conservarán; las nuevas se vincularán al configurar las asignaciones.</p></div></article>
    </section>
  </div>
}

function Summary({label,value,detail}:{label:string;value:string;detail:string}){return <article className="structure-summary-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>}
function Field({label,required,children}:{label:string;required?:boolean;children:React.ReactNode}){return <label className="form-field"><span>{label}{required&&<em>*</em>}</span>{children}</label>}
function formatMinutes(minutes:number){const h=Math.floor(minutes/60),m=minutes%60;return h?(m?`${h} h ${m} min`:`${h} h`):`${m} min`}
