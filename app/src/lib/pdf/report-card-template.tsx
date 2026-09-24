import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { ReportCard } from '@/actions/reportCards';

export type ReportCardPDFData = ReportCard & { schoolName: string };

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 40,
    lineHeight: 1.4,
  },
  header: {
    marginBottom: 20,
    borderBottom: '1 solid #e5e7eb',
    paddingBottom: 16,
  },
  schoolName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  studentInfo: {
    marginTop: 4,
    fontSize: 10,
    color: '#4b5563',
  },
  table: {
    marginTop: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 6,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1 solid #f3f4f6',
  },
  tableCell: {
    fontSize: 10,
    color: '#4b5563',
  },
  colSubject: { width: '35%' },
  colTeacher: { width: '30%' },
  colTypes: { width: '20%' },
  colFinal: { width: '15%', textAlign: 'right' },
  overall: {
    marginTop: 24,
    paddingTop: 12,
    borderTop: '1 solid #d1d5db',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overallLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  overallValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
  },
});

function formatPercent(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)}%`;
}

export const ReportCardPDF: React.FC<{ data: ReportCardPDFData }> = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.schoolName}>{data.schoolName}</Text>
        <Text style={styles.title}>Boleta de calificaciones</Text>
        <Text style={styles.studentInfo}>
          {data.studentName}
          {data.studentCode ? ` (${data.studentCode})` : ''}
          {data.gradeLevelName ? ` — ${data.gradeLevelName} ${data.sectionName ?? ''}` : ''}
        </Text>
        <Text style={styles.studentInfo}>Período: {data.termName}</Text>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.colSubject]}>Materia</Text>
          <Text style={[styles.tableHeaderCell, styles.colTeacher]}>Docente</Text>
          <Text style={[styles.tableHeaderCell, styles.colTypes]}>Detalle</Text>
          <Text style={[styles.tableHeaderCell, styles.colFinal]}>Promedio</Text>
        </View>
        {data.subjects.map((s) => (
          <View style={styles.tableRow} key={s.sectionSubjectId}>
            <Text style={[styles.tableCell, styles.colSubject]}>{s.subjectName}</Text>
            <Text style={[styles.tableCell, styles.colTeacher]}>{s.teacherName}</Text>
            <Text style={[styles.tableCell, styles.colTypes]}>
              {s.typeAverages.map((t) => `${t.type}: ${t.averagePercent.toFixed(1)}%`).join(', ') || 'Sin notas'}
            </Text>
            <Text style={[styles.tableCell, styles.colFinal]}>{formatPercent(s.finalAveragePercent)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.overall}>
        <Text style={styles.overallLabel}>Promedio general</Text>
        <Text style={styles.overallValue}>{formatPercent(data.overallAveragePercent)}</Text>
      </View>
    </Page>
  </Document>
);

export default ReportCardPDF;
