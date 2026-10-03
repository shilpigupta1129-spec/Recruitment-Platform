import { useEffect, useRef, useState } from "react";

function Interview() {
  // =========================
  // STAGE 1 STATES
  // =========================
  const [started, setStarted] = useState(false);
  const [customQuestion, setCustomQuestion] = useState("");
  const [expectedAnswer, setExpectedAnswer] = useState("");
  const [customQuestions, setCustomQuestions] = useState([]);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [videoQuestions, setVideoQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [savedEvaluation, setSavedEvaluation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiResult, setAiResult] = useState(null);

  // =========================
  // STAGE 2 STATES
  // =========================
  const [videoEvaluations, setVideoEvaluations] = useState([]);
  const videoEvaluationsRef = useRef([]);
  const videoQuestionsRef = useRef([]);

  const [finalScorecard, setFinalScorecard] = useState(null);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const [videoInterviewCompleted, setVideoInterviewCompleted] =
    useState(false);

  const [transcript, setTranscript] = useState("");
  const [aiSpeaking, setAiSpeaking] = useState(false);

  const [videoQuestion, setVideoQuestion] = useState(
    "Please introduce yourself and tell me about your technical background."
  );
  const [videoQuestionId, setVideoQuestionId] = useState(null);
  const [videoQuestionIndex, setVideoQuestionIndex] = useState(0);

  // =========================
  // VIDEO / SPEECH REFS
  // =========================
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);

  // Existing interview ID
  const interviewId = 2;

  // =========================
  // STOP CAMERA
  // =========================
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // =========================
  // START VIDEO INTERVIEW
  // =========================
  const startVideoInterview = async () => {
    setAiResult(null);
    setTranscript("");
    setError("");

    stopCamera();

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/interviews/${interviewId}/questions`
      );

      if (!response.ok) {
        throw new Error("Unable to load video interview questions.");
      }

      const questionList = await response.json();

      if (!Array.isArray(questionList) || questionList.length === 0) {
        throw new Error("No video interview questions found.");
      }

      // Save database questions for Stage 2
      setVideoQuestions(questionList);
      videoQuestionsRef.current = questionList;

      // Stage 2 starts with Introduction - Question ID 7
      const introductionQuestion = questionList.find(
        (item) => item.question_id === 7
      );

      if (!introductionQuestion) {
        throw new Error("Introduction question not found.");
      }

      setVideoQuestion(introductionQuestion.question);
      setVideoQuestionId(introductionQuestion.question_id);
      setVideoQuestionIndex(0);

      // Start camera and microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // AI asks Introduction question
      speakQuestion(
        introductionQuestion.question,
        true,
        introductionQuestion.question_id
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Camera and microphone permission is required."
      );
    }
  };

  // =========================
  // SPEAK AI QUESTION
  // =========================
  const speakQuestion = (
    text,
    startListeningAfter = false,
    questionId = null
  ) => {
    if (!("speechSynthesis" in window)) {
      setError("Speech synthesis is not supported in this browser.");
      return;
    }

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(text);

    speech.rate = 0.9;
    speech.pitch = 1;

    setAiSpeaking(true);

    speech.onend = () => {
      setAiSpeaking(false);

      if (startListeningAfter) {
        setTimeout(() => {
          startSpeechRecognition(text, questionId);
        }, 500);
      }
    };

    speech.onerror = () => {
      setAiSpeaking(false);
    };

    window.speechSynthesis.speak(speech);
  };

  // =========================
  // START SPEECH RECOGNITION
  // =========================
  const startSpeechRecognition = (
    questionText = videoQuestion,
    questionId = null
  ) => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    if (recognitionRef.current) {
      return;
    }

    setError("");
    setTranscript("");

    const recognition = new SpeechRecognition();

    recognitionRef.current = recognition;

    recognition.lang = "en-US";

    // IMPORTANT:
    // Continuous mode keeps listening even if candidate pauses.
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = "";
    let silenceTimer = null;
    let processed = false;

    const SILENCE_TIME = 6000; // 6 seconds

    const resetSilenceTimer = () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }

      silenceTimer = setTimeout(() => {
        console.log(
          "6 seconds silence detected. Stopping recognition..."
        );
        recognition.stop();
      }, SILENCE_TIME);
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        const text = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += text + " ";
        } else {
          interimTranscript += text;
        }
      }

      const displayTranscript =
        finalTranscript + interimTranscript;

      setTranscript(displayTranscript.trim());

      console.log(
        "Candidate Answer:",
        displayTranscript
      );

      // Every time candidate speaks,
      // restart the 6-second silence timer.
      resetSilenceTimer();
    };

    recognition.onerror = (event) => {
      console.log(
        "Speech recognition error:",
        event.error
      );

      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }

      recognitionRef.current = null;

      if (event.error !== "aborted") {
        setError(
          "Unable to capture your voice. Please try again."
        );
      }
    };

    recognition.onend = async () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }

      recognitionRef.current = null;

      // Prevent duplicate processing
      if (processed) {
        return;
      }

      const finalAnswer = finalTranscript.trim();

      if (!finalAnswer) {
        return;
      }

      processed = true;

      try {
        setLoading(true);
        setError("");

        // -----------------------------
        // AI ANSWER EVALUATION
        // -----------------------------

        const response = await fetch(
          "http://127.0.0.1:8000/ai/analyze-video-answer?question=" +
            encodeURIComponent(questionText) +
            "&answer=" +
            encodeURIComponent(finalAnswer),
          {
            method: "POST",
          }
        );

        if (!response.ok) {
          throw new Error("AI evaluation failed.");
        }

        const data = await response.json();

        setAiResult(data);

        const newEvaluation = {
          question: questionText,
          answer: finalAnswer,
          score:
            typeof data.score === "number"
              ? data.score
              : 0,
          feedback:
            typeof data.feedback === "string"
              ? data.feedback
              : "",
        };

        // Save video interview answer to database
        if (questionId) {
          let answerId = null;

          // Try to save the answer
          const saveAnswerResponse = await fetch(
            `http://127.0.0.1:8000/interviews/${interviewId}/answers`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                question_id: questionId,
                answer: finalAnswer,
              }),
            }
          );

          if (saveAnswerResponse.ok) {
            const savedAnswerData =
              await saveAnswerResponse.json();

            answerId = savedAnswerData.answer_id;
          } else if (saveAnswerResponse.status === 400) {
            // Answer already exists — use the existing answer
            const answersResponse = await fetch(
              `http://127.0.0.1:8000/interviews/${interviewId}/answers`
            );

            if (answersResponse.ok) {
              const answers =
                await answersResponse.json();

              const existingAnswer = answers.find(
                (item) =>
                  item.question_id === questionId
              );

              if (existingAnswer) {
                answerId = existingAnswer.answer_id;
              }
            }

            console.log(
              "Answer already exists. Using existing answer:",
              answerId
            );
          } else {
            const errorData =
              await saveAnswerResponse.text();

            console.error(
              "Unable to save video interview answer:",
              errorData
            );
          }

          // Save AI score and feedback
          if (
            answerId &&
            data.score !== undefined
          ) {
            const evaluationResponse = await fetch(
              `http://127.0.0.1:8000/interviews/${interviewId}/answers/${answerId}/evaluation?score=${encodeURIComponent(
                data.score
              )}&feedback=${encodeURIComponent(
                data.feedback || ""
              )}`,
              {
                method: "PUT",
              }
            );

            if (!evaluationResponse.ok) {
              const evaluationError =
                await evaluationResponse.text();

              console.error(
                "Unable to save evaluation:",
                evaluationError
              );
            }
          }
        }

        const updatedEvaluations = [
          ...videoEvaluationsRef.current,
          newEvaluation,
        ];

        videoEvaluationsRef.current =
          updatedEvaluations;

        setVideoEvaluations(updatedEvaluations);

        // -----------------------------
        // GENERATE NEXT QUESTION
        // -----------------------------

        const nextQuestionResponse = await fetch(
          "http://127.0.0.1:8000/ai/generate-next-question?answer=" +
            encodeURIComponent(finalAnswer) +
            "&current_question=" +
            encodeURIComponent(questionText),
          {
            method: "POST",
          }
        );

        if (!nextQuestionResponse.ok) {
          throw new Error(
            "Unable to generate next question."
          );
        }

        const nextQuestionData =
          await nextQuestionResponse.json();

        // -----------------------------
        // INTERVIEW COMPLETED
        // -----------------------------

        if (nextQuestionData.interview_completed) {
          try {
            const scorecardResponse = await fetch(
              "http://127.0.0.1:8000/ai/generate-final-scorecard?evaluations=" +
                encodeURIComponent(
                  JSON.stringify(
                    updatedEvaluations.map(
                      (item) => ({
                        question:
                          typeof item.question ===
                          "string"
                            ? item.question
                            : "",
                        answer:
                          typeof item.answer ===
                          "string"
                            ? item.answer
                            : "",
                        score:
                          typeof item.score ===
                          "number"
                            ? item.score
                            : 0,
                        feedback:
                          typeof item.feedback ===
                          "string"
                            ? item.feedback
                            : "",
                      })
                    )
                  )
                ),
              {
                method: "POST",
              }
            );

            if (!scorecardResponse.ok) {
              throw new Error(
                "Unable to generate final scorecard."
              );
            }

            const scorecardData =
  await scorecardResponse.json();

/*
  Get the real candidate_id from the backend interview.
  We do NOT hardcode candidate_id because interview IDs
  and candidate IDs can change.
*/
let actualCandidateId = null;

try {
  const interviewInfoResponse = await fetch(
    `http://127.0.0.1:8000/interviews/${interviewId}/scorecard`
  );

  if (interviewInfoResponse.ok) {
    const interviewInfo =
      await interviewInfoResponse.json();

    actualCandidateId =
      interviewInfo?.candidate_id ?? null;
  }
} catch (candidateIdError) {
  console.error(
    "Unable to get interview candidate ID:",
    candidateIdError
  );
}

const scorecardToSave = {
  ...scorecardData,
  candidate_id: actualCandidateId,
  interview_id: interviewId,
};

/*
  Save using the actual candidate ID.
  This prevents one candidate's scorecard from
  appearing in another candidate's profile.
*/
if (actualCandidateId !== null) {
  localStorage.setItem(
    `latestInterviewScorecard_${actualCandidateId}`,
    JSON.stringify(scorecardToSave)
  );
}

/*
  Keep the legacy key too, but with the real candidate ID.
  App.jsx will only use this if the candidate ID matches.
*/
localStorage.setItem(
  "latestInterviewScorecard",
  JSON.stringify(scorecardToSave)
);

setFinalScorecard(scorecardData);
          } catch (scorecardError) {
            console.error(
              "Scorecard error:",
              scorecardError
            );

            setError(
              "Interview completed, but final scorecard could not be generated."
            );
          }

          setVideoInterviewCompleted(true);
          return;
        }

        // -----------------------------
        // NEXT QUESTION
        // -----------------------------

        if (nextQuestionData.next_question) {
          const nextQuestion =
            nextQuestionData.next_question;

          // Find matching question in database
          const matchingQuestion =
            videoQuestionsRef.current.find((item) => {
              const dbQuestion =
                item.question.toLowerCase().trim();

              const nextQuestionText =
                nextQuestion.toLowerCase().trim();

              return (
                dbQuestion === nextQuestionText ||
                (dbQuestion.includes("list") &&
                  dbQuestion.includes("tuple") &&
                  nextQuestionText.includes("list") &&
                  nextQuestionText.includes("tuple")) ||
                (dbQuestion.includes("fastapi") &&
                  nextQuestionText.includes("fastapi")) ||
                (dbQuestion.includes("primary key") &&
                  dbQuestion.includes("foreign key") &&
                  nextQuestionText.includes("primary key") &&
                  nextQuestionText.includes("foreign key")) ||
                (dbQuestion.includes("let") &&
                  dbQuestion.includes("const") &&
                  dbQuestion.includes("var") &&
                  nextQuestionText.includes("let") &&
                  nextQuestionText.includes("const") &&
                  nextQuestionText.includes("var")) ||
                (dbQuestion.includes("technical project") &&
                  nextQuestionText.includes("technical project")) ||
                (dbQuestion.includes("introduce yourself") &&
                  nextQuestionText.includes("introduce yourself"))
              );
            });

          console.log(
            "NEXT QUESTION FROM BACKEND:",
            nextQuestion
          );

          console.log(
            "QUESTIONS LOADED IN FRONTEND:",
            videoQuestions
          );

          console.log(
            "MATCHING QUESTION:",
            matchingQuestion
          );

          if (!matchingQuestion) {
            throw new Error(
              "Next interview question was not found in the database."
            );
          }

          setVideoQuestion(nextQuestion);

          setVideoQuestionId(
            matchingQuestion.question_id
          );

          setVideoQuestionIndex(
            (previousIndex) =>
              previousIndex + 1
          );

          setTranscript("");
          setAiResult(null);

          speakQuestion(
            nextQuestion,
            true,
            matchingQuestion.question_id
          );
        }
      } catch (err) {
        console.error(err);

        setError(
          "Unable to evaluate your answer."
        );
      } finally {
        setLoading(false);
      }
    };

    recognition.start();

    // Start initial silence timer
    resetSilenceTimer();
  };

  // =========================
  // START STAGE 2
  // =========================
  useEffect(() => {
    if (interviewCompleted) {
      const timer = setTimeout(async () => {
        await startVideoInterview();
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [interviewCompleted]);

  // =========================
  // STOP CAMERA AFTER INTERVIEW
  // =========================
  useEffect(() => {
    if (videoInterviewCompleted) {
      stopCamera();

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    }
  }, [videoInterviewCompleted]);

  // =========================
  // CLEANUP
  // =========================
  useEffect(() => {
    return () => {
      stopCamera();

      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

    // =========================
  // LOAD SAVED CUSTOM QUESTIONS
  // =========================
  useEffect(() => {
    const loadCustomQuestions = async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/interviews/${interviewId}/questions`
        );

        if (!response.ok) {
          throw new Error("Unable to load saved questions.");
        }

        const data = await response.json();

        setCustomQuestions(data);
      } catch (err) {
        setError(err.message);
      }
    };

    if (interviewId) {
      loadCustomQuestions();
    }
  }, [interviewId]);

  const deleteExpectedAnswer = async (questionId) => {
  try {
    const response = await fetch(
      `http://127.0.0.1:8000/interviews/${interviewId}/questions/${questionId}/expected-answer`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      throw new Error("Unable to delete expected answer.");
    }

    setCustomQuestions((prev) =>
      prev.map((item) =>
        item.question_id === questionId
          ? { ...item, expected_answer: null }
          : item
      )
    );

    if (editingQuestionId === questionId) {
      setExpectedAnswer("");
    }
  } catch (err) {
    setError(err.message);
  }
};

const deleteQuestion = async (questionId) => {
  try {
    const response = await fetch(
      `http://127.0.0.1:8000/interviews/${interviewId}/questions/${questionId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      throw new Error("Unable to delete question.");
    }

    setCustomQuestions((prev) =>
      prev.filter((item) => item.question_id !== questionId)
    );

    if (editingQuestionId === questionId) {
      setEditingQuestionId(null);
      setCustomQuestion("");
      setExpectedAnswer("");
    }
  } catch (err) {
    setError(err.message);
  }
};

  // ============================================================
  // STAGE 1 - START INTERVIEW
  // ============================================================
  const addCustomQuestion = async () => {
  if (!customQuestion.trim()) {
    return;
  }

  if (!expectedAnswer.trim()) {
    return;
  }

  try {
    // UPDATE EXISTING QUESTION
    if (editingQuestionId) {
      const response = await fetch(
        `http://127.0.0.1:8000/interviews/${interviewId}/questions/${editingQuestionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: customQuestion.trim(),
            expected_answer: expectedAnswer.trim(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Unable to update question.");
      }

      const data = await response.json();

      setCustomQuestions((prev) =>
        prev.map((item) =>
          item.question_id === editingQuestionId
            ? data
            : item
        )
      );

      setEditingQuestionId(null);
      setCustomQuestion("");
      setExpectedAnswer("");

      return;
    }

    // ADD NEW QUESTION
    const response = await fetch(
      `http://127.0.0.1:8000/interviews/${interviewId}/questions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: customQuestion.trim(),
          expected_answer: expectedAnswer.trim(),
          question_type: "technical",
          difficulty: "medium",
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Unable to add custom question.");
    }

    const data = await response.json();

    setCustomQuestions((prev) => [...prev, data]);
    setCustomQuestion("");
    setExpectedAnswer("");
  } catch (err) {
    setError(err.message);
  }
};
  const startInterview = async () => {
    try {
      await fetch(
        `http://127.0.0.1:8000/interviews/${interviewId}/reset`,
        {
          method: "POST",
        }
      );

      setLoading(true);
      setError("");

      const response = await fetch(
        "http://127.0.0.1:8000/interviews/" +
          interviewId +
          "/questions"
      );

      if (!response.ok) {
        throw new Error(
          "Unable to load interview questions."
        );
      }

      const data = await response.json();

      const allQuestions = Array.isArray(data)
        ? data
        : [data];

      const questionList = allQuestions.filter(
        (item) =>
          item.question_type === "technical" &&
          item.question_id !== 7
      );

      if (questionList.length === 0) {
        throw new Error(
          "No interview questions found."
        );
      }

      setQuestions(questionList);
      setCurrentQuestionIndex(0);
      setAnswer("");
      setSubmitted(false);
      setSavedEvaluation(false);
      setAiResult(null);

      setStarted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // STAGE 1 - SUBMIT ANSWER
  // ============================================================
  const submitAnswer = async () => {
    if (!answer.trim()) {
      alert("Please enter your answer first.");
      return;
    }

    const currentQuestion =
      questions[currentQuestionIndex];

    if (!currentQuestion) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      // ==========================================
      // SAVE ANSWER
      // ==========================================
      const response = await fetch(
        "http://127.0.0.1:8000/interviews/" +
          interviewId +
          "/answers",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question_id:
              currentQuestion.question_id,
            answer: answer,
          }),
        }
      );

      if (!response.ok) {
        const errorData =
          await response.text();

        throw new Error(
          errorData ||
            "Unable to submit answer."
        );
      }

      const answerData =
        await response.json();

      const answerId =
        answerData.answer_id;

      // ==========================================
      // AI EVALUATION
      // ==========================================
      const aiResponse = await fetch(
        "http://127.0.0.1:8000/ai/analyze-answer?answer_id=" +
          answerId,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            question:
              currentQuestion.question,
            answer: answer,
          }),
        }
      );

      if (!aiResponse.ok) {
        console.log(
          "AI evaluation failed"
        );
      } else {
        const aiData =
          await aiResponse.json();

        console.log(
          "AI Evaluation:",
          aiData
        );

        setAiResult(aiData);

        console.log(
          "AI Score:",
          aiData.score,
          "Feedback:",
          aiData.feedback,
          "Source:",
          aiData.source
        );
      }

      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // STAGE 1 - NEXT QUESTION
  // ============================================================
  const nextQuestion = () => {
    if (
      currentQuestionIndex <
      questions.length - 1
    ) {
      setCurrentQuestionIndex(
        (previousIndex) =>
          previousIndex + 1
      );

      setAnswer("");
      setSubmitted(false);
      setSavedEvaluation(false);
      setAiResult(null);
      setError("");
    }
  };

  const currentQuestion =
    questions[currentQuestionIndex];

  // ============================================================
  // FINAL SCORECARD SCREEN
  // ============================================================
  if (finalScorecard) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #0f172a 0%, #111827 50%, #172033 100%)",
          padding: "24px",
          fontFamily: "Arial, sans-serif",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            background: "#111827",
            padding: "32px",
            borderRadius: "22px",
            border: "1px solid #334155",
            boxShadow:
              "0 20px 50px rgba(0,0,0,0.35)",
            boxSizing: "border-box",
          }}
        >
          {/* HEADER */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "58px",
                height: "58px",
                borderRadius: "16px",
                background:
                  "linear-gradient(135deg, #2563eb, #7c3aed)",
                fontSize: "28px",
                marginBottom: "14px",
                boxShadow:
                  "0 8px 25px rgba(37,99,235,0.3)",
              }}
            >
              📊
            </div>

            <h1
              style={{
                margin: 0,
                color: "#f8fafc",
                fontSize: "30px",
                fontWeight: "700",
              }}
            >
              Final AI Interview Scorecard
            </h1>

            <p
              style={{
                marginTop: "10px",
                marginBottom: 0,
                color: "#94a3b8",
                fontSize: "15px",
              }}
            >
              Your AI video interview has been
              completed successfully.
            </p>
          </div>

          {/* SCORE DETAILS */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
              marginTop: "20px",
            }}
          >
            {/* TECHNICAL KNOWLEDGE */}
            <div
              style={{
                padding: "20px",
                background: "#172033",
                border: "1px solid #334155",
                borderRadius: "14px",
              }}
            >
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "13px",
                  marginBottom: "8px",
                }}
              >
                Technical Knowledge
              </div>

              <div
                style={{
                  color: "#60a5fa",
                  fontSize: "26px",
                  fontWeight: "700",
                }}
              >
                {
                  finalScorecard.technical_knowledge
                }
                /10
              </div>
            </div>

            {/* COMMUNICATION */}
            <div
              style={{
                padding: "20px",
                background: "#172033",
                border: "1px solid #334155",
                borderRadius: "14px",
              }}
            >
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "13px",
                  marginBottom: "8px",
                }}
              >
                Communication
              </div>

              <div
                style={{
                  color: "#60a5fa",
                  fontSize: "26px",
                  fontWeight: "700",
                }}
              >
                {finalScorecard.communication}
                /10
              </div>
            </div>

            {/* ANSWER RELEVANCE */}
            <div
              style={{
                padding: "20px",
                background: "#172033",
                border: "1px solid #334155",
                borderRadius: "14px",
              }}
            >
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "13px",
                  marginBottom: "8px",
                }}
              >
                Answer Relevance
              </div>

              <div
                style={{
                  color: "#60a5fa",
                  fontSize: "26px",
                  fontWeight: "700",
                }}
              >
                {
                  finalScorecard.answer_relevance
                }
                /10
              </div>
            </div>

            {/* PROBLEM SOLVING */}
            <div
              style={{
                padding: "20px",
                background: "#172033",
                border: "1px solid #334155",
                borderRadius: "14px",
              }}
            >
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "13px",
                  marginBottom: "8px",
                }}
              >
                Problem Solving
              </div>

              <div
                style={{
                  color: "#60a5fa",
                  fontSize: "26px",
                  fontWeight: "700",
                }}
              >
                {
                  finalScorecard.problem_solving
                }
                /10
              </div>
            </div>
          </div>

          {/* OVERALL SCORE */}
          <div
            style={{
              marginTop: "24px",
              padding: "28px",
              background:
                "linear-gradient(135deg, #132e24, #163b2b)",
              border:
                "1px solid rgba(74,222,128,0.35)",
              borderRadius: "16px",
              textAlign: "center",
              boxShadow:
                "0 10px 30px rgba(34,197,94,0.08)",
            }}
          >
            <div
              style={{
                color: "#86efac",
                fontSize: "13px",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "8px",
              }}
            >
              Overall Interview Score
            </div>

            <div
              style={{
                color: "#4ade80",
                fontSize: "38px",
                fontWeight: "800",
              }}
            >
              {finalScorecard.overall_score}/10
            </div>
          </div>

          {/* AI FEEDBACK */}
          <div
            style={{
              marginTop: "24px",
              padding: "22px",
              background: "#172033",
              border: "1px solid #334155",
              borderRadius: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "14px",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  background:
                    "rgba(59,130,246,0.15)",
                  fontSize: "18px",
                }}
              >
                🤖
              </span>

              <h3
                style={{
                  margin: 0,
                  color: "#60a5fa",
                  fontSize: "18px",
                }}
              >
                AI Feedback
              </h3>
            </div>

            <p
              style={{
                margin: 0,
                color: "#dbeafe",
                lineHeight: "1.7",
                fontSize: "15px",
              }}
            >
              {finalScorecard.feedback}
            </p>
          </div>

          {/* INTERVIEW SUMMARY */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
              marginTop: "24px",
            }}
          >
            <div
              style={{
                padding: "18px",
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: "12px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "13px",
                  marginBottom: "6px",
                }}
              >
                Total Questions
              </div>

              <div
                style={{
                  color: "#f8fafc",
                  fontSize: "22px",
                  fontWeight: "700",
                }}
              >
                {finalScorecard.total_questions}
              </div>
            </div>

            <div
              style={{
                padding: "18px",
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: "12px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "13px",
                  marginBottom: "6px",
                }}
              >
                Interview Status
              </div>

              <div
                style={{
                  color: "#4ade80",
                  fontSize: "16px",
                  fontWeight: "700",
                }}
              >
                ✓ Completed
              </div>
            </div>
          </div>

          {/* SOURCE */}
          <div
            style={{
              marginTop: "22px",
              paddingTop: "18px",
              borderTop: "1px solid #1f2937",
              textAlign: "center",
            }}
          >
            <span
              style={{
                color: "#64748b",
                fontSize: "12px",
              }}
            >
              {finalScorecard.source}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // STAGE 2 - AI VIDEO INTERVIEW SCREEN
  // ============================================================
  if (interviewCompleted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #0f172a 0%, #111827 50%, #172033 100%)",
          padding: "24px",
          fontFamily: "Arial, sans-serif",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            background: "#111827",
            padding: "30px",
            borderRadius: "22px",
            border: "1px solid #334155",
            boxShadow:
              "0 20px 50px rgba(0,0,0,0.35)",
            boxSizing: "border-box",
          }}
        >
          {/* HEADER */}
          <div
            style={{
              marginBottom: "8px",
            }}
          >
            <h1
              style={{
                margin: 0,
                color: "#ffffff",
                fontSize: "30px",
              }}
            >
              AI Video Interview
            </h1>

            <p
              style={{
                marginTop: "8px",
                marginBottom: 0,
                color: "#94a3b8",
                fontSize: "14px",
              }}
            >
              Your AI interviewer will ask questions
              verbally. Speak clearly after the AI
              finishes speaking.
            </p>
          </div>

          {/* INTERVIEW PROGRESS */}
          <div
            style={{
              marginTop: "24px",
              marginBottom: "25px",
              padding: "18px",
              background: "#172033",
              border: "1px solid #334155",
              borderRadius: "14px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "15px",
                marginBottom: "10px",
                color: "#cbd5e1",
                fontSize: "14px",
              }}
            >
              <span
                style={{
                  fontWeight: "600",
                }}
              >
                AI Video Interview
              </span>

              <span>
                Question{" "}
                {videoQuestionIndex + 1}{" "}
                of 6
              </span>
            </div>

            <div
              style={{
                width: "100%",
                height: "8px",
                background: "#334155",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width:
                    videoQuestions.length > 0 &&
                    videoQuestionId
                      ? `${
                          ((videoQuestionIndex + 1) /
                            6) *
                          100
                        }%`
                      : "0%",
                  height: "100%",
                  background:
                    "linear-gradient(90deg, #3b82f6, #7c3aed)",
                  borderRadius: "10px",
                  transition:
                    "width 0.4s ease",
                }}
              />
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div
              style={{
                marginTop: "15px",
                background: "rgba(127,29,29,0.35)",
                border:
                  "1px solid rgba(248,113,113,0.35)",
                color: "#fca5a5",
                padding: "15px",
                borderRadius: "10px",
              }}
            >
              {error}
            </div>
          )}

          {/* VIDEO CALL AREA */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "18px",
              marginTop: "25px",
              marginBottom: "25px",
            }}
          >
            {/* AI INTERVIEWER */}
            <div
              style={{
                minHeight: "340px",
                background:
                  "linear-gradient(145deg, #1e293b, #0f172a)",
                borderRadius: "16px",
                overflow: "hidden",
                position: "relative",
                border: "1px solid #334155",
                boxShadow:
                  "0 8px 25px rgba(0,0,0,0.25)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
              }}
            >
              {/* AI AVATAR */}
              <div
                style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, #3b82f6, #7c3aed)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "58px",
                  boxShadow:
                    aiSpeaking
                      ? "0 0 0 8px rgba(59,130,246,0.15), 0 0 35px rgba(59,130,246,0.5)"
                      : "0 8px 25px rgba(0,0,0,0.3)",
                  transition: "0.3s ease",
                }}
              >
                🤖
              </div>

              <h3
                style={{
                  marginTop: "18px",
                  marginBottom: "7px",
                  fontSize: "20px",
                }}
              >
                AI Interviewer
              </h3>

              <div
                style={{
                  padding: "7px 14px",
                  borderRadius: "20px",
                  background: aiSpeaking
                    ? "rgba(59,130,246,0.15)"
                    : "rgba(34,197,94,0.15)",
                  color: aiSpeaking
                    ? "#60a5fa"
                    : "#4ade80",
                  fontSize: "14px",
                  border: aiSpeaking
                    ? "1px solid rgba(96,165,250,0.2)"
                    : "1px solid rgba(74,222,128,0.2)",
                }}
              >
                {aiSpeaking
                  ? "🔊 AI is speaking..."
                  : "🎤 Listening for your answer"}
              </div>

              {/* STATUS BADGE */}
              <div
                style={{
                  position: "absolute",
                  top: "14px",
                  left: "14px",
                  background: "#0f172a",
                  color: "#cbd5e1",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  border: "1px solid #334155",
                }}
              >
                AI
              </div>
            </div>

            {/* CANDIDATE VIDEO */}
            <div
              style={{
                minHeight: "340px",
                background: "#020617",
                borderRadius: "16px",
                overflow: "hidden",
                position: "relative",
                border: "1px solid #334155",
                boxShadow:
                  "0 8px 25px rgba(0,0,0,0.25)",
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "340px",
                  objectFit: "cover",
                  display: "block",
                }}
              />

              {/* YOU LABEL */}
              <div
                style={{
                  position: "absolute",
                  bottom: "14px",
                  left: "14px",
                  background:
                    "rgba(15,23,42,0.88)",
                  color: "#ffffff",
                  padding: "7px 12px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "600",
                  border: "1px solid #334155",
                }}
              >
                You
              </div>

              {/* CAMERA STATUS */}
              <div
                style={{
                  position: "absolute",
                  top: "14px",
                  right: "14px",
                  background:
                    "rgba(15,23,42,0.88)",
                  color: "#4ade80",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  border: "1px solid rgba(74,222,128,0.2)",
                }}
              >
                ● Camera On
              </div>
            </div>
          </div>

          {/* CURRENT QUESTION */}
          <div
            style={{
              marginTop: "20px",
              padding: "22px",
              background:
                "linear-gradient(145deg, #1e293b, #172033)",
              border: "1px solid #334155",
              borderRadius: "14px",
              boxShadow:
                "0 6px 20px rgba(0,0,0,0.18)",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: "12px",
                color: "#60a5fa",
                fontSize: "16px",
              }}
            >
              🤖 AI Question
            </h3>

            <p
              style={{
                margin: 0,
                color: "#f8fafc",
                fontSize: "18px",
                lineHeight: "1.6",
                fontWeight: "500",
              }}
            >
              {videoQuestion}
            </p>
          </div>

          {/* LIVE TRANSCRIPT */}
          {transcript && (
            <div
              style={{
                marginTop: "20px",
                padding: "18px 20px",
                background: "#111827",
                border: "1px solid #374151",
                borderRadius: "14px",
                boxShadow:
                  "0 6px 20px rgba(0,0,0,0.18)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "12px",
                }}
              >
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: "#22c55e",
                    display: "inline-block",
                    boxShadow:
                      "0 0 10px rgba(34,197,94,0.5)",
                  }}
                />

                <h3
                  style={{
                    margin: 0,
                    color: "#f9fafb",
                    fontSize: "16px",
                  }}
                >
                  Live Transcript
                </h3>
              </div>

              <p
                style={{
                  margin: 0,
                  color: "#d1d5db",
                  lineHeight: "1.7",
                  fontSize: "15px",
                }}
              >
                {transcript}
              </p>
            </div>
          )}

          {/* AI EVALUATION */}
          {aiResult && (
            <div
              style={{
                marginTop: "20px",
                padding: "20px",
                background: "#172033",
                border: "1px solid #334155",
                borderRadius: "14px",
                boxShadow:
                  "0 6px 20px rgba(0,0,0,0.18)",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: "16px",
                  color: "#60a5fa",
                  fontSize: "17px",
                }}
              >
                🤖 AI Evaluation
              </h3>

              {/* SCORE */}
              <div
                style={{
                  marginBottom: "14px",
                  padding: "14px",
                  background: "#1e293b",
                  borderRadius: "10px",
                  border: "1px solid #334155",
                }}
              >
                <strong
                  style={{
                    color: "#cbd5e1",
                    fontSize: "14px",
                  }}
                >
                  Score
                </strong>

                <div
                  style={{
                    marginTop: "4px",
                    color: "#22c55e",
                    fontSize: "24px",
                    fontWeight: "700",
                  }}
                >
                  {aiResult.score}/10
                </div>
              </div>

              {/* FEEDBACK */}
              <div
                style={{
                  marginBottom: "14px",
                  padding: "14px",
                  background: "#1e293b",
                  borderRadius: "10px",
                  border: "1px solid #334155",
                }}
              >
                <strong
                  style={{
                    color: "#cbd5e1",
                    fontSize: "14px",
                  }}
                >
                  Feedback
                </strong>

                <p
                  style={{
                    margin: "8px 0 0",
                    color: "#e2e8f0",
                    lineHeight: "1.6",
                    fontSize: "15px",
                  }}
                >
                  {aiResult.feedback}
                </p>
              </div>

              {/* EVALUATION SOURCE */}
              <div
                style={{
                  padding: "14px",
                  background: "#1e293b",
                  borderRadius: "10px",
                  border: "1px solid #334155",
                }}
              >
                <strong
                  style={{
                    color: "#cbd5e1",
                    fontSize: "14px",
                  }}
                >
                  Evaluation Source
                </strong>

                <p
                  style={{
                    margin: "8px 0 0",
                    color: "#94a3b8",
                    fontSize: "14px",
                    lineHeight: "1.5",
                  }}
                >
                  {aiResult.source}
                </p>
              </div>
            </div>
          )}

          {/* LOADING */}
          {loading && (
            <div
              style={{
                marginTop: "20px",
                padding: "16px 18px",
                background: "#172033",
                border: "1px solid #334155",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "#60a5fa",
                  boxShadow:
                    "0 0 12px rgba(96,165,250,0.7)",
                }}
              />

              <span
                style={{
                  color: "#cbd5e1",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                🤖 AI is evaluating your answer...
              </span>
            </div>
          )}

          {/* MANUAL MICROPHONE BUTTON */}
          {!aiSpeaking &&
            !loading &&
            !videoInterviewCompleted && (
              <div
                style={{
                  textAlign: "center",
                  marginTop: "22px",
                }}
              >
                <button
                  onClick={() =>
                    startSpeechRecognition(
                      videoQuestion,
                      videoQuestionId
                    )
                  }
                  style={{
                    padding: "13px 28px",
                    border: "none",
                    borderRadius: "10px",
                    background:
                      "linear-gradient(135deg, #2563eb, #4f46e5)",
                    color: "white",
                    fontSize: "15px",
                    fontWeight: "600",
                    cursor: "pointer",
                    boxShadow:
                      "0 6px 18px rgba(37,99,235,0.3)",
                    transition:
                      "all 0.2s ease",
                  }}
                >
                  🎤 Start Speaking
                </button>
              </div>
            )}
        </div>
      </div>
    );
  }

  // ============================================================
  // STAGE 1 - TECHNICAL INTERVIEW SCREEN
  // ============================================================
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          background: "#ffffff",
          padding: "35px",
          borderRadius: "16px",
          boxShadow:
            "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        <h1
          style={{
            marginBottom: "10px",
          }}
        >
          AI Technical Interview
        </h1>

        <p
          style={{
            color: "#666",
            marginBottom: "30px",
          }}
        >
          Welcome to your AI-powered
          technical interview.
        </p>

        {/* ERROR */}
        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "15px",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        {/* BEFORE INTERVIEW START */}
        {!started ? (
          <>
          <div
          style={{
            background: "#ffffff",
            padding: "20px",
            borderRadius: "10px",
            marginBottom: "25px",
            border: "1px solid #e5e7eb",
            }}
            >
  <h3 style={{ marginTop: 0 }}>
    Add Your Own Interview Question
  </h3>

  <textarea
    value={customQuestion}
    onChange={(e) => setCustomQuestion(e.target.value)}
    placeholder="Enter your own technical question..."
    rows={3}
    style={{
      width: "100%",
      padding: "12px",
      border: "1px solid #d1d5db",
      borderRadius: "8px",
      fontSize: "15px",
      boxSizing: "border-box",
      resize: "vertical",
    }}
  />
<textarea
  value={expectedAnswer}
  onChange={(e) => setExpectedAnswer(e.target.value)}
  placeholder="Enter the expected/correct answer..."
  rows={4}
  style={{
    width: "100%",
    padding: "12px",
    marginTop: "10px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "15px",
    boxSizing: "border-box",
    resize: "vertical",
  }}
/>
  <button
    onClick={addCustomQuestion}
    style={{
      marginTop: "10px",
      padding: "10px 18px",
      border: "none",
      borderRadius: "8px",
      background: "#2563eb",
      color: "#fff",
      fontSize: "15px",
      cursor: "pointer",
    }}
  >
    {editingQuestionId ? "Update Question" : "Add Question"}
  </button>

  {customQuestions.length > 0 && (
    <div style={{ marginTop: "15px" }}>
      <strong>Added Questions:</strong>

      {customQuestions.map((item, index) => (
  <div
    key={item.question_id || index}
    style={{
      marginTop: "8px",
      padding: "12px",
      background: "#f8fafc",
      borderRadius: "6px",
    }}
  >
    <div>
      <strong>
        {index + 1}. {item.question}
      </strong>
    </div>

    {item.expected_answer && (
      <div
        style={{
          marginTop: "8px",
          color: "#475569",
          fontSize: "14px",
        }}
      >
        <strong>Expected Answer:</strong>{" "}
        {item.expected_answer}
      </div>
    )}

    <button
      onClick={() => {
        setEditingQuestionId(item.question_id);
        setCustomQuestion(item.question);
        setExpectedAnswer(item.expected_answer || "");
      }}
      style={{
        marginTop: "10px",
        padding: "8px 14px",
        border: "none",
        borderRadius: "6px",
        background: "#f59e0b",
        color: "#fff",
        cursor: "pointer",
      }}
    >
      Edit
    </button>

    {item.expected_answer && (
      <button
        onClick={() => deleteExpectedAnswer(item.question_id)}
        style={{
          marginTop: "10px",
          marginLeft: "8px",
          padding: "8px 14px",
          border: "none",
          borderRadius: "6px",
          background: "#dc2626",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        Delete Expected Answer
      </button>
    )}

    <button
      onClick={() => deleteQuestion(item.question_id)}
      style={{
        marginTop: "10px",
        marginLeft: "8px",
        padding: "8px 14px",
        border: "none",
        borderRadius: "6px",
        background: "#991b1b",
        color: "#fff",
        cursor: "pointer",
      }}
    >
      Delete Question
    </button>
  </div>
))}
</div>
  )}
  </div>
          <div>
            <div
              style={{
                background: "#f0f4ff",
                padding: "20px",
                borderRadius: "10px",
                marginBottom: "25px",
              }}
            >
              <h3>
                Interview Instructions
              </h3>

              <ul>
                <li>
                  Answer each technical
                  question carefully.
                </li>

                <li>
                  Try to explain your
                  answer clearly.
                </li>

                <li>
                  Your answers will be
                  evaluated by the AI
                  system.
                </li>

                <li>
                  The interview contains
                  technical questions.
                </li>
              </ul>
            </div>

            <button
              onClick={startInterview}
              disabled={loading}
              style={{
                padding:
                  "12px 25px",
                border: "none",
                borderRadius: "8px",
                background:
                  "#2563eb",
                color: "#fff",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              {loading
                ? "Loading..."
                : "Start Interview"}
            </button>
          </div>
          </>
        ) : currentQuestion ? (
          // =====================================================
          // CURRENT TECHNICAL QUESTION
          // =====================================================
          <div>
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                marginBottom: "15px",
              }}
            >
              <h2>
                Question{" "}
                {currentQuestionIndex +
                  1}{" "}
                of{" "}
                {questions.length}
              </h2>

              <span
                style={{
                  background:
                    "#e8f5e9",
                  padding:
                    "7px 12px",
                  borderRadius:
                    "20px",
                  color:
                    "#2e7d32",
                }}
              >
                {
                  currentQuestion.difficulty
                }
              </span>
            </div>

            {/* QUESTION */}
            <div
              style={{
                background:
                  "#f8fafc",
                padding: "25px",
                borderRadius:
                  "10px",
                border:
                  "1px solid #e5e7eb",
                marginBottom:
                  "20px",
              }}
            >
              <h3>
                {
                  currentQuestion.question
                }
              </h3>
            </div>

            {/* ANSWER */}
            <label
              style={{
                display: "block",
                fontWeight:
                  "bold",
                marginBottom:
                  "10px",
              }}
            >
              Your Answer
            </label>

            <textarea
              value={answer}
              onChange={(e) =>
                setAnswer(
                  e.target.value
                )
              }
              disabled={submitted}
              placeholder="Type your answer here..."
              rows="7"
              style={{
                width: "100%",
                padding: "15px",
                borderRadius:
                  "8px",
                border:
                  "1px solid #d1d5db",
                fontSize: "15px",
                resize: "vertical",
                boxSizing:
                  "border-box",
              }}
            />

            {/* SUBMIT / EVALUATION */}
            {!submitted &&
            !savedEvaluation ? (
              <button
                onClick={
                  submitAnswer
                }
                disabled={loading}
                style={{
                  marginTop:
                    "15px",
                  padding:
                    "12px 25px",
                  border: "none",
                  borderRadius:
                    "8px",
                  background:
                    "#16a34a",
                  color: "#fff",
                  fontSize:
                    "16px",
                  cursor:
                    "pointer",
                }}
              >
                {loading
                  ? "Submitting..."
                  : "Submit Answer"}
              </button>
            ) : (
              <div
                style={{
                  marginTop:
                    "25px",
                  padding: "20px",
                  background:
                    "#f0fdf4",
                  border:
                    "1px solid #bbf7d0",
                  borderRadius:
                    "10px",
                }}
              >
                <h3>
                  Answer Submitted
                  ✅
                </h3>

                <p>
                  Your answer has
                  been submitted
                  successfully.
                </p>

                {/* AI EVALUATION */}
                {aiResult && (
                  <div
                    style={{
                      marginTop:
                        "20px",
                      padding:
                        "20px",
                      background:
                        "#eff6ff",
                      border:
                        "1px solid #bfdbfe",
                      borderRadius:
                        "10px",
                    }}
                  >
                    <h3>
                      AI Evaluation
                    </h3>

                    <p>
                      <strong>
                        Score:
                      </strong>{" "}
                      {
                        aiResult.score
                      }
                      /10
                    </p>

                    <p>
                      <strong>
                        Feedback:
                      </strong>{" "}
                      {
                        aiResult.feedback
                      }
                    </p>

                    <p>
                      <strong>
                        Source:
                      </strong>{" "}
                      {
                        aiResult.source
                      }
                    </p>
                  </div>
                )}

                {/* NEXT QUESTION */}
                {currentQuestionIndex <
                questions.length -
                  1 ? (
                  <button
                    onClick={
                      nextQuestion
                    }
                    style={{
                      marginTop:
                        "10px",
                      padding:
                        "12px 25px",
                      border: "none",
                      borderRadius:
                        "8px",
                      background:
                        "#2563eb",
                      color: "#fff",
                      fontSize:
                        "16px",
                      cursor:
                        "pointer",
                    }}
                  >
                    Next Question
                  </button>
                ) : (
                  // ==========================================
                  // STAGE 1 COMPLETED
                  // ==========================================
                  <div
                    style={{
                      marginTop:
                        "15px",
                    }}
                  >
                    <p>
                      <strong>
                        Technical
                        questions
                        completed.
                        ✅
                      </strong>
                    </p>

                    <button
                      onClick={() =>
                        setInterviewCompleted(
                          true
                        )
                      }
                      style={{
                        marginTop:
                          "10px",
                        padding:
                          "12px 25px",
                        border: "none",
                        borderRadius:
                          "8px",
                        background:
                          "#7c3aed",
                        color: "#fff",
                        fontSize:
                          "16px",
                        cursor:
                          "pointer",
                      }}
                    >
                      Start AI Video
                      Interview 🎥
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p>
            No questions available.
          </p>
        )}
      </div>
    </div>
  );
}

export default Interview;