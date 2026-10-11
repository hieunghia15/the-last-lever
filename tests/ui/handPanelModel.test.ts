import { afterEach, describe, expect, it } from 'vitest';
import { cardToString } from '../../src/core/cards';
import { setLocale } from '../../src/i18n';
import { handPanelModel, type HandPanelModel } from '../../src/ui/handPanelModel';
import { cards } from '../testing';

afterEach(() => setLocale('vi'));

function model(hole: string, board = ''): HandPanelModel {
  const m = handPanelModel(cards(hole), cards(board));
  if (!m) throw new Error('expected a model');
  return m;
}

const cellText = (m: HandPanelModel) =>
  m.cells.map((c) => `${cardToString(c.card)}${c.kicker ? '*' : ''}`).join(' ');

describe('handPanelModel', () => {
  it('is null before any cards are dealt', () => {
    expect(handPanelModel([], [])).toBeNull();
  });

  it('matches the design: two pair on the flop, waiting for a full house on A or K', () => {
    const m = model('Ad Kc', 'As Kh 7d');
    expect(m.rank).toBe('twoPair');
    expect(m.position).toBe(8);
    expect(m.total).toBe(10);
    expect(m.detail).toBe('Đôi Át & Đôi K');
    expect(cellText(m)).toBe('As Ad Kh Kc 7d*');
    expect(m.strength).toBe('strong');
    expect(m.draw).toEqual({ kind: 'improve', hand: 'fullHouse', outs: 'A, K' });
  });

  it('shows only the two hole cards before the flop', () => {
    const m = model('Qh Qd');
    expect(m.rank).toBe('onePair');
    expect(m.cells).toHaveLength(2);
    expect(m.cells.every((c) => !c.kicker)).toBe(true);
    expect(m.draw).toEqual({ kind: 'preflop' });
  });

  it('marks every card but the top one as a kicker on a high card hand', () => {
    const m = model('As 9d', '7c 4h 2s Jd 3c');
    expect(m.rank).toBe('highCard');
    expect(cellText(m)).toBe('As Jd* 9d* 7c* 4h*');
    expect(m.detail).toBe('Cao nhất Át');
    expect(m.draw).toEqual({ kind: 'complete' });
  });

  it('picks the best five of seven cards', () => {
    const m = model('Kh Kd', 'Ks 5c 5d 2h 9s');
    expect(m.rank).toBe('fullHouse');
    expect(cellText(m)).toBe('Ks Kh Kd 5d 5c');
    expect(m.detail).toBe('Ba lá K, đôi 5');
  });

  it('puts the ace last in a wheel', () => {
    const m = model('As 2d', '3c 4h 5s Kd Qc');
    expect(m.rank).toBe('straight');
    expect(cellText(m)).toBe('5s 4h 3c 2d As');
    expect(m.detail).toBe('Từ Át tới 5');
  });

  it('counts the outs instead of naming ranks for a flush draw', () => {
    const m = model('Ah 9h', '2h 6h Kc');
    expect(m.draw).toEqual({ kind: 'improve', hand: 'flush', outs: '9 lá' });
  });

  it('says when no single card can improve the hand', () => {
    const m = model('As Ks', 'Qs Js Ts 2d');
    expect(m.rank).toBe('royalFlush');
    expect(m.position).toBe(1);
    expect(m.draw).toEqual({ kind: 'none' });
  });

  it('tags a weak hand as weak', () => {
    expect(model('7c 2d', 'Ks Qh 9s Jd').strength).toBe('weak');
  });

  it('is stable for the same cards', () => {
    expect(model('Jh Td', '9c 8s 2h').equity).toBe(model('Jh Td', '9c 8s 2h').equity);
  });

  it('follows the language', () => {
    setLocale('en');
    expect(model('Ad Kc', 'As Kh 7d').detail).toBe('Aces & Ks');
  });
});
