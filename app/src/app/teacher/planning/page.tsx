import { getTeacherClassesOptions } from '@/actions/teacher';
import PlanningClient from './PlanningClient';

export default async function PlanningPage({ searchParams }: { searchParams: Promise<{ class?: string, term?: string }> }) {
  const { class: classId, term: termId } = await searchParams;
  const options = await getTeacherClassesOptions('school-demo');

  let defaultClassId = classId;
  let defaultTermId = termId;

  if (!defaultClassId && options.classes.length > 0) {
    defaultClassId = options.classes[0].id;
  }
  if (!defaultTermId && options.terms.length > 0) {
    defaultTermId = options.terms[0].id;
  }

  return (
    <PlanningClient 
      options={options} 
      initialClassId={defaultClassId || ''} 
      initialTermId={defaultTermId || ''} 
      tenantSlug="school-demo"
    />
  );
}
