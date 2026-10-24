export type Ownership = 'publico' | 'concertado' | 'privado' | ''
export type CenterType = 'CEIP' | 'IES' | 'CEIPSO' | 'CRA' | 'COLEGIO' | 'OTRO' | ''
export type EducationStage = 'Infantil' | 'Primaria' | 'ESO' | 'Bachillerato'
export type Weekday = 'L' | 'M' | 'X' | 'J' | 'V' | 'S'
export type ScheduleMode = 'morning' | 'afternoon' | 'split' | 'custom'
export type TimeBlockType = 'teaching' | 'break' | 'complementary' | 'other'
export type SubjectType = 'common' | 'specific' | 'optional' | 'other'
export type StudyPlanMode = 'ordinary' | 'split' | 'co_teaching' | 'alternative' | 'other'
export type TeacherRequirement = 'tutor' | 'specialist' | 'any' | 'specific'
export type NormativeSection = 'center' | 'structure' | 'schedule' | 'study_plan' | 'staff' | 'assignments' | 'rules' | 'general'
export type NormativeRuleKind = 'weekly_hours' | 'weekly_minutes' | 'session_minutes' | 'weekly_periods' | 'teacher_periods' | 'stage_rule' | 'subject_rule' | 'other'

export interface CenterData {
  name: string
  officialCode: string
  ownership: Ownership
  centerType: CenterType
  autonomousCommunity: string
  province: string
  locality: string
  stages: EducationStage[]
}

export interface AcademicYear {
  id: string
  label: string
  startYear: number
  endYear: number
}

export interface SchoolGroup {
  id: string
  name: string
  stage: EducationStage
  level: string
  line: string
  students: number | null
  classroom: string
  combined: boolean
  linkedGroupIds: string[]
  tutorTeacherId: string | null
  notes: string
  active: boolean
}

export interface TimeBlock {
  id: string
  label: string
  start: string
  end: string
  type: TimeBlockType
  stageScope: EducationStage[]
  active: boolean
}

export interface ScheduleConfig {
  activeDays: Weekday[]
  mode: ScheduleMode
  blocks: TimeBlock[]
}

export interface Subject {
  id: string
  name: string
  code: string
  stage: EducationStage
  type: SubjectType
  defaultSessionMinutes: number | null
  active: boolean
}

export interface StudyPlanEntry {
  id: string
  groupId: string
  subjectId: string
  weeklySessions: number
  weeklyMinutes?: number | null
  mandatory: boolean
  mode: StudyPlanMode
  teacherRequirement: TeacherRequirement
  teacherId: string | null
  fixedSessionMinutes: number | null
  notes: string
  active: boolean
}

export interface NormativeSource {
  id: string
  name: string
  mimeType: string
  size: number
  pageCount: number
  extractedChars: number
  sha256: string
  addedAt: string
  stages: EducationStage[]
  ruleCount: number
}

export interface Teacher {
  id: string
  name: string
  status: 'confirmed' | 'to_determine'
  employmentType: 'full' | 'partial' | 'itinerant' | 'other'
  specialties: string[]
  roles: string[]
  weeklyTeachingMinutes: number | null
  active: boolean
}

export interface TeacherAvailability {
  teacherId: string
  day: string
  session: string
  status: 'available' | 'unavailable' | 'travel' | 'assigned'
  detail: string
}

export interface TeachingAssignment {
  id: string
  groupId: string
  subjectId: string
  teacherId: string
  assignmentType: 'main' | 'support' | 'co_teaching'
  weeklySessions: number | null
  weeklyMinutes: number | null
  fixedSlots?: { day:string; session:string }[]
  active: boolean
  source?: string
}

export interface CenterRule {
  id: string
  scope: string
  ruleType: 'HARD' | 'SOFT'
  code: string
  description: string
  parameters: Record<string, unknown>
  weight?: number | null
  source?: 'manual' | 'imported' | 'normative'
  normativeRuleId?: string | null
  active: boolean
  reviewRequired?: boolean
}

