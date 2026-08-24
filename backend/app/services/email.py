import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

from app.core.config import get_settings
from app.schemas.application import ApplicationDetail

logger = logging.getLogger(__name__)


def format_issue_card(status: str, check_type: str, message: str) -> str:
    """Format validation & rule observation into a clear, actionable, human-readable card."""
    status_upper = (status or "WARN").upper()
    is_fail = status_upper == "FAIL"
    
    badge_bg = "#fef2f2" if is_fail else "#fffbeb"
    badge_border = "#fca5a5" if is_fail else "#fde68a"
    badge_text_color = "#991b1b" if is_fail else "#92400e"
    badge_label = "ACTION REQUIRED" if is_fail else "VERIFICATION NEEDED"
    badge_icon = "❌" if is_fail else "⚠️"

    clean_type = check_type.replace('_', ' ').title()
    if "Required Field" in clean_type:
        clean_type = "Mandatory Parameter Check"
    elif "Completeness" in clean_type:
        clean_type = "Form Completeness Check"
    elif "Authenticity" in clean_type:
        clean_type = "Certificate Authenticity Check"
    elif "Duplicate" in clean_type:
        clean_type = "Duplicate Document Prevention"
    elif "Max Tree Cost" in clean_type or "Cost" in clean_type:
        clean_type = "Project Cost & Scheme Limit"
    elif "Cross Document" in clean_type:
        clean_type = "Cross-Document Data Consistency"

    # Human-readable Issue explanation & Action Required step
    msg_lower = (message or "").lower()
    issue_desc = message
    action_desc = "Please review the submitted document details and verify parameter entries."

    if "completeness is" in msg_lower:
        issue_desc = "Application fields are partially filled (50% parameter completeness)."
        action_desc = "Provide missing project location, organisation details, or duration in form parameters."
    elif "certificate" in msg_lower and "number" in msg_lower:
        issue_desc = "Official certificate document attached, but certificate registration number was not automatically extracted."
        action_desc = "Ensure uploaded certificate scan is high-resolution and registration number is clearly visible."
    elif "duplicate" in msg_lower:
        issue_desc = "Document checksum matches a previously uploaded application file."
        action_desc = "Confirm document uniqueness or re-upload original project certificate."
    elif "cost" in msg_lower or "limit" in msg_lower:
        issue_desc = "Estimated project cost exceeds allowable scheme threshold limit."
        action_desc = "Adjust project budget or re-submit under a higher-tier environmental scheme."
    elif "applicant" in msg_lower and "name" in msg_lower:
        issue_desc = "Applicant Full Name requires supporting identity document evidence."
        action_desc = "Attach official applicant ID card or EIA authorization document."
    elif "title" in msg_lower:
        issue_desc = "Project Title requires matching EIA project proposal document."
        action_desc = "Upload project proposal or environmental report matching project title."
    elif "has only 0 distinct" in msg_lower:
        issue_desc = "Awaiting 2+ uploaded documents to perform cross-document consistency verification."
        action_desc = "Upload EIA report and financial proposal to enable cross-document validation."

    return f"""
    <div style="background-color: {badge_bg}; border: 1px solid {badge_border}; border-left: 4px solid {badge_text_color}; border-radius: 8px; padding: 18px 24px; margin-bottom: 16px;">
      <div style="font-size: 20px; font-weight: bold; color: {badge_text_color}; margin-bottom: 12px; border-bottom: 1px solid {badge_border}; padding-bottom: 8px;">
        {badge_icon} {clean_type} <span style="font-size: 14px; font-weight: normal; color: #475569; margin-left: 8px;">| {badge_label}</span>
      </div>
      <ul style="margin: 0; padding-left: 24px; font-size: 15px; color: #334155; line-height: 1.6;">
        <li style="margin-bottom: 8px;"><strong>Issue Identified:</strong> {issue_desc}</li>
        <li><strong style="color: {badge_text_color};">Action Required:</strong> {action_desc}</li>
      </ul>
    </div>
    """


