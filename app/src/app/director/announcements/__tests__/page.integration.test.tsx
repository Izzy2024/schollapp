import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, screen } from '@testing-library/react';

const adminAnnouncementsPageMock = mock.fn();

mock.module('@/app/admin/announcements/page', {
  defaultExport: () => {
    adminAnnouncementsPageMock();
    return <div data-testid="admin-announcements-surface">Admin Announcements Surface</div>;
  },
});

describe('/director/announcements integration contract (S04)', () => {
  it('reutiliza la superficie existente de comunicados y la renderiza para Dirección', async () => {
    const DirectorAnnouncementsPage = (await import('../page')).default;

    render(<DirectorAnnouncementsPage />);

    assert.equal(adminAnnouncementsPageMock.mock.callCount(), 1);
    assert.ok(screen.getByTestId('admin-announcements-surface'));
  });
});