export interface GeneratedScheduleEntry {
  id: string
  assignmentId: string
  groupId: string
  subjectId: string
  teacherId: string
  day: Weekday
  sessionId: string
}

export interface GenerationIssueDiagnostics {
  candidateSlots: number
  unavailableCount: number
  groupBusyCount: number
  teacherBusyCount: number
  hardRuleCount: number
  fixedTarget: boolean
}

export interface GenerationIssue {
  id: string
  type: 'unplaced_main' | 'unplaced_support'
  assignmentId: string
  groupId: string
  subjectId: string
  teacherId: string
  missingSessions: number
  severity: 'error' | 'warning'
  diagnostics?: GenerationIssueDiagnostics
}

export interface GenerationRun {
  id: string
  createdAt: string
  status: 'complete' | 'partial' | 'failed'
  score: number
  hardViolations: number
  softPenalty: number
  placedSessions: number
  requestedSessions: number
  entries: GeneratedScheduleEntry[]
  issues?: GenerationIssue[]
  notes: string[]
}

export type NormativeRelevance = 'timetable' | 'reference'

export interface NormativeRule {
  id: string
  sourceId: string
  section: NormativeSection
  kind: NormativeRuleKind
  label: string
  value: number | null
  unit: 'hours' | 'minutes' | 'periods' | null
  stage: EducationStage | null
  level: string | null
  subject: string | null
  page: number
  excerpt: string
  confidence: number
  approved: boolean
  relevance?: NormativeRelevance
}

export interface ViyeuticaProject {
  schemaVersion: 1
  center: CenterData
  academicYear: AcademicYear
  groups: SchoolGroup[]
  schedule: ScheduleConfig
  subjects: Subject[]
  studyPlan: StudyPlanEntry[]
  teachers: Teacher[]
  teacherAvailability: TeacherAvailability[]
  assignments: TeachingAssignment[]
  rules: CenterRule[]
  generationRuns: GenerationRun[]
  selectedGenerationRunId?: string | null
  normativeSources: NormativeSource[]
  normativeRules: NormativeRule[]
  updatedAt: string | null
}

export const EDUCATION_LEVELS: Record<EducationStage,string[]> = {
  Infantil: ['3 años','4 años','5 años'],
  Primaria: ['1.º Primaria','2.º Primaria','3.º Primaria','4.º Primaria','5.º Primaria','6.º Primaria'],
  ESO: ['1.º ESO','2.º ESO','3.º ESO','4.º ESO'],
  Bachillerato: ['1.º Bachillerato','2.º Bachillerato'],
}

export const EMPTY_CENTER: CenterData = {
  name: '',
  officialCode: '',
  ownership: '',
  centerType: '',
  autonomousCommunity: 'Extremadura',
  province: '',
  locality: '',
  stages: [],
}

export const DEFAULT_ACADEMIC_YEAR: AcademicYear = {
  id: '2026-2027',
  label: '2026/2027',
  startYear: 2026,
  endYear: 2027,
}

export const EMPTY_SCHEDULE: ScheduleConfig = {
  activeDays: ['L','M','X','J','V'],
  mode: 'morning',
  blocks: [],
}

export const EMPTY_PROJECT: ViyeuticaProject = {
  schemaVersion: 1,
  center: EMPTY_CENTER,
  academicYear: DEFAULT_ACADEMIC_YEAR,
  groups: [],
  schedule: EMPTY_SCHEDULE,
  subjects: [],
  studyPlan: [],
  teachers: [],
  teacherAvailability: [],
  assignments: [],
  rules: [],
  generationRuns: [],
  selectedGenerationRunId: null,
  normativeSources: [],
  normativeRules: [],
  updatedAt: null,
}

export function isCenterComplete(center: CenterData) {
  return Boolean(
    center.name.trim() &&
    center.officialCode.trim() &&
    center.ownership &&
    center.centerType &&
    center.autonomousCommunity.trim() &&
    center.province.trim() &&
    center.locality.trim() &&
    center.stages.length,
  )
}

