import { getTeacherWeeklySchedule } from '@/actions/schedule';
import ScheduleClient from './ScheduleClient';

export default async function SchedulePage() {
  const schedule = await getTeacherWeeklySchedule('school-demo');

  return <ScheduleClient schedule={schedule} />;
}
