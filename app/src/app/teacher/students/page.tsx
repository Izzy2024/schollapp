import { getTeacherClassesOptions } from '@/actions/teacher';
import TeacherStudentsClient from './TeacherStudentsClient';

export default async function TeacherStudentsPage({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  const { class: classId } = await searchParams;
  const options = await getTeacherClassesOptions('school-demo');

  let defaultClassId = classId;

  if (!defaultClassId && options.classes.length > 0) {
    defaultClassId = options.classes[0].id;
  }

  return (
    <TeacherStudentsClient 
      options={options} 
      initialClassId={defaultClassId || ''} 
      tenantSlug="school-demo"
    />
  );
}
