export type Ownership = 'publico' | 'concertado' | 'privado' | ''
export type CenterType = 'CEIP' | 'IES' | 'CEIPSO' | 'CRA' | 'COLEGIO' | 'OTRO' | ''
export type EducationStage = 'Infantil' | 'Primaria' | 'ESO' | 'Bachillerato'
export type Weekday = 'L' | 'M' | 'X' | 'J' | 'V' | 'S'
export type ScheduleMode = 'morning' | 'afternoon' | 'split' | 'custom'
export type TimeBlockType = 'teaching' | 'break' | 'complementary' | 'other'

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

export interface ViyeuticaProject {
  schemaVersion: 1
  center: CenterData
  academicYear: AcademicYear
  groups: SchoolGroup[]
  schedule: ScheduleConfig
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