export function isStructureComplete(project: ViyeuticaProject) {
  if (!isCenterComplete(project.center)) return false
  const activeGroups = project.groups.filter(group => group.active)
  return project.center.stages.every(stage => activeGroups.some(group => group.stage === stage))
}

export function minutesFromTime(value: string) {
  const [hours,minutes] = value.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return NaN
  return hours * 60 + minutes
}

export function timeBlockDuration(block: TimeBlock) {
  return minutesFromTime(block.end) - minutesFromTime(block.start)
}

export function validateSchedule(schedule: ScheduleConfig) {
  const errors: string[] = []
  if (!schedule.activeDays.length) errors.push('Selecciona al menos un día lectivo.')
  const active = schedule.blocks.filter(block => block.active)
  if (!active.some(block => block.type === 'teaching')) errors.push('Añade al menos una sesión lectiva.')
  const sorted = [...active].sort((a,b) => minutesFromTime(a.start) - minutesFromTime(b.start))
  for (const block of sorted) {
    if (!block.label.trim()) errors.push('Todos los tramos necesitan un nombre.')
    if (timeBlockDuration(block) <= 0) errors.push(`El tramo "${block.label}" tiene una hora final no válida.`)
  }
  for (let index=1; index<sorted.length; index++) {
    if (minutesFromTime(sorted[index].start) < minutesFromTime(sorted[index-1].end)) {
      errors.push(`Existe un solapamiento entre "${sorted[index-1].label}" y "${sorted[index].label}".`)
    }
  }
  return [...new Set(errors)]
}

export function isScheduleComplete(project: ViyeuticaProject) {
  return isStructureComplete(project) && validateSchedule(project.schedule).length === 0
}


export function validateStudyPlan(project: ViyeuticaProject) {
  const errors: string[] = []
  const activeGroups = project.groups.filter(group => group.active)
  const activeSubjects = new Set(project.subjects.filter(subject => subject.active).map(subject => subject.id))
  const activeEntries = project.studyPlan.filter(entry => entry.active)

  if (!project.subjects.some(subject => subject.active)) errors.push('Añade al menos una materia activa.')
  if (!activeEntries.length) errors.push('Añade al menos una carga semanal al plan de estudios.')

  for (const group of activeGroups) {
    if (!activeEntries.some(entry => entry.groupId === group.id && activeSubjects.has(entry.subjectId))) {
      errors.push(`El grupo "${group.name}" no tiene materias configuradas.`)
    }
  }

  for (const entry of activeEntries) {
    const hasSessions = entry.weeklySessions > 0
    const hasMinutes = (entry.weeklyMinutes ?? 0) > 0
    if (!hasSessions && !hasMinutes) errors.push('Todas las cargas semanales deben indicar sesiones o minutos.')
    if (!activeSubjects.has(entry.subjectId)) errors.push('Existe una carga vinculada a una materia inactiva o inexistente.')
    if (!activeGroups.some(group => group.id === entry.groupId)) errors.push('Existe una carga vinculada a un grupo inactivo o inexistente.')
  }

  return [...new Set(errors)]
}

export function isStudyPlanComplete(project: ViyeuticaProject) {
  return isScheduleComplete(project) && validateStudyPlan(project).length === 0
}


export function validateStaff(project: ViyeuticaProject) {
  const errors: string[] = []
  const activeTeachers = project.teachers.filter(teacher => teacher.active)

  if (!activeTeachers.length) errors.push('Añade al menos un docente activo.')

  for (const teacher of activeTeachers) {
    if (!teacher.name.trim()) errors.push('Todos los docentes necesitan un nombre.')
    if (!teacher.specialties.length) errors.push(`El docente "${teacher.name || 'sin nombre'}" no tiene especialidad.`)
    if (teacher.weeklyTeachingMinutes !== null && teacher.weeklyTeachingMinutes < 0) {
      errors.push(`La carga lectiva de "${teacher.name}" no es válida.`)
    }
  }

  const tutorIds = new Set(project.groups.map(group => group.tutorTeacherId).filter(Boolean))
  for (const tutorId of tutorIds) {
    if (!activeTeachers.some(teacher => teacher.id === tutorId)) {
      errors.push('Existe una tutoría vinculada a un docente inexistente o inactivo.')
    }
  }

  return [...new Set(errors)]
}

