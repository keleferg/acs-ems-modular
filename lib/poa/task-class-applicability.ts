// FAA task titles identify the airplane classes to which restricted tasks apply.
export function taskAppliesToClass(taskName: string | null | undefined, classCode: string | null | undefined, taskCode = '') {
  const ratingClass = (classCode ?? '').trim().toUpperCase();
  if (!['ASEL','ASES','AMEL','AMES'].includes(ratingClass)) return true;
  if (/^(PA|CA)\.X\./.test(taskCode)) return ['AMEL','AMES'].includes(ratingClass);
  // This long task title is truncated in the catalog before its class suffix.
  if (/^(PA|CA)\.I\.I(?:\.|$)/.test(taskCode)) return ['ASES','AMES'].includes(ratingClass);
  const classes: string[] = (taskName ?? '').match(/\b(?:ASEL|ASES|AMEL|AMES)\b/g) ?? [];
  return classes.length === 0 || classes.includes(ratingClass);
}
