from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.database import get_db
from backend.models.interview import Interview
from backend.models.interview_question import InterviewQuestion
from backend.models.interview_answer import InterviewAnswer


router = APIRouter(prefix="/interviews")


class AnswerCreate(BaseModel):
    question_id: int
    answer: str


@router.post("/{interview_id}/answers")
def submit_answer(
    interview_id: int,
    data: AnswerCreate,
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

    question = db.query(InterviewQuestion).filter(
        InterviewQuestion.id == data.question_id,
        InterviewQuestion.interview_id == interview_id
    ).first()

    if not question:
        raise HTTPException(
            status_code=404,
            detail="Question not found for this interview"
        )

    existing_answer = db.query(InterviewAnswer).filter(
        InterviewAnswer.interview_id == interview_id,
        InterviewAnswer.question_id == data.question_id
    ).first()

    if existing_answer:
        raise HTTPException(
            status_code=400,
            detail="Answer already submitted for this question"
        )

    new_answer = InterviewAnswer(
        interview_id=interview_id,
        question_id=data.question_id,
        answer=data.answer
    )

    db.add(new_answer)
    db.commit()
    db.refresh(new_answer)

    return {
        "message": "Answer submitted successfully",
        "answer_id": new_answer.id,
        "interview_id": new_answer.interview_id,
        "question_id": new_answer.question_id,
        "answer": new_answer.answer
    }


@router.get("/{interview_id}/answers")
def get_answers(
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

    return [
        {
            "answer_id": answer.id,
            "interview_id": answer.interview_id,
            "question_id": answer.question_id,
            "answer": answer.answer
        }
        for answer in answers
    ]