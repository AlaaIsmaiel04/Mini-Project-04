# Pharmacy profile and duty

The protected /pharmacist/profile route reads the authenticated pharmacy. Name is read-only; profile writes allow only area, address and phone. Drafts survive errors, focus refresh and language switches. Pending controls prevent duplicate saves; inactive or unverified access disables writes while preserving readable data.

DutyManager lists current/upcoming/past periods and implements add/edit/delete, delete confirmation, pending/error/success states, retained invalid drafts and refetch after writes. Device timezone is explicitly shown. datetime-local values are validated and converted to UTC ISO timestamps; edit inputs round-trip to the same local time. Overnight periods are valid, end must follow start, maximum duration is 24 hours, and backend overlap errors remain visible.

pharmacy-api.ts allowlists request fields and uses the shared authenticated client. EN/AR text uses pharmacist-messages.ts and the existing language provider; data stays unchanged. See docs/MOHAMMAD-IMPLEMENTATION.md for tests and dependencies.
