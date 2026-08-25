from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.database import get_db
from backend.models.interview import Interview
from backend.models.application import Application
from backend.models.job import Job
from backend.models.user import User


router = APIRouter(prefix="/interviews")


class InterviewCreate(BaseModel):
    candidate_id: int
    job_id: int


@router.post("/")
def create_interview(
    data: InterviewCreate,
    db: Session = Depends(get_db)
):
    # Check candidate exists
    candidate = db.query(User).filter(
        User.id == data.candidate_id
    ).first()

    if not candidate:
        raise HTTPException(
            status_code=404,
            detail="Candidate not found"
        )

    # Check job exists
    job = db.query(Job).filter(
        Job.id == data.job_id
    ).first()

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found"
        )

    # Check application exists
    application = db.query(Application).filter(
        Application.candidate_id == data.candidate_id,
        Application.job_id == data.job_id
    ).first()

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Candidate has not applied for this job"
        )

    # Candidate must be shortlisted
    if application.status != "shortlisted":
        raise HTTPException(
            status_code=400,
            detail="Candidate is not shortlisted for this interview"
        )

    # Prevent duplicate interview
    existing_interview = db.query(Interview).filter(
        Interview.candidate_id == data.candidate_id,
        Interview.job_id == data.job_id
    ).first()

    if existing_interview:
        raise HTTPException(
            status_code=400,
            detail="Interview already exists for this candidate and job"
        )

    # Create interview
    interview = Interview(
        candidate_id=data.candidate_id,
        job_id=data.job_id,
        status="started"
    )

    db.add(interview)
    db.commit()
    db.refresh(interview)

    return {
        "message": "Interview created successfully",
        "interview_id": interview.id,
        "candidate_id": interview.candidate_id,
        "job_id": interview.job_id,
        "status": interview.status
    }


@router.get("/{interview_id}")
def get_interview(
    interview_id: int,
    db: Session = Depends(get_db)
):
    interview = db.query(Interview).filter(
        Interview.id == interview_id
    ).first()

    if not interview:
        raise HTTPException(
            status_code=404,
            detail="Interview not found"
        )

    return {
        "interview_id": interview.id,
        "candidate_id": interview.candidate_id,
        "job_id": interview.job_id,
        "status": interview.status
    }