def generate_report_html(detail: ApplicationDetail) -> str:
    """Generate a clean, responsive, gap-free HTML clearance report for mobile and desktop screens."""
    form_data = detail.form_data or {}

    app_id = detail.id
    project_title = detail.project_title or "Environmental Clearance Project"
    applicant_name = detail.applicant_name or "N/A"
    applicant_email = form_data.get("applicant_email") or "N/A"
    org_name = form_data.get("organization_name") or "N/A"
    category = detail.project_category or "Environmental Clearance"
    location = form_data.get("project_location") or "N/A"
    cost = form_data.get("project_cost")
    formatted_cost = f"₹{cost:,.2f}" if isinstance(cost, (int, float)) else "N/A"
    duration = form_data.get("project_duration")
    formatted_duration = f"{duration} Months" if duration else "N/A"
    status = (detail.status or "AWAITING_HUMAN_REVIEW").replace("_", " ")
    ai_rec = (detail.ai_recommendation or "REQUEST_CLARIFICATION").replace("_", " ")

    # Documents summary
    docs_rows = ""
    missing_invalid_docs = []
    if detail.documents:
        for doc in detail.documents:
            st = (doc.processing_status or "PENDING").upper()
            st_color = "#16a34a" if st in ("PROCESSED", "EXTRACTED") else "#dc2626"
            docs_rows += f"""
            <tr>
              <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 15px; color: #0f172a; word-break: break-word;">{doc.filename}</td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 15px; color: #475569;">{doc.document_type}</td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 15px; font-weight: bold; color: {st_color};">{st}</td>
            </tr>
            """
            if st in ("FAILED", "ERROR", "UNREADABLE"):
                missing_invalid_docs.append(f"{doc.filename} ({doc.document_type}): Extraction failed or unreadable.")
    else:
        docs_rows = '<tr><td colspan="3" style="padding: 10px; text-align: center; color: #94a3b8; font-size: 15px;">No documents attached.</td></tr>'
        missing_invalid_docs.append("No official clearance documents uploaded.")

    missing_docs_html = ""
    if missing_invalid_docs:
        items = "".join([f"<li style='margin-bottom: 3px;'>{item}</li>" for item in missing_invalid_docs])
        missing_docs_html = f"""
        <div style="background-color: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; padding: 10px 12px; margin-top: 10px;">
          <h4 style="margin: 0 0 4px 0; color: #991b1b; font-size: 15px; font-weight: bold;">⚠️ Document Issues & Missing Submissions</h4>
          <ul style="margin: 0; padding-left: 18px; color: #991b1b; font-size: 15px;">{items}</ul>
        </div>
        """

    # Format Validation and Rule Observations with Issue & Required Action Cards
    issue_cards = []
    for val in detail.validation_results:
        if val.status in ("FAIL", "WARN", "NOT_VERIFIABLE"):
            issue_cards.append(format_issue_card(val.status, val.validation_type, val.message))
    for rule in detail.rule_results:
        if rule.result in ("FAIL", "WARN"):
            issue_cards.append(format_issue_card(rule.result, rule.rule_name, rule.reason))

    val_issues_html = ""
    if issue_cards:
        cards_str = "".join(issue_cards)
        val_issues_html = f"""
        <div style="margin-top: 10px;">
          <h4 style="margin: 0 0 8px 0; color: #0a2540; font-size: 20px; font-weight: bold;">📋 Validation Issues & Action Required</h4>
          {cards_str}
        </div>
        """
    else:
        val_issues_html = """
        <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 10px 12px; margin-top: 10px; font-size: 15px; color: #166534; font-weight: 500;">
          ✅ All automated clearance guidelines and rule parameters passed successfully.
        </div>
        """

    # Final decision notes section
    decision_section = ""
    if detail.latest_decision:
        dec_type = (detail.latest_decision.get("decision") or status).replace("_", " ")
        dec_notes = detail.latest_decision.get("comments") or "No additional conditions attached."
        override = detail.latest_decision.get("override_reason")
        override_html = f"<p style='margin: 4px 0 0 0; color: #991b1b; font-size: 15px; font-weight: bold;'>Override Reason: {override}</p>" if override else ""
        decision_section = f"""
        <div style="background-color: #f8fafc; border: 1px solid #0a2540; border-radius: 6px; padding: 12px; margin-top: 12px;">
          <h3 style="margin: 0 0 6px 0; color: #0a2540; font-size: 20px; font-weight: bold;">👤 Official Reviewer Final Decision</h3>
          <p style="margin: 0; font-size: 20px; font-weight: bold; color: #0a2540;">Decision: {dec_type}</p>
          <p style="margin: 4px 0 0 0; font-size: 15px; color: #475569; line-height: 1.4;">Notes & Conditions: {dec_notes}</p>
          {override_html}
        </div>
        """

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Environmental Clearance Report</title>
  <style>
    @media only screen and (max-width: 600px) {{
      .wrapper {{ padding: 10px !important; }}
      .card-body {{ padding: 14px !important; }}
      .header-pad {{ padding: 14px !important; }}
      .hide-mobile {{ display: none !important; }}
      .col-stack {{ display: block !important; width: 100% !important; }}
    }}
  </style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; margin: 0; padding: 32px; color: #0f172a; -webkit-text-size-adjust: 100%;">
  
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 1000px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px;">
    
    <!-- Header -->
    <tr>
      <td class="header-pad" style="background-color: #0a2540; padding: 16px; color: #ffffff; border-bottom: 3px solid #c59b27;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <h1 style="margin: 0; font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #ffffff;">DECC REVIEW PORTAL</h1>
              <p style="margin: 2px 0 0 0; font-size: 14px; color: #94a3b8;">Environmental Clearance Review • Government of Maharashtra</p>
            </td>
            <td text-align="right" align="right" style="text-align: right;">
              <span style="background-color: rgba(197, 155, 39, 0.2); border: 1px solid #c59b27; color: #c59b27; padding: 3px 8px; border-radius: 4px; font-size: 13px; font-weight: bold;">OFFICIAL REPORT</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td class="card-body" style="padding: 16px;">
        
        <!-- Project Title -->
        <div style="margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
          <h2 style="margin: 0 0 2px 0; color: #0a2540; font-size: 20px; font-weight: bold; line-height: 1.3;">{project_title}</h2>
          <p style="margin: 0; font-size: 15px; color: #64748b;">Application ID: <span style="font-family: monospace; font-weight: bold; color: #0f172a;">{app_id}</span></p>
        </div>

        <!-- Section 1: Summary -->
        <h3 style="margin: 0 0 8px 0; color: #0a2540; font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">1. Application Summary</h3>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 14px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 15px;">
          <tr>
            <td style="padding: 12px; width: 20%; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">Applicant</td>
            <td style="padding: 12px; width: 30%; color: #0f172a; font-weight: bold; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">{applicant_name}<br><span style="font-weight:normal; font-size:13px; color:#64748b;">{applicant_email}</span></td>
            <td style="padding: 12px; width: 20%; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">Organisation</td>
            <td style="padding: 12px; width: 30%; color: #0f172a; font-weight: bold; border-bottom: 1px solid #e2e8f0;">{org_name}</td>
          </tr>
          <tr>
            <td style="padding: 12px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">Location</td>
            <td style="padding: 12px; color: #0f172a; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">{location}<br><span style="font-size:13px; color:#64748b;">{category}</span></td>
            <td style="padding: 12px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">Project Specs</td>
            <td style="padding: 12px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">{formatted_cost}<br><span style="font-size:13px; color:#64748b;">{formatted_duration}</span></td>
          </tr>
          <tr>
            <td style="padding: 12px; color: #64748b; font-weight: 600; border-right: 1px solid #e2e8f0;">Clearance Status</td>
            <td colspan="3" style="padding: 12px; color: #0a2540; font-weight: bold;">{status}</td>
          </tr>
        </table>

        <!-- Section 2: Documents -->
        <h3 style="margin: 14px 0 8px 0; color: #0a2540; font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">2. Submitted Documents & Verification</h3>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 6px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; font-size: 15px; table-layout: fixed;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <th style="padding: 8px 10px; text-align: left; color: #475569; font-weight: bold; width: 45%;">Filename</th>
              <th style="padding: 8px 10px; text-align: left; color: #475569; font-weight: bold; width: 30%;">Type</th>
              <th style="padding: 8px 10px; text-align: left; color: #475569; font-weight: bold; width: 25%;">Status</th>
            </tr>
          </thead>
          <tbody>
            {docs_rows}
          </tbody>
        </table>
        {missing_docs_html}

        <!-- Section 3: Compliance & Action Items -->
        <h3 style="margin: 16px 0 8px 0; color: #0a2540; font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">3. Environmental Compliance Assessment</h3>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px;">
          <p style="margin: 0; font-size: 15px; color: #0f172a;"><strong>AI Clearance Recommendation:</strong> <span style="color: #0a2540; font-weight: bold;">{ai_rec}</span></p>
        </div>
        
        {val_issues_html}
        {decision_section}

      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 12px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 14px; color: #64748b;">
        <p style="margin: 0;">Maharashtra State Environmental Clearance Review Portal</p>
        <p style="margin: 2px 0 0 0; font-weight: bold; color: #0a2540;">AI ASSISTS • HUMAN DECIDES</p>
      </td>
    </tr>
  </table>

