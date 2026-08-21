# Green Infrastructure Support Scheme — Policy & Eligibility Guide

## Overview

The Green Infrastructure Support Scheme (GREEN-INFRA-SUPPORT) is a local government grant programme designed to fund environmentally beneficial infrastructure projects. This document defines the eligibility criteria, funding limits, required documentation, and evaluation procedures for all applications.

---

## Eligibility Criteria

### 1. Eligible Organization Types

Only the following organization types may apply:

- **Municipality** — Urban/rural local bodies with statutory recognition
- **Registered NGO** — Non-governmental organizations with valid registration
- **Academic Institution** — Universities, colleges, or research institutions
- **Government Agency** — State or central government departments

Applications from for-profit private companies, individuals, or unregistered entities will not be considered.

---

## Financial Limits

### Maximum Project Cost

The **maximum allowable total project cost** is **₹50,00,000 (fifty lakh rupees)**.

Applications with a claimed project cost exceeding **₹50 lakh** will be automatically flagged for Senior Review and may be rejected at the preliminary screening stage.

Applications with a project cost below **₹10,000** will be considered incomplete.

### Budget Verification

All submitted budget documents must be consistent. A discrepancy of more than **2% of the lower stated value** (or more than ₹5,000, whichever is higher) between budget figures stated in different documents will be treated as a **budget inconsistency** and will require clarification before any decision can be made.

---

## Project Duration

### Maximum Duration

The **maximum eligible project duration** is **24 months** (two years) from the approved start date.

Projects spanning more than 24 months will be considered ineligible unless a formal extension has been pre-approved by the scheme administrator.

### Minimum Duration

Projects of fewer than **1 month** duration are not eligible under this scheme.

---

## Required Documents

All applications must include the following documents:

| Document Type | Description |
|---|---|
| **APPLICATION_FORM** | Completed official application form with applicant details, project summary, and declaration |
| **PROPOSAL** | Detailed project proposal including objectives, methodology, timeline, and expected outcomes |
| **BUDGET** | Itemized project budget with supporting justification |
| **CERTIFICATE** | Relevant registration certificate (NGO registration, institutional accreditation, etc.) |

Applications missing any of the above documents will be routed for **clarification** before substantive review.

---

## Environmental Eligibility

Projects must demonstrate a clear environmental benefit. Acceptable project categories include:

- Urban Greening (parks, tree planting, green corridors)
- Water Conservation (rainwater harvesting, wetland restoration)
- Waste Management (recycling, composting, waste-to-energy)
- Clean Energy (solar, wind, biomass)
- Biodiversity Conservation
- Sustainable Agriculture
- Pollution Remediation

Projects without a stated environmental benefit may be found ineligible.

---

## Review and Routing Policy

### Routing Thresholds

| Condition | Routing Decision |
|---|---|
| Missing required documents | CLARIFICATION_REQUIRED → Normal Reviewer |
| AI confidence < 0.55 | MANUAL_VERIFICATION_REQUIRED → Senior Reviewer |
| Risk score ≥ 70 | SENIOR_REVIEW → Senior Reviewer |
| Risk score ≥ 40 OR contradictions detected | EXPERT_REVIEW → Expert Reviewer |
| All thresholds clear | NORMAL_REVIEW → Normal Reviewer |

### Human Authority

The AI system provides a recommendation only. **All final decisions (APPROVE / REJECT) must be made by an authorized human reviewer.**

The AI system will never issue an irreversible final approval or rejection.

---

## Suspicious Indicators

Applications may be flagged for additional scrutiny if any of the following are detected:

- **Budget inconsistency** between submitted documents
- **Extraction confidence below 50%** (poor quality or unreadable documents)
- **Project cost above ₹1,00,00,000** (one crore rupees) — beyond scheme limits
- **Duplicate application** sharing the same applicant name and project title as a previous submission
- **Certificate document present but no certificate number extracted**

---

## Scoring

Applications are scored on two dimensions:

- **Risk Score (0–100)**: Likelihood that the application contains errors, inconsistencies, or fraud indicators. Higher = more risk.
- **Quality Score (0–100)**: Overall quality and completeness of the application. Higher = better quality.

A combined confidence score (0.0–1.0) indicates how reliable the AI assessment is.

---

## Contact and Queries

For scheme-related queries, contact the Green Infrastructure Support office. For technical processing queries, contact the application review team.

*This document is effective from 2026-01-01 and supersedes all earlier scheme guidelines.*
