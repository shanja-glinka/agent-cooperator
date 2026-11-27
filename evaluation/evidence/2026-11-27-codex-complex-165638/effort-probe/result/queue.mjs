import { addAbortListener } from 'node:events';

function abortError() {
  const error = new Error('The wait was aborted');
  error.name = 'AbortError';
  return error;
}

export function createQueue() {
  const generations = new Map();

  function discard(key, generation) {
    if (generations.get(key) !== generation) return false;
    return generations.delete(key);
  }

  function cancelWaiter(key, generation, waiter) {
    if (!generation.waiters.delete(waiter)) return;
    waiter.abortListener?.[Symbol.dispose]();
    waiter.reject(abortError());
    // Discard first so operation abort handlers can start fresh work.
    if (generation.waiters.size === 0 && discard(key, generation)) {
      generation.controller.abort();
    }
  }

  function findGeneration(key) {
    let generation = generations.get(key);
    while (generation) {
      // An earlier abort listener can reenter before our waiter listener runs.
      for (const waiter of generation.waiters) {
        if (!waiter.signal?.aborted) return generation;
        cancelWaiter(key, generation, waiter);
      }
      // The operation's abort handler may have started a replacement.
      generation = generations.get(key);
    }
  }

  function settle(key, generation, method, result) {
    if (!discard(key, generation)) return;

    // Resolving a wait can synchronously inspect a thenable.
    for (const waiter of generation.waiters) {
      waiter.abortListener?.[Symbol.dispose]();
    }
    for (const waiter of generation.waiters) {
      waiter[method](result);
    }
    generation.waiters.clear();
  }

  async function execute(key, generation, operation) {
    let result;
    try {
      result = await operation(generation.controller.signal);
    } catch (error) {
      settle(key, generation, 'reject', error);
      return;
    }
    settle(key, generation, 'resolve', result);
  }

  function run(key, operation, signal) {
    if (signal?.aborted) return Promise.reject(abortError());

    let generation = findGeneration(key);
    if (signal?.aborted) return Promise.reject(abortError());

    const start = !generation;
    if (start) {
      generation = { controller: new AbortController(), waiters: new Set() };
      generations.set(key, generation);
    }

    const wait = new Promise((resolve, reject) => {
      const waiter = { resolve, reject, signal };
      generation.waiters.add(waiter);
      if (signal) {
        waiter.abortListener = addAbortListener(signal, () => {
          cancelWaiter(key, generation, waiter);
        });
      }
    });

    if (start) void execute(key, generation, operation);
    return wait;
  }

  return { run };
}
