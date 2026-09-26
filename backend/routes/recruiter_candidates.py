import os
import shutil

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.recruiter_candidate import RecruiterCandidate
from backend.resume.parser import parse_resume
from backend.resume.parser import extract_text_from_pdf
from backend.semantic_matcher import calculate_similarity, extract_skill_matches
from backend.qualification_matcher import check_qualification
from backend.experience_matcher import check_experience
from backend.overall_score import calculate_overall_score


router = APIRouter()

UPLOAD_DIR = "uploads/resumes"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ---------------------------------------------------------
# GET ALL CANDIDATES
# ---------------------------------------------------------
@router.get("/candidates")
def get_candidates(db: Session = Depends(get_db)):
    candidates = (
        db.query(RecruiterCandidate)
        .order_by(RecruiterCandidate.id.desc())
        .all()
    )

    return {
        "candidates": [
            {
                "id": c.id,
                "name": c.name,
                "email": c.email,
                "phone": c.phone,
                "skills": c.skills,
                "education": c.education,
                "experience": c.experience,
                "extracurricular": c.extracurricular,
                "resume_filename": c.resume_filename,
                "job_description": c.job_description,
                "semantic_score": c.semantic_score,
                "skill_score": c.skill_score,
                "qualification_status": c.qualification_status,
                "experience_status": c.experience_status,
                "experience_score": c.experience_score,
                "overall_score": c.overall_score,
                "recruitment_status": c.recruitment_status,
            }
            for c in candidates
        ]
    }


# ---------------------------------------------------------
# GET SINGLE CANDIDATE
# ---------------------------------------------------------
@router.get("/candidates/{candidate_id}")
def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    candidate = (
        db.query(RecruiterCandidate)
        .filter(RecruiterCandidate.id == candidate_id)
        .first()
    )

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    candidate_data = {
        "id": candidate.id,
        "name": candidate.name,
        "email": candidate.email,
        "phone": candidate.phone,
        "skills": candidate.skills,
        "education": candidate.education,
        "experience": candidate.experience,
        "extracurricular": candidate.extracurricular,
        "resume_filename": candidate.resume_filename,
        "job_description": candidate.job_description,
        "semantic_score": candidate.semantic_score,
        "skill_score": candidate.skill_score,
        "qualification_status": candidate.qualification_status,
        "experience_status": candidate.experience_status,
        "experience_score": candidate.experience_score,
        "overall_score": candidate.overall_score,
        "recruitment_status": candidate.recruitment_status,
    }

    return {
        "candidate": candidate_data,
        "resume_details": candidate_data,
        "recruitment_status": candidate.recruitment_status,
    }


