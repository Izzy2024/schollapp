import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

export type EnrollmentCertificateData = {
  schoolName: string;
  studentName: string;
  studentCode: string | null;
  gradeLevelName: string;
  sectionName: string;
  academicYearName: string;
  status: string;
  issuedAt: Date;
};

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    padding: 60,
    lineHeight: 1.6,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 30,
    letterSpacing: 1,
  },
  body: {
    fontSize: 12,
    marginBottom: 40,
    textAlign: 'justify',
  },
  bold: {
    fontWeight: 'bold',
  },
  signatureLine: {
    marginTop: 80,
    borderTop: '1 solid #1f2937',
    width: 220,
    textAlign: 'center',
    paddingTop: 6,
    fontSize: 10,
    marginHorizontal: 'auto',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 60,
    right: 60,
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
}

export const EnrollmentCertificatePDF: React.FC<{ data: EnrollmentCertificateData }> = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.schoolName}>{data.schoolName}</Text>
      <Text style={styles.title}>Constancia de Estudios</Text>

      <Text style={styles.body}>
        Por medio de la presente se hace constar que <Text style={styles.bold}>{data.studentName}</Text>
        {data.studentCode ? ` (matrícula ${data.studentCode})` : ''} se encuentra {data.status === 'enrolled' || data.status === 'reenrolled' ? 'inscrito(a) actualmente' : 'registrado(a)'} en{' '}
        <Text style={styles.bold}>{data.gradeLevelName}, sección {data.sectionName}</Text>, durante el ciclo escolar{' '}
        <Text style={styles.bold}>{data.academicYearName}</Text>.
      </Text>

      <Text style={styles.body}>
        Se extiende la presente constancia para los fines que al interesado convengan, en {formatDate(data.issuedAt)}.
      </Text>

      <Text style={styles.signatureLine}>Firma autorizada</Text>

      <Text style={styles.footer}>Documento generado electrónicamente por {data.schoolName}.</Text>
    </Page>
  </Document>
);

export default EnrollmentCertificatePDF;
