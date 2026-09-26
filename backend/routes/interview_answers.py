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
        "answer": new_answer.answer,
        "score": new_answer.score,
        "feedback": new_answer.feedback
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
            "answer": answer.answer,
             "score": answer.score,
             "feedback": answer.feedback
        }
        for answer in answers
    ]
@router.delete("/{interview_id}/answers/{answer_id}")
def delete_answer(
    interview_id: int,
    answer_id: int,
    db: Session = Depends(get_db)
):
    answer = db.query(InterviewAnswer).filter(
        InterviewAnswer.id == answer_id,
        InterviewAnswer.interview_id == interview_id
    ).first()

    if not answer:
        raise HTTPException(
            status_code=404,
            detail="Answer not found"
        )

    db.delete(answer)
    db.commit()

    return {
        "message": "Answer deleted successfully",
        "answer_id": answer_id
    }

@router.post("/{interview_id}/reset")
def reset_interview(
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

    deleted_count = db.query(InterviewAnswer).filter(
        InterviewAnswer.interview_id == interview_id
    ).delete(synchronize_session=False)

    db.commit()

    return {
        "message": "Interview reset successfully",
        "interview_id": interview_id,
        "deleted_answers": deleted_count
    }

@router.put("/{interview_id}/answers/{answer_id}/evaluation")
def update_answer_evaluation(
    interview_id: int,
    answer_id: int,
    score: int,
    feedback: str,
    db: Session = Depends(get_db)
):
    answer = db.query(InterviewAnswer).filter(
        InterviewAnswer.id == answer_id,
        InterviewAnswer.interview_id == interview_id
    ).first()

    if not answer:
        raise HTTPException(
            status_code=404,
            detail="Answer not found"
        )

    answer.score = score
    answer.feedback = feedback

    db.commit()
    db.refresh(answer)

    return {
        "message": "Answer evaluation saved successfully",
        "answer_id": answer.id,
        "score": answer.score,
        "feedback": answer.feedback
    }
@router.get("/{interview_id}/scorecard")
def get_interview_scorecard(
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
        return {
            "interview_id": interview_id,
            "candidate_id": interview.candidate_id,
            "job_id": interview.job_id,
            "total_questions": 0,
            "overall_score": 0,
            "answers": []
        }

    evaluated_answers = [
        answer for answer in answers
        if answer.score is not None
    ]

    if evaluated_answers:
        overall_score = round(
            sum(answer.score for answer in evaluated_answers)
            / len(evaluated_answers),
            1
        )
    else:
        overall_score = 0

    return {
        "interview_id": interview_id,
        "candidate_id": interview.candidate_id,
        "job_id": interview.job_id,
        "total_questions": len(answers),
        "evaluated_questions": len(evaluated_answers),
        "overall_score": overall_score,
        "answers": [
            {
                "answer_id": answer.id,
                "question_id": answer.question_id,
                "answer": answer.answer,
                "score": answer.score,
                "feedback": answer.feedback
            }
            for answer in answers
        ]
    }