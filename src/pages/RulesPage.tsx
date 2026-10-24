import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  CheckCircle2, FileCheck2, Pencil, Plus, Save, ShieldAlert, ShieldCheck,
  SlidersHorizontal, Trash2,
} from 'lucide-react'
import {
  isAssignmentsComplete,
  validateRules,
  type CenterRule,
  type NormativeRule,
  type ViyeuticaProject,
} from '../domain/project'
import { saveProject } from '../store/projectStorage'
import { convertNormativeToCenterRule } from '../domain/normativeRuleBridge'
import { WizardStepper } from '../components/WizardStepper'
import { TemplatePanel } from '../components/TemplatePanel'

type RuleType=CenterRule['ruleType']

interface Draft {
  scope:string
  ruleType:RuleType
  code:string
  description:string
  weight:string
  conditionKind:string
  teacherId:string
  groupId:string
  subjectId:string
  stage:string
  day:string
  sessionId:string
  value:string
  comparison:string
}

const emptyDraft:Draft={
  scope:'center',
  ruleType:'HARD',
  code:'',
  description:'',
  weight:'',
  conditionKind:'generic',
  teacherId:'',
  groupId:'',
  subjectId:'',
  stage:'',
  day:'',
  sessionId:'',
  value:'',
  comparison:'equals',
}

const scopes=[
  ['center','Centro'],
  ['group','Grupo'],
  ['teacher','Profesorado'],
  ['subject','Materia'],
  ['schedule','Jornada'],
  ['assignment','Asignación'],
  ['resource','Recurso'],
] as const

const CONDITION_SCOPES:Record<string,string[]>={
  generic:['center','group','teacher','subject','schedule','assignment','resource'],
  availability:['teacher','group','subject','assignment'],
  daily_limit:['teacher','group','subject'],
  consecutive_limit:['teacher','group','subject'],
  fixed_slot:['assignment','teacher','group','subject'],
  avoid_slot:['teacher','group','subject','assignment','schedule'],
  weekly_load:['teacher','group','subject'],
}

function allowedScopes(kind:string){
  return CONDITION_SCOPES[kind]??CONDITION_SCOPES.generic
}

const uid=()=> 'rule_'+crypto.randomUUID()

type ConditionField='comparison'|'teacherId'|'groupId'|'subjectId'|'stage'|'day'|'sessionId'|'value'

const CONDITION_FIELDS:Record<string,ConditionField[]>={
  generic:['comparison','teacherId','groupId','subjectId','stage','day','sessionId','value'],
  availability:['comparison','teacherId','groupId','subjectId','day','sessionId'],
  daily_limit:['comparison','teacherId','groupId','subjectId','value'],
  consecutive_limit:['comparison','teacherId','groupId','subjectId','value'],
  fixed_slot:['teacherId','groupId','subjectId','day','sessionId'],
  avoid_slot:['comparison','teacherId','groupId','subjectId','day','sessionId'],
  weekly_load:['comparison','teacherId','groupId','subjectId','value'],
}

const CONDITION_COMPARISONS:Record<string,string[]>={
  generic:['equals','not_equals','minimum','maximum','avoid','prefer'],
  availability:['equals','not_equals','prefer'],
  daily_limit:['maximum','minimum','equals'],
  consecutive_limit:['maximum','minimum','equals'],
  fixed_slot:['equals'],
  avoid_slot:['avoid','prefer'],
  weekly_load:['maximum','minimum','equals'],
}

function conditionUses(kind:string,field:ConditionField){
  return (CONDITION_FIELDS[kind]??CONDITION_FIELDS.generic).includes(field)
}

function normalizeDraftForCondition(draft:Draft,kind:string):Draft{
  const allowedScopeValues=allowedScopes(kind)
  const next={...draft,conditionKind:kind,scope:allowedScopeValues.includes(draft.scope)?draft.scope:allowedScopeValues[0]}
  const fields=CONDITION_FIELDS[kind]??CONDITION_FIELDS.generic
  for(const field of ['teacherId','groupId','subjectId','stage','day','sessionId','value'] as ConditionField[]){
    if(!fields.includes(field)) (next as any)[field]=''
  }
  const allowed=CONDITION_COMPARISONS[kind]??CONDITION_COMPARISONS.generic
  next.comparison=allowed.includes(next.comparison)?next.comparison:allowed[0]
  return next
}

function normalizeDraftForScope(draft:Draft,scope:string):Draft{
  if(scope===draft.scope) return draft
  return {
    ...draft,
    scope,
    teacherId:'',
    groupId:'',
    subjectId:'',
    stage:'',
    day:'',
    sessionId:'',
  }
}

function targetFieldOrder(scope:string):ConditionField[]{
  if(scope==='assignment'||scope==='group') return ['groupId','subjectId','teacherId','stage','day','sessionId']
  if(scope==='teacher') return ['teacherId','groupId','subjectId','stage','day','sessionId']
  if(scope==='subject') return ['subjectId','groupId','teacherId','stage','day','sessionId']
  if(scope==='schedule') return ['day','sessionId','stage','groupId','subjectId','teacherId']
  return ['stage','groupId','subjectId','teacherId','day','sessionId']
}

