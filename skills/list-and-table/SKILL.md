---
name: list-and-table
description: >
  Use when a screen shows many records, when users ask to export data instead of working in the
  app, or when a list becomes slow or unusable on a phone.
---

# Lists and tables

**The question this skill answers:** what is the user trying to find, and how many rows
stand between them and it?

Those two facts decide every control on the screen. A 40-row list needs none of this. A
40,000-row list needs all of it, and adding it later means retrofitting six callers.

---

## 1. Derive the finding controls from how the user knows what they want

```
How does the user identify the row they want?
├─ By name or number they already know ──► SEARCH is primary. Autofocus it.
├─ By a property ("all overdue") ────────► FILTERS are primary. Search is secondary.
├─ By position ("most recent", "biggest")► SORT is primary. Default it correctly.
└─ They're browsing, not searching ──────► none of the above. Good defaults and
                                            pagination are enough.
```

Most tables get all three whether or not they need them. Build the primary one properly
and the others plainly.

**Whatever you build, put its state in the URL** (`?q=acme&status=overdue&page=2`). It
costs nothing and it makes the view shareable, bookmarkable, and back-button-correct. A
filtered list a user cannot send to a colleague is a bug they will report as "can I
export this?"

## 2. Derive pagination from what the user does after finding a row

```
Will they come BACK to this list after opening a row?
├─ yes (operational work — the common case) ─► NUMBERED PAGES.
│     and preserve position on back-navigation. Clicking row 34, then back,
│     must return to row 34 — not the top of page 1. This is the most
│     cursed and most common list bug there is.
├─ no, they consume and move on ────────────► "Load more".
└─ it's a media feed ───────────────────────► infinite scroll, and accept
                                               that you have destroyed the footer.
```

Server-side always. Default 25–50, **hard-capped server side**. Show the range and total:
"Showing 26–50 of 412" — the total is what tells a user whether to filter or to keep paging.

## 3. Derive bulk actions from whether the user acts on sets

```
Does the user ever do the same thing to many rows?
└─ yes → checkboxes, and then the distinction that matters:
         "Select all" selects THE VISIBLE PAGE.
         "Select all 412 matching" is a SECOND, separate click.
         Conflating those two deletes the wrong things, and the user
         will not notice until later.
```

Bulk destructive actions confirm with the count and a sample: "Delete 12 invoices,
including INV-1042 and 11 others?" Report partial failure honestly: "10 archived, 2 failed".

This is the feature whose absence sends operational users back to spreadsheets.

## 4. Derive columns from the decision the user is making

```
What does the user need to see to decide whether this is the right row?
└─ THOSE are your default columns. Usually 5-7.
   Everything else goes behind column settings, persisted per user.
```

A 20-column default is unreadable, and it is what you get from showing every field the
API returns. Right-align numbers, left-align text, use tabular figures so digits line up,
truncate long text with a tooltip rather than wrapping a cell to four lines.

## 5. Derive export from what they will do outside your app

```
Why are they exporting?
├─ To send it to someone ────► CSV, respecting current filters and sort.
│                               Say so: "Export 47 filtered rows".
├─ To work on it and bring
│  it back ──────────────────► then you owe them IMPORT too. Every export
│                               a user makes, they eventually want to send back.
└─ It's a report ────────────► generate it as a report, not a spreadsheet.
```

Export display values, not raw codes — `Overdue`, never `status_3`. Over a few thousand
rows, generate async and email a link; a browser download that dies at row 50,000 is
worse than no export.

## 6. Derive the mobile layout from which fields carry the decision

A horizontally scrolling table on a phone is unusable. Below 768px, become cards:

```
┌──────────────────────────────┐
│ INV-1042            Overdue  │  ← identifier + status
│ Acme Ltd                     │  ← the one field that identifies it
│ ₹12,400 · due 14 Mar    ›    │  ← two more, then a chevron
└──────────────────────────────┘
```

Pick the three or four fields that carry the decision from §4. The rest live in the
detail view. Keep search and filters reachable; move selection behind a "Select" toggle.

## 7. Saved views, for tables used daily

Let the user name a filter-plus-sort combination, set a default, and share it. This is
cheap once filters live in the URL, and it turns a generic table into their workspace.

---

## Verify

```bash
ship detect --rules list
```

**Automated:** unpaginated collection endpoints, list views with no empty state.

**Judgement:**

- [ ] The primary finding control matches how the user identifies rows
- [ ] Search, filters, sort and page all in the URL
- [ ] Back-navigation returns to the same scroll position and page
- [ ] "Select all page" and "select all matching" are distinct actions
- [ ] Default columns are the ones the decision needs, not everything the API returns
- [ ] Export respects filters and emits display values
- [ ] Opened at 375px: it is cards, not a scrolling table
- [ ] Sorting and pagination happen server-side

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| "Can I get this as a spreadsheet?" | no bulk actions — they are leaving to do the work elsewhere |
| Users lose their place constantly | scroll and page position not preserved on back |
| Someone deleted 400 rows meaning 25 | select-all conflated page with all-matching |
| Filtered views shared as screenshots | filter state not in the URL |
| Sorting shows the wrong rows | client-side sort over a paginated page |
| Table unusable on a phone | no card transformation below 768px |
| Fast in dev, unusable in month eight | pagination or indexes deferred |
| Nobody uses the filters | filters hidden behind a modal |

## Don't

- Don't use infinite scroll for operational tables.
- Don't build a pivot table. Export to a spreadsheet — that is what they are for.
- Don't add column resizing before column *hiding*; hiding is what people want.
- Don't default to more than seven columns.
