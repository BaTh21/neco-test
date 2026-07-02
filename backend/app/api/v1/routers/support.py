from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from app.services.email import send_support_email, send_contact_email

router = APIRouter()

class ProblemReport(BaseModel):
    problem: str
    email: str | None = None
    
class ContactRequest(BaseModel):
    name: str | None = None
    email: str
    message: str

@router.post("/report-problem")
async def report_problem(report: ProblemReport):
    if not report.problem.strip():
        raise HTTPException(status_code=400, detail="Problem description is required")
    
    success = await send_support_email(report.problem, report.email)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send report. Please try again later.")
    
    return {"message": "Thank you! Our team will review your report."}

@router.post("/contact-support")
async def contact_support(contact: ContactRequest):
    if not contact.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    success = await send_contact_email(contact.email, contact.message, contact.name)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send message. Please try again later.")
    
    return {"message": "Your message has been sent. Our support team will get back to you soon."}