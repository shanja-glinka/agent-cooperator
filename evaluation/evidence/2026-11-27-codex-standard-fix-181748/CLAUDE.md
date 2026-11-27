# Claude Opus: стоимость и качество по повтору

Cold-start USD — benchmark list-price estimate for all actors, including recorded GPT-6.2 Sol reviewers. Sol USD uses the benchmark GPT-6.1 price proxy. Reviewer credits are a separate unit, computed as noncached input × 50 + cacheRead × 2.5 + output × 250 per million tokens; these credits are not added to USD.

Isolation is taken from the separate official isolation.json. Missing verdicts and missing repeats are shown explicitly; no row is treated as clean by default. Reviewer usage below comes only from public metrics actors with role `reviewer` and model `gpt-6.2-sol`; no auxiliary behavior file is read.

## Completeness

| Bundle | Selected cells | Source cells | Excluded candidate cells | Missing | Duplicates | Unexpected | Missing isolation | Missing contract/wall/price/reviewer | Result |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| controls | 32/32 | 48/48 | 16 | 0 | 0 | 0 | 0 | 0 | complete |
| 1.9.0 | 20/20 | 20/20 | 0 | 0 | 0 | 0 | 0 | 0 | complete |
| 1.9.1 | 20/20 | 20/20 | 0 | 0 | 0 | 0 | 0 | 0 | complete |

## Repeats summary

| Task | Release | Variant | Contract passes / repeats | Repeats observed | Wall time mean (range) | Cold-start USD sum (repeats, all actors) | Sol reviewer requests sum (repeats) | Sol reviewer credits sum (repeats) | Isolation (repeats) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| small | Без кита | nokit | 2/2 | 2/2 | 4:08 (4:01–4:15) | $1.2804 | 0 | 0.00 | clean 2 |
| big | Без кита | nokit | 0/2 | 2/2 | 16:35 (14:49–18:20) | $9.0650 | 0 | 0.00 | clean 2 |
| unknown | Без кита | nokit | 2/2 | 2/2 | 2:04 (1:55–2:13) | $0.8236 | 0 | 0.00 | clean 2 |
| review | Без кита | nokit | 2/2 | 2/2 | 3:10 (2:15–4:04) | $0.8852 | 0 | 0.00 | clean 2 |
| small | 1.8.1 | current | 2/2 | 2/2 | 4:03 (3:40–4:26) | $1.1866 | 0 | 0.00 | clean 2 |
| big | 1.8.1 | current | 2/2 | 2/2 | 31:04 (25:09–36:59) | $7.8443 | 79 | 60.91 | clean 2 |
| unknown | 1.8.1 | current | 2/2 | 2/2 | 2:07 (1:47–2:27) | $0.9804 | 0 | 0.00 | clean 2 |
| review | 1.8.1 | current | 2/2 | 2/2 | 2:24 (2:09–2:38) | $0.9922 | 0 | 0.00 | clean 2 |
| small | 1.9.0 | Standard | 2/2 | 2/2 | 3:37 (3:24–3:49) | $1.3845 | 0 | 0.00 | clean 2 |
| big | 1.9.0 | Standard | 1/2 | 2/2 | 23:01 (17:11–28:50) | $4.9042 | 38 | 26.87 | clean 2 |
| unknown | 1.9.0 | Standard | 2/2 | 2/2 | 1:55 (1:53–1:56) | $0.9124 | 0 | 0.00 | clean 2 |
| review | 1.9.0 | Standard | 2/2 | 2/2 | 2:24 (2:12–2:36) | $0.9861 | 0 | 0.00 | clean 2 |
| big | 1.9.0 | Complex | 2/2 | 2/2 | 26:27 (25:02–27:52) | $6.3141 | 50 | 42.37 | clean 2 |
| small | 1.9.1 | Standard | 2/2 | 2/2 | 3:22 (3:18–3:25) | $1.3749 | 0 | 0.00 | clean 2 |
| big | 1.9.1 | Standard | 2/2 | 2/2 | 27:50 (25:44–29:56) | $6.4932 | 65 | 49.18 | clean 2 |
| unknown | 1.9.1 | Standard | 2/2 | 2/2 | 2:10 (2:09–2:11) | $0.9501 | 0 | 0.00 | clean 2 |
| review | 1.9.1 | Standard | 2/2 | 2/2 | 1:59 (1:49–2:08) | $0.8789 | 0 | 0.00 | clean 2 |
| big | 1.9.1 | Complex | 2/2 | 2/2 | 24:26 (23:19–25:33) | $5.3451 | 42 | 28.48 | clean 2 |

## Claude cell details