function buildParameters(draft:Draft){
  const parameters:Record<string,unknown>={conditionKind:draft.conditionKind}
  if(conditionUses(draft.conditionKind,'teacherId')&&draft.teacherId) parameters.teacherId=draft.teacherId
  if(conditionUses(draft.conditionKind,'groupId')&&draft.groupId) parameters.groupId=draft.groupId
  if(conditionUses(draft.conditionKind,'subjectId')&&draft.subjectId) parameters.subjectId=draft.subjectId
  if(conditionUses(draft.conditionKind,'stage')&&draft.stage) parameters.stage=draft.stage
  if(conditionUses(draft.conditionKind,'day')&&draft.day) parameters.day=draft.day
  if(conditionUses(draft.conditionKind,'sessionId')&&draft.sessionId) parameters.sessionId=draft.sessionId
  if(conditionUses(draft.conditionKind,'value')&&draft.value!=='') parameters.value=Number.isNaN(Number(draft.value))?draft.value:Number(draft.value)
  if(conditionUses(draft.conditionKind,'comparison')&&draft.comparison) parameters.comparison=draft.comparison
  if(draft.conditionKind==='fixed_slot') parameters.comparison='equals'
  return parameters
}

function draftFromRule(rule:CenterRule):Draft{
  const p=rule.parameters??{}
  return {
    scope:rule.scope,
    ruleType:rule.ruleType,
    code:rule.code,
    description:rule.description,
    weight:rule.weight?String(rule.weight):'',
    conditionKind:String(p.conditionKind??'generic'),
    teacherId:String(p.teacherId??''),
    groupId:String(p.groupId??''),
    subjectId:String(p.subjectId??''),
    stage:String(p.stage??''),
    day:String(p.day??''),
    sessionId:String(p.sessionId??''),
    value:p.value===undefined||p.value===null?'':String(p.value),
    comparison:String(p.comparison??'equals'),
  }
}

