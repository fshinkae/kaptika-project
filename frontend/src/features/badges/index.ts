/**
 * Superfície pública da feature 005 (Medalhas e Conquistas). O coordenador
 * pluga estes exports em rota/perfil; nada fora de `features/badges/` é tocado.
 */
export { BadgesGalleryPage } from './BadgesGalleryPage'
export { BadgesGallery } from './BadgesGallery'
export { BadgeCard } from './BadgeCard'
export { BadgeProgressBar } from './BadgeProgressBar'
export { BadgeCelebration } from './BadgeCelebration'
export { BadgeCelebrationHost } from './BadgeCelebrationHost'
export { ProfileBadgesHighlight } from './ProfileBadgesHighlight'
export { useBadgeCelebrations } from './useBadgeCelebrations'
export type { BadgeCelebrationsState } from './useBadgeCelebrations'
export { getBadges } from './badgesApi'
export type { BadgeView, BadgeProgress, BadgeCollection } from './badgesApi'
export { formatAwardedDate } from './badgeFormat'
