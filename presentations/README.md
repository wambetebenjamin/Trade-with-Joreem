# Trade with Joreem — Presentation & PDF Collection

Three separate courses were created from the three supplied transcripts. Every course has an editable PowerPoint deck and a matching PDF edition using the supplied green / red / black modern Forex template.

## Deliverables

| Course | PowerPoint | PDF | Length |
|---|---|---|---:|
| Ultimate Supply & Demand Masterclass — Beginner to Pro | `01_Ultimate_Supply_and_Demand_Masterclass.pptx` | `01_Ultimate_Supply_and_Demand_Masterclass.pdf` | 30 slides / pages |
| Complete Supply & Demand Trading Course | `02_Complete_Supply_and_Demand_Trading_Course.pptx` | `02_Complete_Supply_and_Demand_Trading_Course.pdf` | 19 slides / pages |
| 4-Step SMC Trading Strategy | `03_4_Step_SMC_Trading_Strategy.pptx` | `03_4_Step_SMC_Trading_Strategy.pdf` | 17 slides / pages |

## What is included

- **Template-matched design:** 20 × 11.25 inch widescreen pages, the supplied template's colour system, Kitchakan display lettering and Inter body typography.
- **Distinct course structures:** the masterclass progresses from foundations to top-down analysis; the complete course focuses on three zone methods and Fibonacci confluence; the SMC deck is a four-confluence playbook.
- **Original schematic charts:** editable vector candles, zones, structure, liquidity, confirmation and risk diagrams in PowerPoint. These are illustrations, not live market data.
- **Joreem's supplied portrait** on each cover and closing page, plus stock imagery from Pexels, the existing Joreem image library and the supplied template.
- **Speaker notes in PowerPoint:** each slide includes its transcript source range where applicable, plus educational cautions.
- **Matching PDF editions:** the same page designs, embedded body fonts and clickable outline/bookmark entries for every page.
- **Risk-conscious editing:** payout and profit language is not presented as a guarantee. Source risk examples are identified as illustrations rather than recommendations.

See `IMAGE_CREDITS.md` for image sources and `../tools/` for the reproducible build scripts.

## Source mapping

- `ULTIMATE Supply and Demand Masterclass (Beginner to Pro).txt` → collection 01
- `COMPLETE Supply & Demand Trading Course.txt` → collection 02
- `Copy This 4 Step SMC Trading Strategy (Use it To Get Prop Firm Payouts!).txt` → collection 03

The source transcripts were reorganised and edited for presentation learning. They were not pasted verbatim onto slides.

## Rebuild locally

From the repository root, with Python 3.11+:

```bash
python -m venv .venv
.venv/bin/pip install -r tools/requirements.txt
.venv/bin/python -m tools.build_course_decks
```

The script reads the original uploaded PowerPoint template and writes all six files into `presentations/`.

## Important

These materials are for education only and are not financial advice, trade signals or promises of returns. Trading involves substantial risk. Test any rules independently and define maximum loss before taking risk.