| Task | Release | Variant | Repeat | Contract | Wall time | Cold-start USD | GPT-6.2 Sol reviewer requests | Reviewer credits | Isolation |
|---|---|---|---:|---|---:|---:|---:|---:|---|
| small | Без кита | nokit | 1 | Да | 4:01 | $0.5892 | 0 | 0.00 | clean |
| small | Без кита | nokit | 2 | Да | 4:15 | $0.6912 | 0 | 0.00 | clean |
| big | Без кита | nokit | 1 | Нет | 18:20 | $4.8961 | 0 | 0.00 | clean |
| big | Без кита | nokit | 2 | Нет | 14:49 | $4.1689 | 0 | 0.00 | clean |
| unknown | Без кита | nokit | 1 | Да | 2:13 | $0.4005 | 0 | 0.00 | clean |
| unknown | Без кита | nokit | 2 | Да | 1:55 | $0.4231 | 0 | 0.00 | clean |
| review | Без кита | nokit | 1 | Да | 4:04 | $0.5521 | 0 | 0.00 | clean |
| review | Без кита | nokit | 2 | Да | 2:15 | $0.3331 | 0 | 0.00 | clean |
| small | 1.8.1 | current | 1 | Да | 3:40 | $0.6043 | 0 | 0.00 | clean |
| small | 1.8.1 | current | 2 | Да | 4:26 | $0.5823 | 0 | 0.00 | clean |
| big | 1.8.1 | current | 1 | Да | 36:59 | $5.0325 | 53 | 43.25 | clean |
| big | 1.8.1 | current | 2 | Да | 25:09 | $2.8118 | 26 | 17.66 | clean |
| unknown | 1.8.1 | current | 1 | Да | 2:27 | $0.5550 | 0 | 0.00 | clean |
| unknown | 1.8.1 | current | 2 | Да | 1:47 | $0.4255 | 0 | 0.00 | clean |
| review | 1.8.1 | current | 1 | Да | 2:38 | $0.4916 | 0 | 0.00 | clean |
| review | 1.8.1 | current | 2 | Да | 2:09 | $0.5006 | 0 | 0.00 | clean |
| small | 1.9.0 | Standard | 1 | Да | 3:24 | $0.6517 | 0 | 0.00 | clean |
| small | 1.9.0 | Standard | 2 | Да | 3:49 | $0.7329 | 0 | 0.00 | clean |
| big | 1.9.0 | Standard | 1 | Да | 28:50 | $3.3822 | 38 | 26.87 | clean |
| big | 1.9.0 | Standard | 2 | Нет | 17:11 | $1.5220 | 0 | 0.00 | clean |
| unknown | 1.9.0 | Standard | 1 | Да | 1:56 | $0.4353 | 0 | 0.00 | clean |
| unknown | 1.9.0 | Standard | 2 | Да | 1:53 | $0.4771 | 0 | 0.00 | clean |
| review | 1.9.0 | Standard | 1 | Да | 2:36 | $0.5525 | 0 | 0.00 | clean |
| review | 1.9.0 | Standard | 2 | Да | 2:12 | $0.4336 | 0 | 0.00 | clean |
| big | 1.9.0 | Complex | 1 | Да | 25:02 | $3.0990 | 26 | 25.54 | clean |
| big | 1.9.0 | Complex | 2 | Да | 27:52 | $3.2151 | 24 | 16.84 | clean |
| small | 1.9.1 | Standard | 1 | Да | 3:18 | $0.7712 | 0 | 0.00 | clean |
| small | 1.9.1 | Standard | 2 | Да | 3:25 | $0.6037 | 0 | 0.00 | clean |
| big | 1.9.1 | Standard | 1 | Да | 25:44 | $3.0888 | 32 | 26.82 | clean |
| big | 1.9.1 | Standard | 2 | Да | 29:56 | $3.4044 | 33 | 22.36 | clean |
| unknown | 1.9.1 | Standard | 1 | Да | 2:09 | $0.4704 | 0 | 0.00 | clean |
| unknown | 1.9.1 | Standard | 2 | Да | 2:11 | $0.4797 | 0 | 0.00 | clean |
| review | 1.9.1 | Standard | 1 | Да | 1:49 | $0.4681 | 0 | 0.00 | clean |
| review | 1.9.1 | Standard | 2 | Да | 2:08 | $0.4108 | 0 | 0.00 | clean |
| big | 1.9.1 | Complex | 1 | Да | 23:19 | $2.7034 | 22 | 15.22 | clean |
| big | 1.9.1 | Complex | 2 | Да | 25:33 | $2.6418 | 20 | 13.26 | clean |
