# Documentation guidance

- Describe the current state. Clearly label accepted designs that are still planned.
- Update affected docs with every task; remove obsolete guidance and irrelevant history.
- Make the main README and guides/ the first reading path for newcomers. Link the relevant guide prominently from the main README and docs/README.md.
- Write guides as practical, plain-language walkthroughs of what people can do today. Explain the purpose of each step and its expected result; link technical references and ADRs for deeper detail.
- Extend affected guides as capabilities are implemented. Add focused guides when a new workflow needs one; do not describe planned functionality as available or duplicate technical reference details.
- Use concise, complete, natural language. Explain technical details only when readers need them.
- Give each topic one canonical home. Link to that home instead of repeating explanations, commands, or policies across files or within a file.
- Review the main README for repeated sections and links. Give each audience a direct next step; avoid link chains, circular navigation, and multiple links to the same topic on one page.
- Create a separate document only when it has a distinct purpose or consolidates substantial shared information. Do not add index files for a single document.
- Keep AGENTS.md files as short as practical without losing required instructions; there is no fixed line limit.
- Add scoped AGENTS.md files only for instructions that differ from parent guidance. A folder README is enough for purpose, entry points, and usage.
- Keep setup and current commands in the relevant guide. Manifests, runtime pins, and lockfiles own exact versions; do not copy version inventories into prose.
- Do not write journals or retain installation logs and routine validation evidence.
- Record an experiment only to resolve behavior that is uncertain and not explained by upstream documentation. Keep its question, result, and remaining limit short, in the corresponding ADR when it affects a decision.
- Keep ADRs in adr/. Add them as implementation begins and number them incrementally from 01; planning topics do not reserve numbers. Update the relevant ADR rather than creating separate evidence files.
- Keep reference/glossary.md in alphabetical order, with one definition per term.
- Keep README.md focused on this folder's navigation and purpose.
- Keep issues and milestones consistent with agreed scope and actual delivery; local changes are not merged work.
