# Alibaba static publisher

Alibaba HK retains one active public release. The application source and build instructions live in GitHub. Treat the exact source revision and package digest as separate release records.

The gateway accepts the same validated public overlay and expected parent as before. The publisher validates limits, preserves existing public assets used by the application, and stages the next tree. It keeps the starting tree for the duration of the transaction so a failed health check can restore service. After the new tree passes the publisher health check, the journal records the commit, retirement removes the starting tree, and the completed upload is consumed. The publisher creates no release backup. The rollback operation refuses requests. To restore an older app version after a completed release, build and deploy a reviewed GitHub revision as a new release.

Run `python3 test_single_instance.py` from this directory. The fixtures exercise successful publication, stale input, failed health checks, both sides of interrupted transaction recovery, and preservation of an unrelated newer upload.

For a complete Vite build, include the whole `dist-hk/assets` directory and `assets/chineseos-vite-build.json` in the overlay. The manifest contains `{"version":1,"chunks":["assets/<file>.js",...]}` listing all hashed JS and CSS under the root `assets` directory. The publisher checks the entry files and local chunk references, consumes the manifest, and retires generated chunks absent from the new build. This keeps the current frontend bundle on disk after each app release. Place independently published content outside the root Vite chunk namespace. Overlays without the marker keep inheriting application chunks.

Only install the reviewed `core.py` into the existing fixed publisher after checking the live parent and ruling out an in-flight transaction. Leave transport, authentication, file allowlists, and the minimum post-publication disk reserve under the existing policy. Verify the precise public release, affected study flows, and the remaining active tree after publication. Identify any legacy archive cleanup separately before executing it.
