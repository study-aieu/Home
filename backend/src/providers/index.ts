import type { CMSAdapter } from './adapter';
import wordpress from './wordpress';

export const providers: CMSAdapter[] = [wordpress];

export function getProvider(id: string): CMSAdapter | undefined {
  return providers.find((p) => p.id === id);
}