export function isStaffComplete(project: ViyeuticaProject) {
  return isStudyPlanComplete(project) && validateStaff(project).length === 0
}


export function validateAssignments(project: ViyeuticaProject) {
  const errors: string[] = []
  const activeTeachers = new Set(project.teachers.filter(teacher => teacher.active).map(teacher => teacher.id))
  const activeGroups = new Set(project.groups.filter(group => group.active).map(group => group.id))
  const activeSubjects = new Set(project.subjects.filter(subject => subject.active).map(subject => subject.id))
  const activeAssignments = project.assignments.filter(assignment => assignment.active)

  if (!activeAssignments.length) errors.push('Añade al menos una asignación docente.')

  for (const assignment of activeAssignments) {
    if (!activeTeachers.has(assignment.teacherId)) errors.push('Existe una asignación vinculada a un docente inactivo o inexistente.')
    if (!activeGroups.has(assignment.groupId)) errors.push('Existe una asignación vinculada a un grupo inactivo o inexistente.')
    if (!activeSubjects.has(assignment.subjectId)) errors.push('Existe una asignación vinculada a una materia inactiva o inexistente.')
    if ((assignment.weeklySessions ?? 0) <= 0 && (assignment.weeklyMinutes ?? 0) <= 0) {
      errors.push('Todas las asignaciones activas deben indicar sesiones o minutos semanales.')
    }
  }

  const activeStudyEntries = project.studyPlan.filter(entry => entry.active)
  for (const entry of activeStudyEntries) {
    if (!activeAssignments.some(assignment => assignment.groupId === entry.groupId && assignment.subjectId === entry.subjectId)) {
      errors.push('Hay cargas del plan de estudios sin profesorado asignado.')
      break
    }
  }

  for (const availability of project.teacherAvailability) {
    if (!activeTeachers.has(availability.teacherId)) {
      errors.push('Existe disponibilidad vinculada a un docente inactivo o inexistente.')
      break
    }
  }

  return [...new Set(errors)]
}

export function isAssignmentsComplete(project: ViyeuticaProject) {
  return isStaffComplete(project) && validateAssignments(project).length === 0
}


export function validateRules(project: ViyeuticaProject) {
  const errors: string[] = []
  const activeRules = project.rules.filter(rule => rule.active)

  if (!activeRules.length) errors.push('Añade o importa al menos una regla activa.')

  for (const rule of activeRules) {
    if (!rule.code.trim()) errors.push('Todas las reglas necesitan un código.')
    if (!rule.description.trim()) errors.push('Todas las reglas necesitan una descripción.')
    if (rule.ruleType === 'SOFT' && (rule.weight === null || rule.weight === undefined || rule.weight <= 0)) {
      errors.push(`La regla SOFT "${rule.code || 'sin código'}" necesita un peso mayor que cero.`)
    }
    if (rule.source === 'normative' && rule.normativeRuleId) {
      const normative = project.normativeRules.find(item => item.id === rule.normativeRuleId)
      if (!normative || !normative.approved) {
        errors.push('Existe una regla normativa cuya fuente ya no está aprobada.')
      }
    }
  }

  return [...new Set(errors)]
}

export function isRulesComplete(project: ViyeuticaProject) {
  return isAssignmentsComplete(project) && validateRules(project).length === 0
}


export type PrevalidationSeverity = 'error' | 'warning' | 'info'
export interface PrevalidationIssue {
  id: string
  severity: PrevalidationSeverity
  section: string
  code: string
  message: string
  detail?: string
  entityId?: string | null
}

