import wordpress from './wordpress';
export const providers = [wordpress];
export function getProvider(id) {
    return providers.find((p) => p.id === id);
}
