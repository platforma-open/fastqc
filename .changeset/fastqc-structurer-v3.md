---
"@platforma-open/milaboratories.fastqc.model": minor
"@platforma-open/milaboratories.fastqc.ui": minor
"@platforma-open/milaboratories.fastqc.workflow": patch
"@platforma-open/milaboratories.fastqc": minor
---

Migrate fastqc onto the block-tools structurer (full SDK upgrade: model/ui-vue
1.79.14, workflow-tengo 6.6.3, tengo-builder 4.0.8) and BlockModelV3.

Persisted state is preserved via the legacy upgrader. UI bindings move to
`app.model.data`. `title` is now UI-only and no longer stales the block — only
the input dataset selection does.