export function RulesPage({
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
  const [filter,setFilter]=useState<'all'|'HARD'|'SOFT'>('all')
  const [auditFocus,setAuditFocus]=useState('')

  const validation=useMemo(()=>validateRules(project),[project])
  const activeRules=project.rules.filter(rule=>rule.active)
  const hardCount=activeRules.filter(rule=>rule.ruleType==='HARD').length
  const softCount=activeRules.filter(rule=>rule.ruleType==='SOFT').length
  const normativeCount=activeRules.filter(rule=>rule.source==='normative').length
  const importedCount=activeRules.filter(rule=>rule.source==='imported').length

  useEffect(()=>{
    const raw=window.location.hash.split('?')[1]
    if(!raw)return
    const params=new URLSearchParams(raw)
    const code=params.get('auditCode')
    if(!code)return
    const rule=project.rules.find(item=>item.code===code)
    if(rule){
      setEditingId(rule.id)
      setDraft(draftFromRule(rule))
      setFilter(rule.ruleType)
      setAuditFocus('Regla cargada desde Auditoría: '+humanRuleName(rule.code))
      window.setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),60)
    }else{
      setAuditFocus('Auditoría ha señalado '+code+', pero no existe una regla editable con ese código.')
    }
  },[])

  const persist=(rules:CenterRule[])=>saveProject({...project,rules})

  const reset=()=>{
    setDraft(emptyDraft)
    setEditingId(null)
    setError('')
  }

  const submit=(event:FormEvent)=>{
    event.preventDefault()
    if(!draft.code.trim()||!draft.description.trim()){
      setError('Indica código y descripción.')
      return
    }
    const parameters=buildParameters(draft)
    const weight=draft.ruleType==='SOFT'
      ? Number(draft.weight)
      : null
    if(draft.ruleType==='SOFT'&&(weight===null||!Number.isFinite(weight)||weight<=0)){
      setError('Las reglas SOFT necesitan un peso mayor que cero.')
      return
    }
    const duplicate=project.rules.some(rule=>rule.id!==editingId&&rule.code.trim().toLowerCase()===draft.code.trim().toLowerCase())
    if(duplicate){
      setError('Ya existe una regla con ese código.')
      return
    }

    const previous=editingId?project.rules.find(rule=>rule.id===editingId):undefined
    const rule:CenterRule={
      id:editingId??uid(),
      scope:draft.scope,
      ruleType:draft.ruleType,
      code:draft.code.trim(),
      description:draft.description.trim(),
      parameters,
      weight,
      source:previous?.source??'manual',
      normativeRuleId:previous?.normativeRuleId??null,
      active:true,
      reviewRequired:false,
    }
    persist(editingId
      ? project.rules.map(item=>item.id===editingId?rule:item)
      : [...project.rules,rule]
    )
    reset()
  }

  const edit=(rule:CenterRule)=>{
    setEditingId(rule.id)
    setDraft(draftFromRule(rule))
    setError('')
    window.scrollTo({top:0,behavior:'smooth'})
  }

  const remove=(id:string)=>persist(project.rules.filter(rule=>rule.id!==id))
  const toggle=(id:string)=>persist(project.rules.map(rule=>rule.id===id?{...rule,active:!rule.active}:rule))

  const markImportedReviewed=()=>{
    const count=project.rules.filter(rule=>rule.source==='imported'||rule.reviewRequired).length
    if(!count){
      setTemplateMessage('No hay reglas importadas pendientes de revisión.')
      return
    }
    persist(project.rules.map(rule=>
      rule.source==='imported'||rule.reviewRequired
        ? {...rule,source:'imported',reviewRequired:false}
        : rule
    ))
    setTemplateMessage(`${count} reglas importadas marcadas como revisadas. Comprueba individualmente su vigencia antes de generar.`)
  }

  const createNormativeRules=()=>{
    const approved=project.normativeRules.filter(rule=>rule.approved&&(rule.relevance??legacyNormativeRelevance(rule))==='timetable')
    const existingNormIds=new Set(project.rules.map(rule=>rule.normativeRuleId).filter(Boolean))
    const additions:CenterRule[]=[]
    for(const normative of approved){
      if(existingNormIds.has(normative.id)) continue
      const source=project.normativeSources.find(item=>item.id===normative.sourceId)
      additions.push(convertNormativeToCenterRule(normative,source))
    }
    if(!additions.length){
      setTemplateMessage('No hay reglas normativas aprobadas nuevas para incorporar.')
      return
    }
    persist([...project.rules,...additions])
    setTemplateMessage(`Se han creado ${additions.length} reglas desde normativa aprobada. Quedan marcadas para revisión antes de considerarlas definitivas.`)
  }

  const addBaseRules=()=>{
    const seeds:CenterRule[]=[
      {
        id:uid(),
        scope:'teacher',
        ruleType:'HARD',
        code:'SIN_SOLAPE_DOCENTE',
        description:'Un docente no puede estar asignado a dos actividades simultáneas.',
        parameters:{},
        weight:null,
        source:'manual',
        active:true,
        reviewRequired:false,
      },
      {
        id:uid(),
        scope:'group',
        ruleType:'HARD',
        code:'SIN_SOLAPE_GRUPO',
        description:'Un grupo no puede tener dos actividades simultáneas.',
        parameters:{},
        weight:null,
        source:'manual',
        active:true,
        reviewRequired:false,
      },
      {
        id:uid(),
        scope:'teacher',
        ruleType:'HARD',
        code:'RESPETAR_DISPONIBILIDAD_DOCENTE',
        description:'Las asignaciones deben respetar la disponibilidad e indisponibilidad docente registrada.',
        parameters:{},
        weight:null,
        source:'manual',
        active:true,
        reviewRequired:false,
      },
      {
        id:uid(),
        scope:'schedule',
        ruleType:'HARD',
        code:'RESPETAR_FRANJAS_FIJAS',
        description:'Las franjas fijadas deben mantenerse en el día y sesión indicados.',
        parameters:{},
        weight:null,
        source:'manual',
        active:true,
        reviewRequired:false,
      },
      {
        id:uid(),
        scope:'teacher',
        ruleType:'SOFT',
        code:'REDUCIR_HUECOS_DOCENTES',
        description:'Minimizar huecos innecesarios en el horario individual del profesorado.',
        parameters:{},
        weight:5,
        source:'manual',
        active:true,
        reviewRequired:false,
      },
    ]
    const existingCodes=new Set(project.rules.map(rule=>rule.code))
    const additions=seeds.filter(seed=>!existingCodes.has(seed.code))
    persist([...project.rules,...additions])
    setTemplateMessage(additions.length?`Se han añadido ${additions.length} reglas base editables.`:'Las reglas base ya existen.')
  }

  if(!isAssignmentsComplete(project)){
    return <section className="empty-state-card">
      <ShieldCheck size={34}/>
      <h1>Completa primero Asignaciones</h1>
      <p>Las reglas necesitan una estructura docente y curricular coherente para poder validarse.</p>
      <button className="btn primary" onClick={()=>navigate('/asignaciones')}>Ir a Asignaciones</button>
    </section>
  }

  const visible=project.rules.filter(rule=>filter==='all'||rule.ruleType===filter)

  return <div className="wizard-page rules-page">
    <section className="wizard-intro">
      <div>
        <h1 className="wizard-page-title"><ShieldCheck size={28}/> Reglas</h1>
        <p>Define qué condiciones son obligatorias (HARD) y qué preferencias debe optimizar el generador (SOFT). Cada regla se guarda de forma estructurada para el solver y la auditoría.</p>
      </div>
      <div className="wizard-progress-summary"><strong>7 <span>de 9</span></strong><small>Reglas</small></div>
    </section>

    <WizardStepper currentStep={7} project={project} navigate={navigate}/>

    {auditFocus&&<section className="template-result audit-context-banner"><CheckCircle2 size={16}/><span>{auditFocus}</span></section>}

    <section className="structure-summary">
      <Summary label="Reglas activas" value={String(activeRules.length)} detail="total aplicable"/>
      <Summary label="HARD" value={String(hardCount)} detail="obligatorias"/>
      <Summary label="SOFT" value={String(softCount)} detail="preferencias ponderadas"/>
      <Summary label="Normativa / importadas" value={`${normativeCount}/${importedCount}`} detail="por procedencia"/>
    </section>

    <section className="rules-layout">
      <form className="form-card" onSubmit={submit}>
        <div className="form-card-heading">
          <div className="form-card-number">07</div>
          <div>
            <span className="panel-kicker">{editingId?'Edición':'Nueva restricción'}</span>
            <h2>{editingId?'Editar regla':'Crear regla'}</h2>
            <p>Una regla HARD invalida una solución si se incumple. Una SOFT aporta penalización al score.</p>
          </div>
        </div>

        <div className="form-grid two">
          <Field label="Tipo" required>
            <select value={draft.ruleType} onChange={e=>setDraft({...draft,ruleType:e.target.value as RuleType})}>
              <option value="HARD">HARD · obligatoria</option>
              <option value="SOFT">SOFT · preferencia</option>
            </select>
          </Field>
          <Field label="Código" required>
            <input value={draft.code} onChange={e=>setDraft({...draft,code:e.target.value.toUpperCase().replace(/\s+/g,'_')})} placeholder="Ej. SIN_SOLAPE_DOCENTE"/>
          </Field>
          <Field label="Peso">
            <input type="number" min="1" disabled={draft.ruleType==='HARD'} value={draft.ruleType==='HARD'?'':draft.weight} onChange={e=>setDraft({...draft,weight:e.target.value})} placeholder={draft.ruleType==='SOFT'?'Ej. 5':'No aplica'}/>
          </Field>
        </div>
        <Field label="Descripción" required>
          <textarea value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} placeholder="Describe de forma inequívoca la condición..."/>
        </Field>
        <section className="rule-condition-builder">
          <div className="rule-condition-builder-heading">
            <span className="panel-kicker">Condición de la regla</span>
            <h3>Construir condición</h3>
            <p>Selecciona únicamente los campos que necesites. Viyeutica guardará la estructura técnica automáticamente.</p>
          </div>

          <div className="form-grid two">
            <Field label="Tipo de condición">
              <select value={draft.conditionKind} onChange={e=>setDraft(normalizeDraftForCondition(draft,e.target.value))}>
                <option value="generic">Condición general</option>
                <option value="availability">Disponibilidad / indisponibilidad</option>
                <option value="daily_limit">Límite diario</option>
                <option value="consecutive_limit">Sesiones consecutivas</option>
                <option value="fixed_slot">Franja fija</option>
                <option value="avoid_slot">Evitar franja</option>
                <option value="weekly_load">Carga semanal</option>
              </select>
            </Field>
            <Field label="Ámbito" required>
              <select value={draft.scope} onChange={e=>setDraft(normalizeDraftForScope(draft,e.target.value))}>
                {scopes
                  .filter(([value])=>allowedScopes(draft.conditionKind).includes(value))
                  .map(([value,label])=><option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            {conditionUses(draft.conditionKind,'comparison')&&<Field label="Comparación">
              <select value={draft.comparison} onChange={e=>setDraft({...draft,comparison:e.target.value})}>
                {(CONDITION_COMPARISONS[draft.conditionKind]??CONDITION_COMPARISONS.generic).map(value=><option key={value} value={value}>{comparisonLabel(value)}</option>)}
              </select>
            </Field>}

            <RuleTargetFields draft={draft} project={project} onChange={setDraft}/>

            {conditionUses(draft.conditionKind,'value')&&<Field label="Valor">
              <input type="number" min="1" value={draft.value} onChange={e=>setDraft({...draft,value:e.target.value})} placeholder="Ej. 2"/>
            </Field>}
          </div>

          <RuleConditionPreview draft={draft} project={project}/>
        </section>

        {error&&<div className="inline-error">{error}</div>}

        <div className="form-actions">
          <button type="button" className="btn secondary-light" onClick={()=>navigate('/asignaciones')}>Paso anterior</button>
          <div className="form-actions-right">
            {editingId&&<button type="button" className="btn ghost-inline" onClick={reset}>Cancelar</button>}
            <button className="btn primary" type="submit"><Save size={16}/>{editingId?'Guardar cambios':'Añadir regla'}</button>
          </div>
        </div>
      </form>

      <aside className="wizard-aside">
        <article className={'aside-card validation '+(validation.length===0&&activeRules.length?'ready':'')}>
          <span className="panel-kicker">Prevalidación</span>
          <strong>{validation.length===0&&activeRules.length?'Reglas preparadas':validation.length?`${validation.length} incidencias`:'Sin reglas'}</strong>
          <p>{validation[0]??'Las reglas activas tienen una estructura válida.'}</p>
        </article>

        <TemplatePanel
          title="Plantillas de reglas"
          description="Combina reglas base del motor, reglas importadas del curso anterior y reglas obtenidas de normativa aprobada."
          actions={[
            {
              id:'base-rules',
              label:'Añadir reglas base',
              description:'Solapes, disponibilidad, franjas fijas y reducción de huecos',
              onApply:addBaseRules,
            },
            {
              id:'imported-rules',
              label:'Revisar reglas importadas',
              description:project.rules.some(rule=>rule.source==='imported'||rule.reviewRequired)?'Hay reglas del curso anterior':'No hay reglas importadas pendientes',
              disabled:!project.rules.some(rule=>rule.source==='imported'||rule.reviewRequired),
              onApply:markImportedReviewed,
            },
            {
              id:'normative-rules',
              label:'Incorporar normativa aprobada',
              description:project.normativeRules.some(rule=>rule.approved&&(rule.relevance??legacyNormativeRelevance(rule))==='timetable')?'Crear reglas trazables desde Normativa':'No hay normativa aplicable al horario aprobada',
              disabled:!project.normativeRules.some(rule=>rule.approved&&(rule.relevance??legacyNormativeRelevance(rule))==='timetable'),
              onApply:createNormativeRules,
            },
          ]}
        />
      </aside>
    </section>

    {templateMessage&&<div className="template-result"><CheckCircle2 size={16}/><span>{templateMessage}</span></div>}

    <section className="groups-table-card">
      <div className="groups-table-heading">
        <div><span className="panel-kicker">Motor de restricciones</span><h2>Reglas configuradas</h2></div>
        <div className="rule-filter">
          <button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>Todas</button>
          <button className={filter==='HARD'?'active hard':''} onClick={()=>setFilter('HARD')}>HARD</button>
          <button className={filter==='SOFT'?'active soft':''} onClick={()=>setFilter('SOFT')}>SOFT</button>
        </div>
      </div>

      {visible.length===0
        ? <div className="groups-empty"><ShieldAlert size={28}/><strong>No hay reglas en esta vista</strong><p>Añade una regla o aplica una plantilla.</p></div>
        : <div className="rules-list">{visible.map(rule=><article className={'rule-card '+rule.ruleType.toLowerCase()+(!rule.active?' inactive':'')} key={rule.id}>
            <div className="rule-type-badge">{rule.ruleType}</div>
            <div className="rule-card-main">
              <div className="rule-title-row"><strong>{humanRuleName(rule.code)}</strong><span>{scopeLabel(rule.scope)}</span>{rule.source&&<span>{sourceLabel(rule.source)}</span>}{rule.reviewRequired&&<span className="review-tag">Revisar</span>}</div>
              <p>{rule.description}</p>
              <small>{describeParameters(rule,project)}{rule.ruleType==='SOFT'&&<> · Peso <strong>{rule.weight??'—'}</strong></>}</small>
              {rule.source==='normative'&&rule.normativeRuleId&&<NormativeTrace project={project} id={rule.normativeRuleId}/>}
            </div>
            <div className="rule-card-actions">
              <button className={'status-toggle '+(rule.active?'active':'')} onClick={()=>toggle(rule.id)}>{rule.active?'Activa':'Inactiva'}</button>
              <button title="Editar" onClick={()=>edit(rule)}><Pencil size={15}/></button>
              <button title="Eliminar" className="danger" onClick={()=>remove(rule.id)}><Trash2 size={15}/></button>
            </div>
          </article>)}</div>}
    </section>

    <NormativeTraceabilityPanel project={project}/>
  
  </div>
}

function Summary({label,value,detail}:{label:string;value:string;detail:string}){return <article className="structure-summary-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>}
function Field({label,required,children}:{label:string;required?:boolean;children:React.ReactNode}){return <label className="form-field"><span>{label}{required&&<em>*</em>}</span>{children}</label>}

function RuleTargetFields({
  draft,project,onChange,
}:{
  draft:Draft
  project:ViyeuticaProject
  onChange:(draft:Draft)=>void
}){
  const activeAssignments=project.assignments.filter(item=>item.active)

  const groupOptions=project.groups.filter(group=>{
    if(!group.active)return false
    if(draft.scope==='teacher'&&draft.teacherId){
      return activeAssignments.some(item=>item.teacherId===draft.teacherId&&item.groupId===group.id)
    }
    if(draft.scope==='subject'&&draft.subjectId){
      return activeAssignments.some(item=>item.subjectId===draft.subjectId&&item.groupId===group.id)
    }
    return true
  })

  const subjectOptions=project.subjects.filter(subject=>{
    if(!subject.active)return false
    if(draft.groupId){
      return activeAssignments.some(item=>item.groupId===draft.groupId&&item.subjectId===subject.id) ||
        project.studyPlan.some(item=>item.active&&item.groupId===draft.groupId&&item.subjectId===subject.id)
    }
    if(draft.scope==='teacher'&&draft.teacherId){
      return activeAssignments.some(item=>item.teacherId===draft.teacherId&&item.subjectId===subject.id)
    }
    return true
  })

  const teacherOptions=project.teachers.filter(teacher=>{
    if(!teacher.active)return false
    if(draft.scope==='teacher')return true
    if(draft.groupId||draft.subjectId){
      return activeAssignments.some(item=>
        item.teacherId===teacher.id &&
        (!draft.groupId||item.groupId===draft.groupId) &&
        (!draft.subjectId||item.subjectId===draft.subjectId)
      )
    }
    return true
  })

  const update=(field:ConditionField,value:string)=>{
    const next={...draft,[field]:value} as Draft
    if(field==='teacherId'&&draft.scope==='teacher'){
      next.groupId=''
      next.subjectId=''
    }
    if(field==='subjectId'&&draft.scope==='subject'){
      next.groupId=''
      next.teacherId=''
    }
    if(field==='groupId'){
      if(draft.scope==='group'||draft.scope==='assignment'){
        next.subjectId=''
        next.teacherId=''
      }else{
        next.subjectId=''
      }
    }
    if(field==='subjectId'&&(draft.scope==='group'||draft.scope==='assignment')){
      next.teacherId=''
    }
    onChange(next)
  }

  const disabled=(field:ConditionField)=>{
    if(field==='groupId'){
      if(draft.scope==='teacher') return !draft.teacherId
      if(draft.scope==='subject') return !draft.subjectId
    }
    if(field==='subjectId'){
      if(draft.scope==='group'||draft.scope==='assignment'||draft.scope==='teacher') return !draft.groupId
    }
    if(field==='teacherId'){
      if(draft.scope==='group'||draft.scope==='assignment') return !draft.subjectId
      if(draft.scope==='subject') return !draft.groupId
    }
    if(field==='sessionId'&&draft.conditionKind==='fixed_slot') return !draft.day
    return false
  }

  const placeholder=(field:ConditionField)=>{
    if(field==='groupId'&&draft.scope==='teacher'&&!draft.teacherId)return 'Selecciona primero Profesor/a'
    if(field==='groupId'&&draft.scope==='subject'&&!draft.subjectId)return 'Selecciona primero Materia'
    if(field==='subjectId'&&!draft.groupId&&['group','assignment','teacher'].includes(draft.scope))return 'Selecciona primero Grupo'
    if(field==='teacherId'&&!draft.subjectId&&['group','assignment'].includes(draft.scope))return 'Selecciona primero Materia'
    if(field==='teacherId'&&!draft.groupId&&draft.scope==='subject')return 'Selecciona primero Grupo'
    if(field==='sessionId'&&draft.conditionKind==='fixed_slot'&&!draft.day)return 'Selecciona primero Día'
    return 'Cualquiera / no aplica'
  }

  const render=(field:ConditionField)=>{
    if(!conditionUses(draft.conditionKind,field))return null
    if(field==='teacherId')return <Field key={field} label="Profesor/a">
      <select disabled={disabled(field)} value={draft.teacherId} onChange={e=>update(field,e.target.value)}>
        <option value="">{placeholder(field)}</option>
        {teacherOptions.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </Field>
    if(field==='groupId')return <Field key={field} label="Grupo">
      <select disabled={disabled(field)} value={draft.groupId} onChange={e=>update(field,e.target.value)}>
        <option value="">{placeholder(field)}</option>
        {groupOptions.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </Field>
    if(field==='subjectId')return <Field key={field} label="Materia">
      <select disabled={disabled(field)} value={draft.subjectId} onChange={e=>update(field,e.target.value)}>
        <option value="">{placeholder(field)}</option>
        {subjectOptions.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </Field>
    if(field==='stage')return <Field key={field} label="Etapa">
      <select value={draft.stage} onChange={e=>update(field,e.target.value)}>
        <option value="">Cualquiera / no aplica</option>
        {project.center.stages.map(stage=><option key={stage} value={stage}>{stage}</option>)}
      </select>
    </Field>
    if(field==='day')return <Field key={field} label="Día">
      <select value={draft.day} onChange={e=>update(field,e.target.value)}>
        <option value="">Cualquiera / no aplica</option>
        {project.schedule.activeDays.map(day=><option key={day} value={day}>{dayName(day)}</option>)}
      </select>
    </Field>
    if(field==='sessionId')return <Field key={field} label="Sesión">
      <select disabled={disabled(field)} value={draft.sessionId} onChange={e=>update(field,e.target.value)}>
        <option value="">{placeholder(field)}</option>
        {project.schedule.blocks.filter(block=>block.active).map(block=><option key={block.id} value={block.id}>{block.label} · {block.start}-{block.end}</option>)}
      </select>
    </Field>
    return null
  }

  return <>{targetFieldOrder(draft.scope).map(render)}</>
}
function scopeLabel(scope:string){return scopes.find(([value])=>value===scope)?.[1]??scope}
function sourceLabel(source:CenterRule['source']){return source==='normative'?'Normativa':source==='imported'?'Importada':'Manual'}
function NormativeTrace({project,id}:{project:ViyeuticaProject;id:string}){
  const rule=project.normativeRules.find(item=>item.id===id)
  const source=rule?project.normativeSources.find(item=>item.id===rule.sourceId):undefined
  if(!rule)return null
  return <div className="rule-trace"><FileCheck2 size={13}/><span>{source?.name??'Fuente normativa'} · {rule.reference?rule.reference+' · ':''}pág. {rule.page} · confianza {Math.round(rule.confidence*100)}%</span></div>
}


function humanRuleName(code:string){
  const names:Record<string,string>={
    SIN_SOLAPE_DOCENTE:'Sin solape de profesorado',
    SIN_SOLAPE_GRUPO:'Sin solape de grupos',
    RESPETAR_DISPONIBILIDAD_DOCENTE:'Respetar disponibilidad docente',
    RESPETAR_FRANJAS_FIJAS:'Respetar franjas fijas',
    REDUCIR_HUECOS_DOCENTES:'Reducir huecos del profesorado',
  }
  return names[code]??code.replace(/_/g,' ').toLowerCase().replace(/^./,letter=>letter.toUpperCase())
}


function describeParameters(rule:CenterRule, project:ViyeuticaProject){
  const p=rule.parameters??{}
  const parts:string[]=[]
  const teacher=project.teachers.find(item=>item.id===p.teacherId)
  const group=project.groups.find(item=>item.id===p.groupId)
  const subject=project.subjects.find(item=>item.id===p.subjectId)
  const block=project.schedule.blocks.find(item=>item.id===p.sessionId)
  if(teacher) parts.push('Profesor: '+teacher.name)
  if(group) parts.push('Grupo: '+group.name)
  if(subject) parts.push('Materia: '+subject.name)
  if(p.stage) parts.push('Etapa: '+String(p.stage))
  if(p.day) parts.push('Día: '+dayName(String(p.day)))
  if(block) parts.push('Sesión: '+block.label)
  if(p.value!==undefined) parts.push(comparisonLabel(String(p.comparison??'equals'))+' '+String(p.value))
  return parts.length?parts.join(' · '):'Sin condiciones específicas'
}

function RuleConditionPreview({draft,project}:{draft:Draft;project:ViyeuticaProject}){
  const temp:CenterRule={
    id:'preview',scope:draft.scope,ruleType:draft.ruleType,code:draft.code||'VISTA_PREVIA',
    description:draft.description||'Vista previa',parameters:buildParameters(draft),
    weight:draft.ruleType==='SOFT'?(Number(draft.weight)||null):null,source:'manual',active:true,
  }
  return <div className="rule-condition-preview"><strong>Así se interpretará:</strong><span>{describeParameters(temp,project)}</span></div>
}

function dayName(day:string){
  return day==='L'?'Lunes':day==='M'?'Martes':day==='X'?'Miércoles':day==='J'?'Jueves':day==='V'?'Viernes':day==='S'?'Sábado':day
}
function comparisonLabel(value:string){
  const labels:Record<string,string>={
    equals:'Igual a',not_equals:'Distinto de',minimum:'Mínimo',maximum:'Máximo',avoid:'Evitar',prefer:'Preferir'
  }
  return labels[value]??value
}


function NormativeTraceabilityPanel({project}:{project:ViyeuticaProject}){
  const linkedRules=project.rules.filter(rule=>rule.source==='normative'&&rule.normativeRuleId)
  const approvedNormative=project.normativeRules.filter(rule=>rule.approved&&(rule.relevance??legacyNormativeRelevance(rule))==='timetable')

  const stateClass=linkedRules.length?'linked':approvedNormative.length?'pending-link':'missing'
  return <section className={'normative-traceability-panel '+stateClass}>
    <div className="normative-traceability-heading">
      <div>
        <span className="panel-kicker">Trazabilidad normativa</span>
        <h2>Qué normativa está influyendo en las reglas</h2>
        <p>Viyeutica conserva el vínculo entre la regla operativa y el fragmento normativo que la originó para poder justificarla durante la prevalidación, generación y auditoría.</p>
      </div>
      <div className="normative-traceability-kpis">
        <span><strong>{approvedNormative.length}</strong><small>reglas normativas aprobadas</small></span>
        <span><strong>{linkedRules.length}</strong><small>incorporadas a Reglas</small></span>
      </div>
    </div>

    {linkedRules.length===0
      ? <div className="normative-traceability-empty">
          <ShieldAlert size={20}/>
          <div>
            <strong>{approvedNormative.length
              ? 'Hay normativa aprobada pendiente de incorporar'
              : 'No hay reglas normativas aprobadas'}</strong>
            <p>{approvedNormative.length
              ? `Hay ${approvedNormative.length} reglas aprobadas en Normativa, pero todavía no influyen en Generación ni Auditoría porque no se han incorporado a Reglas. Usa “Incorporar normativa aprobada”.`
              : 'Las reglas actuales proceden únicamente de configuración manual o de una importación anterior. Si el centro necesita justificar restricciones con normativa vigente, revisa primero el módulo Normativa.'}</p>
          </div>
        </div>
      : <div className="normative-traceability-list">
          {linkedRules.map(rule=><NormativeTraceabilityItem key={rule.id} project={project} rule={rule}/>)}
        </div>}
  </section>
}

function NormativeTraceabilityItem({project,rule}:{project:ViyeuticaProject;rule:CenterRule}){
  const normative=project.normativeRules.find(item=>item.id===rule.normativeRuleId)
  const source=normative?project.normativeSources.find(item=>item.id===normative.sourceId):undefined

  if(!normative){
    return <article className="normative-traceability-item broken">
      <div className="normative-traceability-title">
        <ShieldAlert size={18}/>
        <div><strong>{humanRuleName(rule.code)}</strong><span>La referencia normativa original ya no está disponible.</span></div>
      </div>
    </article>
  }

  const applies=[
    normative.stage&&`Etapa: ${normative.stage}`,
    normative.level&&`Nivel: ${normative.level}`,
    normative.subject&&`Materia: ${normative.subject}`,
  ].filter(Boolean)

  return <article className="normative-traceability-item">
    <div className="normative-traceability-title">
      <FileCheck2 size={18}/>
      <div>
        <strong>{humanRuleName(rule.code)}</strong>
        <span>{rule.ruleType} · {rule.active?'Activa':'Inactiva'}{rule.reviewRequired?' · pendiente de revisión':''}</span>
      </div>
    </div>

    <div className="normative-traceability-grid">
      <div>
        <span className="trace-label">Regla normativa de origen</span>
        <strong>{normative.label}</strong>
        <p>{normative.excerpt||'Sin fragmento textual disponible.'}</p>
      </div>
      <div>
        <span className="trace-label">Fuente</span>
        <strong>{source?.name??'Documento no disponible'}</strong>
        <p>Página {normative.page} · confianza {Math.round(normative.confidence*100)}%</p>
      </div>
      <div>
        <span className="trace-label">Dato extraído</span>
        <strong>{normative.value!==null?`${normative.value} ${normativeUnitLabel(normative.unit)}`:'Regla textual'}</strong>
        <p>{applies.length?applies.join(' · '):'Aplicación general o no determinada automáticamente.'}</p>
      </div>
      <div>
        <span className="trace-label">Cómo se usa en Viyeutica</span>
        <strong>{explainNormativeUse(rule,normative)}</strong>
        <p>{explainNormativeImpact(rule,normative)}</p>
      </div>
    </div>
  </article>
}

function normativeUnitLabel(unit:NormativeRule['unit']){
  if(unit==='hours')return 'horas'
  if(unit==='minutes')return 'minutos'
  if(unit==='periods')return 'periodos'
  return ''
}

function explainNormativeUse(rule:CenterRule,normative:NormativeRule){
  if(normative.kind==='weekly_hours'||normative.kind==='weekly_minutes'||normative.kind==='weekly_periods'){
    return 'Control de carga semanal'
  }
  if(normative.kind==='session_minutes'){
    return 'Control de duración de sesiones'
  }
  if(normative.kind==='teacher_periods'){
    return 'Control de carga del profesorado'
  }
  if(normative.kind==='subject_rule'){
    return 'Restricción asociada a una materia'
  }
  if(normative.kind==='stage_rule'){
    return 'Restricción asociada a una etapa'
  }
  return rule.ruleType==='HARD'?'Restricción obligatoria':'Preferencia de optimización'
}

function explainNormativeImpact(rule:CenterRule,normative:NormativeRule){
  const value=normative.value!==null?` (${normative.value} ${normativeUnitLabel(normative.unit)})`:''
  if(rule.reviewRequired){
    return `Se ha creado a partir de la normativa${value}, pero todavía requiere revisión humana antes de considerarla definitiva.`
  }
  if(rule.ruleType==='HARD'){
    return `Generación deberá respetarla obligatoriamente${value}. Auditoría comprobará su cumplimiento cuando la condición sea evaluable automáticamente.`
  }
  return `Generación la tratará como preferencia ponderada${value}; no invalida por sí sola el horario.`
}


function legacyNormativeRelevance(rule:NormativeRule){
  if(rule.section==='schedule'||rule.section==='assignments'||rule.section==='staff'||rule.section==='structure') return 'timetable'
  if(rule.section==='study_plan'&&['weekly_hours','weekly_minutes','weekly_periods','session_minutes','subject_rule'].includes(rule.kind)) return 'timetable'
  if(rule.section==='rules'&&/horario|sesión|periodo|jornada|docente|grupo|asignación|disponibilidad|simult|solap|recreo/i.test(rule.excerpt)) return 'timetable'
  return 'reference'
}
