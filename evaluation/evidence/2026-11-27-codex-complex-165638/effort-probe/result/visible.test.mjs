import test from 'node:test';
import assert from 'node:assert/strict';
import { label } from './label.mjs';
import { ranges } from './intervals.mjs';
import { createQueue } from './queue.mjs';

test('trimmed display value', () => assert.equal(label(' ok '), 'ok'));
test('merge adjacent closed intervals', () => assert.deepEqual(ranges([[3, 4], [1, 2]]), [[1, 4]]));
test('run one operation', async () => assert.equal(await createQueue().run('k', () => 4), 4));
