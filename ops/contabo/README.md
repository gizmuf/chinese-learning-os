# Chinese OS on Contabo

The production checkout lives at `/home/codex-account2/chineseos-vps-test/20261108-v105-ui/source`. The repository is `gizmuf/chinese-learning-os`. Keep the verified source commit on GitHub. Production keeps one active checkout.

1. Create a Git bundle of the reviewed candidate against the active source SHA. Save `sourceCommit`, `baseSource`, `baseLiveRelease`, `bytes` and `sha256` in `PACKAGE-RECEIPT.json`. Transfer the bundle, receipt and these scripts to a private `/dev/shm/chineseos-...` directory over the existing account2 SSH profile.
2. Run `bash stage.sh` as account2. Access the staged app through an SSH tunnel to port 18968 and verify the affected UI. Save `CANDIDATE-APPROVAL.json` with `source`, `sha256`, and `accepted: true` after review and authorization.
3. With the existing authorized administrator profile, run `sudo -n /usr/bin/python3 /dev/shm/<stage>/activate.py`. The script requires 20 GB of remaining disk space, moves the live D1 state to the candidate on the same filesystem and checks the public release and services. The old code is removed after those checks. An error during the switch restores the running tree as part of that operation.
4. Check the public UI. Stop the two stage processes recorded in `worker.pid` and `gateway.pid` after confirming their working directory is `/dev/shm/<stage>/source`. Delete that stage directory. Keep source and release identifiers, test results and disk measurements in the release report.

The shared dependency path is `runtime-dependencies/node_modules` under the service directory. Releases reuse the live lockfile. A dependency version change needs a separately tested dependency preparation before staging.
