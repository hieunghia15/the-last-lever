export const vi = {
  'game.title': 'The Last Lever',
  'boot.tagline': 'Cần gạt cuối cùng — kéo hay không kéo?',
  'boot.locale': 'Ngôn ngữ: {locale}',
  'boot.pickMode': 'Chọn thể thức để bắt đầu',
  'boot.mode': 'BEST OF {n}',

  'seat.you': 'Bạn',
  'seat.bot': 'Bot',
  'score.draws': 'Hòa: {n}',
  'table.stake': 'Mức cược',
  'bot.thinking': 'Đang suy nghĩ…',

  'street.preflop': 'Trước flop',
  'street.flop': 'Flop',
  'street.turn': 'Turn',
  'street.river': 'River',

  'action.check': 'XEM BÀI',
  'action.raise': 'TĂNG +1',
  'action.call': 'THEO',
  'action.fold': 'BỎ',
  'action.allIn': 'TẤT TAY',
  'action.sub.raise': 'lên {n}',
  'action.sub.call': 'thua: kéo {n} cần',
  'action.sub.fold': 'kéo {n} cần',
  'action.sub.allIn': 'lên {n}',

  'toast.check': 'Xem bài',
  'toast.raise': 'Tăng lên {n}',
  'toast.call': 'Theo',
  'toast.fold': 'Bỏ bài',
  'toast.allIn': 'Tất tay!',

  'hand.royalFlush': 'Thùng phá sảnh lớn',
  'hand.straightFlush': 'Thùng phá sảnh',
  'hand.fourOfAKind': 'Tứ quý',
  'hand.fullHouse': 'Cù lũ',
  'hand.flush': 'Thùng',
  'hand.straight': 'Sảnh',
  'hand.threeOfAKind': 'Sám cô',
  'hand.twoPair': 'Hai đôi',
  'hand.onePair': 'Một đôi',
  'hand.highCard': 'Mậu thầu',

  'banner.round': 'Ván {n} — {name} đi trước',
  'banner.showdown': '{name} thắng bài: {winner} hơn {loser}',
  'banner.showdownTie': 'Hòa bài ({hand}) — không ai kéo cần',
  'banner.folded': '{name} bỏ bài — kéo {n} cần',
  'banner.danger': 'Nguy hiểm! {name} +1 chiến thắng',
  'banner.allSafe': 'Kéo toàn An toàn — ván hòa',
  'banner.pokerTie': 'Ván hòa',

  'lever.title': '{name} phải kéo {n} cần',
  'lever.hint': 'Chạm vào một cần để kéo',
  'lever.botChoosing': '{name} đang chọn…',
  'lever.safe': 'AN TOÀN',
  'lever.danger': 'NGUY HIỂM!',

  'round.next': 'VÁN TIẾP',
  'match.won': 'CHIẾN THẮNG',
  'match.lost': 'THẤT BẠI',
  'match.score': '{you} {a} – {b} {bot}',
  'match.draws': 'Số ván hòa: {n}',
  'match.again': 'CHƠI LẠI',

  'rotate.message': 'Hãy xoay ngang điện thoại để chơi',
} as const;

export type MessageKey = keyof typeof vi;
export type Messages = Record<MessageKey, string>;
