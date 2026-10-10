export const vi = {
  'game.title': 'The Last Lever',
  'boot.tagline': 'Cần gạt cuối cùng — kéo hay không kéo?',
  'boot.locale': 'Ngôn ngữ: {locale}',
} as const;

export type MessageKey = keyof typeof vi;
export type Messages = Record<MessageKey, string>;
