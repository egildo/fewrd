import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lanes, segments } from '../src/playground.ts';
import { Chart, type Span } from '../src/index.ts';

const row = (tag: string, a: number, b: number): readonly [string, Span] => [tag, [a, b]];
const names = (l: ReturnType<typeof lanes>) => l.map((lane) => lane.map(([t]) => t));

test('playground-draws-chart: lanes, rows that do not overlap share lane 0', () => {
  assert.deepEqual(names(lanes([row('a', 0, 2), row('b', 3, 5), row('c', 6, 7)])), [['a', 'b', 'c']]);
});
test('playground-draws-chart: lanes, two crossing rows take lanes 0 and 1', () => {
  assert.deepEqual(names(lanes([row('a', 0, 4), row('b', 2, 6)])), [['a'], ['b']]);
});
test('playground-draws-chart: lanes, rows that touch share a lane', () => {
  assert.deepEqual(names(lanes([row('a', 0, 2), row('b', 2, 4)])), [['a', 'b']]);
});
test('playground-draws-chart: lanes, three rows over one span take three lanes', () => {
  assert.deepEqual(names(lanes([row('a', 0, 3), row('b', 0, 3), row('c', 0, 3)])), [['a'], ['b'], ['c']]);
});
test('playground-draws-chart: lanes, a later row falls back to the first lane with room', () => {
  assert.deepEqual(names(lanes([row('a', 0, 6), row('b', 1, 3), row('c', 3, 5), row('d', 6, 8)])), [['a', 'd'], ['b', 'c']]);
});
test('playground-draws-chart: lanes, order within a lane follows all() order', () => {
  const chart = Chart.empty(9).with([row('z', 4, 6), row('y', 0, 2), row('x', 2, 4)]);
  const drawn = lanes([...chart.all()].filter(([, [a, b]]) => b > a));
  assert.deepEqual(names(drawn), [['y', 'x', 'z']]);
});
test('playground-draws-chart: lanes, no rows, no lanes', () => {
  assert.deepEqual(lanes([]), []);
});

const cut = (a: number, b: number) => segments([a, b], 10).map((s) => [s.line, s.from, s.to]);
test('playground-draws-chart: segments, a row inside one line is one piece', () => {
  assert.deepEqual(cut(2, 7), [[0, 2, 7]]);
});
test('playground-draws-chart: segments, a row that crosses a wrap is one piece per line', () => {
  assert.deepEqual(cut(8, 23), [[0, 8, 10], [1, 0, 10], [2, 0, 3]]);
});
test('playground-draws-chart: segments, a row ending on the wrap stays on its line', () => {
  assert.deepEqual(cut(4, 10), [[0, 4, 10]]);
  assert.deepEqual(cut(10, 12), [[1, 0, 2]]);
});
