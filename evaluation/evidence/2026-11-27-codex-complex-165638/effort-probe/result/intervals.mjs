export function ranges(input) {
  if (!Array.isArray(input)) {
    throw new TypeError('Expected an array of intervals');
  }

  const sorted = [];
  for (let index = 0; index < input.length; index += 1) {
    const interval = input[index];
    if (!Array.isArray(interval) || interval.length !== 2) {
      throw new TypeError('Expected each interval to have two endpoints');
    }

    const start = interval[0];
    const end = interval[1];
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
      throw new TypeError('Expected safe integer endpoints');
    }
    if (start > end) {
      throw new RangeError('Interval start must not exceed its end');
    }
    sorted.push([start, end]);
  }

  sorted.sort((left, right) => left[0] - right[0]);

  const merged = [];
  for (const interval of sorted) {
    const [start, end] = interval;
    const previous = merged.at(-1);
    // If start is greater than the previous end, adding one stays safe.
    if (previous && (start <= previous[1] || start === previous[1] + 1)) {
      previous[1] = Math.max(previous[1], end);
    } else {
      merged.push(interval);
    }
  }
  return merged;
}
