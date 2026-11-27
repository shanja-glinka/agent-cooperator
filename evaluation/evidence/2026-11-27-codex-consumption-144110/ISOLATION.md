# What the shared-path flags mean

The product's original detector found 31 clean cells and 17 shared cells, all of the latter on Codex. It found zero stale or crossed cells. The published metrics, clean-only price denominators and original isolation.json retain those verdicts.

Every one of its 32 directed overlap entries referred to the same top-level temporary directory used for an authorship-check hook. The detector extracts the first component below the temporary root and compares that component across concurrent cell commands. The host directory existed. Even a command looking up a hook in a private cell directory could match the detector once the host's top-level directory was found.

Across the flagged cells, 27 completed command events mentioned the fixture. In 25, the combined command output actually contains a path beneath that cell's own temporary directory and a missing-file diagnostic for the fixture. In the other two, error output was suppressed and the compound command ended with a nonzero exit code. There were no recorded file-change events targeting the fixture. The records contain no identified transfer of another cell's result through that directory. A compound command's exit status does not establish what every segment did, and the logs are not a filesystem trace.

Accordingly the supplemental audit does not promote any flagged cell to officially clean. The per-trial credit measurements still describe spend. Estimates across flagged and unflagged trials are labeled as observations; the clean-only table remains available separately. [Supplemental counts](isolation-audit.json) · [Original verdicts](isolation.json) · [Credit denominators](CREDITS.md)
