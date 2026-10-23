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