export function runPrevalidation(project: ViyeuticaProject): PrevalidationIssue[] {
  const issues: PrevalidationIssue[] = []
  const push = (severity:PrevalidationSeverity, section:string, code:string, message:string, detail?:string, entityId?:string|null) => {
    issues.push({id: section+'_'+code+'_'+issues.length, severity, section, code, message, detail, entityId})
  }

  if (!isCenterComplete(project.center)) push('error','Centro','CENTRO_INCOMPLETO','Los datos del centro no están completos.')
  if (!isStructureComplete(project)) push('error','Estructura y grupos','ESTRUCTURA_INCOMPLETA','La estructura del centro no cubre todas las etapas activas.')
  for (const message of validateSchedule(project.schedule)) push('error','Jornada y sesiones','JORNADA',message)
  for (const message of validateStudyPlan(project)) push('error','Plan de estudios','PLAN_ESTUDIOS',message)
  for (const message of validateStaff(project)) push('error','Profesorado','PROFESORADO',message)
  for (const message of validateAssignments(project)) push('error','Asignaciones','ASIGNACIONES',message)
  for (const message of validateRules(project)) push('error','Reglas','REGLAS',message)

  const activeTeachers = project.teachers.filter(t=>t.active)
  const activeAssignments = project.assignments.filter(a=>a.active)
  const assignmentMinutesByTeacher = new Map<string,number>()
  for (const assignment of activeAssignments) {
    const current=assignmentMinutesByTeacher.get(assignment.teacherId)??0
    const minutes=(assignment.weeklyMinutes??0)>0
      ? assignment.weeklyMinutes!
      : (assignment.weeklySessions??0)*45
    assignmentMinutesByTeacher.set(assignment.teacherId,current+minutes)
  }
  for (const teacher of activeTeachers) {
    const assigned=assignmentMinutesByTeacher.get(teacher.id)??0
    if (teacher.weeklyTeachingMinutes!==null && assigned>teacher.weeklyTeachingMinutes) {
      push('error','Profesorado','SOBRECARGA_DOCENTE',`${teacher.name} supera su carga lectiva semanal configurada.`,`Asignado: ${assigned} min · Máximo: ${teacher.weeklyTeachingMinutes} min`,teacher.id)
    }
    if (teacher.status==='to_determine') {
      push('warning','Profesorado','DOCENTE_PENDIENTE',`${teacher.name} sigue marcado como "Por determinar".`,undefined,teacher.id)
    }
  }

  for (const rule of project.rules.filter(r=>r.active)) {
    if (rule.reviewRequired) {
      push('warning','Reglas','REGLA_PENDIENTE_REVISION',`La regla "${rule.description}" requiere revisión.`,undefined,rule.id)
    }
    const p=rule.parameters??{}
    const known = new Set(['SIN_SOLAPE_DOCENTE','SIN_SOLAPE_GRUPO','RESPETAR_DISPONIBILIDAD_DOCENTE','RESPETAR_FRANJAS_FIJAS','REDUCIR_HUECOS_DOCENTES'])
    if (!known.has(rule.code) && !p.conditionKind) {
      push('warning','Reglas','REGLA_NO_EVALUABLE',`La regla "${rule.description}" no tiene una condición estructurada suficiente para comprobarla automáticamente.`,undefined,rule.id)
    }
    if (rule.ruleType==='SOFT') {
      push('info','Reglas','REGLA_SOFT',`Preferencia activa: ${rule.description}`,`Peso: ${rule.weight??'—'}`,rule.id)
    }
  }

  const fixedAvailability = project.teacherAvailability.filter(item=>item.status==='assigned')
  const seenFixed=new Set<string>()
  for (const item of fixedAvailability) {
    const key=`${item.teacherId}|${item.day}|${item.session}`
    if (seenFixed.has(key)) {
      push('warning','Asignaciones','FRANJA_FIJA_DUPLICADA','Existe una franja fijada duplicada para el mismo docente.')
      break
    }
    seenFixed.add(key)
  }

  if (!project.normativeSources.length) {
    push('info','Normativa','SIN_NORMATIVA','No hay documentos normativos cargados. La prevalidación se limita a la configuración del proyecto.')
  } else if (!project.normativeRules.some(rule=>rule.approved)) {
    push('warning','Normativa','NORMATIVA_SIN_APROBAR','Hay normativa cargada, pero ninguna regla normativa está aprobada.')
  }

  if (!issues.some(issue=>issue.severity==='error')) {
    push('info','Prevalidación','LISTO_PARA_GENERAR','No se han detectado bloqueos estructurales antes de la generación.')
  }

  return issues
}

