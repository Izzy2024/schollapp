'use client';

import React, { useEffect, useState } from 'react';
import { App, Button, Spin, Table, Tag, Card, Modal, Input, Select, Space, Progress } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  getDelinquentStudents,
  getDelinquencySummary,
  updateOverdueStatuses,
  recordDunningEvent,
} from '@/actions/finance/delinquency';
import type { DelinquentStudent, DelinquencySummary } from '@/actions/finance-client-types';

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('es-PY', { minimumFractionDigits: 2 })}`;
}

export default function DelinquencyTab() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<DelinquentStudent[]>([]);
  const [summary, setSummary] = useState<DelinquencySummary | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<DelinquentStudent | null>(null);
  const [actionType, setActionType] = useState<string>('email_sent');
  const [actionNote, setActionNote] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [studentsData, summaryData] = await Promise.all([
        getDelinquentStudents(),
        getDelinquencySummary(),
      ]);
      setStudents(studentsData);
      setSummary(summaryData);
    } catch (err: any) {
      message.error(err.message || 'Error cargando morosidad');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatuses = async () => {
    try {
      const result = await updateOverdueStatuses();
      message.success(`${result.updated} cargos marcados como vencidos`);
      load();
    } catch (err: any) {
      message.error(err.message || 'Error');
    }
  };

  const handleRecordAction = async () => {
    if (!selectedStudent || selectedStudent.charges.length === 0) return;

    const chargeId = selectedStudent.charges[0].id;
    try {
      await recordDunningEvent(chargeId, actionType, actionNote);
      message.success('Acción registrada');
      setActionModalOpen(false);
      setActionNote('');
      load();
    } catch (err: any) {
      message.error(err.message || 'Error');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const columns: ColumnsType<DelinquentStudent> = [
    {
      title: 'Alumno',
      key: 'student',
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.studentName}</div>
          {record.studentCode && (
            <div className="text-xs text-gray-400 font-mono">{record.studentCode}</div>
          )}
          {record.gradeLevel && (
            <div className="text-xs text-gray-500">{record.gradeLevel}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Días vencido',
      dataIndex: 'daysOverdue',
      key: 'daysOverdue',
      render: (days: number) => (
        <Tag color={days > 30 ? 'red' : days > 15 ? 'orange' : 'yellow'}>
          {days} días
        </Tag>
      ),
      sorter: (a, b) => a.daysOverdue - b.daysOverdue,
    },
    {
      title: 'Monto vencido',
      dataIndex: 'totalOverdueCents',
      key: 'totalOverdueCents',
      render: (cents: number) => (
        <span className="font-semibold text-red-600">{formatCents(cents)}</span>
      ),
      sorter: (a, b) => a.totalOverdueCents - b.totalOverdueCents,
    },
    {
      title: 'Cargos',
      dataIndex: 'charges',
      key: 'charges',
      render: (charges: DelinquentStudent['charges']) => (
        <div className="space-y-1">
          {charges.slice(0, 3).map((c, idx) => (
            <div key={idx} className="text-xs">
              <span className="text-gray-600">{c.conceptName}</span>
              <span className="text-gray-400 ml-2">({c.daysOverdue} días)</span>
            </div>
          ))}
          {charges.length > 3 && (
            <div className="text-xs text-gray-400">+{charges.length - 3} más</div>
          )}
        </div>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Button
          size="small"
          onClick={() => {
            setSelectedStudent(record);
            setActionModalOpen(true);
          }}
        >
          Registrar gestión
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card size="small">
            <div className="text-xs text-gray-500">Total vencido</div>
            <div className="text-xl font-bold text-red-600">{formatCents(summary.totalOverdueCents)}</div>
          </Card>
          <Card size="small">
            <div className="text-xs text-gray-500">Cargos vencidos</div>
            <div className="text-xl font-bold">{summary.overdueCount}</div>
          </Card>
          <Card size="small">
            <div className="text-xs text-gray-500">Alumnos en mora</div>
            <div className="text-xl font-bold">{summary.studentsAffected}</div>
          </Card>
          <Card size="small">
            <div className="text-xs text-gray-500">Tasa de cobranza</div>
            <div className="text-xl font-bold text-green-600">
              {summary.overdueCount > 0 ? '⚠️ Revisar' : '✓ Al día'}
            </div>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">Alumnos con pagos vencidos</p>
        <Space>
          <Button onClick={handleUpdateStatuses}>Actualizar estados</Button>
          <Button onClick={load}>Actualizar</Button>
        </Space>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <Spin />
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-8 text-green-600">
          ✅ No hay alumnos en mora. ¡Excelente!
        </div>
      ) : (
        <Table
          dataSource={students}
          columns={columns}
          rowKey="studentId"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      )}

      {/* Action modal */}
      <Modal
        title="Registrar gestión de cobranza"
        open={actionModalOpen}
        onCancel={() => setActionModalOpen(false)}
        onOk={handleRecordAction}
        okText="Registrar"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Alumno</label>
            <div className="font-medium">{selectedStudent?.studentName}</div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Tipo de acción</label>
            <Select
              value={actionType}
              onChange={setActionType}
              className="w-full"
              options={[
                { value: 'email_sent', label: 'Email enviado' },
                { value: 'call_made', label: 'Llamada realizada' },
                { value: 'meeting_scheduled', label: 'Cita agendada' },
                { value: 'payment_plan_offered', label: 'Plan de pago ofrecido' },
                { value: 'warning_issued', label: 'Aviso enviado' },
                { value: 'suspended_services', label: 'Servicios suspendidos' },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Nota</label>
            <Input.TextArea
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder="Detalles de la gestión..."
              rows={3}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
