from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.database import get_db
from backend.models.interview import Interview
from backend.models.interview_question import InterviewQuestion


router = APIRouter(prefix="/interviews")


class QuestionCreate(BaseModel):
    question: str
    question_type: str = "technical"
    difficulty: str = "medium"


@router.post("/{interview_id}/questions")
def create_question(
    interview_id: int,
    data: QuestionCreate,
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

    new_question = InterviewQuestion(
        interview_id=interview_id,
        question=data.question,
        question_type=data.question_type,
        difficulty=data.difficulty
    )

    db.add(new_question)
    db.commit()
    db.refresh(new_question)

    return {
        "message": "Question created successfully",
        "question_id": new_question.id,
        "interview_id": new_question.interview_id,
        "question": new_question.question,
        "question_type": new_question.question_type,
        "difficulty": new_question.difficulty
    }


@router.get("/{interview_id}/questions")
def get_questions(
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

    return [
        {
            "question_id": q.id,
            "interview_id": q.interview_id,
            "question": q.question,
            "question_type": q.question_type,
            "difficulty": q.difficulty
        }
        for q in questions
    ]