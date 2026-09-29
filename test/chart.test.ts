import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chart, rel, type AllenRelation, type Span } from '../src/index.ts';

const c = (n: number, rows: [string, Span][]) => Chart.empty(n).with(rows);

test('chart-invariants: empty', () => {
  assert.deepEqual(Chart.empty(5).toJSON(), { $: [[5, 5]], '^': [[0, 0]] });
});

test('chart-invariants: sorted, unique, code-unit key order, round trip', () => {
  const chart = c(9, [
    ['b', [4, 6]], ['b', [1, 3]], ['b', [1, 2]], ['b', [1, 3]],
    ['a', [0, 1]], ['B', [0, 0]],
  ]);
  const json = chart.toJSON();
  assert.deepEqual(Object.keys(json), ['$', 'B', '^', 'a', 'b']);
  assert.deepEqual(json.b, [[1, 2], [1, 3], [4, 6]]);
  assert.equal(chart.size(), 2 + 1 + 1 + 3);
  assert.deepEqual(Chart.from(json).toJSON(), json);
  assert.deepEqual(JSON.parse(JSON.stringify(chart)), json);
  assert.equal(JSON.stringify(Chart.from(json)), JSON.stringify(chart));
});

test('chart-invariants: a tag with no rows is absent', () => {
  const chart = Chart.empty(3).with([]);
  assert.deepEqual(Object.keys(chart.toJSON()), ['$', '^']);
  assert.deepEqual(chart.spans('x'), []);
});

test('chart-is-immutable', () => {
  const a = c(9, [['x', [0, 1]], ['y', [2, 3]]]);
  const b = a.with([['x', [4, 5]], ['x', [0, 1]]]);
  assert.equal(a.spans('x').length, 1);
  assert.equal(b.spans('x').length, 2);
  assert.notEqual(a, b);
  assert.equal(a.spans('y'), b.spans('y'), 'untouched list shared by reference');
  assert.equal(a.spans('^'), b.spans('^'));
  const same = a.with([['x', [0, 1]], ['y', [2, 3]]]);
  assert.equal(same.size(), a.size());
  assert.deepEqual(same.toJSON(), a.toJSON());
});

test('chart-queries: has, after, before, spans, size', () => {
  const chart = c(20, [['x', [2, 4]], ['x', [2, 6]], ['x', [8, 9]], ['y', [3, 5]]]);
  assert.ok(chart.has('x', 2, 6) && !chart.has('x', 2, 5) && !chart.has('nope', 0, 0));
  assert.ok(chart.has('*', 3, 5) && chart.has('*', 0, 0) && chart.has('*', 20, 20) && !chart.has('*', 1, 1));
  assert.deepEqual(chart.after('x', 0), [2, 4]);
  assert.deepEqual(chart.after('x', 3), [8, 9]);
  assert.deepEqual(chart.after('x', 8), [8, 9]);
  assert.equal(chart.after('x', 9), undefined);
  assert.deepEqual(chart.after('*', 3), [3, 5]);
  assert.deepEqual(chart.after('*', 9), [20, 20]);
  assert.deepEqual(chart.before('x', 9), [8, 9]);
  assert.deepEqual(chart.before('x', 6), [2, 6]);
  assert.deepEqual(chart.before('x', 5), [2, 4]);
  assert.equal(chart.before('x', 3), undefined);
  assert.deepEqual(chart.before('*', 5), [3, 5]);
  assert.deepEqual(chart.before('*', 0), [0, 0]);
  assert.equal(chart.size(), 2 + 4);
  assert.deepEqual(chart.spans('y'), [[3, 5]]);
  assert.deepEqual(chart.spans('absent'), []);
});

test('chart-queries: all() in position order, then tag name', () => {
  const chart = c(9, [['b', [1, 3]], ['a', [1, 3]], ['a', [1, 2]], ['z', [0, 5]]]);
  assert.deepEqual([...chart.all()], [
    ['^', [0, 0]], ['z', [0, 5]], ['a', [1, 2]], ['a', [1, 3]], ['b', [1, 3]], ['$', [9, 9]],
  ]);
});

test('chart-queries: from() of a json without $ takes the furthest end', () => {
  assert.deepEqual(Chart.from({ x: [[1, 4]] }).toJSON(), { $: [[4, 4]], '^': [[0, 0]], x: [[1, 4]] });
});

test('allen-relations: thirteen, on proper intervals', () => {
  const cases: [Span, Span, AllenRelation][] = [
    [[0, 2], [4, 6], 'before'], [[0, 2], [2, 6], 'meets'], [[0, 4], [2, 6], 'overlaps'],
    [[2, 4], [2, 6], 'starts'], [[3, 4], [2, 6], 'during'], [[4, 6], [2, 6], 'finishes'],
    [[2, 6], [2, 6], 'equals'], [[4, 6], [0, 2], 'after'], [[2, 6], [0, 2], 'met-by'],
    [[2, 6], [0, 4], 'overlapped-by'], [[2, 6], [2, 4], 'started-by'], [[2, 6], [3, 4], 'contains'],
    [[2, 6], [4, 6], 'finished-by'],
  ];
  for (const [a, b, r] of cases) assert.equal(rel(a, b), r, `${a} ${b}`);
});

test('allen-relations: the text edges meet what touches them', () => {
  assert.equal(rel([0, 0], [0, 5]), 'meets');
  assert.equal(rel([0, 5], [5, 5]), 'meets');
  assert.equal(rel([5, 5], [0, 5]), 'met-by');
  assert.equal(rel([0, 5], [0, 0]), 'met-by');
  assert.equal(rel([3, 3], [3, 3]), 'equals');
  assert.equal(rel([3, 3], [0, 5]), 'during');
});
