from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.interview import Interview
from backend.models.interview_answer import InterviewAnswer

router = APIRouter(prefix="/scorecard", tags=["Scorecard"])


@router.get("/{interview_id}")
def get_scorecard(
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
        InterviewAnswer.interview_id == interview_id
    ).all()

    if not answers:
        raise HTTPException(
            status_code=404,
            detail="No answers found for this interview"
        )

    scored_answers = [
        answer for answer in answers
        if answer.score is not None
    ]

    if not scored_answers:
        raise HTTPException(
            status_code=404,
            detail="No evaluated answers found"
        )

    total_score = sum(
        answer.score for answer in scored_answers
    )

    overall_score = round(
        total_score / len(scored_answers),
        2
    )

    strengths = []
    weaknesses = []
    feedback_list = []

    for answer in scored_answers:

        if answer.feedback:
            feedback_list.append(answer.feedback)

        if answer.score >= 8:
            strengths.append(
                f"Question {answer.question_id}: "
                "Strong and accurate response"
            )

        elif answer.score >= 5:
            strengths.append(
                f"Question {answer.question_id}: "
                "Acceptable response"
            )

        else:
            weaknesses.append(
                f"Question {answer.question_id}: "
                "Needs improvement"
            )

    if overall_score >= 8:
        overall_feedback = (
            "The candidate demonstrated strong technical "
            "understanding and provided accurate responses."
        )
    elif overall_score >= 5:
        overall_feedback = (
            "The candidate demonstrated a satisfactory level "
            "of technical understanding but has areas for improvement."
        )
    else:
        overall_feedback = (
            "The candidate needs significant improvement "
            "in technical understanding."
        )

    return {
        "interview_id": interview_id,
        "candidate_id": interview.candidate_id,
        "job_id": interview.job_id,
        "total_questions": len(answers),
        "evaluated_questions": len(scored_answers),
        "overall_score": overall_score,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "feedback": feedback_list,
        "overall_feedback": overall_feedback
    }