import { describe, expect, it, vi } from 'vitest';
import { EventQueue } from '../../src/session/eventQueue';

/** A play function whose animations finish only when the test says so. */
function manualPlayer() {
  const started: string[] = [];
  const finishers: (() => void)[] = [];
  const play = (event: string) =>
    new Promise<void>((resolve) => {
      started.push(event);
      finishers.push(resolve);
    });
  const finishNext = async () => {
    finishers.shift()?.();
    // Let the queue's await continuation run.
    await Promise.resolve();
    await Promise.resolve();
  };
  return { started, play, finishNext };
}

describe('EventQueue', () => {
  it('plays events in order, one at a time', async () => {
    const p = manualPlayer();
    const queue = new EventQueue(p.play);
    queue.push(['a', 'b', 'c']);
    expect(p.started).toEqual(['a']);
    await p.finishNext();
    expect(p.started).toEqual(['a', 'b']);
    await p.finishNext();
    await p.finishNext();
    expect(p.started).toEqual(['a', 'b', 'c']);
  });

  it('is busy until the last animation finishes, then calls onIdle once', async () => {
    const p = manualPlayer();
    const queue = new EventQueue(p.play);
    const idle = vi.fn();
    queue.onIdle(idle);
    expect(queue.busy).toBe(false);

    queue.push(['a', 'b']);
    expect(queue.busy).toBe(true);
    await p.finishNext();
    expect(queue.busy).toBe(true);
    expect(idle).not.toHaveBeenCalled();
    await p.finishNext();
    expect(queue.busy).toBe(false);
    expect(idle).toHaveBeenCalledTimes(1);
  });

  it('appends events pushed while playing', async () => {
    const p = manualPlayer();
    const queue = new EventQueue(p.play);
    queue.push(['a']);
    queue.push(['b']);
    expect(p.started).toEqual(['a']);
    await p.finishNext();
    expect(p.started).toEqual(['a', 'b']);
  });

  it('restarts after going idle', async () => {
    const p = manualPlayer();
    const queue = new EventQueue(p.play);
    const idle = vi.fn();
    queue.onIdle(idle);
    queue.push(['a']);
    await p.finishNext();
    queue.push(['b']);
    expect(p.started).toEqual(['a', 'b']);
    await p.finishNext();
    expect(idle).toHaveBeenCalledTimes(2);
  });

  it('reports a failed animation and keeps going', async () => {
    const onError = vi.fn();
    const played: string[] = [];
    const queue = new EventQueue((event: string) => {
      played.push(event);
      return event === 'bad' ? Promise.reject(new Error('boom')) : Promise.resolve();
    }, onError);
    const idle = new Promise<void>((resolve) => queue.onIdle(resolve));
    queue.push(['bad', 'good']);
    await idle;
    expect(played).toEqual(['bad', 'good']);
    expect(onError).toHaveBeenCalledOnce();
  });

  it('goes silent after dispose', async () => {
    const p = manualPlayer();
    const queue = new EventQueue(p.play);
    const idle = vi.fn();
    queue.onIdle(idle);
    queue.push(['a', 'b']);
    queue.dispose();
    await p.finishNext();
    queue.push(['c']);
    expect(p.started).toEqual(['a']);
    expect(idle).not.toHaveBeenCalled();
    expect(queue.busy).toBe(false);
  });
});
