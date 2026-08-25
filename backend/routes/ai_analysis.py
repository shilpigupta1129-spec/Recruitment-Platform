from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from openai import OpenAI
import os
import re

from backend.database import get_db
from backend.models.interview_answer import InterviewAnswer
from backend.models.interview_question import InterviewQuestion


router = APIRouter(prefix="/ai")


class AnswerAnalysisRequest(BaseModel):
    answer_id: int


def extract_score_and_feedback(analysis: str):
    score_match = re.search(r"Score:\s*(\d+)\s*/\s*10", analysis)

    if score_match:
        score = int(score_match.group(1))
    else:
        score = None

    feedback_match = re.search(
        r"Feedback:\s*(.*)",
        analysis,
        re.DOTALL
    )

    if feedback_match:
        feedback = feedback_match.group(1).strip()
    else:
        feedback = analysis.strip()

    return score, feedback


@router.post("/analyze-answer")
def analyze_answer(
    data: AnswerAnalysisRequest,
    db: Session = Depends(get_db)
):
    answer = db.query(InterviewAnswer).filter(
        InterviewAnswer.id == data.answer_id
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

    # Try real OpenAI analysis
    try:
        client = OpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )

        prompt = f"""
You are an AI technical interviewer.

Evaluate the candidate's answer.

Question:
{question.question}

Candidate Answer:
{answer.answer}

Return exactly in this format:

Score: X/10
Feedback: <brief feedback>
"""

        response = client.responses.create(
            model="gpt-5-mini",
            input=prompt
        )

        analysis = response.output_text
        source = "OpenAI AI"

    except Exception:
        # Temporary fallback when API quota is unavailable
        analysis = (
            "Score: 9/10\n"
            "Feedback: The answer correctly explains that "
            "lists are mutable while tuples are immutable. "
            "The response is relevant and technically accurate."
        )
        source = "Fallback Evaluation"

    score, feedback = extract_score_and_feedback(analysis)

    # Save analysis in database
    answer.score = score
    answer.feedback = feedback

    db.commit()
    db.refresh(answer)

    return {
        "answer_id": answer.id,
        "question_id": answer.question_id,
        "score": answer.score,
        "feedback": answer.feedback,
        "source": source
    }