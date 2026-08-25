from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from backend.database import get_db
from backend.models.job import Job
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt

router = APIRouter()

SECRET_KEY = "recruitment-platform-secret-key"
ALGORITHM = "HS256"

security = HTTPBearer()


class JobCreate(BaseModel):
    title: str
    description: str
    company: str
    location: str
    salary: str | None = None
    skills: str | None = None

class JobUpdate(BaseModel):
    title: str
    description: str
    company: str
    location: str
    salary: str | None = None
    skills: str | None = None

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


@router.post("/jobs")
def create_job(
    job_data: JobCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "recruiter":
        raise HTTPException(
            status_code=403,
            detail="Only recruiters can create jobs"
        )

    new_job = Job(
        title=job_data.title,
        description=job_data.description,
        company=job_data.company,
        location=job_data.location,
        salary=job_data.salary,
        skills=job_data.skills,
        recruiter_id=current_user["user_id"]
    )

    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    return {
        "message": "Job created successfully",
        "job_id": new_job.id,
        "title": new_job.title,
        "company": new_job.company,
        "location": new_job.location,
        "recruiter_id": new_job.recruiter_id
    }


@router.get("/jobs")
def get_jobs(db: Session = Depends(get_db)):
    jobs = db.query(Job).all()

    return [
        {
            "job_id": job.id,
            "title": job.title,
            "description": job.description,
            "company": job.company,
            "location": job.location,
            "salary": job.salary,
            "skills": job.skills,
            "recruiter_id": job.recruiter_id
        }
        for job in jobs
    ]


@router.get("/jobs/{job_id}")
def get_job(
    job_id: int,
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found"
        )

    return {
        "job_id": job.id,
        "title": job.title,
        "description": job.description,
        "company": job.company,
        "location": job.location,
        "salary": job.salary,
        "skills": job.skills,
        "recruiter_id": job.recruiter_id
    }
@router.put("/jobs/{job_id}")
def update_job(
    job_id: int,
    job_data: JobUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "recruiter":
        raise HTTPException(
            status_code=403,
            detail="Only recruiters can update jobs"
        )

    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found"
        )

    if job.recruiter_id != current_user["user_id"]:
        raise HTTPException(
            status_code=403,
            detail="You can only update your own jobs"
        )

    job.title = job_data.title
    job.description = job_data.description
    job.company = job_data.company
    job.location = job_data.location
    job.salary = job_data.salary
    job.skills = job_data.skills

    db.commit()
    db.refresh(job)

    return {
        "message": "Job updated successfully",
        "job_id": job.id,
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "recruiter_id": job.recruiter_id
    }
@router.delete("/jobs/{job_id}")
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "recruiter":
        raise HTTPException(
            status_code=403,
            detail="Only recruiters can delete jobs"
        )

    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found"
        )

    if job.recruiter_id != current_user["user_id"]:
        raise HTTPException(
            status_code=403,
            detail="You can only delete your own jobs"
        )

    db.delete(job)
    db.commit()

    return {
        "message": "Job deleted successfully",
        "job_id": job_id
    }