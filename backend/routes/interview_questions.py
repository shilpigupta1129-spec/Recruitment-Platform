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
    expected_answer: str = ""

class QuestionUpdate(BaseModel):
    question: str | None = None
    question_type: str | None = None
    difficulty: str | None = None
    expected_answer: str | None = None

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
        difficulty=data.difficulty,
        expected_answer=data.expected_answer
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
        "difficulty": new_question.difficulty,
        "expected_answer": new_question.expected_answer
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
            "difficulty": q.difficulty,
            "expected_answer": q.expected_answer
        }
        for q in questions
    ]

@router.put("/{interview_id}/questions/{question_id}")
def update_question(
    interview_id: int,
    question_id: int,
    data: QuestionUpdate,
    db: Session = Depends(get_db)
):
    question = db.query(InterviewQuestion).filter(
        InterviewQuestion.id == question_id,
        InterviewQuestion.interview_id == interview_id
    ).first()

    if not question:
        raise HTTPException(
            status_code=404,
            detail="Question not found"
        )

    if data.question is not None:
        question.question = data.question

    if data.question_type is not None:
        question.question_type = data.question_type

    if data.difficulty is not None:
        question.difficulty = data.difficulty

    if data.expected_answer is not None:
        question.expected_answer = data.expected_answer

    db.commit()
    db.refresh(question)

    return {
        "message": "Question updated successfully",
        "question_id": question.id,
        "interview_id": question.interview_id,
        "question": question.question,
        "question_type": question.question_type,
        "difficulty": question.difficulty,
        "expected_answer": question.expected_answer
    }

@router.delete("/{interview_id}/questions/{question_id}/expected-answer")
def delete_expected_answer(
    interview_id: int,
    question_id: int,
    db: Session = Depends(get_db)
):
    
    question = db.query(InterviewQuestion).filter(
        InterviewQuestion.id == question_id,
        InterviewQuestion.interview_id == interview_id
    ).first()

    if not question:
        raise HTTPException(
            status_code=404,
            detail="Question not found"
        )
    
    question.expected_answer = None

    db.commit()
    db.refresh(question)

    return {
        "message": "Expected answer deleted successfully",
        "question_id": question.id,
        "expected_answer": question.expected_answer
    }

@router.delete("/{interview_id}/questions/{question_id}")
def delete_question(
    interview_id: int,
    question_id: int,
    db: Session = Depends(get_db)
):
    question = db.query(InterviewQuestion).filter(
        InterviewQuestion.id == question_id,
        InterviewQuestion.interview_id == interview_id
    ).first()
    
    if not question:
        raise HTTPException(
            status_code=404,
            detail="Question not found"
        )

    db.delete(question)
    db.commit()

    return {
        "message": "Question deleted successfully",
        "question_id": question_id
    }
