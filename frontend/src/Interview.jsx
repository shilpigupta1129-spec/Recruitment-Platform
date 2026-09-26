import { useEffect, useRef, useState } from "react";

function Interview() {
  // =========================
  // STAGE 1 STATES
  // =========================
  const [started, setStarted] = useState(false);
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
          startSpeechRecognition(
            text,
            questionId
          );
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
      console.log("6 seconds silence detected. Stopping recognition...");
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
      const answers = await answersResponse.json();

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
  const matchingQuestion = videoQuestionsRef.current.find((item) => {
  const dbQuestion = item.question.toLowerCase().trim();
  const nextQuestionText = nextQuestion.toLowerCase().trim();

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
console.log("NEXT QUESTION FROM BACKEND:", nextQuestion);
console.log("QUESTIONS LOADED IN FRONTEND:", videoQuestions);
console.log("MATCHING QUESTION:", matchingQuestion);
  if (!matchingQuestion) {
    throw new Error(
      "Next interview question was not found in the database."
    );
  }

  setVideoQuestion(nextQuestion);
  setVideoQuestionId(
    matchingQuestion.question_id
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

  // ============================================================
  // STAGE 1 - START INTERVIEW
  // ============================================================
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
          [8, 9, 10, 11, 12].includes(item.question_id)
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

      // // Load previously submitted answers
      // const answersResponse = await fetch(
      //   "http://127.0.0.1:8000/interviews/" +
      //     interviewId +
      //     "/answers"
      // );

      // if (answersResponse.ok) {
      //   const answers =
      //     await answersResponse.json();

      //   const currentAnswer = answers.find(
      //     (item) =>
      //       item.question_id ===
      //       questionList[0].question_id
      //   );

      //   if (currentAnswer) {
      //     setAnswer(
      //       currentAnswer.answer || ""
      //     );

      //     setSubmitted(true);

      //     if (currentAnswer.score !== null) {
      //       setAiResult({
      //         score: currentAnswer.score,
      //         feedback:
      //           currentAnswer.feedback,
      //         source: "Saved Evaluation",
      //       });
      //     }
      //   }
      // }

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
  // IMPORTANT:
  // This is OUTSIDE useEffect.
  // ============================================================
  if (finalScorecard) {
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
            maxWidth: "800px",
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
              textAlign: "center",
              marginBottom: "10px",
            }}
          >
            📊 Final AI Interview Scorecard
          </h1>

          <p
            style={{
              textAlign: "center",
              color: "#64748b",
              marginBottom: "30px",
            }}
          >
            Your AI video interview has been
            completed successfully.
          </p>

          {/* SCORE DETAILS */}
          <div
            style={{
              background: "#f8fafc",
              padding: "20px",
              borderRadius: "10px",
              border:
                "1px solid #e5e7eb",
            }}
          >
            <p>
              <strong>
                Technical Knowledge:
              </strong>{" "}
              {
                finalScorecard.technical_knowledge
              }
              /10
            </p>

            <p>
              <strong>
                Communication:
              </strong>{" "}
              {finalScorecard.communication}
              /10
            </p>

            <p>
              <strong>
                Answer Relevance:
              </strong>{" "}
              {
                finalScorecard.answer_relevance
              }
              /10
            </p>

            <p>
              <strong>
                Problem Solving:
              </strong>{" "}
              {
                finalScorecard.problem_solving
              }
              /10
            </p>
          </div>

          {/* OVERALL SCORE */}
          <div
            style={{
              marginTop: "25px",
              padding: "25px",
              background: "#f0fdf4",
              border:
                "1px solid #86efac",
              borderRadius: "12px",
              textAlign: "center",
            }}
          >
            <h2
              style={{
                margin: 0,
                color: "#166534",
              }}
            >
              Overall Score:{" "}
              {finalScorecard.overall_score}
              /10
            </h2>
          </div>

          {/* AI FEEDBACK */}
          <div
            style={{
              marginTop: "25px",
              padding: "20px",
              background: "#eef6ff",
              border:
                "1px solid #93c5fd",
              borderRadius: "12px",
            }}
          >
            <h3>🤖 AI Feedback</h3>

            <p
              style={{
                lineHeight: "1.6",
              }}
            >
              {finalScorecard.feedback}
            </p>
          </div>

          {/* TOTAL QUESTIONS */}
          <p
            style={{
              marginTop: "20px",
              textAlign: "center",
              color: "#475569",
            }}
          >
            <strong>
              Total Questions:
            </strong>{" "}
            {finalScorecard.total_questions}
          </p>

          {/* SOURCE */}
          <p
            style={{
              textAlign: "center",
              color: "#94a3b8",
              fontSize: "13px",
            }}
          >
            {finalScorecard.source}
          </p>
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
          <h1>
            AI Video Interview 🎥🤖
          </h1>

          <p
            style={{
              color: "#64748b",
            }}
          >
            Your AI interviewer will ask
            questions verbally. Speak clearly
            after the AI finishes speaking.
          </p>

          {/* ERROR */}
          {error && (
            <div
              style={{
                marginTop: "15px",
                background: "#fee2e2",
                color: "#991b1b",
                padding: "15px",
                borderRadius: "8px",
              }}
            >
              {error}
            </div>
          )}

          {/* VIDEO CALL AREA */}
          <div
            style={{
              display: "flex",
              gap: "20px",
              marginTop: "25px",
              marginBottom: "25px",
            }}
          >
            {/* AI INTERVIEWER */}
            <div
              style={{
                flex: 1,
                minHeight: "300px",
                background: "#111827",
                borderRadius: "12px",
                display: "flex",
                flexDirection:
                  "column",
                alignItems: "center",
                justifyContent:
                  "center",
                color: "white",
              }}
            >
              <div
                style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  background: "#374151",
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "center",
                  fontSize: "60px",
                }}
              >
                🤖
              </div>

              <h3>
                AI Interviewer
              </h3>

              <p>
                {aiSpeaking
                  ? "🔊 AI is speaking..."
                  : "🎤 Listening for your answer"}
              </p>
            </div>

            {/* CANDIDATE VIDEO */}
            <div
              style={{
                flex: 1,
                minHeight: "300px",
                background: "#111827",
                borderRadius: "12px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "300px",
                  objectFit: "cover",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  bottom: "10px",
                  left: "10px",
                  background:
                    "rgba(0,0,0,0.6)",
                  color: "white",
                  padding:
                    "5px 10px",
                  borderRadius: "5px",
                }}
              >
                You
              </div>
            </div>
          </div>

          {/* CURRENT QUESTION */}
          <div
            style={{
              marginTop: "20px",
              padding: "20px",
              background: "#f8fafc",
              border:
                "1px solid #e5e7eb",
              borderRadius: "10px",
            }}
          >
            <h3>
              🤖 AI Question
            </h3>

            <p
              style={{
                fontSize: "17px",
                lineHeight: "1.6",
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
                padding: "15px",
                background: "#f8fafc",
                border:
                  "1px solid #d1d5db",
                borderRadius: "10px",
              }}
            >
              <h3>
                🎤 Candidate Response
              </h3>

              <p
                style={{
                  lineHeight: "1.6",
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
                background: "#eef6ff",
                border:
                  "1px solid #93c5fd",
                borderRadius: "10px",
              }}
            >
              <h3>
                🤖 AI Evaluation
              </h3>

              <p>
                <strong>
                  Score:
                </strong>{" "}
                {aiResult.score}/10
              </p>

              <p>
                <strong>
                  Feedback:
                </strong>{" "}
                {aiResult.feedback}
              </p>

              <p>
                <strong>
                  Evaluation Source:
                </strong>{" "}
                {aiResult.source}
              </p>
            </div>
          )}

          {/* LOADING */}
          {loading && (
            <p
              style={{
                marginTop: "20px",
                color: "#2563eb",
                fontWeight: "bold",
              }}
            >
              🤖 AI is evaluating your
              answer...
            </p>
          )}

          {/* MANUAL MICROPHONE BUTTON */}
          {!aiSpeaking &&
            !loading &&
            !videoInterviewCompleted && (
              <button
                onClick={() =>
                  startSpeechRecognition(
                    videoQuestion,
                    videoQuestionId
                  )
                }
                style={{
                  marginTop: "20px",
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
                🎤 Start Speaking
              </button>
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