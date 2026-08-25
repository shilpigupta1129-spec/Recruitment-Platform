from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from backend.database import get_db
from backend.models.candidate_profile import CandidateProfile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
import os		

router = APIRouter()

SECRET_KEY = "recruitment-platform-secret-key"
ALGORITHM = "HS256"

security = HTTPBearer()


class ProfileUpdate(BaseModel):
    phone: str | None = None
    education: str | None = None
    experience: str | None = None
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


@router.put("/candidate/profile")
def update_profile(
    profile_data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "candidate":
        raise HTTPException(
            status_code=403,
            detail="Only candidates can update their profile"
        )

    profile = db.query(CandidateProfile).filter(
        CandidateProfile.candidate_id == current_user["user_id"]
    ).first()

    if profile:
        profile.phone = profile_data.phone
        profile.education = profile_data.education
        profile.experience = profile_data.experience
        profile.skills = profile_data.skills
    else:
        profile = CandidateProfile(
            candidate_id=current_user["user_id"],
            phone=profile_data.phone,
            education=profile_data.education,
            experience=profile_data.experience,
            skills=profile_data.skills
        )

        db.add(profile)

    db.commit()
    db.refresh(profile)

    return {
        "message": "Candidate profile updated successfully",
        "profile_id": profile.id,
        "candidate_id": profile.candidate_id,
        "phone": profile.phone,
        "education": profile.education,
        "experience": profile.experience,
        "skills": profile.skills
    }

@router.get("/candidate/profile")
def get_profile(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "candidate":
        raise HTTPException(
            status_code=403,
            detail="Only candidates can view their profile"
        )

    profile = db.query(CandidateProfile).filter(
        CandidateProfile.candidate_id == current_user["user_id"]
    ).first()

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Candidate profile not found"
        )

    return {
        "profile_id": profile.id,
        "candidate_id": profile.candidate_id,
        "phone": profile.phone,
        "education": profile.education,
        "experience": profile.experience,
        "skills": profile.skills,
        "resume_filename": profile.resume_filename
    }

@router.post("/candidate/resume")
def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "candidate":
        raise HTTPException(
            status_code=403,
            detail="Only candidates can upload resumes"
        )

    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF resumes are allowed"
        )

    upload_dir = "uploads/resumes"
    os.makedirs(upload_dir, exist_ok=True)

    filename = f"{current_user['user_id']}_{file.filename}"
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, "wb") as buffer:
        buffer.write(file.file.read())

    profile = db.query(CandidateProfile).filter(
        CandidateProfile.candidate_id == current_user["user_id"]
    ).first()

    if not profile:
        profile = CandidateProfile(
            candidate_id=current_user["user_id"]
        )
        db.add(profile)

    profile.resume_filename = filename

    db.commit()
    db.refresh(profile)

    return {
        "message": "Resume uploaded successfully",
        "candidate_id": profile.candidate_id,
        "resume_filename": profile.resume_filename
    }