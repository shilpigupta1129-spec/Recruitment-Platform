from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.interview import Interview
from backend.models.interview_answer import InterviewAnswer

router = APIRouter(
    prefix="/evaluation",
    tags=["Candidate Evaluation"]
)


@router.get("/{interview_id}")
def evaluate_candidate(
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

    answers = db.query(InterviewAnswer).filter(
        InterviewAnswer.interview_id == interview_id,
        InterviewAnswer.score.isnot(None)
    ).all()

    if not answers:
        raise HTTPException(
            status_code=404,
            detail="No evaluated answers found"
        )

    total_score = sum(answer.score for answer in answers)

    overall_score = round(
        total_score / len(answers),
        2
    )

    if overall_score >= 8:
        performance_level = "Strong"
        recommendation = "Recommended"

    elif overall_score >= 6:
        performance_level = "Good"
        recommendation = "Recommended"

    elif overall_score >= 5:
        performance_level = "Average"
        recommendation = "Consider"

    else:
        performance_level = "Weak"
        recommendation = "Not Recommended"

    return {
        "interview_id": interview_id,
        "candidate_id": interview.candidate_id,
        "job_id": interview.job_id,
        "overall_score": overall_score,
        "performance_level": performance_level,
        "recommendation": recommendation
    }