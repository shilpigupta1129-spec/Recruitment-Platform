import os

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from openai import OpenAI

from backend.database import get_db
from backend.models.interview_answer import InterviewAnswer
from backend.models.interview_question import InterviewQuestion


router = APIRouter(
    prefix="/ai",
    tags=["AI Analysis"]
)


client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)


@router.post("/analyze-answer")
def analyze_answer(
    answer_id: int,
    db: Session = Depends(get_db)
):
    answer = db.query(InterviewAnswer).filter(
        InterviewAnswer.id == answer_id
    ).first()

    if not answer:
        raise HTTPException(
            status_code=404,
            detail="Answer not found"
        )

    question = db.query(InterviewQuestion).filter(
        InterviewQuestion.id == answer.question_id
    ).first()

    if not question:
        raise HTTPException(
            status_code=404,
            detail="Question not found"
        )

    prompt = f"""
Evaluate the candidate's answer to the interview question.

Question:
{question.question}

Candidate Answer:
{answer.answer}

Give:
1. A score from 0 to 10
2. Short, question-specific feedback

Be technically accurate and evaluate only the candidate's answer
in relation to the given question.
"""

    try:
        if not os.getenv("OPENAI_API_KEY"):
            raise Exception("API key missing")

        response = client.responses.create(
            model="gpt-5-mini",
            input=prompt
        )

        analysis = response.output_text

        answer.score = 8
        answer.feedback = analysis

        db.commit()
        db.refresh(answer)

        return {
            "answer_id": answer.id,
            "question_id": answer.question_id,
            "score": answer.score,
            "feedback": answer.feedback,
            "source": "OpenAI AI"
        }

    except Exception:
        # Question-aware fallback evaluation
        question_text = question.question.lower()
        answer_text = answer.answer.lower()

        if (
            "dictionary" in question_text
            and "list" in question_text
        ):
            if (
                "key-value" in answer_text
                and "index" in answer_text
            ):
                score = 9
                feedback = (
                    "The answer correctly distinguishes a dictionary "
                    "from a list by explaining key-value pairs and "
                    "index-based access."
                )
            else:
                score = 6
                feedback = (
                    "The answer shows some understanding but does not "
                    "clearly explain the main differences between a "
                    "dictionary and a list."
                )

        elif (
            "list" in question_text
            and "tuple" in question_text
        ):
            if (
                "mutable" in answer_text
                and "immutable" in answer_text
            ):
                score = 9
                feedback = (
                    "The answer correctly explains that lists are "
                    "mutable while tuples are immutable."
                )
            else:
                score = 6
                feedback = (
                    "The answer partially addresses the difference "
                    "between lists and tuples but needs more detail."
                )

        else:
            score = 7
            feedback = (
                "The answer is relevant to the interview question "
                "but could provide more technical detail."
            )

        answer.score = score
        answer.feedback = feedback

        db.commit()
        db.refresh(answer)

        return {
            "answer_id": answer.id,
            "question_id": answer.question_id,
            "score": answer.score,
            "feedback": answer.feedback,
            "source": "Fallback Evaluation"
        }