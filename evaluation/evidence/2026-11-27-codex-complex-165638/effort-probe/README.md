# Does automatic Complex selection reach the worker threads?

Codex CLI 0.172.0 received the three-block task in task.md with the installed 1.9.0 kit and no native launch profile. The prompt required delegation to three workers. It withheld the expected profile and per-block effort. Only the visible tests were in the checkout. Each worker's file-change event connects its actual thread to one module. The model and effort come from the thread's turn context. The root named Complex, and all three actual worker efforts matched the choices fixed in expected.json before launch.

| Owned module | Actual worker | Requests |
| --- | --- | ---: |
| label.mjs | GPT-6.2 Sol low | 5 |
| intervals.mjs | GPT-6.2 Sol medium | 7 |
| queue.mjs | GPT-6.2 Sol high | 10 |

The root used Sol high for 35 requests. Its independent reviewer used Sol xhigh for 11. All 68 attributed requests are in requests.jsonl; at the standard rate the run consumed 24.88 credit equivalents. The three visible and six withheld tests passed. This is a routing and implementation check on a specified fixture. The main benchmark measures efficiency against Luna on a real project.

Recheck the delivered code and both sets of tests from this directory:

```sh
node --test result/*.test.mjs
```
