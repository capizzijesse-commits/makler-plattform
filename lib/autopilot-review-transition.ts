export function isImageReviewTransition(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const v=value as {ready?:unknown;status?:unknown;reasons?:unknown};
  return v.ready===false && v.status==='REVIEW_REQUIRED' && Array.isArray(v.reasons) && v.reasons.length===1 && v.reasons[0]==='IMAGE_REVIEW_REQUIRED';
}
export class AutopilotReviewRedirect extends Error {
  constructor(){super('AUTOPILOT_IMAGE_REVIEW_REQUIRED');this.name='AutopilotReviewRedirect';}
}
