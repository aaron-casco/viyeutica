export type Ownership = 'publico' | 'concertado' | 'privado' | ''
export type CenterType = 'CEIP' | 'IES' | 'CEIPSO' | 'CRA' | 'COLEGIO' | 'OTRO' | ''
export type EducationStage = 'Infantil' | 'Primaria' | 'ESO' | 'Bachillerato'

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

export interface ViyeuticaProject {
  schemaVersion: 1
  center: CenterData
  academicYear: AcademicYear
  updatedAt: string | null
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

export const EMPTY_PROJECT: ViyeuticaProject = {
  schemaVersion: 1,
  center: EMPTY_CENTER,
  academicYear: DEFAULT_ACADEMIC_YEAR,
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