</body>
</html>
"""
    return html


def send_application_report_email(detail: ApplicationDetail, recipient_email: str) -> None:
    """Send environmental clearance report email using SMTP credentials from settings."""
    settings = get_settings()

    host = settings.smtp_host
    port = settings.smtp_port
    user = settings.smtp_user
    password = settings.smtp_password or settings.smtp_pass
    from_email = settings.smtp_from_email or user or "no-reply@decc-portal.gov.in"

    if not recipient_email or "@" not in recipient_email:
        raise ValueError("Invalid recipient email address provided.")

    if not user or not password:
        raise ValueError(
            "SMTP credentials not configured in backend .env. "
            "Please set SMTP_USER and SMTP_PASSWORD in your backend .env file."
        )

    # Build MIME message
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Environmental Clearance Review Report: {detail.project_title or detail.id}"
    msg["From"] = f"DECC Review Portal <{from_email}>"
    msg["To"] = recipient_email

    # Generate plain text fallback & HTML
    plain_text = f"Environmental Clearance Review Report\nProject: {detail.project_title}\nApplicant: {detail.applicant_name}\nStatus: {detail.status}\nAI Recommendation: {detail.ai_recommendation}"
    html_content = generate_report_html(detail)

    msg.attach(MIMEText(plain_text, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    # Connect to SMTP server
    logger.info("Connecting to SMTP server %s:%s for recipient %s", host, port, recipient_email)
    if settings.smtp_use_tls:
        server = smtplib.SMTP(host, port, timeout=20)
        server.ehlo()
        server.starttls()
        server.ehlo()
    else:
        server = smtplib.SMTP(host, port, timeout=20)

    try:
        server.login(user, password)
        server.sendmail(from_email, [recipient_email], msg.as_string())
        logger.info("Clearance report email sent successfully to %s", recipient_email)
    finally:
        try:
            server.quit()
        except Exception:
            pass