export function isPrevalidationComplete(project: ViyeuticaProject) {
  if (!isRulesComplete(project)) return false
  return !runPrevalidation(project).some(issue=>issue.severity==='error')
}


export function latestGeneration(project: ViyeuticaProject) {
  return project.generationRuns[project.generationRuns.length - 1] ?? null
}

export function isGenerationComplete(project: ViyeuticaProject) {
  const latest=latestGeneration(project)
  return Boolean(isPrevalidationComplete(project) && latest && latest.status==='complete' && latest.hardViolations===0)
}


export type AuditSeverity = 'error' | 'warning' | 'info'
export interface AuditIssue {
  id: string
  severity: AuditSeverity
  category: 'Solapes' | 'Disponibilidad' | 'Franjas fijas' | 'Cobertura' | 'Carga semanal' | 'Reglas' | 'Integridad'
  code: string
  message: string
  detail?: string
  teacherId?: string | null
  groupId?: string | null
  subjectId?: string | null
  day?: Weekday | null
  sessionId?: string | null
}

export interface AuditResult {
  runId: string
  createdAt: string
  passed: boolean
  errors: number
  warnings: number
  infos: number
  issues: AuditIssue[]
}


export function generationSignature(run: GenerationRun) {
  return run.entries
    .map(entry => [entry.assignmentId,entry.groupId,entry.subjectId,entry.teacherId,entry.day,entry.sessionId].join('|'))
    .sort()
    .join('||')
}

export function uniqueGenerationRuns(runs: GenerationRun[]) {
  const seen=new Set<string>()
  const unique:GenerationRun[]=[]
  for(const run of runs){
    const signature=generationSignature(run)
    if(seen.has(signature)) continue
    seen.add(signature)
    unique.push(run)
  }
  return unique
}

export function generationDifference(a:GenerationRun,b:GenerationRun) {
  const aSet=new Set(a.entries.map(entry=>[entry.assignmentId,entry.day,entry.sessionId].join('|')))
  const bSet=new Set(b.entries.map(entry=>[entry.assignmentId,entry.day,entry.sessionId].join('|')))
  let onlyA=0
  let onlyB=0
  for(const key of aSet) if(!bSet.has(key)) onlyA++
  for(const key of bSet) if(!aSet.has(key)) onlyB++
  return {
    differentPlacements:Math.max(onlyA,onlyB),
    onlyA,
    onlyB,
    identical:onlyA===0&&onlyB===0,
  }
}


export function emptyGroupTeachingSlots(project:ViyeuticaProject,run:GenerationRun){
  const teachingBlocks=project.schedule.blocks.filter(block=>block.active&&block.type==='teaching')
  const result:{groupId:string;day:Weekday;sessionId:string}[]=[]
  for(const group of project.groups.filter(group=>group.active)){
    for(const day of project.schedule.activeDays){
      for(const block of teachingBlocks){
        const hasMain=run.entries.some(entry=>
          entry.groupId===group.id &&
          entry.day===day &&
          entry.sessionId===block.id &&
          project.assignments.find(assignment=>assignment.id===entry.assignmentId)?.assignmentType==='main'
        )
        if(!hasMain) result.push({groupId:group.id,day,sessionId:block.id})
      }
    }
  }
  return result
}

export function isGenerationProposalValid(project:ViyeuticaProject,run:GenerationRun){
  return run.status==='complete' &&
    run.hardViolations===0 &&
    emptyGroupTeachingSlots(project,run).length===0
}
