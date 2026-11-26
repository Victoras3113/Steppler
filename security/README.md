# Security checks

- `run-tests.sh` builds a throw-away local PostgreSQL with the app's schema, photo rules and all migrations,
  then simulates the main account, a second admin, a driver, an attacker signing up directly and a logged-out
  visitor. The output must match `expected.txt` exactly (`ALL SECURITY TESTS PASSED`).
- A weekly scheduled scan re-runs these tests and reviews the code for new risks.
- If you change database rules on purpose, update `expected.txt` after checking the new output is what you want.
