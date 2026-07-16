/**
 * Temps relatif FR — style LinkedIn / X (« il y a 2 h »)
 */
export function formatRelativeTime(
  input: string | number | Date | null | undefined
): string {
  if (input == null || input === 0) return '';

  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '';

  const now = Date.now();
  const diffMs = Math.max(0, now - date.getTime());
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hours = Math.floor(min / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (sec < 45) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  if (hours < 24) return `il y a ${hours} h`;
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days} j`;
  if (weeks < 5) return `il y a ${weeks} sem.`;
  if (months < 12) return `il y a ${months} mois`;

  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

export function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return '?';
  return (
    name
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

export function formatRoleLabel(role: string | null | undefined): string {
  if (!role) return 'Membre PIH';
  if (role === 'product_creator') return 'Product Owner';
  return role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ');
}
