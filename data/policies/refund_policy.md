# Refund Policy

## Automated Refund Limits
- Refunds up to ₹5,000 are auto-approved by the Refund Agent (risk score < 50).
- Refunds between ₹5,001 and ₹25,000 are paused and require manager approval
  before processing. The gateway assigns a high risk score and queues for human review.
- Refunds above ₹25,000 are automatically blocked by the gateway (risk score ≥ 75).
  They require senior management approval and a written justification submitted
  outside the automated system.

## Eligibility
- Refund requests must be submitted within 30 days of purchase.
- Digital products are non-refundable after download.

## Risk Scoring
- The gateway risk engine scores refund actions based on amount relative to the
  ₹25,000 threshold. A ₹25,000 refund scores 100 (maximum risk) and is blocked.
- Risk score = (amount / threshold) × base_risk_weight, capped at 100.

## Audit
- Every refund action must be logged with agent ID, amount, timestamp, and approver.
- Blocked and paused actions appear in the immutable audit trail with their risk score
  and the policy that triggered the decision.