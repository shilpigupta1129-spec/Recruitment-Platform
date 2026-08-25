from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.application import Application
from backend.models.job import Job
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt

router = APIRouter()

SECRET_KEY = "recruitment-platform-secret-key"
ALGORITHM = "HS256"

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("user_id")
        role = payload.get("role")

        if user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid token"
            )

        return {
            "user_id": user_id,
            "role": role
        }

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )


@router.post("/jobs/{job_id}/apply")
def apply_for_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "candidate":
        raise HTTPException(
            status_code=403,
            detail="Only candidates can apply for jobs"
        )

    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found"
        )

    existing_application = db.query(Application).filter(
        Application.job_id == job_id,
        Application.candidate_id == current_user["user_id"]
    ).first()

    if existing_application:
        raise HTTPException(
            status_code=400,
            detail="You have already applied for this job"
        )

    new_application = Application(
        job_id=job_id,
        candidate_id=current_user["user_id"],
        status="applied"
    )

    db.add(new_application)
    db.commit()
    db.refresh(new_application)

    return {
        "message": "Application submitted successfully",
        "application_id": new_application.id,
        "job_id": new_application.job_id,
        "candidate_id": new_application.candidate_id,
        "status": new_application.status
    }
@router.get("/applications/my")
def get_my_applications(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "candidate":
        raise HTTPException(
            status_code=403,
            detail="Only candidates can view their applications"
        )

    applications = db.query(Application).filter(
        Application.candidate_id == current_user["user_id"]
    ).all()

    return [
        {
            "application_id": application.id,
            "job_id": application.job_id,
            "candidate_id": application.candidate_id,
            "status": application.status
        }
        for application in applications
    ]
@router.get("/recruiter/applications")
def get_recruiter_applications(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "recruiter":
        raise HTTPException(
            status_code=403,
            detail="Only recruiters can view applications"
        )

    applications = (
        db.query(Application)
        .join(Job, Application.job_id == Job.id)
        .filter(Job.recruiter_id == current_user["user_id"])
        .all()
    )

    return [
        {
            "application_id": application.id,
            "job_id": application.job_id,
            "candidate_id": application.candidate_id,
            "status": application.status
        }
        for application in applications
    ]
class ApplicationStatusUpdate(BaseModel):
    status: str


@router.put("/applications/{application_id}/status")
def update_application_status(
    application_id: int,
    status_data: ApplicationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "recruiter":
        raise HTTPException(
            status_code=403,
            detail="Only recruiters can update application status"
        )

    application = db.query(Application).filter(
        Application.id == application_id
    ).first()

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )

    job = db.query(Job).filter(
        Job.id == application.job_id
    ).first()

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found"
        )

    if job.recruiter_id != current_user["user_id"]:
        raise HTTPException(
            status_code=403,
            detail="You can only update applications for your own jobs"
        )

    allowed_statuses = [
        "applied",
        "shortlisted",
        "rejected",
        "selected"
    ]

    if status_data.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid application status"
        )

    application.status = status_data.status

    db.commit()
    db.refresh(application)

    return {
        "message": "Application status updated successfully",
        "application_id": application.id,
        "job_id": application.job_id,
        "candidate_id": application.candidate_id,
        "status": application.status
    }