# Decisions

| Decision | Default taken | Reason | Confidence / validation |
|---|---|---|---|
| Product shape | Internal vertical work tool | User named one department and one operational job | High; follows `vertical-business-os` |
| V1 modules | Bills, Fleet, Vendors | All three are touched to create/reconcile a maintenance bill; dashboard is only a view | High |
| Event spine | Bill lifecycle event | Repeated daily event is invoice entry/verification/approval/payment | High |
| Bill mutability | Source bill immutable; corrections use void + replacement | Financial/operational history must be reconstructible | High |
| Money | Integer paise + INR | Prevent floating point reconciliation drift | High |
| GST | Rate per line; intra/inter/no-GST display | Mixed-rate vendor bills need line-level arithmetic | Medium; statutory applicability intentionally out of scope |
| Identity | No login in this MVP | Safest reversible default without provisioning/security claims; one trusted workstation | Medium; production gap documented |
| Persistence | Versioned localStorage | Runs immediately with no external mutation or paid service | Medium; production server gap documented |
| UI theme | Light default, amber accent | Office/workshop use and “built for real work” rule | High; follows design skill |
| Mobile | Bottom nav, record cards below 768px | Four destinations; horizontal operational tables are unusable on phones | High |
| Import/export | CSV | Existing operational history is likely spreadsheet-shaped and portability is mandatory | High |
| Payment | Record reference/date only | User asked billing, not payment execution; no external side effect permitted | High |
| Deployment | Not performed | User asked to create app in repo, not publish external infrastructure | High |
