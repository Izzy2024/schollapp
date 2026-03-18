import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const messageErrorMock = mock.fn();
const messageSuccessMock = mock.fn();

mock.module('antd', {
  namedExports: {
    message: {
      error: messageErrorMock,
      success: messageSuccessMock,
    },
  },
});

mock.module('@/components/DashboardLayout', {
  defaultExport: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
});

const getEnrollmentsMock = mock.fn();
const enrollStudentMock = mock.fn();
const reenrollStudentMock = mock.fn();
const unenrollStudentMock = mock.fn();
const getStudentsWithoutEnrollmentMock = mock.fn();
const getSectionsWithCapacityMock = mock.fn();

mock.module('@/actions/enrollment', {
  namedExports: {
    getEnrollments: getEnrollmentsMock,
    enrollStudent: enrollStudentMock,
    reenrollStudent: reenrollStudentMock,
    unenrollStudent: unenrollStudentMock,
    getStudentsWithoutEnrollment: getStudentsWithoutEnrollmentMock,
    getSectionsWithCapacity: getSectionsWithCapacityMock,
  },
});

describe('/admin/enrollment UI contract (S02)', () => {
  beforeEach(() => {
    messageErrorMock.mock.resetCalls();
    messageSuccessMock.mock.resetCalls();
    getEnrollmentsMock.mock.resetCalls();
    enrollStudentMock.mock.resetCalls();
    reenrollStudentMock.mock.resetCalls();
    unenrollStudentMock.mock.resetCalls();
    getStudentsWithoutEnrollmentMock.mock.resetCalls();
    getSectionsWithCapacityMock.mock.resetCalls();

    getEnrollmentsMock.mock.mockImplementation(async () => [
      {
        id: 'enr-1',
        studentId: 'stu-1',
        studentName: 'Ana Pérez',
        studentCode: 'A-001',
        gradeLevelName: '1° Primaria',
        sectionName: 'A',
        status: 'enrolled',
        enrolledAt: '2026-02-01T00:00:00.000Z',
      },
    ]);

    getSectionsWithCapacityMock.mock.mockImplementation(async () => [
      {
        id: 'sec-unlimited',
        name: 'A',
        gradeLevelName: '1° Primaria',
        capacity: null,
        enrolledCount: 2,
        isFull: false,
      },
      {
        id: 'sec-limited',
        name: 'B',
        gradeLevelName: '1° Primaria',
        capacity: 3,
        enrolledCount: 2,
        isFull: false,
      },
    ]);

    getStudentsWithoutEnrollmentMock.mock.mockImplementation(async () => [
      { id: 'stu-2', firstName: 'Luis', lastName: 'Gómez', studentCode: 'A-002' },
    ]);

    enrollStudentMock.mock.mockImplementation(async () => ({ success: true }));
    reenrollStudentMock.mock.mockImplementation(async () => ({ success: true }));
    unenrollStudentMock.mock.mockImplementation(async () => ({ success: true }));
  });

  it('muestra mensaje de negocio estable para CAPACITY_EXCEEDED', async () => {
    reenrollStudentMock.mock.mockImplementation(async () => {
      throw new Error('CAPACITY_EXCEEDED');
    });

    const EnrollmentPage = (await import('../page')).default;
    render(<EnrollmentPage />);

    const reBtn = await screen.findByRole('button', { name: /reinscribir/i });
    fireEvent.click(reBtn);

    await waitFor(() => {
      assert.equal(messageErrorMock.mock.calls.length, 1);
      assert.equal(messageErrorMock.mock.calls[0].arguments[0], 'No hay cupo disponible en la sección seleccionada.');
    });
  });

  it('muestra mensaje de negocio estable para TENANT_SCOPE_VIOLATION', async () => {
    reenrollStudentMock.mock.mockImplementation(async () => {
      throw new Error('TENANT_SCOPE_VIOLATION');
    });

    const EnrollmentPage = (await import('../page')).default;
    render(<EnrollmentPage />);

    const reBtn = await screen.findByRole('button', { name: /reinscribir/i });
    fireEvent.click(reBtn);

    await waitFor(() => {
      assert.equal(messageErrorMock.mock.calls.length, 1);
      assert.equal(messageErrorMock.mock.calls[0].arguments[0], 'No se pudo validar el alcance del tenant para esta operación.');
    });
  });

  it('ejecuta flujo de reinscripción en nuevo ciclo y muestra éxito', async () => {
    const EnrollmentPage = (await import('../page')).default;
    render(<EnrollmentPage />);

    const reBtn = await screen.findByRole('button', { name: /reinscribir/i });
    fireEvent.click(reBtn);

    await waitFor(() => {
      assert.equal(reenrollStudentMock.mock.calls.length, 1);
      assert.deepEqual(reenrollStudentMock.mock.calls[0].arguments, ['stu-1', 'sec-unlimited', 'school-demo']);
      assert.equal(messageSuccessMock.mock.calls[0].arguments[0], 'Reinscripción completada en el ciclo activo.');
    });
  });

  it('muestra capacidad sin límite de forma consistente', async () => {
    const EnrollmentPage = (await import('../page')).default;
    render(<EnrollmentPage />);

    await screen.findByText('Inscripciones');
    const noLimit = await screen.findAllByText(/sin límite/i);
    assert.ok(noLimit.length >= 1);
  });
});