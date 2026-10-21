# Rutba Office Templates

The templates [Rutba Office](https://github.com/eharain/Rutba-Office) ships
with, kept here and improved here:

- **The template gallery** for Documents, Worksheets and Presentations:
  letters, reports, invoices, budgets, planners, pitch decks and more. Each is
  made by Office's own engines from a specification in `src/`, and pictured by
  Office itself (`files/` and `thumbs/`).
- **Rutba Data Files' ready-made databases** (`data-files/`): simple
  templates (contacts, inventory, membership, customers and sales, a lending
  library) and complete sample businesses (a trading company, a shop, a
  clinic, a salon, a repair shop, an agency, a cafe, rentals, a school, a
  charity, a workshop, and more to come), each with its tables, queries,
  forms, reports and print templates, with invented start-up records or
  empty, and its documentation.

Every person, business, address and figure in them is invented. E-mail
addresses are on example domains and phone numbers come only from the ranges
kept for fiction.

## How Office uses this repository

Office takes it as a git submodule at `packages/templates` (the package
`@rutba/templates`), so the templates are built and checked by Office's own
engines and window checks before every release. To work on them:

```
git clone --recurse-submodules https://github.com/eharain/Rutba-Office.git
cd Rutba-Office/packages/templates
git config core.hooksPath .githooks
```

Change a template here, commit and push in this repository, then move Office's
submodule to the new commit in Rutba-Office.

## Versions

`manifest.json` says which Office each part of the set needs:

- `set` is this set's own version. It goes up with every published change.
- `minOffice` is the oldest Office that can use the set; each part (the
  gallery, Data Files) and each template may need a newer one.

An Office older than a template needs shows that template as needing an
update, and offers it. An Office whose templates are older than a newer set
it can use fetches the newer set when it checks for updates.

## Rules for every commit

The hooks in `.githooks/` reject a commit or a push that carries an AI tool's
attribution or name, a long dash or an invisible character, and the same check
runs on GitHub for every push and pull request. Set them up once in each
clone with `git config core.hooksPath .githooks`.

## Licence

As Rutba Office: GNU AGPL v3.0, or a commercial licence from the copyright
holder. See `LICENSE`.
