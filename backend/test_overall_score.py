from resume.parser import extract_text_from_pdf
from semantic_matcher import calculate_similarity, extract_skill_matches
from qualification_matcher import check_qualification
from experience_matcher import check_experience
from overall_score import calculate_overall_score


# -----------------------------
# Resume
# -----------------------------

pdf_path = "resume/Shilpi_Resume (1).pdf"

resume_text = extract_text_from_pdf(pdf_path)


# -----------------------------
# Job Description
# -----------------------------

job_description = """
We are looking for a Junior Software Developer.

Requirements:
- Bachelor's degree in Computer Science or related field
- Knowledge of Python and C++
- Knowledge of JavaScript and SQL
- Basic understanding of software development
- Problem solving and communication skills
- Ability to work in a team
"""


# -----------------------------
# Semantic matching
# -----------------------------

semantic_score = calculate_similarity(
    resume_text,
    job_description
)


# -----------------------------
# Skill matching
# -----------------------------

matched_skills, missing_skills = extract_skill_matches(
    resume_text,
    job_description
)


# Get skills required by JD
required_skills = matched_skills + missing_skills


# -----------------------------
# Qualification matching
# -----------------------------

qualification_result = check_qualification(
    resume_text,
    job_description
)


# -----------------------------
# Experience matching
# -----------------------------

experience_result = check_experience(
    resume_text,
    job_description
)


# -----------------------------
# Overall score
# -----------------------------

overall_score = calculate_overall_score(
    semantic_score,
    matched_skills,
    required_skills,
    qualification_result["status"],
    experience_result["status"]
)


# -----------------------------
# Display results
# -----------------------------

print("\n================================")
print("      CANDIDATE MATCH REPORT")
print("================================")

print("\nSemantic Match:")
print(semantic_score, "%")

print("\nMatched Skills:")
for skill in matched_skills:
    print("✓", skill)

print("\nMissing Skills:")
for skill in missing_skills:
    print("✗", skill)

print("\nQualification:")
print(qualification_result["status"])

print("\nExperience:")
print(experience_result["status"])

print("\n--------------------------------")
print("OVERALL CANDIDATE SCORE:")
print(overall_score, "%")
print("--------------------------------")