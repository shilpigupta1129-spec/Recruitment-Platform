from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.interview import Interview
from backend.models.interview_question import InterviewQuestion
from backend.models.interview_answer import InterviewAnswer

router = APIRouter(
    prefix="/recruiter",
    tags=["Recruiter Assessment"]
)


@router.get("/assessment/{interview_id}")
def get_recruiter_assessment(
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

    questions = db.query(InterviewQuestion).filter(
        InterviewQuestion.interview_id == interview_id
    ).all()

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

    answer_details = []

    for answer in scored_answers:
        question = next(
            (
                q for q in questions
                if q.id == answer.question_id
            ),
            None
        )

        answer_details.append({
            "question_id": answer.question_id,
            "question": question.question if question else "Unknown",
            "answer": answer.answer,
            "score": answer.score,
            "feedback": answer.feedback
        })

    return {
        "interview_id": interview.id,
        "candidate_id": interview.candidate_id,
        "job_id": interview.job_id,
        "total_questions": len(questions),
        "evaluated_questions": len(scored_answers),
        "overall_score": overall_score,
        "performance_level": performance_level,
        "recommendation": recommendation,
        "answers": answer_details
    }