# ---------------------------------------------------------
# UPLOAD RESUME + ANALYZE
# ---------------------------------------------------------
@router.post("/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    job_description: str = Form(""),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF resume files are supported",
        )

    safe_filename = os.path.basename(file.filename)
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    # Avoid overwriting an existing file
    base, extension = os.path.splitext(safe_filename)
    counter = 1

    while os.path.exists(file_path):
        safe_filename = f"{base}_{counter}{extension}"
        file_path = os.path.join(UPLOAD_DIR, safe_filename)
        counter += 1

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        resume_data = parse_resume(file_path)
        resume_text = extract_text_from_pdf(file_path)

        semantic_score = float(calculate_similarity(
            resume_text,
            job_description
        ))

        matched_skills, missing_skills = extract_skill_matches(
            resume_text,
            job_description
        )

        qualification_result = check_qualification(
            resume_text,
            job_description
        )

        experience_result = check_experience(
            resume_text,
            job_description
        )

        # Extract required skills from the job description
        required_skills = []

        common_skills = [
            "Python",
            "C++",
            "Java",
            "JavaScript",
            "SQL",
            "HTML",
            "CSS",
            "React",
            "Node.js",
            "FastAPI",
            "Django",
            "Machine Learning",
            "Data Analysis",
            "Git",
            "GitHub",
            "Docker",
            "AWS",
            "REST API",
            "Flask",
            "MySQL",
        ]

        job_description_lower = job_description.lower()

        for skill in common_skills:
            if skill.lower() in job_description_lower:
                required_skills.append(skill)

        skill_score = (
            round((len(matched_skills) / len(required_skills)) * 100, 2)
            if required_skills
            else 100
        )

        experience_score = 100

        if experience_result["status"] == "Matched":
            experience_score = 100
        elif experience_result["status"] == "Partially Matched":
            experience_score = 50
        elif experience_result["status"] == "Not Matched":
            experience_score = 0

        overall_score = calculate_overall_score(
            semantic_score=semantic_score,
            matched_skills=matched_skills,
            required_skills=required_skills,
            qualification_status=qualification_result["status"],
            experience_status=experience_result["status"],
        )

        if overall_score >= 75:
            recruitment_status = "Shortlisted"
        elif overall_score >= 50:
            recruitment_status = "Under Review"
        else:
            recruitment_status = "Not Recommended"

        candidate = RecruiterCandidate(
            name=resume_data.get("name") or "Unknown Candidate",
            email=resume_data.get("email"),
            phone=resume_data.get("phone"),
            skills=", ".join(resume_data.get("skills", [])) if isinstance(resume_data.get("skills"), list) else resume_data.get("skills"),
            education=", ".join(resume_data.get("education", [])) if isinstance(resume_data.get("education"), list) else resume_data.get("education"),
            experience=", ".join(resume_data.get("experience", [])) if isinstance(resume_data.get("experience"), list) else resume_data.get("experience"),
            extracurricular=None,
            resume_filename=safe_filename,
            job_description=job_description,
            semantic_score=semantic_score,
            skill_score=skill_score,
            qualification_status=qualification_result["status"],
            experience_status=experience_result["status"],
            experience_score=experience_score,
            overall_score=overall_score,
            recruitment_status=recruitment_status,
        )

        db.add(candidate)
        db.commit()
        db.refresh(candidate)

        return {
            "message": "Resume uploaded and analyzed successfully",
            "candidate": {
                "id": candidate.id,
                "name": candidate.name,
                "email": candidate.email,
                "phone": candidate.phone,
                "skills": candidate.skills,
                "education": candidate.education,
                "experience": candidate.experience,
                "resume_filename": candidate.resume_filename,
                "semantic_score": candidate.semantic_score,
                "skill_score": candidate.skill_score,
                "qualification_status": candidate.qualification_status,
                "experience_status": candidate.experience_status,
                "experience_score": candidate.experience_score,
                "overall_score": candidate.overall_score,
                "recruitment_status": candidate.recruitment_status,
                "matched_skills": matched_skills,
                "missing_skills": missing_skills,
                "qualification_details": qualification_result,
                "experience_details": experience_result,
            },
            "analysis": {
                "semantic_score": semantic_score,
                "matched_skills": matched_skills,
                "missing_skills": missing_skills,
                "qualification": qualification_result,
                "experience": experience_result,
                "skill_score": skill_score,
                "experience_score": experience_score,
                "overall_score": overall_score,
            },
        }

    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)

        raise HTTPException(
            status_code=500,
            detail=f"Resume analysis failed: {str(e)}",
        )


# ---------------------------------------------------------
# UPDATE RECRUITMENT STATUS
# ---------------------------------------------------------
@router.put("/candidates/{candidate_id}/status")
def update_recruitment_status(
    candidate_id: int,
    recruitment_status: str,
    db: Session = Depends(get_db),
):
    candidate = (
        db.query(RecruiterCandidate)
        .filter(RecruiterCandidate.id == candidate_id)
        .first()
    )

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    candidate.recruitment_status = recruitment_status

    db.commit()
    db.refresh(candidate)

    return {
        "message": "Recruitment status updated successfully",
        "recruitment_status": candidate.recruitment_status,
    }


# ---------------------------------------------------------
# DELETE CANDIDATE
# ---------------------------------------------------------
@router.delete("/candidates/{candidate_id}")
def delete_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
):
    candidate = (
        db.query(RecruiterCandidate)
        .filter(RecruiterCandidate.id == candidate_id)
        .first()
    )

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    if candidate.resume_filename:
        resume_path = os.path.join(
            UPLOAD_DIR,
            candidate.resume_filename
        )

        if os.path.exists(resume_path):
            os.remove(resume_path)

    db.delete(candidate)
    db.commit()

    return {
        "message": "Candidate deleted successfully"
    }


# ---------------------------------------------------------
# DOWNLOAD / VIEW RESUME
# ---------------------------------------------------------
@router.get("/candidates/{candidate_id}/resume")
def get_candidate_resume(
    candidate_id: int,
    db: Session = Depends(get_db),
):
    candidate = (
        db.query(RecruiterCandidate)
        .filter(RecruiterCandidate.id == candidate_id)
        .first()
    )

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    if not candidate.resume_filename:
        raise HTTPException(
            status_code=404,
            detail="Resume not found"
        )

    file_path = os.path.join(
        UPLOAD_DIR,
        candidate.resume_filename
    )

    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404,
            detail="Resume file not found"
        )

    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=candidate.resume_filename,
    )